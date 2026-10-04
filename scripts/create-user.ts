/**
 * Creates an admin account. Run on the server:
 *
 *   pnpm user:create --email ana@example.org --name "Ana Pop" --locale ro
 *
 * The password is prompted for (or read from stdin when it is piped).
 */
import { createInterface } from 'node:readline';
import { text } from 'node:stream/consumers';
import { parseArgs } from 'node:util';
import { db, schema } from '../src/db/client.ts';
import { ADMIN_LOCALES, type AdminLocale } from '../src/i18n/config.ts';
import { MIN_PASSWORD_LENGTH, hashPassword } from '../src/lib/password.ts';

function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    process.stdout.write(question);
    (rl as unknown as { _writeToOutput: () => void })._writeToOutput = () => {};
    rl.question('', (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

const { values } = parseArgs({
  options: { email: { type: 'string' }, name: { type: 'string' }, locale: { type: 'string', default: 'ro' } },
});

const email = values.email?.trim().toLowerCase();
const name = values.name?.trim();
const locale = values.locale as AdminLocale;

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail('--email is required and must be a valid address.');
if (!name) fail('--name is required.');
if (!ADMIN_LOCALES.includes(locale)) fail(`--locale must be ${ADMIN_LOCALES.join(' or ')}.`);

let password: string;
if (process.stdin.isTTY) {
  password = await promptHidden('Password: ');
  if (password !== (await promptHidden('Confirm password: '))) fail('the two entries do not match.');
} else {
  password = (await text(process.stdin)).replace(/\r?\n$/, '');
}
if (password.length < MIN_PASSWORD_LENGTH) fail(`the password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);

try {
  db.insert(schema.users).values({ email, name, locale, passwordHash: await hashPassword(password) }).run();
} catch (err) {
  if (err instanceof Error && /UNIQUE/.test(err.message)) fail(`an account already exists for ${email}.`);
  throw err;
}
console.log(`Account created: ${name} <${email}> (admin language: ${locale}).`);
