import './helpers/scratch.ts';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { eq } from 'drizzle-orm';
import { db, schema } from '../src/db/client.ts';
import { getPageForEdit, getPageSeo, isSeoPage, listPagesForAdmin, parsePageForm, savePage } from '../src/lib/admin-pages.ts';
import { LOCALES } from '../src/i18n/config.ts';
import { automaticPageSeo } from '../src/lib/seo.ts';
import { CONTENT_PAGES, SEO_PAGES } from '../src/lib/site.ts';

function form(fields: Record<string, string> = {}): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

describe('parsePageForm', () => {
  it('reads the four languages; an empty SEO field means the automatic value', () => {
    const { translations, errors } = parsePageForm(form({ seoTitle_fr: '  Devenir   bénévole | Hope ', seoDescription_de: 'Zeile eins\nZeile zwei' }));
    assert.deepEqual(errors, []);
    assert.deepEqual(translations.map((t) => t.locale), [...LOCALES]);
    assert.deepEqual(translations.find((t) => t.locale === 'fr'), { locale: 'fr', seoTitle: 'Devenir bénévole | Hope', seoDescription: null });
    assert.equal(translations.find((t) => t.locale === 'de')!.seoDescription, 'Zeile eins Zeile zwei');
    assert.equal(translations.find((t) => t.locale === 'ro')!.seoTitle, null);
  });

  it('refuses fields longer than their limit', () => {
    assert.deepEqual(parsePageForm(form({ seoTitle_ro: 'a'.repeat(120) })).errors, []);
    assert.deepEqual(parsePageForm(form({ seoTitle_ro: 'a'.repeat(121) })).errors, ['tooLong']);
    assert.deepEqual(parsePageForm(form({ seoDescription_ro: 'a'.repeat(301) })).errors, ['tooLong']);
  });

  it('knows every page with a fixed address: home, lists, campaigns, contact and content pages', () => {
    for (const slug of ['home', 'adoptii-caini', 'adoptii-virtuale-pisici', 'campanii', 'contact', ...CONTENT_PAGES]) assert.ok(isSeoPage(slug), slug);
    assert.equal(SEO_PAGES.length, 7 + CONTENT_PAGES.length);
    for (const slug of ['', '/', 'shop', 'admin', 'adoptii-caini/rex', '../despre-noi', 'Despre-Noi']) assert.equal(isSeoPage(slug), false, slug);
  });
});

describe('savePage', () => {
  const seo = (slug: Parameters<typeof getPageForEdit>[0], locale: string) => getPageForEdit(slug).translations.find((t) => t.locale === locale);

  it('creates the page, then replaces its SEO fields', () => {
    assert.deepEqual(getPageForEdit('voluntariat'), { updatedAt: null, translations: [] });
    savePage('voluntariat', parsePageForm(form({ seoTitle_fr: 'Titre' })).translations);
    assert.equal(getPageForEdit('voluntariat').translations.length, 4);
    assert.equal(seo('voluntariat', 'fr')!.seoTitle, 'Titre');
    assert.ok(getPageForEdit('voluntariat').updatedAt instanceof Date);

    savePage('voluntariat', parsePageForm(form({ seoDescription_fr: 'Description' })).translations);
    assert.equal(getPageForEdit('voluntariat').translations.length, 4);
    assert.deepEqual(seo('voluntariat', 'fr'), { locale: 'fr', seoTitle: null, seoDescription: 'Description' });
  });

  it('never touches the stored text of a page', () => {
    const { pages, pageTranslations } = schema;
    const pageId = db.insert(pages).values({ slug: 'despre-noi' }).returning({ id: pages.id }).get().id;
    db.insert(pageTranslations).values({ pageId, locale: 'en', title: 'despre-noi', body: '<p>About us</p>' }).run();
    savePage('despre-noi', parsePageForm(form({ seoTitle_en: 'About | Hope' })).translations);
    const english = db.select().from(pageTranslations).where(eq(pageTranslations.pageId, pageId)).all().find((row) => row.locale === 'en')!;
    assert.deepEqual([english.body, english.seoTitle], ['<p>About us</p>', 'About | Hope']);
  });

  it('gives the list of the admin the languages written by hand', () => {
    const rows = listPagesForAdmin();
    assert.deepEqual(rows.map((row) => row.slug), [...SEO_PAGES]);
    assert.equal(rows[0].slug, 'home');
    assert.deepEqual(rows.find((row) => row.slug === 'voluntariat')!.written, ['fr']);
    assert.deepEqual(rows.find((row) => row.slug === 'despre-noi')!.written, ['en']);
    // Never saved: every language keeps the automatic values.
    assert.deepEqual(rows.find((row) => row.slug === 'doneaza')!.written, []);
    assert.equal(rows.find((row) => row.slug === 'doneaza')!.updatedAt, null);
  });
});

describe('SEO of a page', () => {
  it('is written for one language at a time, the home page like any other', () => {
    assert.equal(getPageSeo('home', 'de'), null);
    savePage('home', parsePageForm(form({ seoTitle_de: 'Hunde und Katzen adoptieren | HOPE' })).translations);
    assert.deepEqual(getPageSeo('home', 'de'), { seoTitle: 'Hunde und Katzen adoptieren | HOPE', seoDescription: null });
    // The other languages keep the automatic values: nothing is borrowed from another language.
    for (const locale of ['ro', 'en', 'fr'] as const) assert.deepEqual(getPageSeo('home', locale), { seoTitle: null, seoDescription: null }, locale);
    savePage('adoptii-caini', parsePageForm(form({ seoDescription_ro: 'Caini pentru adoptie.' })).translations);
    assert.equal(getPageSeo('adoptii-caini', 'ro')!.seoDescription, 'Caini pentru adoptie.');
  });

  it('has automatic values built the same way in every language', () => {
    for (const locale of LOCALES) {
      const seen = new Set<string>();
      for (const page of SEO_PAGES) {
        const { title, description } = automaticPageSeo(page, locale);
        assert.ok(title && description, `${locale} ${page}`);
        if (page !== 'home') assert.match(title, / \| Hope$/, `${locale} ${page}`);
        seen.add(title);
      }
      assert.equal(seen.size, SEO_PAGES.length, `${locale}: a title is shared by two pages`);
    }
  });
});
