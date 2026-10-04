/** Public site languages. Romanian is served at the root, the others under /{code}. */
export const LOCALES = ['ro', 'en', 'fr', 'de'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ro';

/**
 * Languages actually served. German stays off until its content is translated: an enabled
 * language is linked from every page (hreflang, sitemap, language switcher).
 */
export const ENABLED_LOCALES: readonly Locale[] = ['ro', 'en', 'fr'];
/** Served to visitors whose browser language is not one of the enabled ones. */
export const FALLBACK_LOCALE: Locale = 'en';
export const LOCALE_NAMES: Record<Locale, string> = { ro: 'Română', en: 'English', fr: 'Français', de: 'Deutsch' };

/** hreflang values carried over from the Wix site (ro-ro, en-us, fr-fr), plus German. */
export const HREFLANG: Record<Locale, string> = { ro: 'ro-ro', en: 'en-us', fr: 'fr-fr', de: 'de-de' };

/** Languages offered for the admin interface. */
export const ADMIN_LOCALES = ['ro', 'fr'] as const;
export type AdminLocale = (typeof ADMIN_LOCALES)[number];

export const isLocale = (value: string): value is Locale => (LOCALES as readonly string[]).includes(value);

/** `/fr/adoptii-caini/lizzie` → `{ locale: 'fr', path: '/adoptii-caini/lizzie' }` */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const [, first = '', ...rest] = pathname.replace(/\/+$/, '').split('/');
  if (first !== DEFAULT_LOCALE && isLocale(first)) return { locale: first, path: '/' + rest.join('/') };
  return { locale: DEFAULT_LOCALE, path: pathname.replace(/\/+$/, '') || '/' };
}

/** Slugs are identical in every language: only the prefix changes. */
export function localizePath(path: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return path;
  return `/${locale}${path === '/' ? '' : path}`;
}

/**
 * Best enabled language for an `Accept-Language` header, by descending q-value.
 * Returns null when the header is absent (search engine crawlers send none) and
 * FALLBACK_LOCALE when it names only languages the site does not serve.
 */
export function preferredLocale(acceptLanguage: string | null): Locale | null {
  if (!acceptLanguage?.trim()) return null;
  const wanted = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = Number(params.find((p) => p.trim().startsWith('q='))?.split('=')[1] ?? 1);
      return { code: tag.slice(0, 2).toLowerCase(), q: Number.isNaN(q) ? 0 : q };
    })
    .filter((entry) => entry.q > 0)
    .sort((a, b) => b.q - a.q);
  return wanted.map((entry) => entry.code).find((code): code is Locale => ENABLED_LOCALES.includes(code as Locale)) ?? FALLBACK_LOCALE;
}
