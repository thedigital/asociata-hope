import './helpers/scratch.ts';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { eq } from 'drizzle-orm';
import { db, schema } from '../src/db/client.ts';
import { completeSetup, deleteUser, findSetup, inviteUser, listUsers, parseUserForm, resetUser, setUserLocale } from '../src/lib/admin-users.ts';
import { authenticate, createSession, getSessionUser } from '../src/lib/auth.ts';
import { currentStep, totpCode } from '../src/lib/totp.ts';

const { users } = schema;
const PASSWORD = 'correct horse battery';

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}
const stored = (email: string) => db.select().from(users).where(eq(users.email, email)).get()!;
const codeFor = (email: string, offset = 0) => totpCode(stored(email).totpSecret!, currentStep() + offset);
const invite = (email: string, name = 'Ana Pop') => {
  const result = inviteUser({ email, name, locale: 'ro' });
  assert.ok('token' in result);
  return result.token;
};

describe('parseUserForm', () => {
  it('normalises the e-mail and the name; an unknown language becomes Romanian', () => {
    assert.deepEqual(parseUserForm(form({ email: ' Ana@Example.org ', name: ' Ana   Pop ', locale: 'fr' })), { input: { email: 'ana@example.org', name: 'Ana Pop', locale: 'fr' }, errors: [] });
    assert.equal(parseUserForm(form({ email: 'a@b.org', name: 'A', locale: 'de' })).input.locale, 'ro');
  });

  it('refuses a wrong e-mail or a missing name', () => {
    assert.deepEqual(parseUserForm(form({ email: 'ana', name: '' })).errors, ['email', 'name']);
    assert.deepEqual(parseUserForm(form({ email: 'a b@c.org', name: 'a'.repeat(81) })).errors, ['email', 'name']);
  });
});

describe('a new account', () => {
  it('cannot sign in before its link is used, and stores only the hash of the token', async () => {
    const token = invite('ana@example.org');
    const user = stored('ana@example.org');
    assert.equal(user.passwordHash, '');
    assert.ok(user.setupTokenHash && user.setupTokenHash !== token && !JSON.stringify(user).includes(token));
    assert.equal(listUsers().find((row) => row.email === 'ana@example.org')!.state, 'pending');
    assert.equal(await authenticate('ana@example.org', '', codeFor('ana@example.org')), null);
    assert.equal(findSetup(token)!.email, 'ana@example.org');
  });

  it('is refused when the e-mail already has an account', () => {
    assert.deepEqual(inviteUser({ email: 'ana@example.org', name: 'Other', locale: 'fr' }), { error: 'emailTaken' });
  });

  it('sets its password once the authenticator app gives a valid code', async () => {
    const token = resetUser(stored('ana@example.org').id)!.token;
    assert.equal(await completeSetup(token, 'short', 'short', codeFor('ana@example.org')), 'password');
    assert.equal(await completeSetup(token, PASSWORD, `${PASSWORD}.`, codeFor('ana@example.org')), 'mismatch');
    assert.equal(await completeSetup(token, PASSWORD, PASSWORD, '000000'), 'code');
    assert.equal(await completeSetup('unknown', PASSWORD, PASSWORD, codeFor('ana@example.org')), 'invalid');
    assert.equal(stored('ana@example.org').passwordHash, '', 'nothing is stored while a check fails');

    assert.equal(await completeSetup(token, PASSWORD, PASSWORD, codeFor('ana@example.org')), 'ok');
    assert.equal(listUsers().find((row) => row.email === 'ana@example.org')!.state, 'ready');
    // The link works once, and the code that confirmed the app cannot be used again to sign in.
    assert.equal(findSetup(token), null);
    assert.equal(await completeSetup(token, PASSWORD, PASSWORD, codeFor('ana@example.org', 1)), 'invalid');
    assert.equal(await authenticate('ana@example.org', PASSWORD, codeFor('ana@example.org')), null);
    assert.equal((await authenticate('ana@example.org', PASSWORD, codeFor('ana@example.org', 1)))!.email, 'ana@example.org');
  });

  it('has a link that expires', () => {
    const token = invite('late@example.org');
    db.update(users).set({ setupExpiresAt: new Date(Date.now() - 1000) }).where(eq(users.email, 'late@example.org')).run();
    assert.equal(findSetup(token), null);
    assert.equal(listUsers().find((row) => row.email === 'late@example.org')!.state, 'expired');
  });
});

describe('resetUser', () => {
  it('cancels the credentials at once and signs the account out', async () => {
    const { id } = stored('ana@example.org');
    const session = createSession(id).token;
    const token = resetUser(id)!.token;
    assert.equal(getSessionUser(session), null);
    assert.equal(await authenticate('ana@example.org', PASSWORD, codeFor('ana@example.org', 1)), null);
    assert.equal(findSetup(token)!.id, id);
    assert.equal(resetUser(9999), null);
  });

  it('keeps the session of the person resetting their own account, until the link is used', async () => {
    const { id } = stored('ana@example.org');
    const [mine, other] = [createSession(id).token, createSession(id).token];
    const token = resetUser(id, mine)!.token;
    assert.equal(getSessionUser(mine)!.id, id);
    assert.equal(getSessionUser(other), null);
    assert.equal(await completeSetup(token, PASSWORD, PASSWORD, codeFor('ana@example.org')), 'ok');
    assert.equal(getSessionUser(mine), null);
  });
});

describe('deleteUser and setUserLocale', () => {
  it('never deletes the account of the person signed in', () => {
    const { id } = stored('ana@example.org');
    assert.equal(deleteUser(id, id), false);
    assert.ok(stored('ana@example.org'));
  });

  it('deletes another account with its sessions', () => {
    const { id } = stored('late@example.org');
    const session = createSession(id).token;
    assert.equal(deleteUser(id, stored('ana@example.org').id), true);
    assert.equal(db.select().from(users).where(eq(users.id, id)).get(), undefined);
    assert.equal(getSessionUser(session), null);
  });

  it('changes the language of the admin, among the two offered', () => {
    const { id } = stored('ana@example.org');
    setUserLocale(id, 'fr');
    assert.equal(stored('ana@example.org').locale, 'fr');
    setUserLocale(id, 'de');
    assert.equal(stored('ana@example.org').locale, 'fr');
  });
});
