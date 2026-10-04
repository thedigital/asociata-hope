/**
 * Controlled vocabularies for animals. Identifiers are English and stable: they are stored
 * in the database and used as filter values. Display labels are translated by the front end.
 */
export const SPECIES = ['dog', 'cat'] as const;
export const ADOPTION_TYPES = ['real', 'virtual'] as const;
export const SEXES = ['male', 'female', 'mixed'] as const; // mixed = a group listed as one record
export const SIZES = ['small', 'medium', 'large'] as const;
export const STATUSES = ['draft', 'published', 'adopted', 'deceased'] as const;

export const COLORS = [
  'white',
  'black',
  'grey',
  'orange',
  'white-black',
  'white-grey',
  'white-orange',
  'white-beige',
  'black-grey',
  'white-grey-beige',
  'tricolor',
] as const;

export const TRAITS = [
  'affectionate',
  'calm',
  'cheerful',
  'cuddly',
  'delicate',
  'docile',
  'energetic',
  'fearful',
  'friendly',
  'gentle',
  'intelligent',
  'loving',
  'playful',
  'reserved',
  'shy',
  'sociable',
  'well-behaved',
] as const;

export type Species = (typeof SPECIES)[number];
export type AdoptionType = (typeof ADOPTION_TYPES)[number];
export type Sex = (typeof SEXES)[number];
export type Size = (typeof SIZES)[number];
export type Status = (typeof STATUSES)[number];
export type Color = (typeof COLORS)[number];
export type Trait = (typeof TRAITS)[number];

/** URL segment of each collection, unchanged from the Wix site (same in every language). */
export const COLLECTION_PATHS: Record<Species, Record<AdoptionType, string>> = {
  dog: { real: 'adoptii-caini', virtual: 'adoptii-virtuale-caini' },
  cat: { real: 'adoptii-pisici', virtual: 'adoptii-virtuale-pisici' },
};

/** Whole months elapsed since `birthDate` (ISO `YYYY-MM-DD`). */
export function ageInMonths(birthDate: string, now = new Date()): number {
  const [year, month, day] = birthDate.split('-').map(Number);
  const months = (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
  return Math.max(0, now.getDate() < day ? months - 1 : months);
}
