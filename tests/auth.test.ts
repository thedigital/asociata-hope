import './helpers/scratch.ts';
import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { eq } from 'drizzle-orm';
import { db, schema } from '../src/db/client.ts';
import { SESSION_DAYS, authenticate, clearFailures, createSession, deleteSession, getSessionUser, isLocked, recordFailure } from '../src/lib/auth.ts';
import { hashPassword } from '../src/lib/password.ts';
import { base32Decode, base32Encode, currentStep, generateSecret, otpauthUrl, totpCode, verifyTotp } from '../src/lib/totp.ts';

const { users, sessions } = schema;
const PASSWORD = 'correct horse battery';

async function createUser(email: string, withTotp = true) {
  const totpSecret = withTotp ? generateSecret() : null;
  const { id } = db.insert(users).values({ email, name: 'Test', passwordHash: await hashPassword(PASSWORD), totpSecret, locale: 'fr' }).returning({ id: users.id }).get();
  return { id, secret: totpSecret ?? '' };
}

afterEach(() => mock.timers.reset());

describe('TOTP', () => {
  // Test vectors of RFC 6238 (SHA-1), cut to six digits.
  const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));

  it('gives the codes of RFC 6238', () => {
    assert.equal(RFC_SECRET, 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    assert.equal(totpCode(RFC_SECRET, currentStep(59_000)), '287082');
    assert.equal(totpCode(RFC_SECRET, currentStep(1_111_111_109_000)), '081804');
    assert.equal(totpCode(RFC_SECRET, currentStep(1_234_567_890_000)), '005924');
    assert.equal(totpCode(RFC_SECRET, currentStep(20_000_000_000_000)), '353130');
  });

  it('decodes what it encodes', () => {
    const secret = generateSecret();
    assert.match(secret, /^[A-Z2-7]{32}$/);
    assert.equal(base32Encode(base32Decode(secret)), secret);
    assert.equal(base32Decode(secret.toLowerCase().replace(/(.{4})/g, '$1 ')).toString('hex'), base32Decode(secret).toString('hex'));
  });

  it('accepts the current code and one step of drift either way, nothing further', () => {
    const now = 1_700_000_000_000;
    const step = currentStep(now);
    for (const drift of [-1, 0, 1]) assert.equal(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, step + drift), 0, now), step + drift);
    assert.equal(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, step - 2), 0, now), null);
    assert.equal(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, step + 2), 0, now), null);
  });

  it('accepts a code typed with a space and refuses what is not six digits', () => {
    const now = 1_700_000_000_000;
    const code = totpCode(RFC_SECRET, currentStep(now));
    assert.equal(verifyTotp(RFC_SECRET, `${code.slice(0, 3)} ${code.slice(3)}`, 0, now), currentStep(now));
    for (const wrong of ['', '12345', '1234567', 'abcdef', `${code}0`, `-${code.slice(1)}`]) assert.equal(verifyTotp(RFC_SECRET, wrong, 0, now), null, JSON.stringify(wrong));
  });

  it('refuses a code already used, and older ones', () => {
    const now = 1_700_000_000_000;
    const step = currentStep(now);
    assert.equal(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, step), step, now), null);
    assert.equal(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, step - 1), step, now), null);
    assert.equal(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, step + 1), step, now), step + 1);
  });

  it('builds the URI read by authenticator apps', () => {
    const url = new URL(otpauthUrl(RFC_SECRET, 'ana@example.org', 'Hope'));
    assert.equal(url.protocol, 'otpauth:');
    assert.equal(decodeURIComponent(url.pathname), '/Hope:ana@example.org');
    assert.deepEqual(Object.fromEntries(url.searchParams), { secret: RFC_SECRET, issuer: 'Hope', algorithm: 'SHA1', digits: '6', period: '30' });
  });
});

describe('authenticate', () => {
  it('needs the password and the code, and answers the same for every failure', async () => {
    const { id, secret } = await createUser('ana@example.org');
    const code = () => totpCode(secret, currentStep());
    assert.equal(await authenticate('ana@example.org', 'wrong password', code()), null);
    assert.equal(await authenticate('ana@example.org', PASSWORD, '000000'), null);
    assert.equal(await authenticate('ana@example.org', PASSWORD, ''), null);
    assert.equal(await authenticate('nobody@example.org', PASSWORD, code()), null);
    assert.deepEqual(await authenticate('  ANA@Example.org ', PASSWORD, code()), { id, email: 'ana@example.org', name: 'Test', locale: 'fr' });
  });

  it('refuses the same code a second time', async () => {
    const { secret } = await createUser('replay@example.org');
    const code = totpCode(secret, currentStep());
    assert.ok(await authenticate('replay@example.org', PASSWORD, code));
    assert.equal(await authenticate('replay@example.org', PASSWORD, code), null);
    assert.ok(await authenticate('replay@example.org', PASSWORD, totpCode(secret, currentStep() + 1)));
  });

  it('refuses an account without authenticator app', async () => {
    await createUser('no-totp@example.org', false);
    assert.equal(await authenticate('no-totp@example.org', PASSWORD, '123456'), null);
  });
});

describe('sessions', () => {
  it('stores only a hash of the token', async () => {
    const { id } = await createUser('session@example.org');
    const { token, expiresAt } = createSession(id);
    assert.ok(token.length >= 43);
    const rows = db.select().from(sessions).where(eq(sessions.userId, id)).all();
    assert.equal(rows.length, 1);
    assert.notEqual(rows[0].id, token);
    assert.match(rows[0].id, /^[0-9a-f]{64}$/);
    assert.ok(Math.abs(expiresAt.getTime() - Date.now() - SESSION_DAYS * 86_400_000) < 5000);
    assert.equal(getSessionUser(token)?.email, 'session@example.org');
    assert.equal(getSessionUser(rows[0].id), null, 'the stored hash is not a token');
    assert.equal(getSessionUser('unknown'), null);
  });

  it('ends at sign-out and at expiry', async () => {
    const { id } = await createUser('expiry@example.org');
    const first = createSession(id);
    deleteSession(first.token);
    assert.equal(getSessionUser(first.token), null);

    const second = createSession(id);
    mock.timers.enable({ apis: ['Date'], now: Date.now() + (SESSION_DAYS + 1) * 86_400_000 });
    assert.equal(getSessionUser(second.token), null);
    assert.equal(db.select().from(sessions).where(eq(sessions.userId, id)).all().length, 0, 'an expired session is deleted');
  });

  it('disappears with its account', async () => {
    const { id } = await createUser('deleted@example.org');
    const { token } = createSession(id);
    db.delete(users).where(eq(users.id, id)).run();
    assert.equal(getSessionUser(token), null);
  });
});

describe('login throttling', () => {
  it('locks a key after eight failures, for fifteen minutes', () => {
    const start = Date.now();
    mock.timers.enable({ apis: ['Date'], now: start });
    for (let i = 0; i < 7; i++) recordFailure('ip:203.0.113.1');
    assert.equal(isLocked('ip:203.0.113.1'), false);
    recordFailure('ip:203.0.113.1');
    assert.equal(isLocked('ip:203.0.113.1'), true);
    assert.equal(isLocked('ip:203.0.113.2'), false, 'other keys are not affected');
    mock.timers.setTime(start + 14 * 60_000);
    assert.equal(isLocked('ip:203.0.113.1'), true);
    mock.timers.setTime(start + 15 * 60_000 + 1);
    assert.equal(isLocked('ip:203.0.113.1'), false);
  });

  it('forgets the failures after a successful sign-in', () => {
    for (let i = 0; i < 8; i++) recordFailure('email:ana@example.org');
    assert.equal(isLocked('email:ana@example.org'), true);
    clearFailures('email:ana@example.org');
    assert.equal(isLocked('email:ana@example.org'), false);
  });

  it('keeps a bounded list whatever is typed', () => {
    for (let i = 0; i < 10_050; i++) recordFailure(`email:${i}@example.org`);
    // The most recent keys are still counted.
    for (let i = 0; i < 7; i++) recordFailure('email:10049@example.org');
    assert.equal(isLocked('email:10049@example.org'), true);
    assert.equal(isLocked('email:0@example.org'), false);
  });
});
