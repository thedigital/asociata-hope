import { SCRATCH } from './helpers/scratch.ts';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { asc, eq } from 'drizzle-orm';
import sharp from 'sharp';
import { db, schema } from '../src/db/client.ts';
import { LOCALES } from '../src/i18n/config.ts';
import { addPhotos, deleteAnimal, deletePhoto, getAnimalForEdit, moveAnimal, movePhoto, parseAnimalForm, saveAnimal, setVideo, slugify } from '../src/lib/admin-animals.ts';
import { IMAGE_WIDTHS } from '../src/lib/media.ts';
import { buildAnimalSeo } from '../src/lib/seo.ts';

const { animals, animalPhotos, animalTraits, animalTranslations, redirects } = schema;
const UPLOADS = join(SCRATCH, 'uploads');

/** The animal form as a browser sends it: a list is a repeated field, a ticked box is present. */
function form(fields: Record<string, string | string[]> = {}): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries({ name: 'Rex', species: 'dog', adoptionType: 'real', status: 'published', ...fields })) {
    for (const item of [value].flat()) data.append(name, item);
  }
  return data;
}
const save = (id: number | null, fields: Record<string, string | string[]> = {}) => {
  const parsed = parseAnimalForm(form(fields));
  assert.deepEqual(parsed.errors, []);
  const result = saveAnimal(id, parsed);
  assert.ok('id' in result, JSON.stringify(result));
  return result.id;
};
const stored = (id: number) => getAnimalForEdit(id)!;
const seo = (id: number, locale: string) => stored(id).translations.find((t) => t.locale === locale)!;
const rules = () => Object.fromEntries(db.select().from(redirects).all().map((r) => [r.fromPath, r.toPath]));
const picture = async (width = 40, height = 30) => new File([await sharp({ create: { width, height, channels: 3, background: '#2a9d8f' } }).png().toBuffer()], 'photo.png', { type: 'image/png' });
const mp4 = (size = 32) => new File([Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom'), Buffer.alloc(size)])], 'film.mp4', { type: 'video/mp4' });
const files = (kind: string) => (existsSync(join(UPLOADS, kind)) ? readdirSync(join(UPLOADS, kind)) : []);

describe('slugify', () => {
  it('writes a name as a URL segment', () => {
    assert.equal(slugify('Țuțu și Mărțișor'), 'tutu-si-martisor');
    assert.equal(slugify('  Mr. Big  '), 'mr-big');
    assert.equal(slugify('Zoé & Léo'), 'zoe-leo');
  });
});

describe('parseAnimalForm', () => {
  it('reads the fields of the form', () => {
    const { data, traits, translations, errors } = parseAnimalForm(
      form({ name: '  Bruno ', sex: 'male', size: 'large', color: 'black', birthDate: '2020-03-01', birthDateEstimated: 'on', vaccinated: 'on', traits: ['playful', 'calm', 'playful'], description_fr: 'Ligne 1\r\nLigne 2', seoTitle_de: ' Bruno ' }),
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(data, {
      name: 'Bruno',
      slug: 'bruno',
      species: 'dog',
      adoptionType: 'real',
      status: 'published',
      sex: 'male',
      size: 'large',
      color: 'black',
      birthDate: '2020-03-01',
      birthDateEstimated: true,
      vaccinated: true,
      sterilized: false,
      dewormed: false,
      videoUrl: null,
    });
    assert.deepEqual(traits, ['playful', 'calm']);
    assert.deepEqual(translations.map((t) => t.locale), [...LOCALES]);
    assert.equal(translations.find((t) => t.locale === 'fr')!.description, 'Ligne 1\nLigne 2');
    assert.deepEqual(translations.find((t) => t.locale === 'de'), { locale: 'de', description: '', seoTitle: 'Bruno', seoDescription: null });
  });

  it('keeps the address typed by hand, even an odd one imported from Wix', () => {
    assert.equal(parseAnimalForm(form({ name: 'Marzipan', slug: '-marzipan' })).data.slug, '-marzipan');
    assert.deepEqual(parseAnimalForm(form({ slug: 'Rex 2' })).errors, ['slug']);
    assert.deepEqual(parseAnimalForm(form({ slug: 'a/b' })).errors, ['slug']);
  });

  it('refuses a missing or too long name', () => {
    assert.deepEqual(parseAnimalForm(form({ name: ' ' })).errors, ['name', 'slug']);
    assert.deepEqual(parseAnimalForm(form({ name: 'a'.repeat(81), slug: 'a' })).errors, ['name']);
  });

  it('never stores a value outside the taxonomy', () => {
    for (const field of ['species', 'adoptionType', 'status']) assert.deepEqual(parseAnimalForm(form({ [field]: 'dragon' })).errors, ['invalid'], field);
    const { data, traits, errors } = parseAnimalForm(form({ sex: 'unknown', size: 'giant', color: 'rainbow', traits: ['calm', 'invented'] }));
    assert.deepEqual(errors, []);
    assert.deepEqual([data.sex, data.size, data.color], [null, null, null]);
    assert.deepEqual(traits, ['calm']);
  });

  it('refuses a date that does not exist or lies in the future, and a video link that is not one', () => {
    for (const birthDate of ['01/03/2020', '2020-13-01', '2999-01-01']) assert.deepEqual(parseAnimalForm(form({ birthDate })).errors, ['birthDate'], birthDate);
    assert.deepEqual(parseAnimalForm(form({ videoUrl: 'javascript:alert(1)' })).errors, ['videoUrl']);
    assert.equal(parseAnimalForm(form({ videoUrl: 'https://youtu.be/abc' })).data.videoUrl, 'https://youtu.be/abc');
  });
});

describe('saveAnimal', () => {
  it('creates the animal with its traits and a text in every language', () => {
    const id = save(null, { name: 'Bruno', sex: 'male', traits: ['calm', 'playful'], description_ro: 'Bruno este un câine bun.' });
    const { animal, traits, translations, path } = stored(id);
    assert.deepEqual([animal.name, animal.slug, animal.sex, animal.status], ['Bruno', 'bruno', 'male', 'published']);
    assert.deepEqual(traits, ['calm', 'playful']);
    assert.deepEqual(translations.map((t) => t.locale).sort(), [...LOCALES].sort());
    assert.equal(seo(id, 'ro').description, 'Bruno este un câine bun.');
    assert.equal(path, '/adoptii-caini/bruno');
  });

  it('lists a new animal first in its collection', () => {
    const first = save(null, { name: 'Order one', species: 'cat' });
    const second = save(null, { name: 'Order two', species: 'cat' });
    const order = db.select({ id: animals.id }).from(animals).where(eq(animals.species, 'cat')).orderBy(asc(animals.sortOrder)).all().map((a) => a.id);
    assert.deepEqual(order, [second, first]);
  });

  it('refuses an address already taken in the same collection only', () => {
    save(null, { name: 'Luna' });
    assert.deepEqual(saveAnimal(null, parseAnimalForm(form({ name: 'Luna' }))), { error: 'slugTaken' });
    const cat = save(null, { name: 'Luna', species: 'cat' });
    // Saving an animal again is not a clash with itself.
    assert.equal(save(cat, { name: 'Luna', species: 'cat' }), cat);
    assert.deepEqual(saveAnimal(999_999, parseAnimalForm(form({ name: 'Nobody' }))), { error: 'invalid' });
  });

  it('writes the empty SEO fields from the characteristics, in every language', () => {
    const id = save(null, { name: 'Maya', sex: 'female', size: 'small', vaccinated: 'on', traits: ['calm'] });
    const facts = { name: 'Maya', species: 'dog', adoptionType: 'real', sex: 'female', size: 'small', color: null, vaccinated: true, sterilized: false, dewormed: false, traits: ['calm'] } as const;
    for (const locale of LOCALES) {
      const expected = buildAnimalSeo({ ...facts, traits: [...facts.traits] }, locale);
      assert.deepEqual([seo(id, locale).seoTitle, seo(id, locale).seoDescription], [expected.title, expected.description], locale);
    }
    assert.match(seo(id, 'fr').seoTitle!, /^Maya /);
  });

  it('rewrites a generated SEO field when the animal changes, and keeps one written by hand', () => {
    const id = save(null, { name: 'Toto', sex: 'male' });
    const generated = seo(id, 'fr');
    // The form sends back what it displayed: the generated description, and a title typed by hand.
    save(id, { name: 'Toto', sex: 'female', seoTitle_fr: 'Toto, le chien du refuge', seoDescription_fr: generated.seoDescription! });
    assert.equal(seo(id, 'fr').seoTitle, 'Toto, le chien du refuge');
    assert.notEqual(seo(id, 'fr').seoDescription, generated.seoDescription);
    assert.equal(seo(id, 'fr').seoDescription, buildAnimalSeo({ name: 'Toto', species: 'dog', adoptionType: 'real', sex: 'female', size: null, color: null, vaccinated: false, sterilized: false, dewormed: false, traits: [] }, 'fr').description);
    // Emptied by hand: generated again.
    save(id, { name: 'Toto', sex: 'female' });
    assert.match(seo(id, 'fr').seoTitle!, /^Toto .*\| Hope$/);
  });

  it('replaces the traits and the texts at each save', () => {
    const id = save(null, { name: 'Pixel', traits: ['calm', 'playful'], description_en: 'A good dog.' });
    save(id, { name: 'Pixel', traits: ['playful'] });
    assert.deepEqual(stored(id).traits, ['playful']);
    assert.equal(seo(id, 'en').description, '');
    assert.equal(db.select().from(animalTranslations).where(eq(animalTranslations.animalId, id)).all().length, LOCALES.length);
  });
});

describe('change of address', () => {
  it('redirects the old URL in every language', () => {
    const id = save(null, { name: 'Bobi' });
    assert.equal(rules()['/adoptii-caini/bobi'], undefined, 'a save that keeps the address creates no rule');
    save(id, { name: 'Bobi', slug: 'bobita' });
    const all = rules();
    assert.equal(all['/adoptii-caini/bobi'], '/adoptii-caini/bobita');
    for (const locale of ['en', 'fr', 'de']) assert.equal(all[`/${locale}/adoptii-caini/bobi`], `/${locale}/adoptii-caini/bobita`, locale);
    assert.ok(db.select().from(redirects).where(eq(redirects.fromPath, '/adoptii-caini/bobi')).all().every((r) => r.status === 301));
  });

  it('follows a second change in one hop, and a move to another list', () => {
    const id = save(null, { name: 'Nero' });
    save(id, { name: 'Nero', slug: 'nero-2' });
    save(id, { name: 'Nero', slug: 'nero-3', adoptionType: 'virtual' });
    const all = rules();
    assert.equal(all['/adoptii-caini/nero'], '/adoptii-virtuale-caini/nero-3');
    assert.equal(all['/adoptii-caini/nero-2'], '/adoptii-virtuale-caini/nero-3');
    assert.equal(all['/fr/adoptii-caini/nero'], '/fr/adoptii-virtuale-caini/nero-3');
    assert.equal(stored(id).path, '/adoptii-virtuale-caini/nero-3');
  });

  it('never leaves a rule on the current URL, so going back makes no loop', () => {
    const id = save(null, { name: 'Dana' });
    save(id, { name: 'Dana', slug: 'dana-2' });
    save(id, { name: 'Dana', slug: 'dana' });
    const all = rules();
    assert.equal(all['/adoptii-caini/dana'], undefined);
    assert.equal(all['/de/adoptii-caini/dana'], undefined);
    assert.equal(all['/adoptii-caini/dana-2'], '/adoptii-caini/dana');
  });
});

describe('photos', () => {
  const order = (id: number) => stored(id).photos.map((p) => p.id);

  it('stores real pictures re-encoded as JPEG and counts what it refused', async () => {
    const id = save(null, { name: 'Photo one' });
    const notAnImage = new File(['<?php echo 1;'], 'photo.jpg', { type: 'image/jpeg' });
    const rejected = await addPhotos(id, [await picture(), notAnImage, new File([], 'empty.jpg'), await picture(60, 80)]);
    assert.equal(rejected, 1);
    const { photos } = stored(id);
    assert.deepEqual(photos.map((p) => [p.width, p.height, p.sortOrder]), [[40, 30, 0], [60, 80, 1]]);
    for (const photo of photos) {
      assert.match(photo.file, /^[0-9a-f]{24}\.jpg$/);
      assert.equal((await sharp(join(UPLOADS, 'animals', photo.file)).metadata()).format, 'jpeg');
    }
    // Pictures added later come after those already there.
    await addPhotos(id, [await picture()]);
    assert.deepEqual(stored(id).photos.map((p) => p.sortOrder), [0, 1, 2]);
  });

  it('reduces a very large picture', async () => {
    const id = save(null, { name: 'Photo large' });
    await addPhotos(id, [await picture(3000, 1500)]);
    assert.deepEqual([stored(id).photos[0].width, stored(id).photos[0].height], [2400, 1200]);
  });

  it('moves a picture: main, left, right', async () => {
    const id = save(null, { name: 'Photo two' });
    await addPhotos(id, [await picture(), await picture(), await picture()]);
    const [a, b, c] = order(id);
    movePhoto(id, c, 'main');
    assert.deepEqual(order(id), [c, a, b]);
    movePhoto(id, c, 'left');
    assert.deepEqual(order(id), [c, a, b], 'the first picture cannot go further left');
    movePhoto(id, c, 'right');
    assert.deepEqual(order(id), [a, c, b]);
    movePhoto(id, b, 'right');
    assert.deepEqual(order(id), [a, c, b], 'the last picture cannot go further right');
    movePhoto(id, b, 'left');
    assert.deepEqual(order(id), [a, b, c]);
    assert.deepEqual(stored(id).photos.map((p) => p.sortOrder), [0, 1, 2]);
  });

  it('deletes a picture with its file and its resized copies, never the picture of another animal', async () => {
    const id = save(null, { name: 'Photo three' });
    const other = save(null, { name: 'Photo four' });
    await addPhotos(id, [await picture(), await picture(), await picture()]);
    await addPhotos(other, [await picture()]);
    const [first, second, third] = stored(id).photos;
    const cached = join(SCRATCH, 'cache', 'animals', String(IMAGE_WIDTHS[0]));
    mkdirSync(cached, { recursive: true });
    writeFileSync(join(cached, `${second.file}.webp`), 'resized');

    await deletePhoto(id, second.id);
    assert.deepEqual(order(id), [first.id, third.id]);
    assert.deepEqual(stored(id).photos.map((p) => p.sortOrder), [0, 1]);
    assert.equal(existsSync(join(UPLOADS, 'animals', second.file)), false);
    assert.equal(existsSync(join(cached, `${second.file}.webp`)), false);
    assert.ok(existsSync(join(UPLOADS, 'animals', first.file)));

    await deletePhoto(id, stored(other).photos[0].id);
    movePhoto(id, stored(other).photos[0].id, 'main');
    assert.equal(stored(other).photos.length, 1);
    assert.deepEqual(order(id), [first.id, third.id]);
  });
});

describe('video', () => {
  const videoOf = (id: number) => stored(id).animal.videoFile;

  it('stores an MP4, replaces it, removes it', async () => {
    const id = save(null, { name: 'Video one' });
    assert.equal(await setVideo(id, mp4(), false), true);
    const first = videoOf(id)!;
    assert.match(first, /^[0-9a-f]{24}\.mp4$/);
    assert.ok(files('videos').includes(first));

    assert.equal(await setVideo(id, null, false), true);
    assert.equal(await setVideo(id, new File([], 'empty.mp4'), false), true);
    assert.equal(videoOf(id), first, 'a save without a new file keeps the video');

    assert.equal(await setVideo(id, mp4(), false), true);
    const second = videoOf(id)!;
    assert.notEqual(second, first);
    assert.equal(files('videos').includes(first), false, 'the replaced file is deleted');

    assert.equal(await setVideo(id, null, true), true);
    assert.equal(videoOf(id), null);
    assert.equal(files('videos').includes(second), false);
  });

  it('refuses what is not an MP4 and keeps the current video', async () => {
    const id = save(null, { name: 'Video two' });
    await setVideo(id, mp4(), false);
    const current = videoOf(id)!;
    assert.equal(await setVideo(id, new File(['GIF89a not a film at all'], 'film.mp4', { type: 'video/mp4' }), false), false);
    assert.equal(videoOf(id), current);
    assert.ok(files('videos').includes(current));
  });

  it('refuses a video above 80 MB', async () => {
    const id = save(null, { name: 'Video three' });
    assert.equal(await setVideo(id, mp4(80 * 1024 * 1024), false), false);
    assert.equal(videoOf(id), null);
  });

  it('keeps the uploaded video when the form is saved again', async () => {
    const id = save(null, { name: 'Video four' });
    await setVideo(id, mp4(), false);
    const current = videoOf(id);
    save(id, { name: 'Video four', sex: 'male' });
    assert.equal(videoOf(id), current);
  });
});

describe('order and deletion', () => {
  it('moves an animal inside its own collection', () => {
    const collection = { species: 'cat', adoptionType: 'virtual' };
    const [c, b, a] = ['Sort c', 'Sort b', 'Sort a'].map((name) => save(null, { name, ...collection }));
    const outsider = save(null, { name: 'Sort outsider', species: 'dog', adoptionType: 'virtual' });
    const order = () => db.select({ id: animals.id }).from(animals).where(eq(animals.species, 'cat')).orderBy(asc(animals.sortOrder)).all().map((r) => r.id).filter((id) => [a, b, c].includes(id));
    assert.deepEqual(order(), [a, b, c]);
    moveAnimal(c, 'up');
    assert.deepEqual(order(), [a, c, b]);
    moveAnimal(a, 'up');
    assert.deepEqual(order(), [a, c, b], 'the first one stays first');
    moveAnimal(a, 'down');
    assert.deepEqual(order(), [c, a, b]);
    moveAnimal(b, 'down');
    assert.deepEqual(order(), [c, a, b], 'the last one stays last');
    moveAnimal(999_999, 'up');
    assert.equal(stored(outsider).animal.species, 'dog');
  });

  it('deletes the animal with its traits, texts, pictures and video', async () => {
    const id = save(null, { name: 'Gone', traits: ['calm'], description_ro: 'Text' });
    await addPhotos(id, [await picture(), await picture()]);
    await setVideo(id, mp4(), false);
    const { photos, animal } = stored(id);

    await deleteAnimal(id);
    assert.equal(getAnimalForEdit(id), null);
    for (const table of [animalTraits, animalTranslations, animalPhotos]) assert.equal(db.select().from(table).where(eq(table.animalId, id)).all().length, 0);
    for (const photo of photos) assert.equal(existsSync(join(UPLOADS, 'animals', photo.file)), false);
    assert.equal(files('videos').includes(animal.videoFile!), false);
    // Deleting twice, or an unknown animal, changes nothing.
    await deleteAnimal(id);
  });
});
