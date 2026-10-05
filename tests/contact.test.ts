import { SCRATCH } from './helpers/scratch.ts';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { eq } from 'drizzle-orm';
import { db, schema } from '../src/db/client.ts';
import {
  ATTACHMENT_MAX_BYTES,
  CAT_CHOICES,
  CAT_CHOICE_KEYS,
  CAT_TEXTS,
  CONTACT_DIR,
  REASONS,
  deleteContactMessage,
  isRateLimited,
  notifyContactMessage,
  parseContactForm,
  saveContactMessage,
  type Reason,
} from '../src/lib/contact.ts';

const NOW = 1_800_000_000_000;
const PDF = Buffer.from('%PDF-1.7\n%test\n');
const PNG = Buffer.from('\x89PNG\r\n\x1a\n0000', 'latin1');
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const WEBP = Buffer.from('RIFF0000WEBPVP8 ', 'latin1');

/** A form filled by a person ten seconds after the page was shown. */
function form(reason: Reason | string, fields: Record<string, string | File> = {}): FormData {
  const data = new FormData();
  const base: Record<string, string | File> = { reason, firstName: 'Ana', lastName: 'Pop', email: 'ana@example.org', message: 'Buna ziua', website: '', t: (NOW - 10_000).toString(36) };
  if (reason === 'adopt-dog' || reason === 'adopt-cat') base.animalName = 'Lizzie';
  if (reason === 'adopt-cat') {
    for (const key of CAT_CHOICE_KEYS) base[key] = CAT_CHOICES[key][0];
    for (const key of CAT_TEXTS) base[key] = `answer ${key}`;
  }
  if (reason === 'redirection') base.attachment = new File([PDF], 'formular.pdf', { type: 'application/pdf' });
  for (const [name, value] of Object.entries({ ...base, ...fields })) data.set(name, value);
  return data;
}
const parse = (data: FormData) => parseContactForm(data, NOW);

describe('parseContactForm', () => {
  it('accepts a complete form for every reason', async () => {
    for (const reason of REASONS) {
      const result = await parse(form(reason));
      assert.deepEqual(result.errors, [], reason);
      assert.equal(result.spam, false, reason);
      assert.equal(result.values.reason, reason);
      assert.equal(result.attachment !== null, reason === 'redirection', reason);
    }
  });

  it('lists the missing fields', async () => {
    const empty = await parse(form('', { firstName: ' ', lastName: '', email: '', message: '\n' }));
    assert.deepEqual(empty.errors, ['reason', 'firstName', 'lastName', 'email', 'message']);
    assert.deepEqual((await parse(form('unknown'))).errors, ['reason']);
    assert.deepEqual((await parse(form('adopt-dog', { animalName: '' }))).errors, ['animalName']);
    assert.deepEqual((await parse(form('sponsorship', { animalName: '' }))).errors, [], 'the animal is only required to adopt');
  });

  it('refuses what is not an e-mail address', async () => {
    for (const email of ['ana', 'ana@example', '@example.org', 'ana@@example.org', 'ana pop@example.org', 'ana@example.org\nBcc: x@example.org']) {
      assert.deepEqual((await parse(form('other', { email }))).errors, ['email'], JSON.stringify(email));
    }
  });

  it('trims the texts, cuts them at their limit and keeps line breaks as \\n', async () => {
    const { values, errors } = await parse(form('other', { firstName: `  ${'a'.repeat(200)}`, message: `one\r\ntwo${'x'.repeat(6000)}`, animalName: 'b'.repeat(200) }));
    assert.deepEqual(errors, []);
    assert.equal(values.firstName.length, 80);
    assert.equal(values.animalName.length, 80);
    assert.equal(values.message.length, 5000);
    assert.ok(values.message.startsWith('one\ntwo'));
  });

  it('requires the whole questionnaire to adopt a cat, with known answers only', async () => {
    const complete = await parse(form('adopt-cat'));
    assert.deepEqual(Object.keys(complete.values.answers).sort(), [...CAT_CHOICE_KEYS, ...CAT_TEXTS].sort());
    const result = await parse(form('adopt-cat', { housing: 'castle', budget: '', plants: ' ' }));
    assert.deepEqual(result.errors, ['housing', 'budget', 'plants']);
    assert.equal(result.values.answers.housing, undefined);
  });

  it('ignores the questionnaire for the other reasons', async () => {
    const { values, errors } = await parse(form('adopt-dog', { housing: 'owner', plants: 'ficus' }));
    assert.deepEqual(errors, []);
    assert.deepEqual(values.answers, {});
  });

  it('recognises the attachment from its content, not from its name or announced type', async () => {
    for (const [type, data] of Object.entries({ pdf: PDF, png: PNG, jpg: JPG, webp: WEBP })) {
      const { attachment, errors } = await parse(form('redirection', { attachment: new File([data], 'virus.exe', { type: 'application/octet-stream' }) }));
      assert.deepEqual(errors, [], type);
      assert.equal(attachment?.type, type);
      assert.deepEqual(attachment?.data, data);
    }
    const disguised = new File(['<script>alert(1)</script>'], 'formular.pdf', { type: 'application/pdf' });
    assert.deepEqual((await parse(form('redirection', { attachment: disguised }))).errors, ['attachment']);
    assert.deepEqual((await parse(form('redirection', { attachment: new File(['MZ\x90\x00'], 'photo.jpg', { type: 'image/jpeg' }) }))).errors, ['attachment']);
  });

  it('requires the attachment for a redirection, of 5 MB at most', async () => {
    assert.deepEqual((await parse(form('redirection', { attachment: new File([], 'empty.pdf') }))).errors, ['attachment']);
    assert.deepEqual((await parse(form('redirection', { attachment: 'formular.pdf' }))).errors, ['attachment']);
    const pad = (size: number) => new File([PDF, Buffer.alloc(size - PDF.length)], 'formular.pdf');
    assert.deepEqual((await parse(form('redirection', { attachment: pad(ATTACHMENT_MAX_BYTES) }))).errors, []);
    assert.deepEqual((await parse(form('redirection', { attachment: pad(ATTACHMENT_MAX_BYTES + 1) }))).errors, ['attachment']);
  });

  it('ignores a file sent with another reason', async () => {
    const { attachment, errors } = await parse(form('other', { attachment: new File([PDF], 'formular.pdf') }));
    assert.deepEqual(errors, []);
    assert.equal(attachment, null);
  });

  it('flags bot-like submissions: hidden field filled, sent at once, stale or without time', async () => {
    const spam = async (fields: Record<string, string>) => (await parse(form('other', fields))).spam;
    assert.equal(await spam({ website: 'https://spam.example' }), true);
    assert.equal(await spam({ t: (NOW - 2999).toString(36) }), true);
    assert.equal(await spam({ t: (NOW - 3000).toString(36) }), false);
    assert.equal(await spam({ t: (NOW - 24 * 3600_000).toString(36) }), false);
    assert.equal(await spam({ t: (NOW - 24 * 3600_000 - 1).toString(36) }), true);
    assert.equal(await spam({ t: (NOW + 60_000).toString(36) }), true, 'a time in the future');
    assert.equal(await spam({ t: '' }), true);
    assert.equal(await spam({ t: '!!' }), true);
  });
});

describe('isRateLimited', () => {
  it('accepts five messages per address and per hour', () => {
    for (let i = 0; i < 5; i++) assert.equal(isRateLimited('203.0.113.7', NOW + i), false);
    assert.equal(isRateLimited('203.0.113.7', NOW + 10), true);
    assert.equal(isRateLimited('203.0.113.8', NOW + 10), false, 'another address is not affected');
    assert.equal(isRateLimited('203.0.113.7', NOW + 3600_000 - 1), true);
    // One hour after the first message, a place is free again.
    assert.equal(isRateLimited('203.0.113.7', NOW + 3600_000), false);
    assert.equal(isRateLimited('203.0.113.7', NOW + 3600_000), true);
  });
});

describe('stored messages', () => {
  let savedSmtp: string | undefined;
  beforeEach(() => {
    savedSmtp = process.env.SMTP_URL;
    delete process.env.SMTP_URL;
  });
  afterEach(() => {
    if (savedSmtp !== undefined) process.env.SMTP_URL = savedSmtp;
  });
  const row = (id: number) => db.select().from(schema.contactMessages).where(eq(schema.contactMessages.id, id)).get();

  it('stores the message with its answers, in the language of the visitor', async () => {
    const { values } = await parse(form('adopt-cat'));
    const saved = row(saveContactMessage(values, 'fr'))!;
    assert.equal(saved.locale, 'fr');
    assert.equal(saved.reason, 'adopt-cat');
    assert.equal(saved.animalName, 'Lizzie');
    assert.equal(saved.handledAt, null);
    assert.equal(saved.attachment, null);
    assert.deepEqual(JSON.parse(saved.answers), values.answers);
  });

  it('keeps the attachment in the private directory, under a name the visitor did not choose', async () => {
    assert.equal(CONTACT_DIR, join(SCRATCH, 'contact'));
    const { values, attachment } = await parse(form('redirection', { attachment: new File([PDF], '../../evil.pdf') }));
    const id = saveContactMessage(values, 'ro', attachment);
    const file = row(id)!.attachment!;
    assert.match(file, /^[0-9a-f-]{36}\.pdf$/);
    assert.deepEqual(readFileSync(join(CONTACT_DIR, file)), PDF);
    assert.deepEqual(readdirSync(SCRATCH).filter((name) => name.includes('evil')), []);

    deleteContactMessage(id);
    assert.equal(row(id), undefined);
    assert.equal(existsSync(join(CONTACT_DIR, file)), false, 'deleting the message deletes the file');
    deleteContactMessage(id);
  });

  it('sends no e-mail when SMTP is not configured', async () => {
    const { values } = await parse(form('other'));
    assert.equal(await notifyContactMessage(values, 1, () => 'text'), false);
  });
});
