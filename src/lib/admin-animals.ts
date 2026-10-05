import { randomBytes } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { and, asc, eq, ne } from 'drizzle-orm';
import { db, schema } from '../db/client.ts';
import { ENABLED_LOCALES, LOCALES, localizePath, type Locale } from '../i18n/config.ts';
import { inCollection } from './animals.ts';
import { formText, isIsoDate, oneOf } from './input.ts';
import { UPLOADS_DIR } from './media.ts';
import { buildAnimalSeo } from './seo.ts';
import { removeImage, storeImage } from './uploads.ts';
import { ADOPTION_TYPES, COLORS, SEXES, SIZES, SPECIES, STATUSES, TRAITS, animalPath, type Trait } from './taxonomy.ts';

const { animals, animalPhotos, animalTraits, animalTranslations, redirects } = schema;

export type AnimalInput = Omit<typeof animals.$inferInsert, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder' | 'videoFile'>;
export type TranslationInput = { locale: Locale; description: string; seoTitle: string | null; seoDescription: string | null };
/** Validation problems, as keys of the admin dictionary (`errors`). */
export type FormError = 'name' | 'slug' | 'slugTaken' | 'birthDate' | 'videoUrl' | 'invalid';

const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
/**
 * Photos and video are sent with the animal form in one request, and Cloudflare refuses a request
 * above 100 MB (Free and Pro plans): the form refuses a larger selection before sending it. The
 * limits of nginx (deploy/setup-nginx.sh) and of the Node adapter (astro.config.ts) follow this one.
 */
export const MAX_UPLOAD_BYTES = 95 * 1024 * 1024;

export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Reads and validates the animal form. Unknown taxonomy values are rejected, never stored. */
export function parseAnimalForm(form: FormData) {
  const text = formText(form);
  const errors: FormError[] = [];

  const name = text('name');
  if (!name || name.length > 80) errors.push('name');
  const slug = text('slug') || slugify(name);
  // Legacy Wix slugs may start with a hyphen ("-marzipan"), so only the character set is checked.
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) errors.push('slug');
  const species = oneOf(SPECIES, text('species'));
  const adoptionType = oneOf(ADOPTION_TYPES, text('adoptionType'));
  const status = oneOf(STATUSES, text('status'));
  if (!species || !adoptionType || !status) errors.push('invalid');
  const birthDate = text('birthDate');
  if (birthDate && (!isIsoDate(birthDate) || Date.parse(birthDate) > Date.now())) errors.push('birthDate');
  const videoUrl = text('videoUrl');
  if (videoUrl && !/^https?:\/\/\S+$/.test(videoUrl)) errors.push('videoUrl');

  const data: AnimalInput = {
    name,
    slug,
    species: species ?? 'dog',
    adoptionType: adoptionType ?? 'real',
    status: status ?? 'draft',
    sex: oneOf(SEXES, text('sex')),
    // A dog is described by its size, a cat by its colour: the form shows the one that applies.
    size: species === 'cat' ? null : oneOf(SIZES, text('size')),
    color: species === 'cat' ? oneOf(COLORS, text('color')) : null,
    birthDate: birthDate || null,
    birthDateEstimated: form.has('birthDateEstimated'),
    vaccinated: form.has('vaccinated'),
    sterilized: form.has('sterilized'),
    dewormed: form.has('dewormed'),
    videoUrl: videoUrl || null,
  };
  const traits = form.getAll('traits').map((t) => oneOf(TRAITS, String(t))).filter((t): t is Trait => t !== null);
  const translations: TranslationInput[] = LOCALES.map((locale) => ({
    locale,
    description: text(`description_${locale}`).replace(/\r\n/g, '\n'),
    seoTitle: text(`seoTitle_${locale}`) || null,
    seoDescription: text(`seoDescription_${locale}`) || null,
  }));
  return { data, traits: [...new Set(traits)], translations, errors };
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** When a public URL changes, the old one is redirected (301) to the new one in every language. */
export function moveUrl(tx: Transaction, from: string, to: string): void {
  if (from === to) return;
  for (const locale of ENABLED_LOCALES) {
    const [fromPath, toPath] = [localizePath(from, locale), localizePath(to, locale)];
    // The new URL must not itself be redirected, and existing rules must follow the move.
    tx.delete(redirects).where(eq(redirects.fromPath, toPath)).run();
    tx.update(redirects).set({ toPath }).where(eq(redirects.toPath, fromPath)).run();
    tx.insert(redirects).values({ fromPath, toPath, status: 301 }).onConflictDoUpdate({ target: redirects.fromPath, set: { toPath, status: 301 } }).run();
  }
}

/**
 * Creates or updates an animal with its traits and translations.
 * When the public URL changes, the old one is redirected (301) in every language.
 */
export function saveAnimal(id: number | null, input: ReturnType<typeof parseAnimalForm>): { id: number } | { error: FormError } {
  const { data, traits, translations } = input;
  const clash = db
    .select({ id: animals.id })
    .from(animals)
    .where(and(inCollection(data), eq(animals.slug, data.slug), id ? ne(animals.id, id) : undefined))
    .get();
  if (clash) return { error: 'slugTaken' };

  return db.transaction((tx) => {
    let animalId = id;
    // What the SEO fields contained if they were generated from the record as it was before this save.
    let previousSeo: (locale: Locale) => { title: string; description: string } | null = () => null;
    if (animalId) {
      const before = tx.select().from(animals).where(eq(animals.id, animalId)).get();
      if (!before) return { error: 'invalid' as const };
      const beforeTraits = tx.select().from(animalTraits).where(eq(animalTraits.animalId, animalId)).orderBy(asc(animalTraits.position)).all().map((t) => t.trait);
      previousSeo = (locale) => buildAnimalSeo({ ...before, traits: beforeTraits }, locale);
      tx.update(animals).set({ ...data, updatedAt: new Date() }).where(eq(animals.id, animalId)).run();
      moveUrl(tx, animalPath(before), animalPath(data));
    } else {
      // New animals are listed first.
      const first = tx
        .select({ sortOrder: animals.sortOrder })
        .from(animals)
        .where(inCollection(data))
        .orderBy(asc(animals.sortOrder))
        .get();
      animalId = tx.insert(animals).values({ ...data, sortOrder: (first?.sortOrder ?? 1) - 1 }).returning({ id: animals.id }).get().id;
    }

    tx.delete(animalTraits).where(eq(animalTraits.animalId, animalId)).run();
    if (traits.length) tx.insert(animalTraits).values(traits.map((trait, position) => ({ animalId: animalId!, trait, position }))).run();

    // SEO fields left empty are generated from the characteristics. A field still holding the text
    // generated before this save follows the change; anything typed by hand is kept.
    const withSeo = translations.map((t) => {
      const generated = buildAnimalSeo(
        {
          name: data.name,
          species: data.species,
          adoptionType: data.adoptionType,
          sex: data.sex ?? null,
          size: data.size ?? null,
          color: data.color ?? null,
          vaccinated: Boolean(data.vaccinated),
          sterilized: Boolean(data.sterilized),
          dewormed: Boolean(data.dewormed),
          traits,
        },
        t.locale,
      );
      const previous = previousSeo(t.locale);
      return {
        ...t,
        seoTitle: !t.seoTitle || t.seoTitle === previous?.title ? generated.title : t.seoTitle,
        seoDescription: !t.seoDescription || t.seoDescription === previous?.description ? generated.description : t.seoDescription,
      };
    });
    tx.delete(animalTranslations).where(eq(animalTranslations.animalId, animalId)).run();
    tx.insert(animalTranslations).values(withSeo.map((t) => ({ animalId: animalId!, ...t }))).run();
    return { id: animalId };
  });
}

/** Stores uploaded pictures (`storeImage`). Returns the number of rejected files. */
export async function addPhotos(animalId: number, files: File[]): Promise<number> {
  const last = db.select({ sortOrder: animalPhotos.sortOrder }).from(animalPhotos).where(eq(animalPhotos.animalId, animalId)).orderBy(asc(animalPhotos.sortOrder)).all().pop();
  let sortOrder = last ? last.sortOrder + 1 : 0;
  let rejected = 0;
  for (const upload of files) {
    if (!upload.size) continue;
    const stored = await storeImage('animals', upload);
    if (stored) db.insert(animalPhotos).values({ animalId, ...stored, sortOrder: sortOrder++ }).run();
    else rejected++;
  }
  return rejected;
}

function renumberPhotos(animalId: number, order: number[]) {
  db.transaction((tx) => {
    order.forEach((photoId, sortOrder) => tx.update(animalPhotos).set({ sortOrder }).where(and(eq(animalPhotos.id, photoId), eq(animalPhotos.animalId, animalId))).run());
  });
}

const photoIds = (animalId: number) =>
  db.select({ id: animalPhotos.id }).from(animalPhotos).where(eq(animalPhotos.animalId, animalId)).orderBy(asc(animalPhotos.sortOrder), asc(animalPhotos.id)).all().map((p) => p.id);

export async function deletePhoto(animalId: number, photoId: number) {
  const photo = db.select().from(animalPhotos).where(and(eq(animalPhotos.id, photoId), eq(animalPhotos.animalId, animalId))).get();
  if (!photo) return;
  db.delete(animalPhotos).where(eq(animalPhotos.id, photoId)).run();
  await removeImage('animals', photo.file);
  renumberPhotos(animalId, photoIds(animalId));
}

/** `main` moves the picture to position 0; `left`/`right` swap it with its neighbour. */
export function movePhoto(animalId: number, photoId: number, direction: 'main' | 'left' | 'right') {
  const ids = photoIds(animalId);
  const index = ids.indexOf(photoId);
  if (index < 0) return;
  const target = direction === 'main' ? 0 : direction === 'left' ? index - 1 : index + 1;
  if (target < 0 || target >= ids.length) return;
  ids.splice(index, 1);
  ids.splice(target, 0, photoId);
  renumberPhotos(animalId, ids);
}

/** Stores an MP4 upload; returns false when the file is not an MP4 or is too large. */
export async function setVideo(animalId: number, upload: File | null, remove: boolean): Promise<boolean> {
  const current = db.select({ videoFile: animals.videoFile }).from(animals).where(eq(animals.id, animalId)).get();
  const hasUpload = Boolean(upload?.size);
  if (!current || (!hasUpload && !remove)) return true;
  let videoFile: string | null = null;
  if (upload && hasUpload) {
    // An MP4 file starts with a box whose type, at offset 4, is "ftyp". Only those bytes are read:
    // the file itself goes to the disk as a stream, without a second copy of it in memory.
    if (upload.size > MAX_VIDEO_BYTES || (await upload.slice(4, 8).text()) !== 'ftyp') return false;
    videoFile = `${randomBytes(12).toString('hex')}.mp4`;
    await mkdir(join(UPLOADS_DIR, 'videos'), { recursive: true });
    await writeFile(join(UPLOADS_DIR, 'videos', videoFile), upload.stream());
  }
  if (current.videoFile) await rm(join(UPLOADS_DIR, 'videos', current.videoFile), { force: true });
  db.update(animals).set({ videoFile }).where(eq(animals.id, animalId)).run();
  return true;
}

/** Moves an animal one place up or down inside its collection. */
export function moveAnimal(id: number, direction: 'up' | 'down') {
  const animal = db.select().from(animals).where(eq(animals.id, id)).get();
  if (!animal) return;
  const ids = db
    .select({ id: animals.id })
    .from(animals)
    .where(inCollection(animal))
    .orderBy(asc(animals.sortOrder), asc(animals.id))
    .all()
    .map((a) => a.id);
  const index = ids.indexOf(id);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= ids.length) return;
  [ids[index], ids[target]] = [ids[target], ids[index]];
  db.transaction((tx) => ids.forEach((animalId, position) => tx.update(animals).set({ sortOrder: position + 1 }).where(eq(animals.id, animalId)).run()));
}

export async function deleteAnimal(id: number) {
  const animal = db.select().from(animals).where(eq(animals.id, id)).get();
  if (!animal) return;
  const photos = db.select().from(animalPhotos).where(eq(animalPhotos.animalId, id)).all();
  db.delete(animals).where(eq(animals.id, id)).run();
  for (const photo of photos) await removeImage('animals', photo.file);
  if (animal.videoFile) await rm(join(UPLOADS_DIR, 'videos', animal.videoFile), { force: true });
}

export function getAnimalForEdit(id: number) {
  const animal = db.select().from(animals).where(eq(animals.id, id)).get();
  if (!animal) return null;
  return {
    animal,
    traits: db.select().from(animalTraits).where(eq(animalTraits.animalId, id)).orderBy(asc(animalTraits.position)).all().map((t) => t.trait),
    translations: db.select().from(animalTranslations).where(eq(animalTranslations.animalId, id)).all(),
    photos: db.select().from(animalPhotos).where(eq(animalPhotos.animalId, id)).orderBy(asc(animalPhotos.sortOrder), asc(animalPhotos.id)).all(),
    path: animalPath(animal),
  };
}
