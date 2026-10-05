import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { db, schema } from '../db/client.ts';
import { DEFAULT_LOCALE, type Locale } from '../i18n/config.ts';
import { convert, type Rates } from './exchange-rates.ts';
import { CURRENCIES, type Currency } from './stripe.ts';
import { COLLECTION_PATHS, type CampaignScope } from './taxonomy.ts';

const { animals, animalPhotos, campaigns, campaignDonations, campaignTranslations } = schema;

/** URL segment of the campaigns, the same in every language: /campanii and /campanii/{slug}. */
export const CAMPAIGNS_PATH = 'campanii';

/** Currency in which each language shows the amounts of a campaign. */
export const LOCALE_CURRENCIES: Record<Locale, Currency> = { ro: 'ron', en: 'usd', fr: 'eur', de: 'eur' };

/** An amount in whole units, as it is written on a page; `approximate` when it comes from a conversion. */
export type ShownAmount = { amount: number; currency: Currency; approximate: boolean };

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
  /** Currency of the goal. Gifts are accepted in every currency. */
  currency: Currency;
  endsOn: string | null;
  /** Whole days left, the last day included; null for a permanent campaign. */
  daysLeft: number | null;
  /** Card donations plus the gifts entered by hand, converted to the currency of the goal with the rates of the campaign. */
  raised: number;
  /** The same and the goal, in the currency of the language of the page. */
  shown: { raised: ShownAmount; goal: ShownAmount | null };
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

/** Amounts given by card to each campaign, per currency, in whole units. */
export function raisedByCard(ids: number[]): Map<number, Partial<Record<Currency, number>>> {
  const byCampaign = new Map<number, Partial<Record<Currency, number>>>();
  if (!ids.length) return byCampaign;
  const rows = db
    .select({ id: campaignDonations.campaignId, currency: campaignDonations.currency, total: sql<number>`sum(${campaignDonations.amount})` })
    .from(campaignDonations)
    .where(inArray(campaignDonations.campaignId, ids))
    .groupBy(campaignDonations.campaignId, campaignDonations.currency)
    .all();
  for (const row of rows) byCampaign.set(row.id, { ...byCampaign.get(row.id), [row.currency]: row.total / 100 });
  return byCampaign;
}

/**
 * What a campaign received: the real amounts per currency (card donations plus gifts entered by
 * hand), and `total`, which converts them to one currency with the rates stored at its creation.
 */
export function campaignTotals(campaign: { offlineAmounts: Partial<Record<Currency, number>>; rates: Rates }, card: Partial<Record<Currency, number>> = {}) {
  const received = Object.fromEntries(CURRENCIES.map((c) => [c, (card[c] ?? 0) + (campaign.offlineAmounts[c] ?? 0)])) as Record<Currency, number>;
  const total = (currency: Currency): ShownAmount => ({
    amount: CURRENCIES.reduce((sum, c) => sum + convert(received[c], c, currency, campaign.rates), 0),
    currency,
    approximate: CURRENCIES.some((c) => c !== currency && received[c] > 0),
  });
  return { received, total };
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
    const { total } = campaignTotals(row, byCard.get(row.id));
    const raised = total(row.currency).amount;
    const shownIn = LOCALE_CURRENCIES[locale];
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
      shown: {
        raised: total(shownIn),
        goal: row.goalAmount === null ? null : { amount: convert(row.goalAmount, row.currency, shownIn, row.rates), currency: shownIn, approximate: shownIn !== row.currency },
      },
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

/** Animals that have an open campaign: marked on their cards, and a filter of the lists. */
export function animalsWithCampaign(now = new Date()): Set<number> {
  const rows = db.select().from(campaigns).where(and(eq(campaigns.scope, 'animal'), eq(campaigns.status, 'published'), isNotNull(campaigns.animalId))).all();
  const byCard = raisedByCard(rows.map((row) => row.id));
  const open = rows.filter((row) => campaignState(row, campaignTotals(row, byCard.get(row.id)).total(row.currency).amount, now) === 'open');
  return new Set(open.map((row) => row.animalId!));
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

/** The same for an amount that may come from a conversion, in the admin: "≈ 1 500 €". */
export const formatShown = (shown: ShownAmount, locale: Locale) => `${shown.approximate ? '≈\u00a0' : ''}${formatMoney(shown.amount, shown.currency, locale)}`;

/** "24 decembrie 2026": the last day of a campaign, in the language of the page. */
export const formatDay = (isoDate: string, locale: Locale) => new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${isoDate}T00:00:00Z`));
