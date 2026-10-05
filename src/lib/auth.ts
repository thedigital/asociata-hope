import { createHash, randomBytes } from 'node:crypto';
import { eq, lt } from 'drizzle-orm';
import { db, schema } from '../db/client.ts';
import type { AdminLocale } from '../i18n/config.ts';
import { hashPassword, verifyPassword } from './password.ts';
import { verifyTotp } from './totp.ts';

const { users, sessions } = schema;

export const SESSION_COOKIE = 'session';
export const SESSION_DAYS = 14;
export type AdminUser = { id: number; email: string; name: string; locale: AdminLocale };

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** Only the SHA-256 of the token is stored: a leaked database does not give usable sessions. */
export function createSession(userId: number): { token: string; expiresAt: Date } {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  db.delete(sessions).where(lt(sessions.expiresAt, new Date())).run();
  db.insert(sessions).values({ id: hashToken(token), userId, expiresAt }).run();
  return { token, expiresAt };
}

export function getSessionUser(token: string): AdminUser | null {
  const row = db
    .select({ id: users.id, email: users.email, name: users.name, locale: users.locale, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, hashToken(token)))
    .get();
  if (!row) return null;
  if (row.expiresAt < new Date()) {
    deleteSession(token);
    return null;
  }
  return { id: row.id, email: row.email, name: row.name, locale: row.locale };
}

export const deleteSession = (token: string) => void db.delete(sessions).where(eq(sessions.id, hashToken(token))).run();

let dummyHash: Promise<string> | undefined;

/**
 * Signing in needs the password and a code from the authenticator app. The caller gets no hint
 * about which one was wrong. A hash is verified even for unknown e-mails, so response time does
 * not reveal which accounts exist.
 */
export async function authenticate(email: string, password: string, code: string): Promise<AdminUser | null> {
  const user = db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).get();
  dummyHash ??= hashPassword(randomBytes(16).toString('hex'));
  // An account waiting for its setup link has an empty hash: it is checked like an unknown e-mail.
  const passwordOk = await verifyPassword(user?.passwordHash || (await dummyHash), password).catch(() => false);
  if (!user?.passwordHash || !passwordOk || !user.totpSecret) return null;
  const step = verifyTotp(user.totpSecret, code, user.totpLastStep);
  if (step === null) return null;
  // Remember the step: the same code cannot be replayed, even inside its validity window.
  db.update(users).set({ totpLastStep: step }).where(eq(users.id, user.id)).run();
  return { id: user.id, email: user.email, name: user.name, locale: user.locale };
}

/** Failed logins per key (IP address, e-mail), kept in memory: enough for a single-process server. */
const MAX_FAILURES = 8;
const WINDOW_MS = 15 * 60_000;
const MAX_TRACKED = 10_000;
const failures = new Map<string, { count: number; resetAt: number }>();

export function isLocked(key: string): boolean {
  const entry = failures.get(key);
  if (entry && entry.resetAt < Date.now()) failures.delete(key);
  return (failures.get(key)?.count ?? 0) >= MAX_FAILURES;
}

export function recordFailure(key: string): void {
  // Keys are chosen by the caller (any e-mail can be typed): forget the expired ones so the list cannot grow without end.
  if (failures.size >= MAX_TRACKED) for (const [k, e] of failures) if (e.resetAt < Date.now()) failures.delete(k);
  if (failures.size >= MAX_TRACKED) failures.delete(failures.keys().next().value!);
  const entry = failures.get(key);
  if (!entry || entry.resetAt < Date.now()) failures.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS });
  else entry.count++;
}

export const clearFailures = (key: string) => void failures.delete(key);
