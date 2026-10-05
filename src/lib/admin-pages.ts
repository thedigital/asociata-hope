import { eq } from 'drizzle-orm';
import { db, schema } from '../db/client.ts';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '../i18n/config.ts';
import { bodyOutline } from './page-body.ts';
import { BUILT_PAGES, CONTENT_PAGES, type ContentPage } from './site.ts';

const { pages, pageTranslations } = schema;

export type PageTranslationInput = { locale: Locale; body: string; seoTitle: string | null; seoDescription: string | null };
/** Validation problems, as keys of the admin dictionary (`pages.errors`). */
export type PageFormError = 'body' | 'tooLong';

export const SEO_TITLE_MAX = 120;
export const SEO_DESCRIPTION_MAX = 300;
const BODY_MAX = 200_000;

export const isContentPage = (slug: string): slug is ContentPage => (CONTENT_PAGES as readonly string[]).includes(slug);
/** The text of these pages comes from the database; the others are built by the site and only have SEO fields. */
export const hasStoredBody = (slug: ContentPage) => !BUILT_PAGES.includes(slug);

/**
 * Removes from a body what a content page never holds: scripts, embedded documents, event handlers,
 * `style` attributes and `javascript:` links. The Content-Security-Policy would not run or apply
 * them anyway (src/middleware.ts); this keeps them out of the database too.
 */
export function cleanBody(html: string): string {
  return html
    .replace(/\r\n/g, '\n')
    .replace(/<(script|style|iframe|object|embed)\b[^]*?(<\/\1\s*>|$)/gi, '')
    .replace(/<\/?(script|style|iframe|object|embed|link|meta|base|form)\b[^>]*>/gi, '')
    .replace(/\s(on[a-z]+|style)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(\s(?:href|src)\s*=\s*["']?)\s*(?:javascript|vbscript):[^"'\s>]*/gi, '$1#')
    .trim();
}

/** Reads the form of a page: SEO fields in every language, and the text when the page has one. */
export function parsePageForm(form: FormData, slug: ContentPage): { translations: PageTranslationInput[]; errors: PageFormError[] } {
  const text = (key: string) => String(form.get(key) ?? '').trim();
  const errors = new Set<PageFormError>();
  const translations = LOCALES.map((locale) => {
    const body = hasStoredBody(slug) ? cleanBody(text(`body_${locale}`)) : '';
    const seoTitle = text(`seoTitle_${locale}`).replace(/\s+/g, ' ');
    const seoDescription = text(`seoDescription_${locale}`).replace(/\s+/g, ' ');
    if (hasStoredBody(slug) && !body) errors.add('body');
    if (body.length > BODY_MAX || seoTitle.length > SEO_TITLE_MAX || seoDescription.length > SEO_DESCRIPTION_MAX) errors.add('tooLong');
    return { locale, body, seoTitle: seoTitle || null, seoDescription: seoDescription || null };
  });
  return { translations, errors: [...errors] };
}

/** Stores the four languages of a page. The text of a page built by the site is left as it is. */
export function savePage(slug: ContentPage, translations: PageTranslationInput[]): void {
  db.transaction((tx) => {
    const now = new Date();
    const pageId =
      tx.update(pages).set({ updatedAt: now }).where(eq(pages.slug, slug)).returning({ id: pages.id }).get()?.id ??
      tx.insert(pages).values({ slug, updatedAt: now }).returning({ id: pages.id }).get().id;
    for (const { locale, body, seoTitle, seoDescription } of translations) {
      const seo = { seoTitle, seoDescription };
      tx.insert(pageTranslations)
        .values({ pageId, locale, title: slug, body, ...seo })
        .onConflictDoUpdate({ target: [pageTranslations.pageId, pageTranslations.locale], set: hasStoredBody(slug) ? { body, ...seo } : seo })
        .run();
    }
  });
}

export function getPageForEdit(slug: ContentPage) {
  const page = db.select().from(pages).where(eq(pages.slug, slug)).get();
  const translations = page ? db.select().from(pageTranslations).where(eq(pageTranslations.pageId, page.id)).all() : [];
  return { updatedAt: page?.updatedAt ?? null, translations };
}

/**
 * Languages whose text does not have the structure of the Romanian one (same sequence of headings,
 * same number of images) or is missing: the rule checked by `pnpm pages:check`, because a page must
 * look the same in every language.
 */
export function structureDifferences(slug: ContentPage, translations: { locale: Locale; body: string }[]): Locale[] {
  if (!hasStoredBody(slug)) return [];
  const body = (locale: Locale) => translations.find((t) => t.locale === locale)?.body ?? '';
  const reference = bodyOutline(body(DEFAULT_LOCALE));
  return LOCALES.filter((locale) => {
    const outline = bodyOutline(body(locale));
    return !body(locale) || outline.headings !== reference.headings || outline.images !== reference.images;
  });
}

/** Every content page with what the list of the admin shows. */
export function listPagesForAdmin() {
  const rows = db
    .select({ slug: pages.slug, updatedAt: pages.updatedAt, locale: pageTranslations.locale, body: pageTranslations.body })
    .from(pageTranslations)
    .innerJoin(pages, eq(pages.id, pageTranslations.pageId))
    .all();
  return CONTENT_PAGES.map((slug) => {
    const translations = rows.filter((row) => row.slug === slug);
    return { slug, updatedAt: translations[0]?.updatedAt ?? null, differences: structureDifferences(slug, translations) };
  });
}
