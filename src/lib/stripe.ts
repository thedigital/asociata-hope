import type { Locale } from '../i18n/config.ts';
import { env } from './env.ts';
import { oneOf } from './input.ts';

/** Donations by card go through Stripe Checkout: card data never touches this server. */
export const CURRENCIES = ['ron', 'eur', 'usd'] as const;
export type Currency = (typeof CURRENCIES)[number];
export const FREQUENCIES = ['once', 'monthly'] as const;
export type Frequency = (typeof FREQUENCIES)[number];

/** Suggested amounts and accepted range, in whole units of each currency. */
export const AMOUNTS: Record<Currency, { presets: number[]; min: number; max: number }> = {
  ron: { presets: [10, 25, 50, 100, 250], min: 10, max: 50_000 },
  eur: { presets: [5, 10, 25, 50, 100], min: 2, max: 10_000 },
  usd: { presets: [5, 10, 25, 50, 100], min: 2, max: 10_000 },
};

export type Donation = { amount: number; currency: Currency; frequency: Frequency; animal: string | null };
/** `campaign`: the campaign the gift was for is unknown or no longer accepts gifts. */
export type DonationError = 'amount' | 'invalid' | 'campaign';

export const isStripeConfigured = () => Boolean(env('STRIPE_SECRET_KEY'));
/** Without the signing secret of the webhook, card donations are not counted for the campaigns. */
export const isStripeWebhookConfigured = () => Boolean(env('STRIPE_WEBHOOK_SECRET'));

export function parseDonationForm(form: FormData): Donation | { error: DonationError } {
  const currency = oneOf(CURRENCIES, form.get('currency'));
  const frequency = oneOf(FREQUENCIES, form.get('frequency'));
  if (!currency || !frequency) return { error: 'invalid' };
  // The custom amount wins over the preset buttons when both are sent.
  const raw = String(form.get('customAmount') || form.get('amount') || '').replace(',', '.').trim();
  const amount = Number(raw);
  const { min, max } = AMOUNTS[currency];
  if (!/^\d+(\.\d{1,2})?$/.test(raw) || amount < min || amount > max) return { error: 'amount' };
  const animal = String(form.get('animal') ?? '').replace(/[\r\n]/g, ' ').trim().slice(0, 80) || null;
  return { amount, currency, frequency, animal };
}

/** Stripe expects nested parameters as `a[b][c]=value` in a form-encoded body. */
function encode(params: Record<string, unknown>, prefix = '', out = new URLSearchParams()): URLSearchParams {
  for (const [key, value] of Object.entries(params)) {
    const name = prefix ? `${prefix}[${key}]` : key;
    if (value === undefined || value === null) continue;
    if (typeof value === 'object') encode(value as Record<string, unknown>, name, out);
    else out.append(name, String(value));
  }
  return out;
}

/**
 * Creates a Checkout session and returns the URL to send the donor to.
 * A one-off donation is a `payment`; a monthly one is a `subscription` with an ad-hoc monthly price.
 */
export async function createDonationSession(options: {
  donation: Donation;
  locale: Locale;
  productName: string;
  successUrl: string;
  cancelUrl: string;
  /** Campaign the gift is for: the webhook reads it back to count the gift (src/lib/stripe-webhook.ts). */
  campaignId?: number;
}): Promise<string> {
  const key = env('STRIPE_SECRET_KEY');
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  const { donation, locale, productName, successUrl, cancelUrl, campaignId } = options;
  const monthly = donation.frequency === 'monthly';
  const metadata = { source: 'website', frequency: donation.frequency, ...(donation.animal ? { animal: donation.animal } : {}), ...(campaignId ? { campaign: campaignId } : {}) };

  const body = encode({
    mode: monthly ? 'subscription' : 'payment',
    locale,
    success_url: successUrl,
    cancel_url: cancelUrl,
    // "Donate" on the pay button; only allowed for one-off payments.
    submit_type: monthly ? undefined : 'donate',
    line_items: {
      0: {
        quantity: 1,
        price_data: {
          currency: donation.currency,
          // Stripe amounts are in the smallest unit (bani, cents).
          unit_amount: Math.round(donation.amount * 100),
          recurring: monthly ? { interval: 'month' } : undefined,
          product_data: { name: productName },
        },
      },
    },
    metadata,
    // Repeat the metadata on the object that appears in the Stripe dashboard lists.
    ...(monthly ? { subscription_data: { metadata } } : { payment_intent_data: { metadata } }),
  });

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  const session = (await response.json()) as { url?: string; error?: { message?: string } };
  if (!response.ok || !session.url) throw new Error(`Stripe: ${session.error?.message ?? response.status}`);
  return session.url;
}
