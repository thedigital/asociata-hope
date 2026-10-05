/**
 * Checks on the built server (`pnpm test:server` builds it first): redirects and headers of the
 * middleware, the contact form and the admin sign-in, as a browser would use them. The server runs
 * on a scratch database and data directory; nothing outside this machine is called.
 */
import { SCRATCH } from '../helpers/scratch.ts';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { get } from 'node:http';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { eq } from 'drizzle-orm';
import { db, schema } from '../../src/db/client.ts';
import { hashPassword } from '../../src/lib/password.ts';
import { currentStep, generateSecret, totpCode } from '../../src/lib/totp.ts';

const ENTRY = 'dist/server/entry.mjs';
const EMAIL = 'ana@example.org';
const PASSWORD = 'correct horse battery';
const SECRET = generateSecret();
const PDF = Buffer.from('%PDF-1.7\n%test\n');

let server: ChildProcess;
let origin = '';

const freePort = () =>
  new Promise<number>((resolve) => {
    const probe = createServer().listen(0, '127.0.0.1', () => {
      const { port } = probe.address() as { port: number };
      probe.close(() => resolve(port));
    });
  });

before(async () => {
  assert.ok(existsSync(ENTRY), `${ENTRY} is missing: run "pnpm test:server", which builds the site first`);
  db.insert(schema.users).values({ email: EMAIL, name: 'Ana', passwordHash: await hashPassword(PASSWORD), totpSecret: SECRET, locale: 'fr' }).run();
  db.insert(schema.redirects)
    .values([
      { fromPath: '/old-page', toPath: '/despre-noi', status: 301 },
      { fromPath: '/gone-page', toPath: null, status: 410 },
    ])
    .run();
  db.insert(schema.animals)
    .values([
      { species: 'dog', adoptionType: 'real', slug: 'rex', name: 'Rex', status: 'published' },
      { species: 'dog', adoptionType: 'real', slug: 'azor', name: 'Azor', status: 'deceased' },
      { species: 'dog', adoptionType: 'real', slug: 'draft', name: 'Draft', status: 'draft' },
      { species: 'cat', adoptionType: 'virtual', slug: 'adopted', name: 'Adopted', status: 'adopted' },
    ])
    .run();

  const port = await freePort();
  origin = `http://127.0.0.1:${port}`;
  const { STRIPE_SECRET_KEY: _stripe, SMTP_URL: _smtp, SITE_URL: _site, ...env } = process.env;
  server = spawn(process.execPath, [ENTRY], { env: { ...env, HOST: '127.0.0.1', PORT: String(port) }, stdio: ['ignore', 'ignore', 'inherit'] });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await fetch(`${origin}/robots.txt`).then((r) => r.ok, () => false)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.fail('the server did not start');
});
after(() => void server?.kill());

type Options = { headers?: Record<string, string>; form?: Record<string, string | File>; body?: BodyInit; multipart?: boolean };

/** One request, never following redirects. A `form` is posted as a browser would, with its Origin. */
function request(path: string, { headers = {}, form, body, multipart }: Options = {}) {
  let payload = body;
  if (form) {
    const data = new FormData();
    for (const [name, value] of Object.entries(form)) data.set(name, value);
    payload = multipart ? data : new URLSearchParams(data as unknown as Record<string, string>);
  }
  return fetch(origin + path, { method: payload === undefined ? 'GET' : 'POST', redirect: 'manual', body: payload, headers: { ...(form ? { origin } : {}), ...headers } });
}
const location = async (path: string, headers?: Record<string, string>) => {
  const response = await request(path, { headers });
  return [response.status, response.headers.get('location')];
};

describe('redirects', () => {
  it('removes the trailing slash and keeps the query', async () => {
    assert.deepEqual(await location('/despre-noi/'), [301, '/despre-noi']);
    assert.deepEqual(await location('/en/adoptii-caini/?color=black'), [301, '/en/adoptii-caini?color=black']);
  });

  it('serves Romanian without prefix', async () => {
    assert.deepEqual(await location('/ro'), [301, '/']);
    assert.deepEqual(await location('/ro/despre-noi?x=1'), [301, '/despre-noi?x=1']);
  });

  it('moves the Wix documents, and the old redirection form in one hop', async () => {
    assert.deepEqual(await location('/_files/ugd/313291_abc.pdf'), [301, '/files/313291_abc.pdf']);
    assert.deepEqual(await location('/fr/_files/ugd/313291_abc.pdf'), [301, '/files/313291_abc.pdf']);
    assert.deepEqual(await location('/_files/ugd/313291_0ee1b28245244859bb09190fb50db677.pdf'), [301, '/formular-230.pdf']);
    assert.deepEqual(await location('/files/313291_0ee1b28245244859bb09190fb50db677.pdf'), [301, '/formular-230.pdf']);
  });

  it('replaces the Wix sitemaps by the single one', async () => {
    for (const name of ['pages-sitemap.xml', 'en_en-sitemap.xml', 'fr_fr-sitemap.xml']) assert.deepEqual(await location(`/${name}`), [301, '/sitemap.xml']);
    assert.equal((await request('/sitemap.xml')).status, 200);
  });

  it('applies the rules of the admin: 301 with a target, 410 without', async () => {
    assert.deepEqual(await location('/old-page'), [301, '/despre-noi']);
    assert.deepEqual(await location('/gone-page'), [410, null]);
  });

  it('answers 410 for the shop in every language', async () => {
    for (const path of ['/shop', '/en/shop', '/fr/shop', '/de/shop']) assert.equal((await request(path)).status, 410, path);
  });

  it('sends the page of a deceased animal to "In memoriam", in the same language', async () => {
    assert.deepEqual(await location('/adoptii-caini/azor'), [301, '/in-memoriam']);
    assert.deepEqual(await location('/de/adoptii-caini/azor'), [301, '/de/in-memoriam']);
  });

  it('shows published animals only', async () => {
    assert.equal((await request('/adoptii-caini/rex')).status, 200);
    assert.equal((await request('/adoptii-caini/draft')).status, 404);
    assert.equal((await request('/adoptii-virtuale-pisici/adopted')).status, 404);
    assert.equal((await request('/adoptii-caini/unknown')).status, 404);
  });

  it('never redirects to another site', async () => {
    for (const path of ['//evil.example/', '///evil.example/', '/ro//evil.example', '/ro/%5Cevil.example', '/ro/%2F%2Fevil.example', '/%5C%5Cevil.example/', '/ro/%09/evil.example']) {
      const target = (await request(path)).headers.get('location');
      if (target !== null) assert.match(target, /^\/(?![/\\])/, `${path} → ${target}`);
    }
  });

  it('serves no file outside the uploads', async () => {
    for (const path of ['/files/..%2F..%2Fhope.db', '/files/hope.db', '/media/animals/400/..%2F..%2Fhope.db', '/media/animals/401/x.jpg', '/media/videos/..%2Fhope.db', '/_files/ugd/..%2Fhope.db']) {
      assert.equal((await request(path)).status, 404, path);
    }
  });
});

describe('language of the first visit', () => {
  const cookie = async (path: string, headers: Record<string, string>) => {
    const response = await request(path, { headers });
    return [response.status, response.headers.get('location'), response.headers.get('set-cookie')?.split(';')[0] ?? null];
  };

  it('never redirects a request without Accept-Language, so crawlers reach every language', async () => {
    // `fetch` always sends the header: this request is made without it.
    const bare = (path: string) => new Promise((resolve) => get(origin + path, (response) => resolve([response.statusCode, response.headers.location ?? null, response.headers['set-cookie'] ?? null])).end());
    for (const path of ['/', '/en', '/fr', '/de', '/contact', '/de/contact']) assert.deepEqual(await bare(path), [200, null, null], path);
  });

  it('does not redirect when the header names no language', async () => {
    for (const value of ['*', '*;q=0.5', ' ', 'x']) assert.deepEqual(await cookie('/fr', { 'accept-language': value }), [200, null, null], value);
  });

  it('sends a first visit to the language of the browser, English when it is not served', async () => {
    assert.deepEqual(await cookie('/', { 'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8' }), [302, '/fr', 'lang=fr']);
    assert.deepEqual(await cookie('/contact?reason=other', { 'accept-language': 'de' }), [302, '/de/contact?reason=other', 'lang=de']);
    assert.deepEqual(await cookie('/fr/contact', { 'accept-language': 'ro' }), [302, '/contact', 'lang=ro']);
    assert.deepEqual(await cookie('/', { 'accept-language': 'ja,zh;q=0.8' }), [302, '/en', 'lang=en']);
    assert.deepEqual(await cookie('/', { 'accept-language': 'en;q=0.5, de;q=0.9' }), [302, '/de', 'lang=de']);
  });

  it('records the choice without redirecting when the URL already has that language', async () => {
    assert.deepEqual(await cookie('/fr', { 'accept-language': 'fr' }), [200, null, 'lang=fr']);
  });

  it('leaves the visitor alone once the cookie exists', async () => {
    assert.deepEqual(await cookie('/', { 'accept-language': 'fr', cookie: 'lang=ro' }), [200, null, null]);
    assert.deepEqual(await cookie('/de', { 'accept-language': 'fr', cookie: 'lang=fr' }), [200, null, null]);
  });

  it('only concerns pages: not files or the admin', async () => {
    for (const path of ['/sitemap.xml', '/robots.txt', '/formular-230.pdf', '/admin/login']) {
      assert.deepEqual(await cookie(path, { 'accept-language': 'fr' }), [200, null, null], path);
    }
  });
});

describe('headers', () => {
  it('sends the security headers and a policy with a nonce on every page', async () => {
    const first = await request('/');
    const second = await request('/');
    const nonce = (response: Response) => response.headers.get('content-security-policy')?.match(/script-src 'self' 'nonce-([^']+)'/)?.[1];
    assert.ok(nonce(first));
    assert.notEqual(nonce(first), nonce(second), 'a nonce is used once');
    const policy = first.headers.get('content-security-policy')!;
    for (const directive of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "frame-ancestors 'self'", "form-action 'self' https://checkout.stripe.com"]) assert.ok(policy.includes(directive), directive);
    assert.ok(!policy.includes('unsafe'), 'the public policy allows nothing inline without the nonce');
    assert.equal(first.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(first.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.equal(first.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.ok(first.headers.get('permissions-policy'));
    assert.equal(first.headers.get('cache-control'), 'no-cache');
    // Every inline script and style of the page carries the nonce of its own response.
    const html = await first.text();
    for (const [tag] of html.matchAll(/<(?:script|style)\b[^>]*>/g)) {
      if (!/\bsrc=/.test(tag) && !/type="application\/ld\+json"/.test(tag)) assert.ok(tag.includes(`nonce="${nonce(first)}"`), tag);
    }
    assert.ok(!/\sstyle="/.test(html), 'public pages have no style attribute');
  });

  it('keeps the admin out of caches and search engines', async () => {
    const response = await request('/admin/login');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.ok(response.headers.get('content-security-policy'));
  });

  it('marks the 404 page noindex', async () => {
    const response = await request('/no-such-page');
    assert.equal(response.status, 404);
    assert.match(await response.text(), /<meta name="robots" content="noindex/);
  });
});

describe('form posts', () => {
  const urlencoded = { 'content-type': 'application/x-www-form-urlencoded' };

  it('refuses a form coming from another site or without origin', async () => {
    for (const path of ['/contact', '/donate', '/admin/login', '/admin/logout']) {
      assert.equal((await request(path, { body: 'a=1', headers: { ...urlencoded, origin: 'https://evil.example' } })).status, 403, path);
      assert.equal((await request(path, { body: 'a=1', headers: urlencoded })).status, 403, path);
    }
  });

  it('refuses what is not a form, and other methods', async () => {
    for (const path of ['/contact', '/donate', '/admin/login']) {
      assert.equal((await request(path, { body: '{}', headers: { 'content-type': 'application/json', origin } })).status, 415, path);
      assert.equal((await request(path, { body: '{}', headers: { 'content-type': 'application/json', origin: 'https://evil.example' } })).status, 415, path);
      assert.equal((await fetch(origin + path, { method: 'DELETE', headers: { origin } })).status, 415, path);
    }
  });

  it('sends the donor back when card payment is not configured', async () => {
    const response = await request('/donate', { form: { locale: 'fr', currency: 'eur', frequency: 'once', amount: '10' } });
    assert.deepEqual([response.status, response.headers.get('location')], [303, '/fr/doneaza?error=unavailable#card']);
  });
});

describe('contact form', () => {
  const filled = (fields: Record<string, string | File> = {}) => ({
    reason: 'other',
    firstName: 'Ana',
    lastName: 'Pop',
    email: 'ana@example.org',
    message: 'Buna ziua',
    website: '',
    t: (Date.now() - 10_000).toString(36),
    ...fields,
  });
  const messages = () => db.select().from(schema.contactMessages).all();

  it('shows the form, with the reason and the animal given by the link', async () => {
    const html = await (await request('/fr/contact?reason=adopt-dog&animal=Rex')).text();
    assert.match(html, /<form[^>]+method="post"/i);
    assert.match(html, /<input[^>]*name="animalName"[^>]*value="Rex"|<input[^>]*value="Rex"[^>]*name="animalName"/);
    assert.match(html, /<input[^>]*value="adopt-dog"[^>]*checked/);
  });

  it('answers 422 and stores nothing when a field is missing', async () => {
    const response = await request('/contact', { form: filled({ email: 'not-an-address' }) });
    assert.equal(response.status, 422);
    assert.match(await response.text(), /Buna ziua/, 'what was typed is shown again');
    assert.equal(messages().length, 0);
  });

  it('gives bots the normal answer but stores nothing', async () => {
    for (const fields of [{ website: 'https://spam.example' }, { t: Date.now().toString(36) }, { t: '' }] as Record<string, string>[]) {
      const response = await request('/contact', { form: filled(fields) });
      assert.deepEqual([response.status, response.headers.get('location')], [303, '/contact?sent=1']);
    }
    assert.equal(messages().length, 0);
  });

  it('stores a message and confirms it in the language of the visitor', async () => {
    const response = await request('/fr/contact', { form: filled({ message: '<b>Bonjour</b>' }) });
    assert.deepEqual([response.status, response.headers.get('location')], [303, '/fr/contact?sent=1']);
    const [message] = messages();
    assert.deepEqual([message.locale, message.reason, message.email, message.message], ['fr', 'other', 'ana@example.org', '<b>Bonjour</b>']);
    assert.equal((await request('/fr/contact?sent=1')).status, 200);
  });

  it('refuses a redirection without its form, and a request too large to hold one', async () => {
    assert.equal((await request('/contact', { form: filled({ reason: 'redirection' }), multipart: true })).status, 422);
    const huge = new File([PDF, Buffer.alloc(6 * 1024 * 1024)], 'formular.pdf');
    assert.equal((await request('/contact', { form: filled({ reason: 'redirection', attachment: huge }), multipart: true })).status, 413);
    assert.equal(messages().length, 1);
  });

  it('keeps the attachment of a redirection private', async () => {
    const response = await request('/contact', { form: filled({ reason: 'redirection', attachment: new File([PDF], 'formular.pdf', { type: 'application/pdf' }) }), multipart: true });
    assert.equal(response.status, 303);
    const message = messages().find((m) => m.reason === 'redirection')!;
    assert.deepEqual(readdirSync(join(SCRATCH, 'contact')), [message.attachment]);
    assert.deepEqual(await location(`/admin/attachments/${message.id}`), [302, '/admin/login']);
    assert.equal((await request(`/files/${message.attachment}`)).status, 404);
    assert.equal((await request(`/media/pages/400/${message.attachment}`)).status, 404);
  });

  it('limits the number of messages per address', async () => {
    // Two messages were accepted above; the limit is five per hour.
    for (let i = 0; i < 3; i++) assert.equal((await request('/contact', { form: filled() })).status, 303);
    assert.equal((await request('/contact', { form: filled() })).status, 429);
    assert.equal(messages().length, 5);
  });
});

describe('admin sign-in', () => {
  const signIn = (fields: Record<string, string>) => request('/admin/login', { form: { email: EMAIL, password: PASSWORD, code: totpCode(SECRET, currentStep()), ...fields } });
  const sessionCookie = (response: Response) => response.headers.get('set-cookie') ?? '';
  let cookie = '';

  it('guards every admin path', async () => {
    for (const path of ['/admin', '/admin/animals/1', '/admin/pages', '/admin/pages/despre-noi', '/admin/messages', '/admin/redirects', '/admin/theme', '/admin/attachments/1', '/admin/unknown']) {
      assert.deepEqual(await location(path), [302, '/admin/login'], path);
    }
    assert.deepEqual(await location('/admin', { cookie: 'session=forged' }), [302, '/admin/login']);
    const post = await request('/admin/messages', { form: { id: '1', _action: 'delete' } });
    assert.deepEqual([post.status, post.headers.get('location')], [302, '/admin/login']);
    assert.equal((await request('/admin/login')).status, 200);
  });

  it('answers the same for a wrong password, a wrong code and an unknown account', async () => {
    const answers = [await signIn({ password: 'wrong password!' }), await signIn({ code: '000000' }), await signIn({ email: 'nobody@example.org' })];
    const texts = await Promise.all(answers.map(async (response) => (await response.text()).match(/role="alert"[^>]*>([^<]*)</)?.[1]));
    for (const response of answers) {
      assert.equal(response.status, 401);
      assert.equal(sessionCookie(response), '');
    }
    assert.ok(texts[0]);
    assert.equal(new Set(texts).size, 1);
  });

  it('opens a session with the password and the code', async () => {
    const response = await signIn({});
    assert.deepEqual([response.status, response.headers.get('location')], [302, '/admin']);
    const header = sessionCookie(response);
    assert.match(header, /^session=[\w-]{43};/);
    assert.match(header, /Path=\/admin/);
    assert.match(header, /HttpOnly/i);
    assert.match(header, /SameSite=Lax/i);
    cookie = header.split(';')[0];
    assert.equal((await request('/admin', { headers: { cookie } })).status, 200);
    assert.deepEqual(await location('/admin/login', { cookie }), [302, '/admin']);
    // Only a hash of the token is in the database.
    assert.equal(db.select().from(schema.sessions).all().some((row) => cookie.includes(row.id)), false);
  });

  it('refuses the same code a second time', async () => {
    assert.equal((await signIn({})).status, 401);
  });

  it('serves a contact attachment to a signed-in user only', async () => {
    const message = db.select().from(schema.contactMessages).where(eq(schema.contactMessages.reason, 'redirection')).get()!;
    const response = await request(`/admin/attachments/${message.id}`, { headers: { cookie } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/pdf');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), PDF);
    assert.equal((await request('/admin/attachments/999', { headers: { cookie } })).status, 404);
  });

  it('edits a content page: its text and its SEO fields reach the public page', async () => {
    assert.equal((await request('/admin/pages', { headers: { cookie } })).status, 200);
    assert.equal((await request('/admin/pages/unknown', { headers: { cookie } })).status, 404);
    const fields: Record<string, string> = {};
    for (const locale of ['ro', 'en', 'fr', 'de']) fields[`body_${locale}`] = `<h2>Titlu</h2><p onclick="x()">Text ${locale}</p><script>alert(1)</script>`;
    const invalid = await request('/admin/pages/voluntariat', { form: { ...fields, body_de: ' ' }, headers: { cookie } });
    assert.equal(invalid.status, 422);
    assert.match(await invalid.text(), /Text fr/, 'what was typed is shown again');

    const saved = await request('/admin/pages/voluntariat', { form: { ...fields, seoTitle_fr: 'Devenir bénévole | Hope', seoDescription_fr: 'Une description écrite à la main.' }, headers: { cookie } });
    assert.deepEqual([saved.status, saved.headers.get('location')], [303, '/admin/pages/voluntariat?saved=1']);
    const french = await (await request('/fr/voluntariat')).text();
    assert.match(french, /<title>Devenir bénévole \| Hope<\/title>/);
    assert.match(french, /<meta name="description" content="Une description écrite à la main\."/);
    assert.match(french, /<p>Text fr<\/p>/);
    assert.ok(!french.includes('alert(1)') && !french.includes('onclick'));
    // A field left empty keeps the automatic value.
    assert.match(await (await request('/voluntariat')).text(), /<title>Voluntariat \| Hope<\/title>/);
  });

  it('ends the session at sign-out', async () => {
    const response = await request('/admin/logout', { form: {}, headers: { cookie } });
    assert.deepEqual([response.status, response.headers.get('location')], [303, '/admin/login']);
    assert.deepEqual(await location('/admin', { cookie }), [302, '/admin/login']);
    assert.equal(db.select().from(schema.sessions).all().length, 0);
  });

  it('locks the form after eight failures, even with the right password', async () => {
    // One attempt failed since the last successful sign-in (the replayed code).
    for (let i = 0; i < 7; i++) assert.equal((await signIn({ email: 'other@example.org', password: 'x' })).status, 401);
    const locked = await signIn({ code: totpCode(SECRET, currentStep() + 1) });
    assert.equal(locked.status, 429);
    assert.equal(sessionCookie(locked), '');
  });
});
