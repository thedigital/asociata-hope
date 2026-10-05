/**
 * Checks a running server against migration/seo-baseline.json (the 351 URLs of the Wix site).
 *
 *   node scripts/seo-parity.ts                              # against http://127.0.0.1:4321
 *   node scripts/seo-parity.ts --url https://staging.example.org
 *
 * Every page of the Wix site is checked in every language served (`ENABLED_LOCALES`), with the same
 * rules: a language Wix did not have, like German, is checked exactly like the others.
 * Every URL: status, language, canonical on itself, hreflang towards every language, a single h1,
 * a description, indexable or not as expected.
 * Home, lists and content pages: a title and a description of their own, never shared by two pages
 * of a language.
 * Animal pages: the title starts with the animal's name, which is never translated.
 * Where Wix recorded a value worth keeping, it must still be there: canonical and hreflang of the
 * 351 URLs, and in Romanian (the only language Wix wrote them in) the titles and the description of
 * the home page.
 * A page renamed since (`RENAMED`) must answer 301 to its new address at the old one, in
 * every language, and the new address is checked like any other page.
 * Exits with code 1 when a check fails.
 */
import { readFile } from 'node:fs/promises';
import { get as httpGet } from 'node:http';
import { get as httpsGet } from 'node:https';
import { join } from 'node:path';
import { parse } from 'node-html-parser';
import { DEFAULT_LOCALE, ENABLED_LOCALES, HREFLANG, isLocale, localizePath } from '../src/i18n/config.ts';
import { COLLECTIONS } from '../src/lib/animals.ts';
import { REMOVED_PATHS, UNLISTED_PAGES } from '../src/lib/site.ts';

type Entry = { htmlLang: string; title: string | null; description: string | null; canonical: string | null; hreflang: Record<string, string> };

const argUrl = process.argv.indexOf('--url');
const origin = (argUrl > 0 ? process.argv[argUrl + 1] : 'http://127.0.0.1:4321').replace(/\/$/, '');
const baseline: Record<string, Entry> = JSON.parse(await readFile(join(import.meta.dirname, '../migration/seo-baseline.json'), 'utf8'));

/** Romanian titles changed on purpose: Wix had inconsistent or wrong automatic titles. */
const ACCEPTED_TITLES: Record<string, string> = {
  '/adoptii-pisici': 'Adoptii pisici | Hope',
  '/adoptii-virtuale-caini': 'Adoptii virtuale caini | Hope',
  '/adoptii-virtuale-pisici': 'Adoptii virtuale pisici | Hope',
};

/**
 * Animal pages that Wix redirected to another animal by mistake: the crawl recorded the other page at
 * their URL. They are separate animals, so the canonical and hreflang must be their own.
 */
const WIX_MISDIRECTED: Record<string, { to: string; name: string }> = {
  '/adoptii-pisici/anais': { to: '/adoptii-pisici/serena', name: 'Anais' },
};

/** Pages renamed since Wix, with their new path: a rule of the `redirects` table per language. */
const RENAMED: Record<string, string> = { '/raport-2024': '/rapoarte-de-activitate' };

const SITE_ORIGIN = 'https://www.adoptii-animale-hope.org';
const collectionPaths = COLLECTIONS.map((c) => c.path);
const normalize = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();
const stripSlash = (url: string | null | undefined) => (url ?? '').replace(/\/$/, '');

/** Plain request without Accept-Language, like a search engine crawler: the language redirect must not trigger. */
function fetchPage(path: string): Promise<{ status: number; body: string; location: string }> {
  const get = origin.startsWith('https:') ? httpsGet : httpGet;
  return new Promise((resolve, reject) => {
    get(origin + path, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body, location: res.headers.location ?? '' }));
    }).on('error', reject);
  });
}

/** Pages already seen with a title or a description, by language: home, lists and content pages each have their own. */
const seen = new Map<string, string>();
/** The paths of the site are those Wix had in Romanian; each one exists in every language. */
const wixPaths = Object.keys(baseline).filter((path) => !isLocale(path.split('/')[1] ?? '') || path.split('/')[1] === DEFAULT_LOCALE);
let checked = 0;
let failures = 0;
// A renamed page: its old address redirects in every language, and the new one takes its place in the list.
for (const [from, to] of Object.entries(RENAMED)) {
  for (const locale of ENABLED_LOCALES) {
    const { status, location } = await fetchPage(localizePath(from, locale));
    checked++;
    if (status === 301 && location.replace(origin, '') === localizePath(to, locale)) continue;
    failures++;
    console.log(`${localizePath(from, locale)}\n  - status ${status} to "${location}", expected 301 to ${localizePath(to, locale)}`);
  }
}
const paths = wixPaths.map((path) => RENAMED[path] ?? path);
for (const localPath of paths) {
  const local = localPath.split('/').filter(Boolean);
  const own = WIX_MISDIRECTED[localPath];
  const ownUrl = (url: string) => (own ? url.replace(own.to, localPath) : url);
  const isAnimal = local.length === 2 && collectionPaths.includes(local[0]);
  const unlisted = (UNLISTED_PAGES as readonly string[]).includes(local[0]);

  for (const locale of ENABLED_LOCALES) {
    const path = localizePath(localPath, locale);
    const errors: string[] = [];
    // What Wix had at this URL: nothing for a language added since.
    const recorded: Entry | undefined = baseline[path];
    const { status, body } = await fetchPage(path);
    checked++;

    if (REMOVED_PATHS.includes(localPath)) {
      if (status !== 410) errors.push(`status ${status}, expected 410`);
    } else if (status !== 200) {
      errors.push(`status ${status}, expected 200`);
    } else {
      const root = parse(body);
      const title = normalize(root.querySelector('title')?.text);
      const description = normalize(root.querySelector('meta[name="description"]')?.getAttribute('content'));
      const robots = root.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '';
      const link = (selector: string) => stripSlash(root.querySelector(selector)?.getAttribute('href'));

      if (root.querySelector('html')?.getAttribute('lang') !== locale) errors.push(`lang is not "${locale}"`);
      if (link('link[rel="canonical"]') !== stripSlash(SITE_ORIGIN + path)) errors.push('canonical is not the URL itself');
      if (recorded?.canonical && stripSlash(ownUrl(recorded.canonical)) !== stripSlash(SITE_ORIGIN + path)) errors.push('canonical differs from Wix');
      const alternates = { 'x-default': DEFAULT_LOCALE, ...Object.fromEntries(ENABLED_LOCALES.map((l) => [HREFLANG[l], l])) };
      for (const [lang, target] of Object.entries(alternates)) {
        if (link(`link[rel="alternate"][hreflang="${lang}"]`) !== stripSlash(SITE_ORIGIN + localizePath(localPath, target))) errors.push(`hreflang ${lang} differs`);
      }
      for (const [lang, href] of Object.entries(recorded?.hreflang ?? {})) {
        if (link(`link[rel="alternate"][hreflang="${lang}"]`) !== stripSlash(ownUrl(href))) errors.push(`hreflang ${lang} differs from Wix`);
      }
      const h1 = root.querySelectorAll('h1').length;
      if (h1 !== 1) errors.push(`${h1} h1`);
      if (!title) errors.push('no title');
      if (!description) errors.push('no description');
      if (/noindex/.test(robots) !== unlisted) errors.push(unlisted ? 'should be noindex' : 'is noindex');

      if (isAnimal) {
        // The Romanian Wix title of an animal page is its bare name, which is never translated
        // (the English and French Wix titles are machine-translated names).
        const name = own?.name ?? normalize(baseline[localPath]?.title);
        if (!title.startsWith(name)) errors.push(`title "${title}" does not start with the name "${name}"`);
      } else if (!unlisted) {
        for (const [what, text] of [['title', title], ['description', description]]) {
          const other = seen.get(`${locale} ${what} ${text}`);
          if (other) errors.push(`same ${what} as ${other}`);
          else seen.set(`${locale} ${what} ${text}`, path);
        }
        // Wix wrote titles and descriptions in Romanian only, and showed them in every language.
        if (locale === DEFAULT_LOCALE && recorded) {
          const wanted = ACCEPTED_TITLES[path] ?? normalize(recorded.title);
          if (title !== wanted) errors.push(`title "${title}", expected "${wanted}"`);
          if (path === '/' && description !== normalize(recorded.description)) errors.push(`description "${description}", expected "${normalize(recorded.description)}"`);
        }
      }
    }
    if (errors.length) {
      failures++;
      console.log(`${path}\n${errors.map((e) => `  - ${e}`).join('\n')}`);
    }
  }
}
console.log(`${checked} URLs checked against ${origin} (${paths.length} pages in ${ENABLED_LOCALES.length} languages), ${failures} with differences.`);
process.exit(failures ? 1 : 0);
