/**
 * The page files of migration/translations/{locale}/pages/{slug}.html, written to the database.
 * The text of a page is not edited in the admin: these files are its only source, so writing them
 * again is always safe. Only the body is replaced; the SEO fields written in the admin are kept.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '../../src/db/client.ts';
import { isLocale } from '../../src/i18n/config.ts';

const ROOT = join(import.meta.dirname, '../../migration/translations');
const { pages, pageTranslations } = schema;
const list = (dir: string) => readdir(dir).catch(() => [] as string[]);

/** Writes every page file of every language; returns how many bodies changed and the files that name no page. */
export async function syncPageFiles(): Promise<{ files: number; changed: number; unknown: string[] }> {
  let files = 0;
  let changed = 0;
  const unknown: string[] = [];
  for (const locale of await list(ROOT)) {
    if (!isLocale(locale)) continue;
    for (const file of (await list(join(ROOT, locale, 'pages'))).filter((f) => f.endsWith('.html'))) {
      const slug = file.replace(/\.html$/, '');
      const page = db.select({ id: pages.id }).from(pages).where(eq(pages.slug, slug)).get();
      if (!page) {
        unknown.push(`${locale}/pages/${file}`);
        continue;
      }
      const body = (await readFile(join(ROOT, locale, 'pages', file), 'utf8')).trim();
      const stored = db.select({ body: pageTranslations.body }).from(pageTranslations).where(and(eq(pageTranslations.pageId, page.id), eq(pageTranslations.locale, locale))).get();
      files++;
      if (stored?.body === body) continue;
      db.insert(pageTranslations)
        .values({ pageId: page.id, locale, title: slug, body })
        .onConflictDoUpdate({ target: [pageTranslations.pageId, pageTranslations.locale], set: { body } })
        .run();
      changed++;
    }
  }
  return { files, changed, unknown };
}
