/**
 * Prints the Romanian description of the published animals of one collection, as the source
 * for translation:  node scripts/migration/dump-texts.ts adoptii-caini [offset] [count]
 */
import { and, asc, eq } from 'drizzle-orm';
import { db, schema } from '../../src/db/client.ts';
import { findCollection } from '../../src/lib/animals.ts';

const { animals, animalTranslations } = schema;
const collection = findCollection(process.argv[2] ?? '');
if (!collection) throw new Error('unknown collection');
const rows = db
  .select({ slug: animals.slug, name: animals.name, sex: animals.sex, description: animalTranslations.description })
  .from(animals)
  .innerJoin(animalTranslations, and(eq(animalTranslations.animalId, animals.id), eq(animalTranslations.locale, 'ro')))
  .where(and(eq(animals.species, collection.species), eq(animals.adoptionType, collection.adoptionType), eq(animals.status, 'published')))
  .orderBy(asc(animals.sortOrder), asc(animals.id))
  .all();
const offset = Number(process.argv[3] ?? 0);
for (const row of rows.slice(offset, offset + Number(process.argv[4] ?? rows.length))) {
  console.log(`### ${collection.path}/${row.slug} | ${row.name} | ${row.sex}\n${row.description}\n`);
}
