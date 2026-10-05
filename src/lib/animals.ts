import { and, asc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '../db/client.ts';
import { DEFAULT_LOCALE, type Locale } from '../i18n/config.ts';
import { coverPhotos, type Photo } from './animal-photos.ts';
import { animalsWithCampaign } from './campaigns.ts';
import { ADOPTION_TYPES, SPECIES, ageInMonths, animalPath, COLLECTION_PATHS, type AdoptionType, type Species, type Trait } from './taxonomy.ts';

const { animals, animalPhotos, animalTraits, animalTranslations } = schema;

export type Collection = { species: Species; adoptionType: AdoptionType; path: string };
export type Animal = typeof animals.$inferSelect;
export type { Photo };
/** `campaign`: a fundraising campaign for this animal is open. */
export type AnimalCard = Animal & { photo: Photo | null; traits: Trait[]; ageMonths: number | null; campaign: boolean };

export const COLLECTIONS: Collection[] = SPECIES.flatMap((species) =>
  ADOPTION_TYPES.map((adoptionType) => ({ species, adoptionType, path: COLLECTION_PATHS[species][adoptionType] })),
);
export const findCollection = (path: string) => COLLECTIONS.find((c) => c.path === path);

export const AGE_GROUPS = ['young', 'youngAdult', 'adult', 'senior'] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];
/** Under one year, one to three years, four to seven years, eight years and over. */
export const ageGroup = (months: number): AgeGroup => (months < 12 ? 'young' : months < 48 ? 'youngAdult' : months < 96 ? 'adult' : 'senior');

/** Rows of one collection, whatever their status. */
export const inCollection = ({ species, adoptionType }: Pick<Collection, 'species' | 'adoptionType'>) => and(eq(animals.species, species), eq(animals.adoptionType, adoptionType));

function traitsByAnimal(ids: number[]): Map<number, Trait[]> {
  const map = new Map<number, Trait[]>();
  if (!ids.length) return map;
  const rows = db.select().from(animalTraits).where(inArray(animalTraits.animalId, ids)).orderBy(asc(animalTraits.position)).all();
  for (const [animalId, list] of Map.groupBy(rows, (row) => row.animalId)) map.set(animalId, list.map((row) => row.trait));
  return map;
}

/** Published animals of a collection, in the order set by the admin. */
export function listAnimals(collection: Collection): AnimalCard[] {
  const rows = db
    .select()
    .from(animals)
    .where(and(inCollection(collection), eq(animals.status, 'published')))
    .orderBy(asc(animals.sortOrder), asc(animals.id))
    .all();
  const ids = rows.map((r) => r.id);
  const photos = coverPhotos(ids);
  const traits = traitsByAnimal(ids);
  const withCampaign = animalsWithCampaign();
  return rows.map((row) => ({
    ...row,
    photo: photos.get(row.id) ?? null,
    traits: traits.get(row.id) ?? [],
    ageMonths: row.birthDate ? ageInMonths(row.birthDate) : null,
    campaign: withCampaign.has(row.id),
  }));
}

export function getAnimal(collection: Collection, slug: string, locale: Locale) {
  const animal = db
    .select()
    .from(animals)
    .where(and(inCollection(collection), eq(animals.slug, slug), eq(animals.status, 'published')))
    .get();
  if (!animal) return null;
  const photos = db.select().from(animalPhotos).where(eq(animalPhotos.animalId, animal.id)).orderBy(asc(animalPhotos.sortOrder)).all();
  const translations = db.select().from(animalTranslations).where(eq(animalTranslations.animalId, animal.id)).all();
  // SEO fields come from the page language only. A missing description falls back to the
  // Romanian original rather than an empty page; `locale` tells which language the text is in.
  const own = translations.find((t) => t.locale === locale);
  const source = own?.description ? own : translations.find((t) => t.locale === DEFAULT_LOCALE);
  const translation = {
    locale: source?.locale ?? locale,
    description: source?.description ?? '',
    seoTitle: own?.seoTitle ?? null,
    seoDescription: own?.seoDescription ?? null,
  };
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
  const photos = coverPhotos(rows.map((r) => r.id));
  return rows.map((row) => ({ ...row, photo: photos.get(row.id) ?? null, traits: [], ageMonths: null, campaign: false }));
}

/** True when the URL belongs to an animal that has died: its page moves to "In memoriam". */
export function isDeceased(collection: Collection, slug: string): boolean {
  return Boolean(db.select({ id: animals.id }).from(animals).where(and(inCollection(collection), eq(animals.slug, slug), eq(animals.status, 'deceased'))).get());
}

/** Every published animal URL path (without language prefix), for the sitemap. */
export function listAnimalPaths(): { path: string; updatedAt: Date }[] {
  return db
    .select({ species: animals.species, adoptionType: animals.adoptionType, slug: animals.slug, updatedAt: animals.updatedAt })
    .from(animals)
    .where(eq(animals.status, 'published'))
    .all()
    .map((a) => ({ path: animalPath(a), updatedAt: a.updatedAt }));
}
