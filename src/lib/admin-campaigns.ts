import { and, desc, eq, ne, sql } from 'drizzle-orm';
import { db, schema } from '../db/client.ts';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '../i18n/config.ts';
import { moveUrl, slugify } from './admin-animals.ts';
import { CAMPAIGNS_PATH, campaignState, campaignTotals, raisedByCard } from './campaigns.ts';
import { FALLBACK_RATES, type Rates } from './exchange-rates.ts';
import { formText, isIsoDate, oneOf } from './input.ts';
import { CURRENCIES, type Currency } from './stripe.ts';
import { CAMPAIGN_SCOPES, CAMPAIGN_STATUSES } from './taxonomy.ts';
import { removeImage, storeImage } from './uploads.ts';

const { animals, campaigns, campaignDonations, campaignTranslations } = schema;

export type CampaignInput = Omit<typeof campaigns.$inferInsert, 'id' | 'createdAt' | 'updatedAt' | 'image' | 'rates' | 'offlineAmounts'> & { offlineAmounts: Record<Currency, number> };
export type CampaignTextInput = { locale: Locale; title: string; summary: string; description: string };
/** Validation problems, as keys of the admin dictionary (`campaigns.errors`). */
export type CampaignFormError = 'title' | 'slug' | 'slugTaken' | 'animal' | 'goal' | 'endsOn' | 'invalid';

export const CAMPAIGN_TITLE_MAX = 90;
export const CAMPAIGN_SUMMARY_MAX = 200;
const MAX_AMOUNT = 10_000_000;

/** Reads and validates the campaign form. A temporary campaign needs both a goal and a last day. */
export function parseCampaignForm(form: FormData) {
  const text = formText(form);
  const errors: CampaignFormError[] = [];
  const texts: CampaignTextInput[] = LOCALES.map((locale) => ({
    locale,
    title: text(`title_${locale}`).replace(/\s+/g, ' '),
    summary: text(`summary_${locale}`).replace(/\s+/g, ' '),
    description: text(`description_${locale}`).replace(/\r\n/g, '\n'),
  }));
  const title = texts.find((t) => t.locale === DEFAULT_LOCALE)!.title;
  if (!title) errors.push('title');
  if (texts.some((t) => t.title.length > CAMPAIGN_TITLE_MAX || t.summary.length > CAMPAIGN_SUMMARY_MAX || t.description.length > 20_000)) errors.push('invalid');

  const slug = text('slug') || slugify(title);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 80) errors.push('slug');
  const scope = oneOf(CAMPAIGN_SCOPES, text('scope'));
  const status = oneOf(CAMPAIGN_STATUSES, text('status'));
  const currency = oneOf(CURRENCIES, text('currency'));
  if (!scope || !status || !currency) errors.push('invalid');

  const animalId = scope === 'animal' ? Number(text('animalId')) : null;
  if (scope === 'animal' && !(animalId && db.select({ id: animals.id }).from(animals).where(eq(animals.id, animalId)).get())) errors.push('animal');

  const amount = (key: string) => (/^\d{1,8}$/.test(text(key)) ? Number(text(key)) : null);
  const temporary = text('kind') === 'temporary';
  const goalAmount = temporary ? amount('goalAmount') : null;
  const endsOn = temporary ? text('endsOn') : '';
  if (temporary && !(goalAmount && goalAmount <= MAX_AMOUNT)) errors.push('goal');
  if (temporary && !isIsoDate(endsOn)) errors.push('endsOn');
  // Gifts received outside the site, one amount per currency.
  const offline = CURRENCIES.map((c) => [c, text(`offline_${c}`) ? amount(`offline_${c}`) : 0] as const);
  if (offline.some(([, value]) => value === null || value > MAX_AMOUNT)) errors.push('invalid');

  const data: CampaignInput = {
    slug,
    scope: scope ?? 'global',
    status: status ?? 'draft',
    animalId: errors.includes('animal') ? null : animalId,
    goalAmount,
    currency: currency ?? 'ron',
    endsOn: endsOn || null,
    offlineAmounts: Object.fromEntries(offline.map(([c, value]) => [c, value ?? 0])) as Record<Currency, number>,
  };
  return { data, texts, temporary, errors: [...new Set(errors)] };
}

/**
 * Creates or updates a campaign and its texts. When its URL changes, the old one is redirected in every language.
 * `rates` are the exchange rates of the day, stored once, at creation: the approximate totals do not move afterwards.
 */
export function saveCampaign(id: number | null, input: ReturnType<typeof parseCampaignForm>, rates: Rates = FALLBACK_RATES): { id: number } | { error: CampaignFormError } {
  const { data, texts } = input;
  if (db.select({ id: campaigns.id }).from(campaigns).where(and(eq(campaigns.slug, data.slug), id ? ne(campaigns.id, id) : undefined)).get()) return { error: 'slugTaken' };
  return db.transaction((tx) => {
    let campaignId = id;
    if (campaignId) {
      const before = tx.select().from(campaigns).where(eq(campaigns.id, campaignId)).get();
      if (!before) return { error: 'invalid' as const };
      tx.update(campaigns).set({ ...data, updatedAt: new Date() }).where(eq(campaigns.id, campaignId)).run();
      moveUrl(tx, `/${CAMPAIGNS_PATH}/${before.slug}`, `/${CAMPAIGNS_PATH}/${data.slug}`);
    } else {
      campaignId = tx.insert(campaigns).values({ ...data, rates }).returning({ id: campaigns.id }).get().id;
    }
    tx.delete(campaignTranslations).where(eq(campaignTranslations.campaignId, campaignId)).run();
    tx.insert(campaignTranslations).values(texts.map((t) => ({ campaignId: campaignId!, ...t }))).run();
    return { id: campaignId };
  });
}

/** Replaces or removes the picture of a campaign. Returns false when the upload is not a valid image. */
export async function setCampaignImage(id: number, upload: File | null, remove: boolean): Promise<boolean> {
  const current = db.select({ image: campaigns.image }).from(campaigns).where(eq(campaigns.id, id)).get();
  const hasUpload = Boolean(upload?.size);
  if (!current || (!hasUpload && !remove)) return true;
  const stored = upload && hasUpload ? await storeImage('campaigns', upload) : null;
  if (hasUpload && !stored) return false;
  if (current.image) await removeImage('campaigns', current.image);
  db.update(campaigns).set({ image: stored?.file ?? null }).where(eq(campaigns.id, id)).run();
  return true;
}

export async function deleteCampaign(id: number): Promise<void> {
  const campaign = db.select().from(campaigns).where(eq(campaigns.id, id)).get();
  if (!campaign) return;
  db.delete(campaigns).where(eq(campaigns.id, id)).run();
  if (campaign.image) await removeImage('campaigns', campaign.image);
}

/** Card donations recorded for a campaign: number and total per currency, in whole units. */
function cardTotals(id: number) {
  const rows = db
    .select({ currency: campaignDonations.currency, count: sql<number>`count(*)`, total: sql<number>`sum(${campaignDonations.amount})` })
    .from(campaignDonations)
    .where(eq(campaignDonations.campaignId, id))
    .groupBy(campaignDonations.currency)
    .all();
  return Object.fromEntries(
    CURRENCIES.map((c) => {
      const row = rows.find((r) => r.currency === c);
      return [c, { count: row?.count ?? 0, total: (row?.total ?? 0) / 100 }];
    }),
  ) as Record<Currency, { count: number; total: number }>;
}

export function getCampaignForEdit(id: number) {
  const campaign = db.select().from(campaigns).where(eq(campaigns.id, id)).get();
  if (!campaign) return null;
  const card = cardTotals(id);
  return {
    campaign,
    texts: db.select().from(campaignTranslations).where(eq(campaignTranslations.campaignId, id)).all(),
    card,
    // Real amounts per currency, card donations and gifts entered by hand together.
    ...campaignTotals(campaign, Object.fromEntries(CURRENCIES.map((c) => [c, card[c].total]))),
  };
}

/** Every campaign with what the list of the admin shows, the most recent first. */
export function listCampaignsForAdmin(now = new Date()) {
  const rows = db.select().from(campaigns).orderBy(desc(campaigns.id)).all();
  const byCard = raisedByCard(rows.map((row) => row.id));
  const texts = db.select({ campaignId: campaignTranslations.campaignId, locale: campaignTranslations.locale, title: campaignTranslations.title }).from(campaignTranslations).all();
  return rows.map((row) => {
    const { received, total } = campaignTotals(row, byCard.get(row.id));
    const raised = total(row.currency);
    return {
      ...row,
      title: texts.find((t) => t.campaignId === row.id && t.locale === DEFAULT_LOCALE)?.title || row.slug,
      received,
      raised,
      state: campaignState(row, raised.amount, now),
      // Languages without a title show the Romanian texts on the public page.
      untranslated: LOCALES.filter((locale) => !texts.some((t) => t.campaignId === row.id && t.locale === locale && t.title)),
    };
  });
}

/** Animals a campaign can be for: any animal still in the care of the association. */
export function listAnimalsForCampaign() {
  return db
    .select({ id: animals.id, name: animals.name, species: animals.species, status: animals.status })
    .from(animals)
    .where(ne(animals.status, 'deceased'))
    .orderBy(animals.name)
    .all();
}
