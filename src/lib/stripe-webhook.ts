import { createHmac, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/client.ts';
import { CURRENCIES } from './stripe.ts';

const { campaigns, campaignDonations } = schema;

/** A signature older than this is refused, so a captured request cannot be sent again later. */
const TOLERANCE_SECONDS = 300;

/**
 * Checks the `Stripe-Signature` header: `t=<timestamp>,v1=<HMAC-SHA256 of "timestamp.body" with the
 * signing secret of the endpoint>`. Several `v1` values may be sent while a secret is being rolled.
 */
export function verifyStripeSignature(payload: string, header: string | null, secret: string, now = Date.now()): boolean {
  const parts = (header ?? '').split(',').map((part) => part.trim().split('='));
  const timestamp = parts.find(([key]) => key === 't')?.[1] ?? '';
  if (!/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > TOLERANCE_SECONDS) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest();
  return parts.some(([key, value]) => key === 'v1' && /^[0-9a-f]{64}$/.test(value ?? '') && timingSafeEqual(Buffer.from(value, 'hex'), expected));
}

type Metadata = { campaign?: string } | null | undefined;
type StripeEvent = {
  type?: string;
  data?: {
    object?: {
      id?: string;
      currency?: string;
      // Checkout session
      payment_status?: string;
      amount_total?: number;
      metadata?: Metadata;
      // Invoice of a monthly gift; the metadata of its subscription moved under `parent` in recent API versions.
      billing_reason?: string;
      amount_paid?: number;
      subscription_details?: { metadata?: Metadata } | null;
      parent?: { subscription_details?: { metadata?: Metadata } | null } | null;
    };
  };
};

/**
 * Records a gift made for a campaign: the Checkout session once it is paid (one-off gift, or first
 * payment of a monthly one), then each later invoice of a monthly gift. Everything else is ignored,
 * and an event received twice is stored once. Returns true when a row was added.
 */
export function recordCampaignDonation(event: StripeEvent): boolean {
  const object = event.data?.object;
  if (!object?.id) return false;
  let amount: number | undefined;
  let metadata: Metadata;
  if ((event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') && object.payment_status === 'paid') {
    [amount, metadata] = [object.amount_total, object.metadata];
  } else if (event.type === 'invoice.paid' && object.billing_reason === 'subscription_cycle') {
    [amount, metadata] = [object.amount_paid, object.parent?.subscription_details?.metadata ?? object.subscription_details?.metadata];
  }
  const campaignId = Number(metadata?.campaign);
  const currency = CURRENCIES.find((c) => c === object.currency);
  if (!Number.isInteger(amount) || !amount || amount < 0 || !currency || !Number.isInteger(campaignId)) return false;
  if (!db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.id, campaignId)).get()) return false;
  return db.insert(campaignDonations).values({ stripeId: object.id, campaignId, amount, currency }).onConflictDoNothing().run().changes > 0;
}
