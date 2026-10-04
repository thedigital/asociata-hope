/**
 * Checks that every content page has the same structure in every language: same sequence of
 * headings and same number of images once `structureBody` has run. Lists are reported but not
 * compared, because the texts are not word-for-word translations of each other.
 *
 *   node scripts/check-pages.ts
 */
import { eq } from 'drizzle-orm';
import { db, schema } from '../src/db/client.ts';
import { DEFAULT_LOCALE, ENABLED_LOCALES } from '../src/i18n/config.ts';
import { bodyOutline } from '../src/lib/page-body.ts';
import { CONTENT_PAGES } from '../src/lib/site.ts';

let problems = 0;
// Two stored bodies are not displayed: "In memoriam" is built from the deceased animals, the
// redirection page from interface strings (RedirectDetail.astro).
const checked = CONTENT_PAGES.filter((page) => page !== 'in-memoriam' && page !== 'redirectioneaza');
for (const slug of checked) {
  const rows = db
    .select({ locale: schema.pageTranslations.locale, body: schema.pageTranslations.body })
    .from(schema.pageTranslations)
    .innerJoin(schema.pages, eq(schema.pages.id, schema.pageTranslations.pageId))
    .where(eq(schema.pages.slug, slug))
    .all();
  const outlines = new Map(rows.map((row) => [row.locale, bodyOutline(row.body)]));
  const reference = outlines.get(DEFAULT_LOCALE);
  const lines: string[] = [];
  for (const locale of ENABLED_LOCALES) {
    const outline = outlines.get(locale);
    if (!outline) lines.push(`  ${locale}: no text`);
    else if (reference && (outline.headings !== reference.headings || outline.images !== reference.images))
      lines.push(`  ${locale}: headings ${outline.headings || '-'} (${DEFAULT_LOCALE}: ${reference.headings || '-'}), images ${outline.images} (${DEFAULT_LOCALE}: ${reference.images}), lists ${outline.lists} (${DEFAULT_LOCALE}: ${reference.lists})`);
  }
  // A different number of lists is worth a look, but texts can legitimately differ.
  for (const locale of ENABLED_LOCALES) {
    const outline = outlines.get(locale);
    if (outline && reference && outline.lists !== reference.lists) console.log(`note: /${slug} has ${outline.lists} list(s) in ${locale}, ${reference.lists} in ${DEFAULT_LOCALE}`);
  }
  if (lines.length) {
    problems += lines.length;
    console.log(`/${slug}\n${lines.join('\n')}`);
  }
}
console.log(`${checked.length} pages checked in ${ENABLED_LOCALES.length} languages, ${problems} difference(s).`);
if (problems) process.exit(1);
