/**
 * Imports the hand-written translations kept in migration/translations/{locale}/:
 *
 *   animals*.md     one "### {collection}/{slug}" heading per animal, followed by its description
 *   pages/{slug}.html   body of a content page (`syncPageFiles`, which every deployment runs on its own: `pnpm pages:sync`)
 *
 *   node scripts/migration/import-translations.ts
 *
 * Existing rows are updated in place (SEO fields are kept). Run it after import-animals and
 * import-pages, which only know the languages that existed on the Wix site.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '../../src/db/client.ts';
import { isLocale } from '../../src/i18n/config.ts';
import { findCollection } from '../../src/lib/animals.ts';
import { syncPageFiles } from './page-files.ts';

const ROOT = join(import.meta.dirname, '../../migration/translations');
const { animals, animalTranslations } = schema;
const list = (dir: string) => readdir(dir).catch(() => [] as string[]);
let problems = 0;

for (const locale of await list(ROOT)) {
  if (!isLocale(locale)) continue;
  let animalCount = 0;

  for (const file of (await list(join(ROOT, locale))).filter((f) => /^animals.*\.md$/.test(f)).sort()) {
    const sections = (await readFile(join(ROOT, locale, file), 'utf8')).split(/^### +/m).slice(1);
    for (const section of sections) {
      const [key, ...lines] = section.split('\n');
      const [path, slug] = key.trim().split('/');
      const collection = findCollection(path);
      const animal = collection
        ? db.select({ id: animals.id }).from(animals).where(and(eq(animals.species, collection.species), eq(animals.adoptionType, collection.adoptionType), eq(animals.slug, slug))).get()
        : undefined;
      if (!animal) {
        console.log(`  ${locale}/${file}: unknown animal "${key.trim()}"`);
        problems++;
        continue;
      }
      const description = lines.join('\n').trim();
      db.insert(animalTranslations)
        .values({ animalId: animal.id, locale, description })
        .onConflictDoUpdate({ target: [animalTranslations.animalId, animalTranslations.locale], set: { description } })
        .run();
      animalCount++;
    }
  }
  console.log(`${locale}: ${animalCount} animal description(s)`);
}
const pageFiles = await syncPageFiles();
for (const file of pageFiles.unknown) console.log(`  ${file}: unknown page`);
problems += pageFiles.unknown.length;
console.log(`${pageFiles.files} page file(s), ${pageFiles.changed} text(s) updated`);

/**
 * Corrections to texts that come from Wix (fixes.json): animal names that its machine translation
 * altered or phrases it got wrong (`replace`, whole words only) and field labels pasted in front of a description (`startAt`).
 */
type Fix = { key: string; locale: string; replace?: [string, string][]; startAt?: string };
const fixes: Fix[] = JSON.parse(await readFile(join(ROOT, 'fixes.json'), 'utf8').catch(() => '[]'));
let fixed = 0;
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
for (const fix of fixes) {
  if (!isLocale(fix.locale)) continue;
  // "*" applies the correction to every animal text of that language.
  const [path, slug] = fix.key.split('/');
  const collection = findCollection(path);
  const scope = collection ? and(eq(animals.species, collection.species), eq(animals.adoptionType, collection.adoptionType), eq(animals.slug, slug)) : undefined;
  const rows =
    fix.key === '*' || collection
      ? db
          .select({ animalId: animalTranslations.animalId, description: animalTranslations.description })
          .from(animalTranslations)
          .innerJoin(animals, eq(animals.id, animalTranslations.animalId))
          .where(and(eq(animalTranslations.locale, fix.locale), scope))
          .all()
      : [];
  if (!rows.length) {
    console.log(`  fixes.json: no ${fix.locale} text for "${fix.key}"`);
    problems++;
    continue;
  }
  for (const row of rows) {
    let description = row.description;
    for (const [from, to] of fix.replace ?? []) description = description.replace(new RegExp(`(?<![\\p{L}-])${escapeRegExp(from)}(?![\\p{L}-])`, 'gu'), to);
    if (fix.startAt && description.includes(fix.startAt)) description = description.slice(description.indexOf(fix.startAt));
    if (description !== row.description) {
      db.update(animalTranslations).set({ description }).where(and(eq(animalTranslations.animalId, row.animalId), eq(animalTranslations.locale, fix.locale))).run();
      fixed++;
    }
  }
}
console.log(`${fixed} text(s) corrected from fixes.json`);
if (problems) process.exit(1);
