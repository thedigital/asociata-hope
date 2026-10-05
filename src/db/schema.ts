import { sql } from 'drizzle-orm';
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { ADMIN_LOCALES, LOCALES } from '../i18n/config.ts';
import { FALLBACK_RATES, type Rates } from '../lib/exchange-rates.ts';
import { CURRENCIES, type Currency } from '../lib/stripe.ts';
import { ADOPTION_TYPES, CAMPAIGN_SCOPES, CAMPAIGN_STATUSES, COLORS, SEXES, SIZES, SPECIES, STATUSES, TRAITS } from '../lib/taxonomy.ts';

const timestamp = (name: string) => integer(name, { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`);
const flag = (name: string) => integer(name, { mode: 'boolean' }).notNull().default(false);

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  // Base32 secret of the authenticator app. An account without one cannot sign in.
  totpSecret: text('totp_secret'),
  // Time step of the last accepted code, so a code cannot be used twice.
  totpLastStep: integer('totp_last_step').notNull().default(0),
  locale: text('locale', { enum: ADMIN_LOCALES }).notNull().default('ro'),
  // SHA-256 of the token of the link with which the person chooses a password and enrols an
  // authenticator app (src/lib/admin-users.ts). Cleared once used.
  setupTokenHash: text('setup_token_hash'),
  setupExpiresAt: integer('setup_expires_at', { mode: 'timestamp' }),
  createdAt: timestamp('created_at'),
});

export const sessions = sqliteTable('sessions', {
  // SHA-256 of the token: the raw token only ever lives in the cookie.
  id: text('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
});

/**
 * One record = one public URL: /{COLLECTION_PATHS[species][adoptionType]}/{slug}.
 * An animal is either a real adoption or a virtual one (sponsorship), never both.
 */
export const animals = sqliteTable(
  'animals',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    species: text('species', { enum: SPECIES }).notNull(),
    adoptionType: text('adoption_type', { enum: ADOPTION_TYPES }).notNull(),
    slug: text('slug').notNull(),
    // Deliberately outside the translations table: names are never translated.
    name: text('name').notNull(),
    sex: text('sex', { enum: SEXES }),
    size: text('size', { enum: SIZES }),
    color: text('color', { enum: COLORS }),
    // ISO date (YYYY-MM-DD); the displayed age is computed from it.
    birthDate: text('birth_date'),
    // True when the date was derived from an age ("3 ani") rather than entered as a date.
    birthDateEstimated: flag('birth_date_estimated'),
    vaccinated: flag('vaccinated'),
    sterilized: flag('sterilized'),
    dewormed: flag('dewormed'),
    videoUrl: text('video_url'),
    videoFile: text('video_file'),
    status: text('status', { enum: STATUSES }).notNull().default('draft'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at'),
    updatedAt: timestamp('updated_at'),
  },
  (t) => [
    uniqueIndex('animals_collection_slug').on(t.species, t.adoptionType, t.slug),
    index('animals_listing').on(t.species, t.adoptionType, t.status, t.sortOrder),
  ],
);

export const animalTraits = sqliteTable(
  'animal_traits',
  {
    animalId: integer('animal_id').notNull().references(() => animals.id, { onDelete: 'cascade' }),
    trait: text('trait', { enum: TRAITS }).notNull(),
    position: integer('position').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.animalId, t.trait] }), index('animal_traits_trait').on(t.trait)],
);

export const animalTranslations = sqliteTable(
  'animal_translations',
  {
    animalId: integer('animal_id').notNull().references(() => animals.id, { onDelete: 'cascade' }),
    locale: text('locale', { enum: LOCALES }).notNull(),
    description: text('description').notNull().default(''),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
  },
  (t) => [primaryKey({ columns: [t.animalId, t.locale] })],
);

export const animalPhotos = sqliteTable(
  'animal_photos',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    animalId: integer('animal_id').notNull().references(() => animals.id, { onDelete: 'cascade' }),
    file: text('file').notNull(),
    alt: text('alt'),
    width: integer('width'),
    height: integer('height'),
    // Position 0 is the main picture.
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('animal_photos_animal').on(t.animalId, t.sortOrder)],
);

/** Content pages (despre-noi, voluntariat…): the slug is shared by every language. */
export const pages = sqliteTable('pages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  updatedAt: timestamp('updated_at'),
});

export const pageTranslations = sqliteTable(
  'page_translations',
  {
    pageId: integer('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
    locale: text('locale', { enum: LOCALES }).notNull(),
    title: text('title').notNull(),
    body: text('body').notNull().default(''),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
  },
  (t) => [primaryKey({ columns: [t.pageId, t.locale] })],
);

/** Redirects managed from the admin (legacy Wix URLs, removed animals). Null `toPath` = 410 Gone. */
export const redirects = sqliteTable('redirects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fromPath: text('from_path').notNull().unique(),
  toPath: text('to_path'),
  status: integer('status').notNull().default(301),
  createdAt: timestamp('created_at'),
});

/** Site-wide settings changed from the admin, one JSON value per key (`theme`: see src/lib/themes.ts). */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

/** Messages sent through the public contact form. `answers` is the JSON of the cat adoption questionnaire. */
export const contactMessages = sqliteTable(
  'contact_messages',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    locale: text('locale', { enum: LOCALES }).notNull(),
    reason: text('reason', { enum: ['adopt-dog', 'adopt-cat', 'sponsorship', 'volunteering', 'redirection', 'other'] }).notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').notNull(),
    animalName: text('animal_name'),
    message: text('message').notNull(),
    answers: text('answers').notNull().default('{}'),
    // File name in `data/contact/` of the document joined to the message, if any.
    attachment: text('attachment'),
    // Set when someone at the association has dealt with the message.
    handledAt: integer('handled_at', { mode: 'timestamp' }),
    createdAt: timestamp('created_at'),
  },
  (t) => [index('contact_messages_created').on(t.createdAt)],
);

/**
 * Fundraising campaigns, each with a public page at /campanii/{slug}. A campaign is permanent (no goal,
 * no end) or temporary: a goal and a last day, set together. Its texts are in `campaign_translations`.
 */
export const campaigns = sqliteTable('campaigns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  scope: text('scope', { enum: CAMPAIGN_SCOPES }).notNull(),
  status: text('status', { enum: CAMPAIGN_STATUSES }).notNull().default('draft'),
  // The animal the money is for, when the scope is `animal`.
  animalId: integer('animal_id').references(() => animals.id, { onDelete: 'set null' }),
  // Temporary campaign only: amount to reach, in whole units of `currency`, and last day (ISO date, Romanian time).
  // Gifts are accepted in every currency; `currency` is only the one of the goal.
  goalAmount: integer('goal_amount'),
  currency: text('currency', { enum: CURRENCIES }).notNull().default('ron'),
  endsOn: text('ends_on'),
  // Gifts received outside the site (transfer, cash), entered by hand per currency, in whole units, and added to the card donations.
  offlineAmounts: text('offline_amounts', { mode: 'json' }).$type<Partial<Record<Currency, number>>>().notNull().default({}),
  // Exchange rates of the day the campaign was created: gifts come in every currency, the total shown is approximate.
  rates: text('rates', { mode: 'json' }).$type<Rates>().notNull().default(FALLBACK_RATES),
  // File name in `data/uploads/campaigns/`.
  image: text('image'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

export const campaignTranslations = sqliteTable(
  'campaign_translations',
  {
    campaignId: integer('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
    locale: text('locale', { enum: LOCALES }).notNull(),
    title: text('title').notNull().default(''),
    // One sentence, shown on the cards and under the title of the page.
    summary: text('summary').notNull().default(''),
    description: text('description').notNull().default(''),
  },
  (t) => [primaryKey({ columns: [t.campaignId, t.locale] })],
);

/**
 * Card donations made for a campaign, recorded by the Stripe webhook (src/pages/stripe/webhook.ts).
 * Nothing about the donor is stored: Stripe remains the record of donations.
 */
export const campaignDonations = sqliteTable(
  'campaign_donations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    // Identifier of the Checkout session or of the invoice of a monthly gift: an event received twice is stored once.
    stripeId: text('stripe_id').notNull().unique(),
    campaignId: integer('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
    // Smallest unit of the currency (bani, cents), as Stripe gives it.
    amount: integer('amount').notNull(),
    currency: text('currency', { enum: CURRENCIES }).notNull(),
    createdAt: timestamp('created_at'),
  },
  (t) => [index('campaign_donations_campaign').on(t.campaignId)],
);
