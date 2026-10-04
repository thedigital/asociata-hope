/**
 * Imports the content pages of the Wix site (migration/raw/{lang}/{slug}.html) into the database.
 *
 *   node scripts/migration/import-pages.ts            # import
 *   node scripts/migration/import-pages.ts --dry-run  # report only
 *
 * The Wix markup is reduced to plain semantic HTML (headings, paragraphs, lists, links, images,
 * buttons). The shared call-to-action tiles at the bottom of every Wix page are dropped: the
 * layout renders them. Images are copied to data/uploads/pages, PDFs to data/uploads/files.
 *
 * Romanian SEO fields written by hand in Wix are taken from migration/seo-baseline.json: a title
 * that is not the automatic "{page name} | Hope", a description that is not the site-wide one.
 * Other languages only had the Romanian values on Wix and keep the translated defaults.
 *
 * WARNING: replaces every content page already in the database.
 */
import { access, copyFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse, type HTMLElement, type Node, NodeType } from 'node-html-parser';
import { db, schema } from '../../src/db/client.ts';
import { CONTENT_PAGES, SITE } from '../../src/lib/site.ts';

const ROOT = join(import.meta.dirname, '../..');
const MIGRATION = join(ROOT, 'migration');
const UPLOADS = join(ROOT, 'data/uploads');
const ORIGIN = 'https://www.adoptii-animale-hope.org';
const LOCALES = ['ro', 'en', 'fr'] as const;
const dryRun = process.argv.includes('--dry-run');

const exists = (p: string) => access(p).then(() => true, () => false);
const localName = (wixId: string) => wixId.replace(/~/g, '_');
const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const images = new Set<string>();
const files = new Set<string>();

/** Site links become root-relative (the language prefix is kept); PDFs move to /files. */
function rewriteHref(href: string): string {
  const pdf = href.match(/\/_files\/ugd\/([\w.-]+\.(?:pdf|doc|docx))/);
  if (pdf) return files.add(pdf[1]), `/files/${pdf[1]}`;
  if (href.startsWith(ORIGIN)) return href.slice(ORIGIN.length) || '/';
  return href;
}

const KEEP = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'br']);
const RENAME: Record<string, string> = { b: 'strong', i: 'em' };
const isBlank = (html: string) => !html.replace(/<br>|&nbsp;|&#8203;|&#x200b;|[\s​﻿]/gi, '');

/** Keeps the semantic tags of a Wix rich text block and drops all styling. */
function cleanRichText(node: Node): string {
  if (node.nodeType === NodeType.TEXT_NODE) return node.rawText.replace(/[​﻿]/g, '');
  if (node.nodeType !== NodeType.ELEMENT_NODE) return '';
  const el = node as HTMLElement;
  const tag = RENAME[el.rawTagName?.toLowerCase()] ?? el.rawTagName?.toLowerCase();
  const inner = el.childNodes.map(cleanRichText).join('');
  if (tag === 'br') return '<br>';
  if (tag === 'a') {
    const href = el.getAttribute('href');
    if (!href || isBlank(inner)) return inner;
    const external = /^https?:\/\//.test(rewriteHref(href));
    return `<a href="${escapeHtml(rewriteHref(href))}"${external ? ' rel="noopener" target="_blank"' : ''}>${inner}</a>`;
  }
  if (tag === 'span' && /font-weight:\s*(bold|[6-9]00)/.test(el.getAttribute('style') ?? '') && !isBlank(inner)) return `<strong>${inner}</strong>`;
  if (!KEEP.has(tag)) return inner;
  if (isBlank(inner)) return '';
  return `<${tag}>${inner.trim()}</${tag}>`;
}

/** The four call-to-action tiles shared by every page. */
function isCtaSection(el: HTMLElement): boolean {
  // Buttons only, and only the two adoption lists: on some Wix pages the donate and volunteer
  // buttons of this block point to the home page.
  const hrefs = el.querySelectorAll('a').filter((a) => /wixui-button/.test(a.getAttribute('class') ?? '')).map((a) => a.getAttribute('href') ?? '');
  if (!['/adoptii-caini', '/adoptii-pisici'].every((path) => hrefs.some((h) => h.endsWith(path)))) return false;
  // Wix nests sections: only the innermost match is the block itself, its parents also hold page content.
  return !el.querySelectorAll('section').some(isCtaSection);
}

function extract(el: HTMLElement, out: string[]): void {
  const tag = el.rawTagName?.toLowerCase();
  if (tag === 'section' && isCtaSection(el)) return;
  if (el.getAttribute('data-testid') === 'richTextElement') {
    const html = el.childNodes.map(cleanRichText).join('');
    if (!isBlank(html)) out.push(html);
    return;
  }
  if (tag === 'img') {
    const id = (el.getAttribute('src') ?? '').match(/static\.wixstatic\.com\/media\/([^/]+)/)?.[1];
    if (id) {
      images.add(id);
      out.push(`<img src="/media/pages/1200/${localName(id)}" alt="${escapeHtml(el.getAttribute('alt') ?? '')}" loading="lazy">`);
    }
    return;
  }
  if (tag === 'a' && /wixui-button/.test(el.getAttribute('class') ?? '')) {
    const href = el.getAttribute('href');
    const label = el.text.trim();
    if (href && label) out.push(`<p><a class="button" href="${escapeHtml(rewriteHref(href))}">${escapeHtml(label)}</a></p>`);
    return;
  }
  // A linked picture (e.g. the adoption contract thumbnails) keeps its link.
  if (tag === 'a' && el.getAttribute('href') && el.querySelector('img')) {
    const inner: string[] = [];
    for (const child of el.childNodes) if (child.nodeType === NodeType.ELEMENT_NODE) extract(child as HTMLElement, inner);
    out.push(...inner.map((html) => (html.startsWith('<img') ? html.replace(/^<img/, `<img data-href="${escapeHtml(rewriteHref(el.getAttribute('href')!))}"`) : html)));
    return;
  }
  for (const child of el.childNodes) if (child.nodeType === NodeType.ELEMENT_NODE) extract(child as HTMLElement, out);
}

/** Consecutive images become one gallery. */
function groupImages(parts: string[]): string {
  const out: string[] = [];
  let run: string[] = [];
  const flush = () => {
    if (run.length) out.push(`<div class="${run.length > 1 ? 'gallery' : 'figure'}">${run.join('')}</div>`);
    run = [];
  };
  const linked = (img: string) => img.replace(/^<img data-href="([^"]*)"(.*)$/, '<a href="$1"><img$2</a>');
  for (const part of parts) part.startsWith('<img') ? run.push(linked(part)) : (flush(), out.push(part));
  flush();
  return out.join('\n');
}

type Baseline = Record<string, { title: string | null; description: string | null }>;
const baseline: Baseline = JSON.parse(await readFile(join(MIGRATION, 'seo-baseline.json'), 'utf8'));
const defaultDescription = baseline['/'].description;

/** Hand-written Romanian SEO fields of a page, null where Wix only had its default. */
function wixSeo(slug: string): { seoTitle: string | null; seoDescription: string | null } {
  const { title, description } = baseline[`/${slug}`] ?? { title: null, description: null };
  return {
    seoTitle: title && !title.endsWith(`| ${SITE.name}`) ? title : null,
    seoDescription: description && description !== defaultDescription ? description : null,
  };
}

const rows: { slug: string; locale: (typeof LOCALES)[number]; body: string }[] = [];
for (const slug of CONTENT_PAGES) {
  for (const locale of LOCALES) {
    const html = await readFile(join(MIGRATION, 'raw', locale, `${slug}.html`), 'utf8');
    const main = parse(html, { blockTextElements: { script: false, style: false } }).querySelector('main');
    if (!main) throw new Error(`${locale}/${slug}: no <main>`);
    const parts: string[] = [];
    extract(main, parts);
    // The donation page starts with the labels and the heading of the Wix card payment widget,
    // which the template replaces with its own form.
    if (slug === 'doneaza') {
      const firstHeading = parts.findIndex((p) => /^<h\d/.test(p));
      if (firstHeading >= 1) parts.splice(1, firstHeading);
    }
    const body = groupImages(parts);
    rows.push({ slug, locale, body });
    console.log(`${locale}/${slug}: ${body.length} chars, ${(body.match(/<img/g) ?? []).length} images`);
  }
}
console.log(`${images.size} images, ${files.size} files referenced`);
if (dryRun) process.exit(0);

await mkdir(join(UPLOADS, 'pages'), { recursive: true });
await mkdir(join(UPLOADS, 'files'), { recursive: true });
for (const id of images) {
  const source = join(MIGRATION, 'media', localName(id));
  if (await exists(source)) await copyFile(source, join(UPLOADS, 'pages', localName(id)));
  else console.log(`  missing image: ${id} (run pnpm crawl --media)`);
}
for (const file of files) {
  const source = join(MIGRATION, 'media/files', file);
  if (await exists(source)) await copyFile(source, join(UPLOADS, 'files', file));
  else console.log(`  missing file: ${file} (run pnpm crawl --media)`);
}

db.transaction((tx) => {
  tx.delete(schema.pages).run();
  for (const slug of CONTENT_PAGES) {
    const { id } = tx.insert(schema.pages).values({ slug }).returning({ id: schema.pages.id }).get();
    for (const row of rows.filter((r) => r.slug === slug)) {
      // The title is provided by the UI dictionary (src/i18n/ui.ts); the column stores the slug as a fallback.
      const seo = row.locale === 'ro' ? wixSeo(slug) : {};
      tx.insert(schema.pageTranslations).values({ pageId: id, locale: row.locale, title: slug, body: row.body, ...seo }).run();
    }
  }
});
console.log(`Imported ${CONTENT_PAGES.length} pages in ${LOCALES.length} languages.`);
