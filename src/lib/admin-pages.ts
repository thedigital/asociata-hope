import { eq } from 'drizzle-orm';
import { db, schema } from '../db/client.ts';
import { LOCALES, type Locale } from '../i18n/config.ts';
import { CONTENT_PAGES, type ContentPage } from './site.ts';

const { pages, pageTranslations } = schema;

export type PageSeoInput = { locale: Locale; seoTitle: string | null; seoDescription: string | null };
/** Validation problems, as keys of the admin dictionary (`pages.errors`). */
export type PageFormError = 'tooLong';

export const SEO_TITLE_MAX = 120;
export const SEO_DESCRIPTION_MAX = 300;

export const isContentPage = (slug: string): slug is ContentPage => (CONTENT_PAGES as readonly string[]).includes(slug);

/** Reads the form of a page: its SEO title and description in every language. The text of a page is not edited in the admin. */
export function parsePageForm(form: FormData): { translations: PageSeoInput[]; errors: PageFormError[] } {
  const text = (key: string) => String(form.get(key) ?? '').trim().replace(/\s+/g, ' ');
  const errors = new Set<PageFormError>();
  const translations = LOCALES.map((locale) => {
    const seoTitle = text(`seoTitle_${locale}`);
    const seoDescription = text(`seoDescription_${locale}`);
    if (seoTitle.length > SEO_TITLE_MAX || seoDescription.length > SEO_DESCRIPTION_MAX) errors.add('tooLong');
    return { locale, seoTitle: seoTitle || null, seoDescription: seoDescription || null };
  });
  return { translations, errors: [...errors] };
}

/** Stores the SEO fields of the four languages of a page. Its stored text is never touched. */
export function savePage(slug: ContentPage, translations: PageSeoInput[]): void {
  db.transaction((tx) => {
    const now = new Date();
    const pageId =
      tx.update(pages).set({ updatedAt: now }).where(eq(pages.slug, slug)).returning({ id: pages.id }).get()?.id ??
      tx.insert(pages).values({ slug, updatedAt: now }).returning({ id: pages.id }).get().id;
    for (const { locale, ...seo } of translations) {
      tx.insert(pageTranslations)
        .values({ pageId, locale, title: slug, ...seo })
        .onConflictDoUpdate({ target: [pageTranslations.pageId, pageTranslations.locale], set: seo })
        .run();
    }
  });
}

export function getPageForEdit(slug: ContentPage) {
  const page = db.select().from(pages).where(eq(pages.slug, slug)).get();
  const translations = page
    ? db
        .select({ locale: pageTranslations.locale, seoTitle: pageTranslations.seoTitle, seoDescription: pageTranslations.seoDescription })
        .from(pageTranslations)
        .where(eq(pageTranslations.pageId, page.id))
        .all()
    : [];
  return { updatedAt: page?.updatedAt ?? null, translations };
}

/** Every content page with what the list of the admin shows: the languages that have a SEO field written by hand. */
export function listPagesForAdmin() {
  const rows = db
    .select({ slug: pages.slug, updatedAt: pages.updatedAt, locale: pageTranslations.locale, seoTitle: pageTranslations.seoTitle, seoDescription: pageTranslations.seoDescription })
    .from(pageTranslations)
    .innerJoin(pages, eq(pages.id, pageTranslations.pageId))
    .all();
  return CONTENT_PAGES.map((slug) => {
    const translations = rows.filter((row) => row.slug === slug);
    const written = LOCALES.filter((locale) => translations.some((row) => row.locale === locale && (row.seoTitle || row.seoDescription)));
    return { slug, updatedAt: translations[0]?.updatedAt ?? null, written };
  });
}
