/**
 * Writes the page files of migration/translations/ to the database: run by every deployment
 * (deploy/deploy.sh), so that a page changes by editing its file and deploying.
 *
 *   node scripts/sync-pages.ts
 *
 * Only the text of the pages that have a file is replaced: nothing else in the database is touched
 * (animals, SEO fields, pages whose text still comes from the Wix crawl).
 */
import { db, schema } from '../src/db/client.ts';
import { syncPageFiles } from './migration/page-files.ts';

// A database that was just created has no page yet: they come with the data sent by deploy/push-data.sh.
if (!db.select({ id: schema.pages.id }).from(schema.pages).limit(1).get()) {
  console.log('No page in the database yet: nothing to update.');
  process.exit(0);
}
const { files, changed, unknown } = await syncPageFiles();
for (const file of unknown) console.log(`  ${file}: unknown page`);
console.log(`${files} page file(s), ${changed} text(s) updated.`);
if (unknown.length) process.exit(1);
