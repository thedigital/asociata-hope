/**
 * Scratch database and data directory for the tests that write: import this file before anything
 * from `src/`, because the database client reads `DATABASE_PATH` when it is first loaded.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const SCRATCH = mkdtempSync(join(tmpdir(), 'hope-test-'));
process.env.DATABASE_PATH = join(SCRATCH, 'hope.db');
process.env.DATA_DIR = SCRATCH;
process.on('exit', () => rmSync(SCRATCH, { recursive: true, force: true }));

const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
const { db } = await import('../../src/db/client.ts');
migrate(db, { migrationsFolder: 'drizzle' });
