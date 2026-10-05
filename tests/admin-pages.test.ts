import './helpers/scratch.ts';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cleanBody, getPageForEdit, hasStoredBody, isContentPage, listPagesForAdmin, parsePageForm, savePage, structureDifferences } from '../src/lib/admin-pages.ts';
import { LOCALES } from '../src/i18n/config.ts';
import { CONTENT_PAGES } from '../src/lib/site.ts';

function form(fields: Record<string, string> = {}): FormData {
  const data = new FormData();
  for (const locale of LOCALES) data.set(`body_${locale}`, `<h2>Title</h2>\n<p>Text ${locale}</p>`);
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

describe('cleanBody', () => {
  it('keeps the markup of a content page', () => {
    const body = '<h2 class="x">Titlu</h2>\n<p>Un <strong>text</strong> cu <a href="/contact" target="_blank" rel="noopener">link</a> și <a href="mailto:a@b.org">e-mail</a>.</p>\n<ul><li>unu</li></ul>\n<div class="figure"><img src="/media/pages/800/a.jpg" alt="Câine" width="800" height="600"></div>';
    assert.equal(cleanBody(body), body);
  });

  it('removes scripts, embedded documents, handlers, style attributes and script links', () => {
    assert.equal(cleanBody('<p>a</p><script>alert(1)</script><p>b</p>'), '<p>a</p><p>b</p>');
    assert.equal(cleanBody('<p>a</p><SCRIPT src="//evil.example/x.js"></SCRIPT >'), '<p>a</p>');
    assert.equal(cleanBody('<p>a</p><script>never closed'), '<p>a</p>');
    assert.equal(cleanBody('<style>p{color:red}</style><p>a</p>'), '<p>a</p>');
    assert.equal(cleanBody('<iframe src="https://evil.example"></iframe><p>a</p><object data="x"></object>'), '<p>a</p>');
    assert.equal(cleanBody('<form action="https://evil.example"><p>a</p></form><base href="//evil.example"><meta http-equiv="refresh" content="0">'), '<p>a</p>');
    assert.equal(cleanBody('<p onclick="x()" style="color:red" class="lead">a</p>'), '<p class="lead">a</p>');
    assert.equal(cleanBody("<img src=x onerror=alert(1) alt='a'>"), "<img src=x alt='a'>");
    assert.equal(cleanBody('<a href="javascript:alert(1)">x</a>'), '<a href="#">x</a>');
    assert.equal(cleanBody('<a href=" JavaScript:alert(1)">x</a>'), '<a href="#">x</a>');
  });

  it('normalises line breaks and trims', () => {
    assert.equal(cleanBody('  <p>a</p>\r\n<p>b</p>\r\n'), '<p>a</p>\n<p>b</p>');
  });
});

describe('parsePageForm', () => {
  it('reads the four languages; an empty SEO field means the automatic value', () => {
    const { translations, errors } = parsePageForm(form({ seoTitle_fr: '  Devenir   bénévole | Hope ', seoDescription_de: 'Zeile eins\nZeile zwei' }), 'voluntariat');
    assert.deepEqual(errors, []);
    assert.deepEqual(translations.map((t) => t.locale), [...LOCALES]);
    assert.deepEqual(translations.find((t) => t.locale === 'fr'), { locale: 'fr', body: '<h2>Title</h2>\n<p>Text fr</p>', seoTitle: 'Devenir bénévole | Hope', seoDescription: null });
    assert.equal(translations.find((t) => t.locale === 'de')!.seoDescription, 'Zeile eins Zeile zwei');
    assert.equal(translations.find((t) => t.locale === 'ro')!.seoTitle, null);
  });

  it('requires the text in every language, cleaned', () => {
    assert.deepEqual(parsePageForm(form({ body_en: '  ' }), 'voluntariat').errors, ['body']);
    assert.deepEqual(parsePageForm(form({ body_en: '<script>x</script>' }), 'voluntariat').errors, ['body']);
    assert.equal(parsePageForm(form({ body_en: '<p onclick="x">a</p>' }), 'voluntariat').translations[1].body, '<p>a</p>');
  });

  it('refuses fields longer than their limit', () => {
    assert.deepEqual(parsePageForm(form({ seoTitle_ro: 'a'.repeat(120) }), 'voluntariat').errors, []);
    assert.deepEqual(parsePageForm(form({ seoTitle_ro: 'a'.repeat(121) }), 'voluntariat').errors, ['tooLong']);
    assert.deepEqual(parsePageForm(form({ seoDescription_ro: 'a'.repeat(301) }), 'voluntariat').errors, ['tooLong']);
  });

  it('ignores the text of a page built by the site', () => {
    assert.deepEqual(CONTENT_PAGES.filter((slug) => !hasStoredBody(slug)), ['in-memoriam', 'redirectioneaza', 'doneaza']);
    const { translations, errors } = parsePageForm(form({ body_ro: '' }), 'doneaza');
    assert.deepEqual(errors, []);
    assert.deepEqual(translations.map((t) => t.body), ['', '', '', '']);
  });

  it('knows the content pages only', () => {
    assert.ok(isContentPage('despre-noi'));
    for (const slug of ['', 'contact', 'adoptii-caini', 'shop', '../despre-noi', 'Despre-Noi']) assert.equal(isContentPage(slug), false, slug);
  });
});

describe('savePage', () => {
  const body = (slug: Parameters<typeof getPageForEdit>[0], locale: string) => getPageForEdit(slug).translations.find((t) => t.locale === locale);

  it('creates the page, then replaces its texts and SEO fields', () => {
    assert.deepEqual(getPageForEdit('voluntariat'), { updatedAt: null, translations: [] });
    savePage('voluntariat', parsePageForm(form({ seoTitle_fr: 'Titre' }), 'voluntariat').translations);
    assert.equal(getPageForEdit('voluntariat').translations.length, 4);
    assert.equal(body('voluntariat', 'fr')!.seoTitle, 'Titre');
    assert.ok(getPageForEdit('voluntariat').updatedAt instanceof Date);

    savePage('voluntariat', parsePageForm(form({ body_fr: '<p>Nouveau</p>', seoDescription_fr: 'Description' }), 'voluntariat').translations);
    assert.equal(getPageForEdit('voluntariat').translations.length, 4);
    assert.deepEqual([body('voluntariat', 'fr')!.body, body('voluntariat', 'fr')!.seoTitle, body('voluntariat', 'fr')!.seoDescription], ['<p>Nouveau</p>', null, 'Description']);
    assert.equal(body('voluntariat', 'ro')!.body, '<h2>Title</h2>\n<p>Text ro</p>');
  });

  it('never touches the stored text of a page built by the site', () => {
    savePage('in-memoriam', LOCALES.map((locale) => ({ locale, body: '', seoTitle: null, seoDescription: null })));
    assert.equal(body('in-memoriam', 'ro')!.body, '');
    // As after an import: a stored body exists, the admin only changes the SEO fields.
    savePage('voluntariat', parsePageForm(form(), 'voluntariat').translations);
    const before = body('voluntariat', 'en')!.body;
    savePage('doneaza', parsePageForm(form({ seoTitle_en: 'Donate | Hope' }), 'doneaza').translations);
    assert.equal(body('doneaza', 'en')!.seoTitle, 'Donate | Hope');
    assert.equal(body('voluntariat', 'en')!.body, before);
  });
});

describe('structureDifferences', () => {
  const texts = (bodies: Partial<Record<(typeof LOCALES)[number], string>>) => LOCALES.filter((locale) => locale in bodies).map((locale) => ({ locale, body: bodies[locale]! }));
  const same = '<h2>a</h2><p>b</p><h3>c</h3><img src="/x.jpg">';

  it('reports nothing when every language has the headings and images of the Romanian text', () => {
    assert.deepEqual(structureDifferences('voluntariat', texts({ ro: same, en: same.replace('b', 'other words'), fr: same, de: same })), []);
  });

  it('names the languages with other headings, another number of images, or no text', () => {
    assert.deepEqual(structureDifferences('voluntariat', texts({ ro: same, en: '<h2>a</h2><p>b</p>', fr: same.replace('<img src="/x.jpg">', ''), de: same })), ['en', 'fr']);
    assert.deepEqual(structureDifferences('voluntariat', texts({ ro: same, en: same })), ['fr', 'de']);
  });

  it('does not compare the pages built by the site', () => {
    assert.deepEqual(structureDifferences('doneaza', texts({ ro: same })), []);
  });

  it('is what the list of the admin shows', () => {
    const rows = listPagesForAdmin();
    assert.deepEqual(rows.map((row) => row.slug), [...CONTENT_PAGES]);
    assert.deepEqual(rows.find((row) => row.slug === 'voluntariat')!.differences, []);
    // Never saved: no text in any language.
    assert.deepEqual(rows.find((row) => row.slug === 'despre-noi')!.differences, [...LOCALES]);
    assert.equal(rows.find((row) => row.slug === 'despre-noi')!.updatedAt, null);
  });
});
