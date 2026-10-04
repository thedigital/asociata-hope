/**
 * Imports the four Wix collection exports (migration/wix-export/*.csv) into the database.
 *
 *   node scripts/migration/import-animals.ts            # validate + import
 *   node scripts/migration/import-animals.ts --dry-run  # validate and report only
 *
 * Free-text Wix fields are normalised to the identifiers of src/lib/taxonomy.ts. Any value that
 * cannot be mapped aborts the import before anything is written.
 * Romanian descriptions come from the CSV; English and French ones from the crawl
 * (migration/content.json), since Wix does not export translations.
 *
 * WARNING: replaces every animal already in the database.
 */
import { copyFile, mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { db, schema } from '../../src/db/client.ts';
import {
  COLORS,
  COLLECTION_PATHS,
  type AdoptionType,
  type Color,
  type Sex,
  type Size,
  type Species,
  type Trait,
} from '../../src/lib/taxonomy.ts';

const ROOT = join(import.meta.dirname, '../..');
const MIGRATION = join(ROOT, 'migration');
const UPLOADS = join(ROOT, 'data/uploads');
const dryRun = process.argv.includes('--dry-run');

const SOURCES: { file: string; species: Species; adoptionType: AdoptionType }[] = [
  { file: 'adoptii-caini.csv', species: 'dog', adoptionType: 'real' },
  { file: 'adoptii-pisici.csv', species: 'cat', adoptionType: 'real' },
  { file: 'adoptii-virtuale-caini.csv', species: 'dog', adoptionType: 'virtual' },
  { file: 'adoptii-virtuale-pisici.csv', species: 'cat', adoptionType: 'virtual' },
];

const exists = (p: string) => access(p).then(() => true, () => false);
const problems: string[] = [];
const notes: string[] = [];

/** RFC 4180 parser (quoted fields may contain commas, quotes and line breaks). */
function parseCsv(input: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const text = input.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') (field += '"'), i++;
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') (row.push(field), (field = ''));
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      (row = []), (field = '');
    } else field += c;
  }
  if (field || row.length) (row.push(field), rows.push(row));
  const [header, ...body] = rows.filter((r) => r.some((v) => v !== ''));
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

const SEX: Record<string, Sex> = { femela: 'female', mascul: 'male', 'mascul - femela': 'mixed' };
const SIZE: Record<string, Size> = { mica: 'small', medie: 'medium', media: 'medium', mare: 'large' };

const COLOR_WORDS: [string, string][] = [
  ['alb', 'white'],
  ['negru', 'black'],
  ['gri', 'grey'],
  ['portocaliu', 'orange'],
  ['bej', 'beige'],
];

function mapColor(raw: string, where: string): Color | null {
  const value = plain(raw);
  if (!value) return null;
  if (value.startsWith('tricolor')) return 'tricolor';
  const words = value.split(/\s+(?:cu|si)\s+/);
  const ids = words.map((w) => COLOR_WORDS.find(([ro]) => ro === w)?.[1]);
  if (ids.includes(undefined)) return problems.push(`${where}: unknown colour "${raw}"`), null;
  // Canonical order, so "Negru cu alb" and "Alb cu negru" share one identifier.
  const id = COLOR_WORDS.map(([, en]) => en).filter((en) => ids.includes(en)).join('-');
  if (!(COLORS as readonly string[]).includes(id)) return problems.push(`${where}: colour "${id}" is not in COLORS`), null;
  return id as Color;
}

/** Romanian adjective stems (gender and plural endings vary) → trait identifier. */
const TRAIT_STEMS: [string, Trait][] = [
  ['afectu', 'affectionate'],
  ['calm', 'calm'],
  ['vesel', 'cheerful'],
  ['lipicio', 'cuddly'],
  ['delicat', 'delicate'],
  ['docil', 'docile'],
  ['energic', 'energetic'],
  ['sperio', 'fearful'],
  ['prieteno', 'friendly'],
  ['bland', 'gentle'],
  ['inteligent', 'intelligent'],
  ['iubito', 'loving'],
  ['jucaus', 'playful'],
  ['sfio', 'reserved'],
  ['timi', 'shy'],
  ['sociabil', 'sociable'],
  ['cuminte', 'well-behaved'],
];

function mapTraits(raw: string, where: string): Trait[] {
  const traits: Trait[] = [];
  for (const word of plain(raw).split(/\s+si\s+|,/).map((w) => w.trim()).filter(Boolean)) {
    const trait = TRAIT_STEMS.find(([stem]) => word.startsWith(stem))?.[1];
    if (!trait) problems.push(`${where}: unknown trait "${word}" in "${raw}"`);
    else if (!traits.includes(trait)) traits.push(trait);
  }
  return traits;
}

function mapHealth(raw: string, where: string) {
  const value = plain(raw);
  const health = {
    vaccinated: /vaccinat/.test(value),
    sterilized: /sterilizat|castrat/.test(value),
    dewormed: /deparazitat/.test(value),
  };
  if (value && value !== 'n/c' && !Object.values(health).some(Boolean)) problems.push(`${where}: unknown health value "${raw}"`);
  return health;
}

/**
 * "8/2023" is a real month of birth. "3 ani", "1,5 ani" and "4 luni" are ages: the birth month is
 * derived by counting back from the record's last update in Wix, and flagged as estimated.
 */
function mapBirthDate(raw: string, updated: Date, where: string): { birthDate: string | null; birthDateEstimated: boolean } {
  const value = plain(raw);
  const iso = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}-01`;
  const exact = value.match(/^(\d{1,2})\/(\d{4})$/);
  if (exact) return { birthDate: iso(Number(exact[2]), Number(exact[1])), birthDateEstimated: false };
  const age = value.match(/^(\d+(?:[.,]\d+)?)\s*(an|ani|luni|luna)$/);
  if (!age) return problems.push(`${where}: unknown age "${raw}"`), { birthDate: null, birthDateEstimated: false };
  const months = Math.round(Number(age[1].replace(',', '.')) * (age[2].startsWith('an') ? 12 : 1));
  const d = new Date(Date.UTC(updated.getUTCFullYear(), updated.getUTCMonth() - months, 1));
  return { birthDate: iso(d.getUTCFullYear(), d.getUTCMonth() + 1), birthDateEstimated: true };
}

type Photo = { id: string; alt: string | null; width: number | null; height: number | null };

function parseImage(uri: string, alt = ''): Photo | null {
  const m = uri.match(/^wix:image:\/\/v1\/([^/]+)\//);
  if (!m) return null;
  const dim = (key: string) => Number(uri.match(new RegExp(`${key}=(\\d+)`))?.[1]) || null;
  return { id: m[1], alt: alt.trim() || null, width: dim('originWidth'), height: dim('originHeight') };
}

function mapPhotos(main: string, others: string, where: string): Photo[] {
  const photos: Photo[] = [];
  const add = (p: Photo | null) => p && !photos.some((x) => x.id === p.id) && photos.push(p);
  add(parseImage(main));
  if (others.trim()) {
    try {
      for (const item of JSON.parse(others) as { src?: string; alt?: string }[]) add(parseImage(item.src ?? '', item.alt));
    } catch {
      problems.push(`${where}: unreadable gallery JSON`);
    }
  }
  if (!photos.length) problems.push(`${where}: no photo`);
  return photos;
}

const localName = (wixId: string) => wixId.replace(/~/g, '_');

async function fetchTo(url: string, dest: string): Promise<boolean> {
  if (await exists(dest)) return true;
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!res.ok) return false;
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
  return true;
}

/** Wix only serves the renditions it generated, so try from the best one down. */
async function fetchVideo(id: string, dest: string): Promise<boolean> {
  for (const quality of ['1080p', '720p', '480p', '360p']) {
    if (await fetchTo(`https://video.wixstatic.com/video/${id}/${quality}/mp4/file.mp4`, dest)) return true;
  }
  return false;
}

type Block = { tag: string; text: string };
const crawl: Record<string, { blocks: Block[] }> = JSON.parse(await readFile(join(MIGRATION, 'content.json'), 'utf8'));
const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Locates the description in the Romanian page, then reads the same blocks in the translated page. */
function translatedDescription(path: string, locale: 'en' | 'fr', roDescription: string, where: string): string | null {
  const ro = crawl[path]?.blocks;
  const tr = crawl[`/${locale}${path}`]?.blocks;
  if (!ro || !tr) return notes.push(`${where}: no crawled ${locale} page`), null;
  const head = squash(roDescription).slice(0, 25);
  const start = ro.findIndex((b) => b.tag === 'p' && squash(b.text).startsWith(head));
  let end = Math.max(start, 0);
  while (end < ro.length && ro[end].tag === 'p') end++;
  // Same structure up to the end of the description (the footer differs between languages).
  const tags = (blocks: Block[]) => blocks.slice(0, end + 1).map((b) => b.tag).join();
  if (start < 0 || tags(ro) !== tags(tr)) return notes.push(`${where}: ${locale} description not aligned with the Romanian page`), null;
  return tr.slice(start, end).map((b) => b.text).join('\n\n');
}

type AnimalRecord = {
  where: string;
  animal: typeof schema.animals.$inferInsert;
  wixVideo: string | null;
  traits: Trait[];
  photos: Photo[];
  descriptions: { ro: string; en: string | null; fr: string | null };
};

const records: AnimalRecord[] = [];
for (const source of SOURCES) {
  const rows = parseCsv(await readFile(join(MIGRATION, 'wix-export', source.file), 'utf8'));
  const collection = COLLECTION_PATHS[source.species][source.adoptionType];
  const itemColumn = Object.keys(rows[0]).find((k) => k.endsWith('(Item)'))!;
  const videoColumn = Object.keys(rows[0]).find((k) => /^vid[eé]o$/i.test(k))!;

  for (const row of rows) {
    const path = row[itemColumn];
    const slug = path.split('/').pop()!;
    const where = `${collection}/${slug}`;
    const updatedAt = new Date(row['Updated Date']);
    const video = row[videoColumn].trim();
    const wixVideo = video.match(/^wix:video:\/\/v1\/([^/]+)\//)?.[1] ?? null;
    if (video && !wixVideo && !/^https?:\/\//.test(video)) problems.push(`${where}: unknown video value "${video}"`);
    if (path !== `/${collection}/${slug}`) problems.push(`${where}: unexpected URL "${path}"`);
    if (!crawl[path]) notes.push(`${where}: not found in the crawl (not published on the live site?)`);

    const description = row['Descriere'].trim();
    records.push({
      where,
      animal: {
        species: source.species,
        adoptionType: source.adoptionType,
        slug,
        name: row['Nume'].trim(),
        sex: row['Sex'].trim() ? (SEX[plain(row['Sex'])] ?? (problems.push(`${where}: unknown sex "${row['Sex']}"`), null)) : null,
        size: row['Talie']?.trim() ? (SIZE[plain(row['Talie'])] ?? (problems.push(`${where}: unknown size "${row['Talie']}"`), null)) : null,
        color: mapColor(row['Colorit'] ?? '', where),
        ...mapBirthDate(row['Varsta'], updatedAt, where),
        ...mapHealth(row['Vaccin'], where),
        videoUrl: wixVideo ? null : video || null,
        videoFile: wixVideo ? `${wixVideo}.mp4` : null,
        status: 'published' as const,
        sortOrder: Number(row['ordre']) || 0,
        createdAt: new Date(row['Created Date']),
        updatedAt,
      },
      wixVideo,
      traits: mapTraits(row['Comportament'], where),
      photos: mapPhotos(row['Imagine principala'], row['Alte imagini'], where),
      descriptions: {
        ro: description,
        en: translatedDescription(path, 'en', description, where),
        fr: translatedDescription(path, 'fr', description, where),
      },
    });
  }
}

const count = <T>(values: T[]) => {
  const map = new Map<string, number>();
  for (const v of values) map.set(String(v), (map.get(String(v)) ?? 0) + 1);
  return Object.fromEntries([...map].sort((a, b) => b[1] - a[1]));
};
console.log(`${records.length} animals read`);
console.log('by collection:', count(records.map((r) => `${r.animal.species}/${r.animal.adoptionType}`)));
console.log('sex:', count(records.map((r) => r.animal.sex)));
console.log('size:', count(records.map((r) => r.animal.size)));
console.log('color:', count(records.map((r) => r.animal.color)));
console.log('traits:', count(records.flatMap((r) => r.traits)));
console.log('vaccinated/sterilized/dewormed:', ['vaccinated', 'sterilized', 'dewormed'].map((k) => records.filter((r) => r.animal[k as 'vaccinated']).length).join(' / '));
console.log('birth date estimated:', records.filter((r) => r.animal.birthDateEstimated).length, '| exact:', records.filter((r) => r.animal.birthDate && !r.animal.birthDateEstimated).length);
console.log('photos:', records.reduce((n, r) => n + r.photos.length, 0), '| wix videos:', records.filter((r) => r.wixVideo).length, '| external videos:', records.filter((r) => r.animal.videoUrl).length);
console.log('translations: en', records.filter((r) => r.descriptions.en).length, '| fr', records.filter((r) => r.descriptions.fr).length);
for (const n of notes) console.log('  note:', n);

if (problems.length) {
  console.error(`\n${problems.length} problem(s), nothing imported:`);
  for (const p of problems) console.error('  -', p);
  process.exit(1);
}
if (dryRun) process.exit(0);

await mkdir(join(MIGRATION, 'media/video'), { recursive: true });
await mkdir(join(UPLOADS, 'animals'), { recursive: true });
await mkdir(join(UPLOADS, 'videos'), { recursive: true });
const failed: string[] = [];
for (const r of records) {
  for (const photo of r.photos) {
    const cached = join(MIGRATION, 'media', localName(photo.id));
    if (await fetchTo(`https://static.wixstatic.com/media/${photo.id}`, cached)) await copyFile(cached, join(UPLOADS, 'animals', localName(photo.id)));
    else failed.push(`${r.where}: photo ${photo.id}`);
  }
  if (r.wixVideo) {
    const cached = join(MIGRATION, 'media/video', `${r.wixVideo}.mp4`);
    if (await fetchVideo(r.wixVideo, cached)) await copyFile(cached, join(UPLOADS, 'videos', `${r.wixVideo}.mp4`));
    else (failed.push(`${r.where}: video ${r.wixVideo}`), (r.animal.videoFile = null));
  }
}

db.transaction((tx) => {
  tx.delete(schema.animals).run();
  for (const r of records) {
    const { id } = tx.insert(schema.animals).values(r.animal).returning({ id: schema.animals.id }).get();
    if (r.traits.length) tx.insert(schema.animalTraits).values(r.traits.map((trait, position) => ({ animalId: id, trait, position }))).run();
    tx.insert(schema.animalPhotos)
      .values(r.photos.map((p, sortOrder) => ({ animalId: id, file: localName(p.id), alt: p.alt, width: p.width, height: p.height, sortOrder })))
      .run();
    for (const locale of ['ro', 'en', 'fr'] as const) {
      const description = r.descriptions[locale];
      if (description) tx.insert(schema.animalTranslations).values({ animalId: id, locale, description }).run();
    }
  }
});

console.log(`\nImported ${records.length} animals.`);
if (failed.length) {
  console.log(`${failed.length} media file(s) could not be downloaded:`);
  for (const f of failed) console.log('  -', f);
}
