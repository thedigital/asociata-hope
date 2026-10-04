import { and, asc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '../db/client.ts';
import { DEFAULT_LOCALE, type Locale } from '../i18n/config.ts';
import { ageInMonths, COLLECTION_PATHS, type AdoptionType, type Species, type Trait } from './taxonomy.ts';

const { animals, animalPhotos, animalTraits, animalTranslations } = schema;

export type Collection = { species: Species; adoptionType: AdoptionType; path: string };
export type Animal = typeof animals.$inferSelect;
export type Photo = typeof animalPhotos.$inferSelect;
export type AnimalCard = Animal & { photo: Photo | null; traits: Trait[]; ageMonths: number | null };

export const COLLECTIONS: Collection[] = (['dog', 'cat'] as const).flatMap((species) =>
  (['real', 'virtual'] as const).map((adoptionType) => ({ species, adoptionType, path: COLLECTION_PATHS[species][adoptionType] })),
);
export const findCollection = (path: string) => COLLECTIONS.find((c) => c.path === path);

export const AGE_GROUPS = ['young', 'adult', 'senior'] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];
/** Under one year, one to seven years, eight years and over. */
export const ageGroup = (months: number): AgeGroup => (months < 12 ? 'young' : months < 96 ? 'adult' : 'senior');

function traitsByAnimal(ids: number[]): Map<number, Trait[]> {
  const map = new Map<number, Trait[]>();
  if (!ids.length) return map;
  const rows = db.select().from(animalTraits).where(inArray(animalTraits.animalId, ids)).orderBy(asc(animalTraits.position)).all();
  for (const row of rows) map.set(row.animalId, [...(map.get(row.animalId) ?? []), row.trait]);
  return map;
}

/** Published animals of a collection, in the order set by the admin. */
export function listAnimals({ species, adoptionType }: Collection): AnimalCard[] {
  const rows = db
    .select()
    .from(animals)
    .where(and(eq(animals.species, species), eq(animals.adoptionType, adoptionType), eq(animals.status, 'published')))
    .orderBy(asc(animals.sortOrder), asc(animals.id))
    .all();
  const ids = rows.map((r) => r.id);
  const photos = ids.length
    ? db.select().from(animalPhotos).where(and(inArray(animalPhotos.animalId, ids), eq(animalPhotos.sortOrder, 0))).all()
    : [];
  const traits = traitsByAnimal(ids);
  return rows.map((row) => ({
    ...row,
    photo: photos.find((p) => p.animalId === row.id) ?? null,
    traits: traits.get(row.id) ?? [],
    ageMonths: row.birthDate ? ageInMonths(row.birthDate) : null,
  }));
}

export function getAnimal({ species, adoptionType }: Collection, slug: string, locale: Locale) {
  const animal = db
    .select()
    .from(animals)
    .where(and(eq(animals.species, species), eq(animals.adoptionType, adoptionType), eq(animals.slug, slug), eq(animals.status, 'published')))
    .get();
  if (!animal) return null;
  const photos = db.select().from(animalPhotos).where(eq(animalPhotos.animalId, animal.id)).orderBy(asc(animalPhotos.sortOrder)).all();
  const translations = db.select().from(animalTranslations).where(eq(animalTranslations.animalId, animal.id)).all();
  // A missing translation falls back to the Romanian original rather than an empty page.
  const translation = translations.find((t) => t.locale === locale) ?? translations.find((t) => t.locale === DEFAULT_LOCALE) ?? null;
  return {
    ...animal,
    photos,
    traits: traitsByAnimal([animal.id]).get(animal.id) ?? [],
    ageMonths: animal.birthDate ? ageInMonths(animal.birthDate) : null,
    translation,
  };
}

/** Deceased animals of every collection, shown on the "In memoriam" page. */
export function listDeceased(): AnimalCard[] {
  const rows = db.select().from(animals).where(eq(animals.status, 'deceased')).orderBy(asc(animals.sortOrder), asc(animals.id)).all();
  const ids = rows.map((r) => r.id);
  const photos = ids.length
    ? db.select().from(animalPhotos).where(and(inArray(animalPhotos.animalId, ids), eq(animalPhotos.sortOrder, 0))).all()
    : [];
  return rows.map((row) => ({ ...row, photo: photos.find((p) => p.animalId === row.id) ?? null, traits: [], ageMonths: null }));
}

/** True when the URL belongs to an animal that has died: its page moves to "In memoriam". */
export function isDeceased({ species, adoptionType }: Collection, slug: string): boolean {
  return Boolean(
    db
      .select({ id: animals.id })
      .from(animals)
      .where(and(eq(animals.species, species), eq(animals.adoptionType, adoptionType), eq(animals.slug, slug), eq(animals.status, 'deceased')))
      .get(),
  );
}

/** Every published animal URL path (without language prefix), for the sitemap. */
export function listAnimalPaths(): { path: string; updatedAt: Date }[] {
  return db
    .select({ species: animals.species, adoptionType: animals.adoptionType, slug: animals.slug, updatedAt: animals.updatedAt })
    .from(animals)
    .where(eq(animals.status, 'published'))
    .all()
    .map((a) => ({ path: `/${COLLECTION_PATHS[a.species][a.adoptionType]}/${a.slug}`, updatedAt: a.updatedAt }));
}
