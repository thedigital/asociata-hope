import type { APIRoute } from 'astro';
import { env } from '../../lib/env.ts';
import { recordCampaignDonation, verifyStripeSignature } from '../../lib/stripe-webhook.ts';

/**
 * Called by Stripe when a payment succeeds, to count the card donations of a campaign. The request
 * is trusted only for its signature, made with the signing secret of the endpoint
 * (`STRIPE_WEBHOOK_SECRET`). Answers 2xx to every signed event, known or not, so Stripe does not send it again.
 */
export const POST: APIRoute = async ({ request }) => {
  const secret = env('STRIPE_WEBHOOK_SECRET');
  if (!secret) return new Response('Webhook not configured', { status: 503 });
  const payload = await request.text();
  if (!verifyStripeSignature(payload, request.headers.get('stripe-signature'), secret)) return new Response('Invalid signature', { status: 400 });
  let event: unknown;
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response('Invalid payload', { status: 400 });
  }
  const recorded = event && typeof event === 'object' ? recordCampaignDonation(event) : false;
  return Response.json({ received: true, recorded });
};
