import './helpers/scratch.ts';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { eq } from 'drizzle-orm';
import { db, schema } from '../src/db/client.ts';
import { getPageForEdit, isContentPage, listPagesForAdmin, parsePageForm, savePage } from '../src/lib/admin-pages.ts';
import { LOCALES } from '../src/i18n/config.ts';
import { CONTENT_PAGES } from '../src/lib/site.ts';

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

  it('knows the content pages only', () => {
    assert.ok(isContentPage('despre-noi'));
    for (const slug of ['', 'contact', 'adoptii-caini', 'shop', '../despre-noi', 'Despre-Noi']) assert.equal(isContentPage(slug), false, slug);
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
    assert.deepEqual(rows.map((row) => row.slug), [...CONTENT_PAGES]);
    assert.deepEqual(rows.find((row) => row.slug === 'voluntariat')!.written, ['fr']);
    assert.deepEqual(rows.find((row) => row.slug === 'despre-noi')!.written, ['en']);
    // Never saved: every language keeps the automatic values.
    assert.deepEqual(rows.find((row) => row.slug === 'doneaza')!.written, []);
    assert.equal(rows.find((row) => row.slug === 'doneaza')!.updatedAt, null);
  });
});
