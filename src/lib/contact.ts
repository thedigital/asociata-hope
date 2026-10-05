import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/client.ts';
import type { Locale } from '../i18n/config.ts';
import { env } from './env.ts';
import { isEmail, oneOf } from './input.ts';
import { DATA_DIR } from './media.ts';
import { SITE } from './site.ts';

/** Why the visitor writes. The adoption reasons reveal extra questions, as on the Wix form. */
export const REASONS = ['adopt-dog', 'adopt-cat', 'sponsorship', 'volunteering', 'redirection', 'other'] as const;
export type Reason = (typeof REASONS)[number];

/** Single-choice questions asked to people who want to adopt a cat. */
export const CAT_CHOICES = {
  housing: ['owner', 'rent-allowed', 'rent-ask'],
  balcony: ['closed', 'open', 'netted', 'none'],
  nets: ['have', 'willing', 'more-info', 'refuse'],
  absence: ['family', 'friend', 'undecided'],
  budget: ['under-100', '100-200', '200-400', 'over-400'],
  vetCosts: ['yes', 'within-means', 'undecided', 'no'],
} as const;
export type CatChoice = keyof typeof CAT_CHOICES;
export const CAT_CHOICE_KEYS = Object.keys(CAT_CHOICES) as CatChoice[];

/** Free-text questions of the same questionnaire. */
export const CAT_TEXTS = ['previousCats', 'idealEnvironment', 'plants', 'ruralRelatives'] as const;
export type CatText = (typeof CAT_TEXTS)[number];

/**
 * The paper form of the 3.5 % redirection can be joined to a message: a photo or a PDF. The type
 * is read from the content, never from the name or the type announced by the browser.
 */
export const ATTACHMENT_TYPES = { pdf: 'application/pdf', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' } as const;
export type AttachmentType = keyof typeof ATTACHMENT_TYPES;
export const ATTACHMENT_ACCEPT = Object.values(ATTACHMENT_TYPES).join(',');
export const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
/** Largest request accepted by the contact form: the attachment plus the text fields. */
export const CONTACT_MAX_BYTES = ATTACHMENT_MAX_BYTES + 256 * 1024;
export type ContactAttachment = { type: AttachmentType; data: Buffer };
/** Private: outside `uploads/`, only served to signed-in users (`/admin/attachments/{id}`). */
export const CONTACT_DIR = join(DATA_DIR, 'contact');
export const attachmentType = (file: string) => (Object.keys(ATTACHMENT_TYPES) as AttachmentType[]).find((type) => file.endsWith(`.${type}`));
export const attachmentName = (id: number, type: AttachmentType) => `hope-${id}.${type}`;

function sniffAttachment(data: Buffer): AttachmentType | null {
  const ascii = (start: number, end: number) => data.subarray(start, end).toString('latin1');
  if (ascii(0, 5) === '%PDF-') return 'pdf';
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'jpg';
  if (ascii(0, 8) === '\x89PNG\r\n\x1a\n') return 'png';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp';
  return null;
}

export type ContactField = 'reason' | 'firstName' | 'lastName' | 'email' | 'animalName' | 'message' | 'attachment' | CatChoice | CatText;
export type ContactValues = {
  reason: Reason | '';
  firstName: string;
  lastName: string;
  email: string;
  animalName: string;
  message: string;
  answers: Partial<Record<CatChoice | CatText, string>>;
};

const LIMITS = { name: 80, email: 200, animalName: 80, message: 5000, answer: 1000 };
/** A real visitor needs a few seconds to fill the form; a page left open for days is stale. */
const MIN_FILL_MS = 3000;
const MAX_FILL_MS = 24 * 3600_000;

export const emptyContact = (reason: Reason | '' = '', animalName = ''): ContactValues => ({ reason, firstName: '', lastName: '', email: '', animalName, message: '', answers: {} });

/** Reads the form; `errors` lists the fields to correct. `spam` is true for bot-like submissions. */
export async function parseContactForm(form: FormData, now = Date.now()): Promise<{ values: ContactValues; attachment: ContactAttachment | null; errors: ContactField[]; spam: boolean }> {
  const text = (key: string, max: number) => String(form.get(key) ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);
  const reason = oneOf(REASONS, form.get('reason')) ?? '';
  const values: ContactValues = {
    reason,
    firstName: text('firstName', LIMITS.name),
    lastName: text('lastName', LIMITS.name),
    email: text('email', LIMITS.email),
    animalName: text('animalName', LIMITS.animalName),
    message: text('message', LIMITS.message),
    answers: {},
  };
  const errors: ContactField[] = [];
  if (!reason) errors.push('reason');
  if (!values.firstName) errors.push('firstName');
  if (!values.lastName) errors.push('lastName');
  if (!isEmail(values.email)) errors.push('email');
  if (!values.message) errors.push('message');
  if ((reason === 'adopt-dog' || reason === 'adopt-cat') && !values.animalName) errors.push('animalName');

  // The questionnaire only exists for cat adoptions; answers sent with another reason are ignored.
  if (reason === 'adopt-cat') {
    for (const key of CAT_CHOICE_KEYS) {
      const value = oneOf<string>(CAT_CHOICES[key], form.get(key));
      if (value) values.answers[key] = value;
      else errors.push(key);
    }
    for (const key of CAT_TEXTS) {
      const value = text(key, LIMITS.answer);
      if (value) values.answers[key] = value;
      else errors.push(key);
    }
  }

  // The attachment is the filled-in form of the redirection: required for that reason, and a
  // file sent with another reason is ignored.
  let attachment: ContactAttachment | null = null;
  if (reason === 'redirection') {
    const file = form.get('attachment');
    const data = file instanceof File && file.size > 0 && file.size <= ATTACHMENT_MAX_BYTES ? Buffer.from(await file.arrayBuffer()) : null;
    const type = data && sniffAttachment(data);
    if (data && type) attachment = { type, data };
    else errors.push('attachment');
  }

  // Bots fill every field (including the hidden one) and submit instantly.
  const elapsed = now - Number.parseInt(String(form.get('t') ?? ''), 36);
  const spam = Boolean(form.get('website')) || !(elapsed >= MIN_FILL_MS && elapsed <= MAX_FILL_MS);
  return { values, attachment, errors, spam };
}

/** At most a few messages per address and per hour, kept in memory. */
const MAX_PER_HOUR = 5;
const recent = new Map<string, number[]>();
export function isRateLimited(address: string, now = Date.now()): boolean {
  const times = (recent.get(address) ?? []).filter((t) => now - t < 3600_000);
  if (times.length >= MAX_PER_HOUR) return true;
  // Addresses that have not written for an hour are forgotten, so the list stays small.
  if (recent.size >= 10_000) for (const [key, sent] of recent) if (now - sent[sent.length - 1] >= 3600_000) recent.delete(key);
  recent.set(address, [...times, now]);
  return false;
}

export function saveContactMessage(values: ContactValues, locale: Locale, attachment: ContactAttachment | null = null): number {
  let file: string | null = null;
  if (attachment) {
    file = `${randomUUID()}.${attachment.type}`;
    mkdirSync(CONTACT_DIR, { recursive: true });
    writeFileSync(join(CONTACT_DIR, file), attachment.data);
  }
  return db
    .insert(schema.contactMessages)
    .values({
      locale,
      reason: values.reason || 'other',
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      animalName: values.animalName || null,
      message: values.message,
      answers: JSON.stringify(values.answers),
      attachment: file,
    })
    .returning({ id: schema.contactMessages.id })
    .get().id;
}

/** Deletes a message and its attachment. */
export function deleteContactMessage(id: number): void {
  const row = db.delete(schema.contactMessages).where(eq(schema.contactMessages.id, id)).returning({ attachment: schema.contactMessages.attachment }).get();
  if (row?.attachment) rmSync(join(CONTACT_DIR, row.attachment), { force: true });
}

/**
 * E-mails the message to the association when SMTP is configured (SMTP_URL). The message is
 * already saved and visible in the admin, so a mail failure is logged, never shown to the visitor.
 * `describe` renders the answers in the association's language.
 */
export async function notifyContactMessage(values: ContactValues, id: number, describe: (values: ContactValues) => string, attachment: ContactAttachment | null = null): Promise<boolean> {
  const smtpUrl = env('SMTP_URL');
  if (!smtpUrl) return false;
  try {
    const { createTransport } = await import('nodemailer');
    await createTransport(smtpUrl).sendMail({
      from: env('MAIL_FROM') ?? `"${SITE.name}" <${SITE.email}>`,
      to: env('CONTACT_TO') ?? SITE.email,
      // Replying to the notification writes to the visitor. Header injection is impossible: the
      // address was validated and contains no whitespace.
      replyTo: `"${`${values.firstName} ${values.lastName}`.replace(/["\r\n]/g, '')}" <${values.email}>`,
      subject: `[Hope #${id}] ${values.firstName} ${values.lastName}${values.animalName ? ` – ${values.animalName}` : ''}`.replace(/[\r\n]/g, ' '),
      text: describe(values),
      attachments: attachment ? [{ filename: attachmentName(id, attachment.type), content: attachment.data, contentType: ATTACHMENT_TYPES[attachment.type] }] : [],
    });
    return true;
  } catch (error) {
    console.error(`Contact message #${id}: e-mail notification failed`, error);
    return false;
  }
}
