/**
 * Creates an animal record (status `deceased`) for each picture of the Wix "In memoriam" page,
 * so that the page is built from animals like every other list.
 *
 *   node scripts/migration/import-memoriam.ts
 *
 * Wix only had a name and a picture for them: species was read from the pictures, and they are
 * filed as real adoptions. Everything else is left empty, to be completed in the admin.
 * Animals that already exist are left untouched, so the script can be run again
 * (`import-animals` wipes all animals: run this one after it).
 */
import { access, copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { and, eq } from 'drizzle-orm';
import sharp from 'sharp';
import { db, schema } from '../../src/db/client.ts';
import { slugify } from '../../src/lib/admin-animals.ts';
import type { Species } from '../../src/lib/taxonomy.ts';

const ROOT = join(import.meta.dirname, '../..');
const MEDIA = join(ROOT, 'migration/media');
const UPLOADS = join(ROOT, 'data/uploads/animals');
const { animals, animalPhotos } = schema;

/** In the order of the Wix page. */
const MEMORIAM: { name: string; species: Species; file: string }[] = [
  { name: 'Otica', species: 'dog', file: '313291_b6ecbdbb9f6d40eeaf3776874061f1fe_mv2.webp' },
  { name: 'Mindy', species: 'dog', file: '313291_7cb0d3bd770d473994f7772ac78f21dd_mv2.jpg' },
  { name: 'Gilda', species: 'dog', file: '313291_d2ad84ef4fc34af2a9d5d5e91893cd52_mv2.webp' },
  { name: 'Wolf', species: 'dog', file: '313291_dc3e96eae68d45e3a87cd48f563131b5_mv2.webp' },
  { name: 'Nils', species: 'dog', file: '313291_d2dcd084a8b04c45a0b7a232d1ec50fb_mv2.webp' },
  { name: 'Terra', species: 'dog', file: '313291_803aab45e0874f7d96bbd89c15d497ea_mv2.webp' },
  { name: 'Muffin', species: 'cat', file: '313291_c7c05916b4e8437da18341f7ec1f1f77_mv2.webp' },
  { name: 'Boogie', species: 'cat', file: '313291_3764f265bbff4c1fb9ea8a3f418dbffe_mv2.webp' },
  { name: 'Chip', species: 'dog', file: '313291_938f598084424813b029f9cba98e138e_mv2.jpg' },
];

await mkdir(UPLOADS, { recursive: true });
let created = 0;
for (const [index, entry] of MEMORIAM.entries()) {
  const slug = slugify(entry.name);
  const where = and(eq(animals.species, entry.species), eq(animals.adoptionType, 'real'), eq(animals.slug, slug));
  if (db.select({ id: animals.id }).from(animals).where(where).get()) {
    console.log(`${entry.name}: already exists, skipped`);
    continue;
  }
  const source = join(MEDIA, entry.file);
  await access(source);
  await copyFile(source, join(UPLOADS, entry.file));
  const { width, height } = await sharp(source).metadata();
  db.transaction((tx) => {
    // After the living animals of the collection, in the order of the Wix page.
    const { id } = tx
      .insert(animals)
      .values({ name: entry.name, slug, species: entry.species, adoptionType: 'real', status: 'deceased', sortOrder: 1000 + index })
      .returning({ id: animals.id })
      .get();
    tx.insert(animalPhotos).values({ animalId: id, file: entry.file, width, height, sortOrder: 0 }).run();
  });
  created++;
}
console.log(`${created} animal(s) created.`);
