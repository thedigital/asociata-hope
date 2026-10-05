/**
 * Creates an admin account, or resets the credentials of an existing one. Run on the server:
 *
 *   pnpm user:create --email ana@example.org --name "Ana Pop" --locale ro
 *   pnpm user:reset --email ana@example.org
 *
 * Both set a password and enrol an authenticator app (TOTP): the QR code is shown in the
 * terminal and a code from the app must be entered before anything is saved. Signing in always
 * requires both. A reset also signs the account out everywhere.
 *
 * When stdin is piped (scripts, tests), the password is read from it and the app confirmation
 * is skipped.
 */
import { createInterface } from 'node:readline';
import { text } from 'node:stream/consumers';
import { parseArgs } from 'node:util';
import { eq } from 'drizzle-orm';
import QRCode from 'qrcode';
import { db, schema } from '../src/db/client.ts';
import { ADMIN_LOCALES, type AdminLocale } from '../src/i18n/config.ts';
import { MIN_PASSWORD_LENGTH, hashPassword } from '../src/lib/password.ts';
import { generateSecret, otpauthUrl, verifyTotp } from '../src/lib/totp.ts';

const { users, sessions } = schema;
const CONFIRM_ATTEMPTS = 3;

function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function prompt(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      process.stdout.write(question);
      (rl as unknown as { _writeToOutput: () => void })._writeToOutput = () => {};
    }
    rl.question(hidden ? '' : question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer);
    });
  });
}

const { values } = parseArgs({
  options: { email: { type: 'string' }, name: { type: 'string' }, locale: { type: 'string' }, reset: { type: 'boolean', default: false } },
});

const email = values.email?.trim().toLowerCase();
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail('--email is required and must be a valid address.');
const existing = db.select().from(users).where(eq(users.email, email)).get();

if (values.reset && !existing) fail(`no account for ${email}.`);
if (!values.reset && existing) fail(`an account already exists for ${email}. Use "pnpm user:reset --email ${email}" to reset its password and authenticator app.`);

const name = values.name?.trim() || existing?.name;
const locale = (values.locale ?? existing?.locale ?? 'ro') as AdminLocale;
if (!name) fail('--name is required.');
if (!ADMIN_LOCALES.includes(locale)) fail(`--locale must be ${ADMIN_LOCALES.join(' or ')}.`);

const interactive = Boolean(process.stdin.isTTY);
let password: string;
if (interactive) {
  password = await prompt('Password: ', true);
  if (password !== (await prompt('Confirm password: ', true))) fail('the two entries do not match.');
} else {
  password = (await text(process.stdin)).replace(/\r?\n$/, '');
}
if (password.length < MIN_PASSWORD_LENGTH) fail(`the password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);

const totpSecret = generateSecret();
console.log('\nScan this QR code with an authenticator app (Google Authenticator, Authy, 1Password…):\n');
console.log(await QRCode.toString(otpauthUrl(totpSecret, email, 'Hope'), { type: 'terminal', small: true }));
console.log(`Or enter this key manually: ${totpSecret}\n`);

// Refuse to save credentials the user cannot use: the app must produce a valid code first.
let totpLastStep = 0;
if (interactive) {
  let confirmed: number | null = null;
  for (let attempt = 1; attempt <= CONFIRM_ATTEMPTS && confirmed === null; attempt++) {
    confirmed = verifyTotp(totpSecret, await prompt('6-digit code shown by the app: '));
    if (confirmed === null) console.log('That code is not valid.');
  }
  if (confirmed === null) fail('the authenticator app was not confirmed. Nothing was saved.');
  totpLastStep = confirmed;
}

// A setup link sent from the admin (src/lib/admin-users.ts) stops working: these credentials replace it.
const credentials = { passwordHash: await hashPassword(password), totpSecret, totpLastStep, setupTokenHash: null, setupExpiresAt: null };
if (existing) {
  db.transaction((tx) => {
    tx.update(users).set({ ...credentials, name, locale }).where(eq(users.id, existing.id)).run();
    tx.delete(sessions).where(eq(sessions.userId, existing.id)).run();
  });
  console.log(`Credentials reset for ${name} <${email}>. Existing sessions were signed out.`);
} else {
  db.insert(users).values({ email, name, locale, ...credentials }).run();
  console.log(`Account created: ${name} <${email}> (admin language: ${locale}).`);
}
