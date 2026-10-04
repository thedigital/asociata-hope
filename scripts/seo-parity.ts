/**
 * Checks a running server against migration/seo-baseline.json (the 351 URLs of the Wix site).
 *
 *   node scripts/seo-parity.ts                              # against http://127.0.0.1:4321
 *   node scripts/seo-parity.ts --url https://staging.example.org
 *
 * Every URL: status, canonical, hreflang, language, a single h1, a description.
 * Romanian content pages: title and description identical to Wix.
 * Animal pages: the title starts with the animal's name, in every language.
 * Exits with code 1 when a check fails.
 */
import { readFile } from 'node:fs/promises';
import { get as httpGet } from 'node:http';
import { get as httpsGet } from 'node:https';
import { join } from 'node:path';
import { parse } from 'node-html-parser';
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

const SITE_ORIGIN = 'https://www.adoptii-animale-hope.org';
const collectionPaths = COLLECTIONS.map((c) => c.path);
const normalize = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();
const stripSlash = (url: string | null | undefined) => (url ?? '').replace(/\/$/, '');

/** Plain request without Accept-Language, like a search engine crawler: the language redirect must not trigger. */
function fetchPage(path: string): Promise<{ status: number; body: string }> {
  const get = origin.startsWith('https:') ? httpsGet : httpGet;
  return new Promise((resolve, reject) => {
    get(origin + path, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
    }).on('error', reject);
  });
}

let failures = 0;
for (const [path, expected] of Object.entries(baseline)) {
  const errors: string[] = [];
  const segments = path.split('/').filter(Boolean);
  const romanian = !['en', 'fr'].includes(segments[0]);
  const local = romanian ? segments : segments.slice(1);
  const localPath = `/${local.join('/')}`;
  const { status, body } = await fetchPage(path);

  if (REMOVED_PATHS.includes(localPath)) {
    if (status !== 410) errors.push(`status ${status}, expected 410`);
  } else if (status !== 200) {
    errors.push(`status ${status}, expected 200`);
  } else {
    const root = parse(body);
    const title = normalize(root.querySelector('title')?.text);
    const description = normalize(root.querySelector('meta[name="description"]')?.getAttribute('content'));
    const robots = root.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '';
    const unlisted = (UNLISTED_PAGES as readonly string[]).includes(local[0]);

    if (root.querySelector('html')?.getAttribute('lang') !== expected.htmlLang) errors.push(`lang is not "${expected.htmlLang}"`);
    // A page the crawl failed to read has no canonical in the baseline: it must then be the URL itself.
    const canonical = expected.canonical || SITE_ORIGIN + path;
    if (stripSlash(root.querySelector('link[rel="canonical"]')?.getAttribute('href')) !== stripSlash(canonical)) errors.push('canonical differs');
    for (const [lang, href] of Object.entries(expected.hreflang)) {
      const found = root.querySelector(`link[rel="alternate"][hreflang="${lang}"]`)?.getAttribute('href');
      if (stripSlash(found) !== stripSlash(href)) errors.push(`hreflang ${lang} differs`);
    }
    const h1 = root.querySelectorAll('h1').length;
    if (h1 !== 1) errors.push(`${h1} h1`);
    if (!description) errors.push('no description');
    if (/noindex/.test(robots) !== unlisted) errors.push(unlisted ? 'should be noindex' : 'is noindex');

    if (local.length === 2 && collectionPaths.includes(local[0])) {
      // The Romanian Wix title of an animal page is its bare name, which is never translated
      // (the English and French Wix titles are machine-translated names).
      const name = normalize(baseline[localPath]?.title);
      if (!title.startsWith(name)) errors.push(`title "${title}" does not start with the name "${name}"`);
    } else if (romanian && !unlisted) {
      const wanted = ACCEPTED_TITLES[path] ?? normalize(expected.title);
      if (title !== wanted) errors.push(`title "${title}", expected "${wanted}"`);
      if (description !== normalize(expected.description)) errors.push(`description "${description}", expected "${normalize(expected.description)}"`);
    }
  }
  if (errors.length) {
    failures++;
    console.log(`${path}\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  }
}
console.log(`${Object.keys(baseline).length} URLs checked against ${origin}, ${failures} with differences.`);
process.exit(failures ? 1 : 0);
