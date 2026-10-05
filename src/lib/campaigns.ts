import { and, eq, inArray, sql } from 'drizzle-orm';
import { db, schema } from '../db/client.ts';
import { DEFAULT_LOCALE, type Locale } from '../i18n/config.ts';
import type { Currency } from './stripe.ts';
import { COLLECTION_PATHS, type CampaignScope } from './taxonomy.ts';

const { animals, animalPhotos, campaigns, campaignDonations, campaignTranslations } = schema;

/** URL segment of the campaigns, the same in every language: /campanii and /campanii/{slug}. */
export const CAMPAIGNS_PATH = 'campanii';

/**
 * `open`: gifts are accepted. A temporary campaign stops when its goal is `reached` or when its
 * last day has passed (`ended`); a permanent one is always open.
 */
export type CampaignState = 'open' | 'reached' | 'ended';

export type Campaign = {
  id: number;
  slug: string;
  path: string;
  scope: CampaignScope;
  /** A temporary campaign has a goal and a last day; a permanent one has neither. */
  temporary: boolean;
  goalAmount: number | null;
  currency: Currency;
  endsOn: string | null;
  /** Whole days left, the last day included; null for a permanent campaign. */
  daysLeft: number | null;
  /** Card donations in the currency of the campaign plus the gifts entered by hand, in whole units. */
  raised: number;
  /** Share of the goal, from 0 to 100; null for a permanent campaign. */
  percent: number | null;
  state: CampaignState;
  /** Picture of the campaign and where it is stored; an animal campaign without one shows the animal. */
  image: { kind: 'campaigns' | 'animals'; file: string } | null;
  /** The animal the money is for, when it has a public page. */
  animal: { name: string; path: string } | null;
  title: string;
  summary: string;
  description: string;
  /** Language of the texts: the Romanian original when the translation is missing. */
  textLocale: Locale;
  updatedAt: Date;
};

/** Date in Romania (ISO `YYYY-MM-DD`): the last day of a campaign ends at midnight there, wherever the server is. */
export const dateInRomania = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

export function campaignState(campaign: { goalAmount: number | null; endsOn: string | null }, raised: number, now = new Date()): CampaignState {
  if (campaign.goalAmount !== null && raised >= campaign.goalAmount) return 'reached';
  if (campaign.endsOn !== null && campaign.endsOn < dateInRomania(now)) return 'ended';
  return 'open';
}

/** Amounts given by card to each campaign, in whole units of the currency of the campaign. */
export function raisedByCard(ids: number[]): Map<number, number> {
  if (!ids.length) return new Map();
  const rows = db
    .select({ id: campaignDonations.campaignId, total: sql<number>`sum(${campaignDonations.amount})` })
    .from(campaignDonations)
    .innerJoin(campaigns, eq(campaigns.id, campaignDonations.campaignId))
    .where(and(inArray(campaignDonations.campaignId, ids), eq(campaignDonations.currency, campaigns.currency)))
    .groupBy(campaignDonations.campaignId)
    .all();
  return new Map(rows.map((row) => [row.id, row.total / 100]));
}

function build(rows: (typeof campaigns.$inferSelect)[], locale: Locale, now = new Date()): Campaign[] {
  const ids = rows.map((row) => row.id);
  if (!ids.length) return [];
  const texts = db.select().from(campaignTranslations).where(inArray(campaignTranslations.campaignId, ids)).all();
  const byCard = raisedByCard(ids);
  const animalIds = rows.map((row) => row.animalId).filter((id): id is number => id !== null);
  const linked = animalIds.length ? db.select().from(animals).where(and(inArray(animals.id, animalIds), eq(animals.status, 'published'))).all() : [];
  const photos = linked.length ? db.select().from(animalPhotos).where(and(inArray(animalPhotos.animalId, linked.map((a) => a.id)), eq(animalPhotos.sortOrder, 0))).all() : [];
  const today = Date.parse(dateInRomania(now));

  return rows.map((row) => {
    const own = texts.find((t) => t.campaignId === row.id && t.locale === locale);
    const text = own?.title ? own : texts.find((t) => t.campaignId === row.id && t.locale === DEFAULT_LOCALE);
    const animal = linked.find((a) => a.id === row.animalId);
    const photo = animal && photos.find((p) => p.animalId === animal.id);
    const raised = row.offlineAmount + (byCard.get(row.id) ?? 0);
    return {
      id: row.id,
      slug: row.slug,
      path: `/${CAMPAIGNS_PATH}/${row.slug}`,
      scope: row.scope,
      temporary: row.goalAmount !== null,
      goalAmount: row.goalAmount,
      currency: row.currency,
      endsOn: row.endsOn,
      daysLeft: row.endsOn ? Math.max(0, Math.round((Date.parse(row.endsOn) - today) / 86_400_000) + 1) : null,
      raised,
      percent: row.goalAmount ? Math.min(100, Math.floor((raised / row.goalAmount) * 100)) : null,
      state: campaignState(row, raised, now),
      image: row.image ? { kind: 'campaigns', file: row.image } : photo ? { kind: 'animals', file: photo.file } : null,
      animal: animal ? { name: animal.name, path: `/${COLLECTION_PATHS[animal.species][animal.adoptionType]}/${animal.slug}` } : null,
      title: text?.title ?? row.slug,
      summary: text?.summary ?? '',
      description: text?.description ?? '',
      textLocale: text?.locale ?? locale,
      updatedAt: row.updatedAt,
    };
  });
}

/**
 * Published campaigns: the open ones first, those that end soonest at the top and the permanent
 * ones after them, then the closed ones, the most recent first.
 */
export function listCampaigns(locale: Locale, now = new Date()): Campaign[] {
  const all = build(db.select().from(campaigns).where(eq(campaigns.status, 'published')).all(), locale, now);
  const open = all.filter((c) => c.state === 'open').sort((a, b) => (a.endsOn ?? '9999').localeCompare(b.endsOn ?? '9999') || a.id - b.id);
  const closed = all.filter((c) => c.state !== 'open').sort((a, b) => (b.endsOn ?? '').localeCompare(a.endsOn ?? '') || b.id - a.id);
  return [...open, ...closed];
}

export function getCampaign(slug: string, locale: Locale, now = new Date()): Campaign | null {
  return build(db.select().from(campaigns).where(and(eq(campaigns.slug, slug), eq(campaigns.status, 'published'))).all(), locale, now)[0] ?? null;
}

/** The open campaign for an animal, shown on its page. */
export function campaignForAnimal(animalId: number, locale: Locale, now = new Date()): Campaign | null {
  const rows = db.select().from(campaigns).where(and(eq(campaigns.animalId, animalId), eq(campaigns.scope, 'animal'), eq(campaigns.status, 'published'))).all();
  return build(rows, locale, now).find((campaign) => campaign.state === 'open') ?? null;
}

/** Every published campaign URL path (without language prefix), for the sitemap. */
export function listCampaignPaths(): { path: string; updatedAt: Date }[] {
  return db
    .select({ slug: campaigns.slug, updatedAt: campaigns.updatedAt })
    .from(campaigns)
    .where(eq(campaigns.status, 'published'))
    .all()
    .map((row) => ({ path: `/${CAMPAIGNS_PATH}/${row.slug}`, updatedAt: row.updatedAt }));
}

/** "1.500 RON", "€1,500": a whole amount in the way of the language. */
export const formatMoney = (amount: number, currency: Currency, locale: Locale) =>
  new Intl.NumberFormat(locale, { style: 'currency', currency: currency.toUpperCase(), maximumFractionDigits: 0 }).format(Math.floor(amount));

/** "24 decembrie 2026": the last day of a campaign, in the language of the page. */
export const formatDay = (isoDate: string, locale: Locale) => new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${isoDate}T00:00:00Z`));
