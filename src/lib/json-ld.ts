/**
 * Structured data (schema.org, JSON-LD) written in the head of public pages. Every block is built
 * in the language of the page; names of animals and the legal name of the association are never translated.
 */
import { DEFAULT_LOCALE, localizePath, type Locale } from '../i18n/config.ts';
import type { useUi } from '../i18n/ui.ts';
import { SITE } from './site.ts';

type Ui = ReturnType<typeof useUi>;
type JsonLd = Record<string, unknown>;
export type Crumb = { name: string; path: string };

const CONTEXT = 'https://schema.org';
/** Pages with a more precise schema.org type than WebPage. */
const PAGE_TYPES: Record<string, string> = { 'despre-noi': 'AboutPage', contact: 'ContactPage' };

/** Absolute URL of a path in a language; the home page has no trailing slash, as its canonical. */
const urlOf = (origin: string, path: string, locale: Locale) => origin + localizePath(path, locale).replace(/^\/$/, '');
// The association and the site are the same in every language: one identifier each, on the Romanian home page.
const organizationId = (origin: string) => `${origin}/#organization`;
const websiteId = (origin: string) => `${origin}/#website`;

/** The association, described in the language of the page. */
export function organizationLd(origin: string, locale: Locale, ui: Ui): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'AnimalShelter',
    '@id': organizationId(origin),
    name: SITE.legalName,
    alternateName: [...new Set([SITE.name, ui.homePage.h1])],
    description: ui.homePage.lead,
    url: urlOf(origin, '/', locale),
    logo: `${origin}/logo.webp`,
    image: `${origin}/logo.webp`,
    email: SITE.email,
    foundingDate: String(SITE.foundedYear),
    taxID: SITE.fiscalCode,
    address: { '@type': 'PostalAddress', addressCountry: 'RO', addressLocality: 'București' },
    sameAs: Object.values(SITE.social),
  };
}

/** The site: the name search engines show for it; Wix declared it too. */
export function websiteLd(origin: string, locale: Locale, ui: Ui): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'WebSite',
    '@id': websiteId(origin),
    name: SITE.name,
    alternateName: [...new Set([SITE.legalName, ui.homePage.h1])],
    description: ui.seo.description,
    url: urlOf(origin, '/', DEFAULT_LOCALE),
    inLanguage: locale,
    publisher: { '@id': organizationId(origin) },
  };
}

/** The page itself: its language, its place in the site and the image shared with it. */
export function webPageLd(origin: string, locale: Locale, page: { path: string; title: string; description: string; image?: string; list?: boolean }): JsonLd {
  const slug = page.path.split('/')[1] ?? '';
  return {
    '@context': CONTEXT,
    '@type': page.list ? 'CollectionPage' : (PAGE_TYPES[slug] ?? 'WebPage'),
    '@id': urlOf(origin, page.path, locale),
    url: urlOf(origin, page.path, locale),
    name: page.title,
    description: page.description,
    inLanguage: locale,
    isPartOf: { '@id': websiteId(origin) },
    about: { '@id': organizationId(origin) },
    ...(page.image ? { primaryImageOfPage: { '@type': 'ImageObject', url: origin + page.image } } : {}),
  };
}

/** Path from the home page to the current page, the home page first. */
export function breadcrumbLd(origin: string, locale: Locale, ui: Ui, crumbs: Crumb[]): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: ui.home, path: '/' }, ...crumbs].map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: urlOf(origin, crumb.path, locale),
    })),
  };
}
