/** Applies the SQL migrations from drizzle/: `pnpm db:migrate`. */
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from '../src/db/client.ts';

migrate(db, { migrationsFolder: 'drizzle' });
console.log('Migrations applied.');
