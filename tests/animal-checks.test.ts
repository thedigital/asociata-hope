import './helpers/scratch.ts';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { eq } from 'drizzle-orm';
import { db, schema } from '../src/db/client.ts';
import { ENABLED_LOCALES, type Locale } from '../src/i18n/config.ts';
import { checkAnimal, checkAnimals, countByLevel, type Issue } from '../src/lib/animal-checks.ts';

const { animals, animalPhotos, animalTraits, animalTranslations } = schema;
type Animal = typeof animals.$inferSelect;
type Text = { locale: Locale; description: string; seoTitle: string | null; seoDescription: string | null };

let serial = 0;
/** A complete record: every check passes until a test removes something. */
const animal = (fields: Partial<typeof animals.$inferInsert> = {}): Animal =>
  db
    .insert(animals)
    .values({ species: 'dog', adoptionType: 'real', slug: `check-${++serial}`, name: 'Rex', status: 'published', sex: 'male', size: 'medium', birthDate: '2021-05-01', ...fields })
    .returning()
    .get();
const DESCRIPTIONS: Record<Locale, string> = {
  ro: 'Rex este un câine blând care își caută o familie.',
  en: 'Rex is a gentle dog looking for a family.',
  fr: 'Rex est un chien doux qui cherche une famille.',
  de: 'Rex ist ein sanfter Hund, der eine Familie sucht.',
};
const texts = (changes: Partial<Record<Locale, Partial<Text>>> = {}): Text[] =>
  ENABLED_LOCALES.map((locale) => ({ locale, description: DESCRIPTIONS[locale], seoTitle: 'Rex | Hope', seoDescription: 'Rex, un câine.', ...changes[locale] }));
const codes = (issues: Issue[]) => issues.map((issue) => issue.code);
const find = (issues: Issue[], code: string) => issues.find((issue) => issue.code === code);

describe('checkAnimal', () => {
  it('finds nothing wrong with a complete record', () => {
    assert.deepEqual(checkAnimal(animal(), ['calm'], texts(), 1), []);
  });

  it('asks for a photo, the sex, the date of birth, traits', () => {
    assert.deepEqual(codes(checkAnimal(animal({ sex: null, birthDate: null }), [], texts(), 0)), ['noPhoto', 'noSex', 'noBirthDate', 'noTraits']);
  });

  it('asks for the size of a dog and for the colour of a cat', () => {
    assert.deepEqual(codes(checkAnimal(animal({ size: null }), ['calm'], texts(), 1)), ['noSize']);
    assert.deepEqual(codes(checkAnimal(animal({ species: 'cat', size: null }), ['calm'], texts(), 1)), ['noColor']);
    assert.deepEqual(checkAnimal(animal({ species: 'cat', size: null, color: 'black' }), ['calm'], texts(), 1), []);
  });

  it('only warns about an estimated date of birth', () => {
    const issues = checkAnimal(animal({ birthDateEstimated: true }), ['calm'], texts(), 1);
    assert.deepEqual(issues, [{ code: 'birthDateEstimated', level: 'warning', locales: undefined }]);
    assert.deepEqual(countByLevel(issues), { errors: 0, warnings: 1 });
  });

  it('takes a placeholder for a missing description', () => {
    const issues = checkAnimal(animal(), ['calm'], texts({ ro: { description: 'n/c' } }), 1);
    assert.deepEqual(codes(issues), ['noDescription']);
  });

  it('names the languages without a translation', () => {
    const issues = checkAnimal(animal(), ['calm'], texts({ fr: { description: '' }, de: { description: ' - ' } }), 1);
    assert.deepEqual(codes(issues), ['missingTranslation']);
    assert.deepEqual(issues[0].locales, ['fr', 'de']);
  });

  it('sees a translation that is the Romanian text copied', () => {
    const issues = checkAnimal(animal(), ['calm'], texts({ en: { description: `  ${DESCRIPTIONS.ro.toUpperCase()} ` } }), 1);
    assert.deepEqual(codes(issues), ['untranslated']);
    assert.deepEqual(issues[0].locales, ['en']);
  });

  it('sees a translation that lost the name of the animal', () => {
    const translated = texts({ en: { description: 'King is a gentle dog looking for a family.' } });
    assert.deepEqual(find(checkAnimal(animal(), ['calm'], translated, 1), 'nameMissing')?.locales, ['en']);
    // Two animals on one record: both names are expected.
    const pair = animal({ name: 'Rex si Luna' });
    const both = texts({ ro: { description: 'Rex si Luna sunt doi câini nedespărțiți.' }, fr: { description: 'Rex et Luna sont deux chiens inséparables.' }, en: { description: 'Rex and his sister are inseparable dogs.' }, de: { description: 'Rex und Luna sind unzertrennliche Hunde.' } });
    assert.deepEqual(find(checkAnimal(pair, ['calm'], both, 1), 'nameMissing')?.locales, ['en']);
    // When the Romanian text does not name the animal, the translations need not either.
    const unnamed = texts({ ro: { description: 'Un câine blând care își caută o familie.' }, en: { description: 'A gentle dog looking for a family.' } });
    assert.equal(find(checkAnimal(animal(), ['calm'], unnamed, 1), 'nameMissing'), undefined);
  });

  it('asks for the SEO fields and warns when they are too long', () => {
    const issues = checkAnimal(animal(), ['calm'], texts({ fr: { seoTitle: null }, de: { seoDescription: ' ' }, en: { seoTitle: 'a'.repeat(66) }, ro: { seoDescription: 'a'.repeat(201) } }), 1);
    assert.deepEqual(find(issues, 'missingSeo'), { code: 'missingSeo', level: 'error', locales: ['fr', 'de'] });
    assert.deepEqual(find(issues, 'seoTooLong'), { code: 'seoTooLong', level: 'warning', locales: ['ro', 'en'] });
    assert.equal(find(checkAnimal(animal(), ['calm'], texts({ en: { seoTitle: 'a'.repeat(65) }, ro: { seoDescription: 'a'.repeat(200) } }), 1), 'seoTooLong'), undefined);
  });

  it('only asks for a photo once the animal has no public page', () => {
    for (const status of ['deceased', 'adopted'] as const) {
      assert.deepEqual(codes(checkAnimal(animal({ status, sex: null, birthDate: null }), [], [], 0)), ['noPhoto'], status);
      assert.deepEqual(checkAnimal(animal({ status, sex: null }), [], [], 1), [], status);
    }
    assert.ok(checkAnimal(animal({ status: 'draft', sex: null }), ['calm'], texts(), 1).length > 0, 'a draft is checked like a published animal');
  });
});

describe('checkAnimals', () => {
  it('gives the same result for a list as for each animal', () => {
    const complete = animal();
    const bare = animal({ sex: null });
    db.insert(animalTraits).values({ animalId: complete.id, trait: 'calm', position: 0 }).run();
    db.insert(animalPhotos).values({ animalId: complete.id, file: 'a.jpg', width: 10, height: 10, sortOrder: 0 }).run();
    db.insert(animalTranslations).values(texts().map((t) => ({ animalId: complete.id, ...t }))).run();

    const issues = checkAnimals([complete, bare]);
    assert.deepEqual(issues.get(complete.id), []);
    assert.deepEqual(issues.get(bare.id), checkAnimal(bare, [], [], 0));
    assert.ok(codes(issues.get(bare.id)!).includes('noSex'));
    assert.equal(checkAnimals([]).size, 0);
    db.delete(animals).where(eq(animals.id, complete.id)).run();
  });
});
