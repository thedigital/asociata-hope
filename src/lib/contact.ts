import { db, schema } from '../db/client.ts';
import type { Locale } from '../i18n/config.ts';
import { env } from './env.ts';
import { SITE } from './site.ts';

/** Why the visitor writes. The adoption reasons reveal extra questions, as on the Wix form. */
export const REASONS = ['adopt-dog', 'adopt-cat', 'sponsorship', 'volunteering', 'other'] as const;
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

export type ContactField = 'reason' | 'firstName' | 'lastName' | 'email' | 'animalName' | 'message' | CatChoice | CatText;
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
export function parseContactForm(form: FormData, now = Date.now()): { values: ContactValues; errors: ContactField[]; spam: boolean } {
  const text = (key: string, max: number) => String(form.get(key) ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);
  const reason = REASONS.find((r) => r === form.get('reason')) ?? '';
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
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) errors.push('email');
  if (!values.message) errors.push('message');
  if ((reason === 'adopt-dog' || reason === 'adopt-cat') && !values.animalName) errors.push('animalName');

  // The questionnaire only exists for cat adoptions; answers sent with another reason are ignored.
  if (reason === 'adopt-cat') {
    for (const key of CAT_CHOICE_KEYS) {
      const value = (CAT_CHOICES[key] as readonly string[]).find((option) => option === form.get(key));
      if (value) values.answers[key] = value;
      else errors.push(key);
    }
    for (const key of CAT_TEXTS) {
      const value = text(key, LIMITS.answer);
      if (value) values.answers[key] = value;
      else errors.push(key);
    }
  }

  // Bots fill every field (including the hidden one) and submit instantly.
  const elapsed = now - Number.parseInt(String(form.get('t') ?? ''), 36);
  const spam = Boolean(form.get('website')) || !(elapsed >= MIN_FILL_MS && elapsed <= MAX_FILL_MS);
  return { values, errors, spam };
}

/** At most a few messages per address and per hour, kept in memory. */
const MAX_PER_HOUR = 5;
const recent = new Map<string, number[]>();
export function isRateLimited(address: string, now = Date.now()): boolean {
  const times = (recent.get(address) ?? []).filter((t) => now - t < 3600_000);
  if (times.length >= MAX_PER_HOUR) return true;
  recent.set(address, [...times, now]);
  return false;
}

export function saveContactMessage(values: ContactValues, locale: Locale): number {
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
    })
    .returning({ id: schema.contactMessages.id })
    .get().id;
}

/**
 * E-mails the message to the association when SMTP is configured (SMTP_URL). The message is
 * already saved and visible in the admin, so a mail failure is logged, never shown to the visitor.
 * `describe` renders the answers in the association's language.
 */
export async function notifyContactMessage(values: ContactValues, id: number, describe: (values: ContactValues) => string): Promise<boolean> {
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
    });
    return true;
  } catch (error) {
    console.error(`Contact message #${id}: e-mail notification failed`, error);
    return false;
  }
}
