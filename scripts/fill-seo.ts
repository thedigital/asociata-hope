/**
 * Fills the empty SEO title and description of every animal that has a public page, in every
 * language:  pnpm seo:fill  (add --dry-run to preview)
 *
 * Only empty fields are written, so anything typed in the admin is kept. Run it again after
 * adding animals or changing their characteristics; clear a field in the admin to have it
 * regenerated.
 */
import { and, asc, eq } from 'drizzle-orm';
import { db, schema } from '../src/db/client.ts';
import { LOCALES } from '../src/i18n/config.ts';
import { buildAnimalSeo } from '../src/lib/seo.ts';

const { animals, animalTraits, animalTranslations } = schema;
const dryRun = process.argv.includes('--dry-run');
let written = 0;
const longest = { title: 0, description: 0 };

for (const animal of db.select().from(animals).where(eq(animals.status, 'published')).orderBy(asc(animals.id)).all()) {
  const traits = db.select().from(animalTraits).where(eq(animalTraits.animalId, animal.id)).orderBy(asc(animalTraits.position)).all().map((t) => t.trait);
  for (const locale of LOCALES) {
    const row = db.select().from(animalTranslations).where(and(eq(animalTranslations.animalId, animal.id), eq(animalTranslations.locale, locale))).get();
    if (row?.seoTitle && row.seoDescription) continue;
    const seo = buildAnimalSeo({ ...animal, traits }, locale);
    const values = { seoTitle: row?.seoTitle || seo.title, seoDescription: row?.seoDescription || seo.description };
    longest.title = Math.max(longest.title, values.seoTitle.length);
    longest.description = Math.max(longest.description, values.seoDescription.length);
    if (dryRun) {
      if (written < 8) console.log(`[${locale}] ${values.seoTitle}\n     ${values.seoDescription}`);
    } else {
      // A language without description gets a row holding only the SEO fields; the page then
      // shows the Romanian description (see getAnimal).
      db.insert(animalTranslations)
        .values({ animalId: animal.id, locale, description: '', ...values })
        .onConflictDoUpdate({ target: [animalTranslations.animalId, animalTranslations.locale], set: values })
        .run();
    }
    written++;
  }
}
console.log(`${dryRun ? 'Would fill' : 'Filled'} ${written} translation(s). Longest title: ${longest.title} characters, longest description: ${longest.description}.`);
