import type { APIRoute } from 'astro';
import { DEFAULT_LOCALE, ENABLED_LOCALES, isLocale, localizePath } from '../i18n/config.ts';
import { useFormsUi } from '../i18n/forms.ts';
import { env } from '../lib/env.ts';
import { createDonationSession, isStripeConfigured, parseDonationForm } from '../lib/stripe.ts';

/** Receives the donation form and sends the donor to the Stripe Checkout page. */
export const POST: APIRoute = async ({ request, site, redirect }) => {
  const form = await request.formData();
  const requested = String(form.get('locale') ?? '');
  const locale = isLocale(requested) && ENABLED_LOCALES.includes(requested) ? requested : DEFAULT_LOCALE;
  const page = localizePath('/doneaza', locale);
  const back = (error: string) => redirect(`${page}?error=${error}#card`, 303);

  const donation = parseDonationForm(form);
  if ('error' in donation) return back(donation.error);
  if (!isStripeConfigured()) return back('unavailable');

  // Absolute URLs built from the configured site address (SITE_URL overrides it on a staging
  // server), never from the request headers.
  const origin = env('SITE_URL')?.replace(/\/$/, '') ?? (import.meta.env.DEV ? new URL(request.url).origin : site!.origin);
  try {
    const url = await createDonationSession({
      donation,
      locale,
      productName: useFormsUi(locale).donate.product(donation.frequency, donation.animal),
      successUrl: origin + localizePath('/donation-thank-you-page', locale),
      cancelUrl: `${origin}${page}?cancelled=1#card`,
    });
    return redirect(url, 303);
  } catch (error) {
    console.error('Donation: could not create the Stripe session', error);
    return back('unavailable');
  }
};
