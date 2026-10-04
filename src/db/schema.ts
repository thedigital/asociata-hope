import { sql } from 'drizzle-orm';
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { ADMIN_LOCALES, LOCALES } from '../i18n/config.ts';
import { ADOPTION_TYPES, COLORS, SEXES, SIZES, SPECIES, STATUSES, TRAITS } from '../lib/taxonomy.ts';

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
