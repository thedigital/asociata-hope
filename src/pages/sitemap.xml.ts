import type { APIRoute } from 'astro';
import { DEFAULT_LOCALE, ENABLED_LOCALES, HREFLANG, localizePath } from '../i18n/config.ts';
import { COLLECTIONS, listAnimalPaths } from '../lib/animals.ts';
import { CONTENT_PAGES } from '../lib/site.ts';

/** Pages reached only after a payment: kept out of the sitemap. */
const EXCLUDED = new Set(['donation-thank-you-page', 'confirmare-plata']);

export const GET: APIRoute = ({ site }) => {
  const origin = site!.origin;
  const absolute = (path: string, locale: (typeof ENABLED_LOCALES)[number]) => origin + localizePath(path, locale).replace(/^\/$/, '');
  const entries: { path: string; lastmod?: string }[] = [
    { path: '/' },
    { path: '/contact' },
    ...COLLECTIONS.map((c) => ({ path: `/${c.path}` })),
    ...CONTENT_PAGES.filter((slug) => !EXCLUDED.has(slug)).map((slug) => ({ path: `/${slug}` })),
    ...listAnimalPaths().map((a) => ({ path: a.path, lastmod: a.updatedAt.toISOString().slice(0, 10) })),
  ];

  // One <url> per language, each listing all its alternates.
  const urls = entries.flatMap(({ path, lastmod }) =>
    ENABLED_LOCALES.map(
      (locale) => `<url><loc>${absolute(path, locale)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}` +
        `<xhtml:link rel="alternate" hreflang="x-default" href="${absolute(path, DEFAULT_LOCALE)}"/>` +
        ENABLED_LOCALES.map((l) => `<xhtml:link rel="alternate" hreflang="${HREFLANG[l]}" href="${absolute(path, l)}"/>`).join('') +
        '</url>',
    ),
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
};
