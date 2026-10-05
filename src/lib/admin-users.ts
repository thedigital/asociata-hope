import { randomBytes } from 'node:crypto';
import { and, asc, eq, ne } from 'drizzle-orm';
import { db, schema } from '../db/client.ts';
import { isAdminLocale, type AdminLocale } from '../i18n/config.ts';
import { hashToken } from './auth.ts';
import { formText, isEmail } from './input.ts';
import { MIN_PASSWORD_LENGTH, hashPassword } from './password.ts';
import { generateSecret, verifyTotp } from './totp.ts';

const { users, sessions } = schema;

/** How long the link sent to a new account, or after a reset, can be used. */
export const SETUP_HOURS = 72;

export type UserInput = { email: string; name: string; locale: AdminLocale };
/** Validation problems, as keys of the admin dictionary (`users.errors`). */
export type UserFormError = 'email' | 'name' | 'emailTaken';
export type SetupError = 'password' | 'mismatch' | 'code';
/** `ready`: can sign in. `pending`: waits for the person to use the link. `expired`: the link was not used in time. */
export type UserState = 'ready' | 'pending' | 'expired';

/**
 * Credentials that cannot be used, and the token of the link with which the person sets their own:
 * nobody else ever knows the password or holds the key of the authenticator app. Only the SHA-256
 * of the token is stored.
 */
function pendingCredentials() {
  const token = randomBytes(32).toString('base64url');
  const values = {
    passwordHash: '',
    totpSecret: generateSecret(),
    totpLastStep: 0,
    setupTokenHash: hashToken(token),
    setupExpiresAt: new Date(Date.now() + SETUP_HOURS * 3_600_000),
  };
  return { token, values };
}

export function parseUserForm(form: FormData): { input: UserInput; errors: UserFormError[] } {
  const text = formText(form);
  const email = text('email').toLowerCase();
  const name = text('name').replace(/\s+/g, ' ');
  const locale = text('locale');
  const errors: UserFormError[] = [];
  if (!isEmail(email) || email.length > 200) errors.push('email');
  if (!name || name.length > 80) errors.push('name');
  return { input: { email, name, locale: isAdminLocale(locale) ? locale : 'ro' }, errors };
}

export function listUsers() {
  return db
    .select()
    .from(users)
    .orderBy(asc(users.name), asc(users.id))
    .all()
    .map((user) => {
      const state: UserState = user.passwordHash && user.totpSecret ? 'ready' : user.setupExpiresAt && user.setupExpiresAt > new Date() ? 'pending' : 'expired';
      return { id: user.id, email: user.email, name: user.name, locale: user.locale, createdAt: user.createdAt, state };
    });
}

/** Creates an account that cannot sign in yet, and returns the token of its setup link. */
export function inviteUser(input: UserInput): { token: string } | { error: UserFormError } {
  if (db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).get()) return { error: 'emailTaken' };
  const { token, values } = pendingCredentials();
  db.insert(users).values({ ...input, ...values }).run();
  return { token };
}

/**
 * Cancels the password and the authenticator app of an account at once, signs it out everywhere and
 * returns the token of a new setup link. `keepSession` is the session token of the person doing it
 * on their own account, so they are not signed out before having read the link.
 */
export function resetUser(id: number, keepSession?: string): { token: string } | null {
  const { token, values } = pendingCredentials();
  return db.transaction((tx) => {
    if (!tx.update(users).set(values).where(eq(users.id, id)).returning({ id: users.id }).get()) return null;
    tx.delete(sessions).where(and(eq(sessions.userId, id), keepSession ? ne(sessions.id, hashToken(keepSession)) : undefined)).run();
    return { token };
  });
}

export function setUserLocale(id: number, locale: string): void {
  if (isAdminLocale(locale)) db.update(users).set({ locale }).where(eq(users.id, id)).run();
}

/** Nobody deletes their own account, so one account that is signed in always remains. */
export function deleteUser(id: number, actingUserId: number): boolean {
  if (id === actingUserId) return false;
  db.delete(users).where(eq(users.id, id)).run();
  return true;
}

/** The account a setup link belongs to, or null when the link is unknown, used or too old. */
export function findSetup(token: string) {
  if (!token) return null;
  const user = db.select().from(users).where(eq(users.setupTokenHash, hashToken(token))).get();
  if (!user?.totpSecret || !user.setupExpiresAt || user.setupExpiresAt < new Date()) return null;
  return { id: user.id, email: user.email, name: user.name, locale: user.locale, totpSecret: user.totpSecret };
}

/**
 * Stores the password chosen by the person once their authenticator app has given a valid code,
 * which proves the app is enrolled. The link stops working and the account is signed out everywhere.
 */
export async function completeSetup(token: string, password: string, confirmation: string, code: string): Promise<'ok' | 'invalid' | SetupError> {
  const user = findSetup(token);
  if (!user) return 'invalid';
  if (password.length < MIN_PASSWORD_LENGTH || password.length > 200) return 'password';
  if (password !== confirmation) return 'mismatch';
  const step = verifyTotp(user.totpSecret, code);
  if (step === null) return 'code';
  const passwordHash = await hashPassword(password);
  db.transaction((tx) => {
    tx.update(users).set({ passwordHash, totpLastStep: step, setupTokenHash: null, setupExpiresAt: null }).where(eq(users.id, user.id)).run();
    tx.delete(sessions).where(eq(sessions.userId, user.id)).run();
  });
  return 'ok';
}
