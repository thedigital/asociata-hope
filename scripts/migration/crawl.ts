/**
 * Crawls the current Wix site (https://www.adoptii-animale-hope.org).
 *
 *   node scripts/migration/crawl.ts            # pages + SEO baseline
 *   node scripts/migration/crawl.ts --media    # + download original images/PDFs
 *   node scripts/migration/crawl.ts --refresh  # ignore the local HTML cache
 *
 * Output (in migration/):
 *   raw/{lang}/{path}.html     raw HTML (cache, not versioned)
 *   urls.json                  URL list per language
 *   seo-baseline.json          SEO tags of every URL: reference for the parity test
 *   content.json               text and images of the <main> area of every URL
 *   social-links.json          social network links found on the site
 *   media/                     original files (not versioned)
 */
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const ORIGIN = 'https://www.adoptii-animale-hope.org';
const LANGS = ['ro', 'en', 'fr'] as const;
type Lang = (typeof LANGS)[number];

const OUT = join(import.meta.dirname, '../../migration');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36';
const CONCURRENCY = 3;
const DELAY_MS = 250;

const args = new Set(process.argv.slice(2));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const exists = (p: string) => access(p).then(() => true, () => false);

async function fetchRetry(url: string, tries = 4): Promise<Response> {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow' });
      if (res.status < 500 && res.status !== 429) return res;
      if (i >= tries) return res;
    } catch (err) {
      if (i >= tries) throw err;
    }
    await sleep(1000 * 2 ** i);
  }
}

async function pool<T>(items: T[], worker: (item: T, index: number) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < items.length) {
        const i = next++;
        await worker(items[i], i);
        await sleep(DELAY_MS);
      }
    }),
  );
}

const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());

/** Romanian paths (no language prefix) from the root sitemap. */
async function collectPaths(): Promise<string[]> {
  const index = await (await fetchRetry(`${ORIGIN}/sitemap.xml`)).text();
  const paths = new Set<string>();
  for (const sm of locs(index)) {
    const xml = await (await fetchRetry(sm)).text();
    for (const loc of locs(xml)) paths.add(new URL(loc).pathname.replace(/\/$/, '') || '/');
  }
  return [...paths].sort();
}

const localized = (path: string, lang: Lang) =>
  lang === 'ro' ? path : `/${lang}${path === '/' ? '' : path}`;

const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');

const attr = (tag: string, name: string) =>
  decode(tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? '');

const stripTags = (html: string) =>
  decode(html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
    .replace(/[​﻿]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();

const headings = (html: string, tag: string) =>
  [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'g'))]
    .map((m) => stripTags(m[1]))
    .filter(Boolean);

function extractSeo(html: string) {
  const head = html.slice(0, html.indexOf('</head>'));
  const metas = [...head.matchAll(/<meta\b[^>]*>/g)].map((m) => m[0]);
  const links = [...head.matchAll(/<link\b[^>]*>/g)].map((m) => m[0]);
  const meta = (key: string) => {
    const tag = metas.find((t) => attr(t, 'name') === key || attr(t, 'property') === key);
    return tag ? attr(tag, 'content') : null;
  };
  const body = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g, '');
  return {
    htmlLang: html.match(/<html[^>]*\blang="([^"]*)"/)?.[1] ?? null,
    title: decode(head.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? ''),
    description: meta('description'),
    keywords: meta('keywords'),
    robots: meta('robots'),
    canonical: attr(links.find((l) => attr(l, 'rel') === 'canonical') ?? '', 'href') || null,
    hreflang: Object.fromEntries(
      links.filter((l) => attr(l, 'rel') === 'alternate' && attr(l, 'hreflang')).map((l) => [attr(l, 'hreflang'), attr(l, 'href')]),
    ),
    og: Object.fromEntries(
      metas.filter((t) => attr(t, 'property').startsWith('og:')).map((t) => [attr(t, 'property'), attr(t, 'content')]),
    ),
    jsonLd: [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map((m) => m[1].trim())
      .filter((s) => s && s !== '{}'),
    h1: headings(body, 'h1'),
    h2: headings(body, 'h2'),
  };
}

/** Content of the main area (without header, menu and footer). */
function extractContent(html: string) {
  const clean = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g, '');
  const start = clean.search(/<main\b/);
  const end = clean.lastIndexOf('</main>');
  const main = start >= 0 && end > start ? clean.slice(start, end) : clean;
  const blocks = [...main.matchAll(/<(h[1-6]|p|li)\b[^>]*>([\s\S]*?)<\/\1>/g)]
    .map((m) => ({ tag: m[1], text: stripTags(m[2]) }))
    .filter((b) => b.text);
  const media = [...new Set([...main.matchAll(/static\.wixstatic\.com\/media\/([^/"\\\s)]+)/g)].map((m) => m[1]))];
  const images = [...main.matchAll(/<img\b[^>]*>/g)]
    .map((m) => ({ id: attr(m[0], 'src').match(/\/media\/([^/]+)/)?.[1] ?? null, alt: attr(m[0], 'alt') }))
    .filter((i) => i.id);
  const files = [...new Set([...main.matchAll(/href="([^"]*\/_files\/ugd\/[^"]+)"/g)].map((m) => decode(m[1])))];
  const links = [...new Set([...main.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((m) => decode(m[1])))];
  return { blocks, media, images, files, links };
}

/** Social links anywhere on the page (footer included). */
const SOCIAL = /https?:\/\/(?:www\.)?(?:facebook|instagram|tiktok|youtube|linkedin|twitter|x|wa)\.(?:com|me)\/[^"\s]+/g;

async function main() {
  await mkdir(OUT, { recursive: true });
  const paths = await collectPaths();
  const urls = LANGS.flatMap((lang) => paths.map((path) => ({ lang, path, url: ORIGIN + localized(path, lang) })));
  await writeFile(join(OUT, 'urls.json'), JSON.stringify({ origin: ORIGIN, langs: LANGS, paths }, null, 2));
  console.log(`${paths.length} paths × ${LANGS.length} languages = ${urls.length} URLs`);

  const seo: Record<string, unknown> = {};
  const content: Record<string, ReturnType<typeof extractContent>> = {};
  const social = new Set<string>();
  const failures: string[] = [];

  await pool(urls, async ({ lang, path, url }, i) => {
    const file = join(OUT, 'raw', lang, (path === '/' ? '/index' : path) + '.html');
    let html: string;
    let status = 200;
    if (!args.has('--refresh') && (await exists(file))) {
      html = await readFile(file, 'utf8');
    } else {
      const res = await fetchRetry(url);
      status = res.status;
      html = await res.text();
      if (!res.ok) {
        failures.push(`${status} ${url}`);
        return;
      }
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, html);
    }
    const key = localized(path, lang);
    seo[key] = { status, ...extractSeo(html) };
    content[key] = extractContent(html);
    for (const m of html.matchAll(SOCIAL)) social.add(decode(m[0]));
    if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${urls.length}`);
  });

  const sorted = <T>(o: Record<string, T>) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(join(OUT, 'seo-baseline.json'), JSON.stringify(sorted(seo), null, 2));
  await writeFile(join(OUT, 'content.json'), JSON.stringify(sorted(content), null, 2));
  await writeFile(join(OUT, 'social-links.json'), JSON.stringify([...social].sort(), null, 2));
  console.log(`SEO + content: ${Object.keys(seo).length} pages, ${failures.length} failure(s)`);
  for (const f of failures) console.log('  FAILED', f);

  if (!args.has('--media')) return;

  const mediaIds = [...new Set(Object.values(content).flatMap((c) => c.media))];
  const fileUrls = [...new Set(Object.values(content).flatMap((c) => c.files))];
  const jobs = [
    ...mediaIds.map((id) => ({ url: `https://static.wixstatic.com/media/${id}`, dest: join(OUT, 'media', id.replace(/~/g, '_')) })),
    ...fileUrls.map((u) => ({ url: new URL(u, ORIGIN).href, dest: join(OUT, 'media/files', new URL(u, ORIGIN).pathname.split('/').pop()!) })),
  ];
  console.log(`Media: ${mediaIds.length} images, ${fileUrls.length} files`);
  await mkdir(join(OUT, 'media/files'), { recursive: true });
  let bytes = 0;
  const mediaFailures: string[] = [];
  await pool(jobs, async ({ url, dest }, i) => {
    if (!(await exists(dest))) {
      const res = await fetchRetry(url);
      if (!res.ok) {
        mediaFailures.push(`${res.status} ${url}`);
        return;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(dest, buf);
      bytes += buf.length;
    }
    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${jobs.length}`);
  });
  console.log(`Media downloaded: ${(bytes / 1e6).toFixed(1)} MB, ${mediaFailures.length} failure(s)`);
  for (const f of mediaFailures) console.log('  FAILED', f);
}

await main();
