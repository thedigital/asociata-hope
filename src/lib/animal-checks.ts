import { inArray } from 'drizzle-orm';
import { db, schema } from '../db/client.ts';
import { DEFAULT_LOCALE, ENABLED_LOCALES, type Locale } from '../i18n/config.ts';

const { animals, animalPhotos, animalTraits, animalTranslations } = schema;

/**
 * Quality checks on an animal record. They are plain rules evaluated on the stored data every
 * time the admin is displayed, so they apply the same way to imported animals and to those
 * created later. `error` = something is missing or wrong; `warning` = something to verify.
 */
export const ISSUE_CODES = [
  'noPhoto',
  'noSex',
  'noBirthDate',
  'noSize',
  'noColor',
  'noTraits',
  'noDescription',
  'missingTranslation',
  'untranslated',
  'nameMissing',
  'missingSeo',
  'seoTooLong',
  'birthDateEstimated',
] as const;
export type IssueCode = (typeof ISSUE_CODES)[number];
export type Issue = { code: IssueCode; level: 'error' | 'warning'; locales?: Locale[] };

type Animal = typeof animals.$inferSelect;
type Translation = Pick<typeof animalTranslations.$inferSelect, 'locale' | 'description' | 'seoTitle' | 'seoDescription'>;

/** Shorter than this, a description is a placeholder ("n/c", "-", "todo"). */
const MIN_DESCRIPTION = 20;
const MAX_SEO_TITLE = 65;
const MAX_SEO_DESCRIPTION = 200;
const normalize = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();

export function checkAnimal(animal: Animal, traits: string[], translations: Translation[], photoCount: number): Issue[] {
  const issues: Issue[] = [];
  const error = (code: IssueCode, locales?: Locale[]) => issues.push({ code, level: 'error', locales });
  const warning = (code: IssueCode, locales?: Locale[]) => issues.push({ code, level: 'warning', locales });

  if (photoCount === 0) error('noPhoto');
  // Animals without a public page (drafts aside) only need a name and a picture.
  if (animal.status === 'deceased' || animal.status === 'adopted') return issues;

  if (!animal.sex) error('noSex');
  if (!animal.birthDate) error('noBirthDate');
  else if (animal.birthDateEstimated) warning('birthDateEstimated');
  if (animal.species === 'dog' && !animal.size) error('noSize');
  if (animal.species === 'cat' && !animal.color) error('noColor');
  if (traits.length === 0) error('noTraits');

  const byLocale = new Map(translations.map((t) => [t.locale, t]));
  const text = (locale: Locale) => byLocale.get(locale)?.description.trim() ?? '';
  const original = text(DEFAULT_LOCALE);
  const hasOriginal = original.length >= MIN_DESCRIPTION;
  if (!hasOriginal) error('noDescription');

  const others = ENABLED_LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);
  const missing = others.filter((locale) => text(locale).length < MIN_DESCRIPTION);
  // A translation that was only copied from the Romanian text.
  const untranslated = others.filter((locale) => !missing.includes(locale) && hasOriginal && normalize(text(locale)) === normalize(original));
  // Names are never translated: if the Romanian text names the animal, each translation must too.
  const names = animal.name.split(/\s+(?:si|și|&|and|et|und)\s+/i).map((n) => n.trim().toLowerCase()).filter((n) => n.length > 1);
  const named = (value: string) => names.every((n) => value.toLowerCase().includes(n));
  const nameMissing = others.filter((locale) => !missing.includes(locale) && named(original) && !named(text(locale)));
  if (hasOriginal && missing.length) error('missingTranslation', missing);
  if (untranslated.length) error('untranslated', untranslated);
  if (nameMissing.length) error('nameMissing', nameMissing);

  const noSeo = ENABLED_LOCALES.filter((locale) => !byLocale.get(locale)?.seoTitle?.trim() || !byLocale.get(locale)?.seoDescription?.trim());
  if (noSeo.length) error('missingSeo', noSeo);
  const longSeo = ENABLED_LOCALES.filter((locale) => {
    const t = byLocale.get(locale);
    return (t?.seoTitle?.length ?? 0) > MAX_SEO_TITLE || (t?.seoDescription?.length ?? 0) > MAX_SEO_DESCRIPTION;
  });
  if (longSeo.length) warning('seoTooLong', longSeo);

  return issues;
}

/** Issues of several animals at once (three queries whatever their number). */
export function checkAnimals(list: Animal[]): Map<number, Issue[]> {
  const ids = list.map((a) => a.id);
  const result = new Map<number, Issue[]>();
  if (!ids.length) return result;
  const group = <T extends { animalId: number }>(rows: T[]) => {
    const map = new Map<number, T[]>();
    for (const row of rows) map.set(row.animalId, [...(map.get(row.animalId) ?? []), row]);
    return map;
  };
  const traits = group(db.select().from(animalTraits).where(inArray(animalTraits.animalId, ids)).all());
  const translations = group(db.select().from(animalTranslations).where(inArray(animalTranslations.animalId, ids)).all());
  const photos = group(db.select({ animalId: animalPhotos.animalId }).from(animalPhotos).where(inArray(animalPhotos.animalId, ids)).all());
  for (const animal of list) {
    result.set(animal.id, checkAnimal(animal, (traits.get(animal.id) ?? []).map((t) => t.trait), translations.get(animal.id) ?? [], photos.get(animal.id)?.length ?? 0));
  }
  return result;
}

export const countByLevel = (issues: Issue[]) => ({
  errors: issues.filter((i) => i.level === 'error').length,
  warnings: issues.filter((i) => i.level === 'warning').length,
});
