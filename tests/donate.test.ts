// The donation route reads the campaigns: the scratch database keeps the tests away from the real one.
import './helpers/scratch.ts';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import type { APIContext } from 'astro';
import { AMOUNTS, CURRENCIES, FREQUENCIES, createDonationSession, isStripeConfigured, parseDonationForm } from '../src/lib/stripe.ts';
import type { Currency, Donation, Frequency } from '../src/lib/stripe.ts';
import { POST } from '../src/pages/donate.ts';

// Stripe is never called: `fetch` is replaced and the requests it receives are inspected.
const CHECKOUT_URL = 'https://checkout.stripe.com/c/pay/cs_test_123';
const SIX_CASES = FREQUENCIES.flatMap((frequency) => CURRENCIES.map((currency) => ({ frequency, currency })));

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

type StripeAnswer = { status?: number; body?: unknown };

/** Replaces `fetch` and returns the list of requests sent to Stripe, as decoded form parameters. */
function mockStripe(answer: StripeAnswer = {}) {
  const calls: { url: string; headers: Record<string, string>; params: Record<string, string> }[] = [];
  mock.method(globalThis, 'fetch', async (url: string | URL, init: RequestInit = {}) => {
    calls.push({
      url: String(url),
      headers: init.headers as Record<string, string>,
      params: Object.fromEntries(init.body as URLSearchParams),
    });
    return Response.json(answer.body ?? { url: CHECKOUT_URL }, { status: answer.status ?? 200 });
  });
  return calls;
}

let savedEnv: Record<string, string | undefined>;
beforeEach(() => {
  savedEnv = { STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY, SITE_URL: process.env.SITE_URL };
  process.env.STRIPE_SECRET_KEY = 'sk_test_unit';
  process.env.SITE_URL = 'https://staging.example.org/';
});
afterEach(() => {
  mock.restoreAll();
  for (const [name, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe('parseDonationForm', () => {
  it('accepts every currency and frequency', () => {
    for (const { frequency, currency } of SIX_CASES) {
      const amount = AMOUNTS[currency].presets[0];
      assert.deepEqual(parseDonationForm(form({ currency, frequency, amount: String(amount) })), { amount, currency, frequency, animal: null });
    }
  });

  it('refuses an unknown or missing currency or frequency', () => {
    assert.deepEqual(parseDonationForm(form({ currency: 'gbp', frequency: 'once', amount: '10' })), { error: 'invalid' });
    assert.deepEqual(parseDonationForm(form({ currency: 'eur', frequency: 'yearly', amount: '10' })), { error: 'invalid' });
    assert.deepEqual(parseDonationForm(form({ frequency: 'once', amount: '10' })), { error: 'invalid' });
    assert.deepEqual(parseDonationForm(form({ currency: 'eur', amount: '10' })), { error: 'invalid' });
    // Identifiers are lower case; nothing is normalised.
    assert.deepEqual(parseDonationForm(form({ currency: 'EUR', frequency: 'once', amount: '10' })), { error: 'invalid' });
  });

  it('accepts the bounds of each currency and refuses the amounts just outside', () => {
    for (const currency of CURRENCIES) {
      const { min, max } = AMOUNTS[currency];
      const parse = (amount: string) => parseDonationForm(form({ currency, frequency: 'once', amount }));
      assert.equal((parse(String(min)) as Donation).amount, min, `${currency} minimum`);
      assert.equal((parse(String(max)) as Donation).amount, max, `${currency} maximum`);
      assert.deepEqual(parse((min - 0.01).toFixed(2)), { error: 'amount' }, `${currency} under the minimum`);
      assert.deepEqual(parse((max + 0.01).toFixed(2)), { error: 'amount' }, `${currency} over the maximum`);
    }
  });

  it('keeps the expected ranges', () => {
    assert.deepEqual(AMOUNTS.ron, { presets: [10, 25, 50, 100, 250], min: 10, max: 50_000 });
    assert.deepEqual(AMOUNTS.eur, { presets: [5, 10, 25, 50, 100], min: 2, max: 10_000 });
    assert.deepEqual(AMOUNTS.usd, { presets: [5, 10, 25, 50, 100], min: 2, max: 10_000 });
    for (const currency of CURRENCIES) {
      for (const preset of AMOUNTS[currency].presets) assert.ok(preset >= AMOUNTS[currency].min && preset <= AMOUNTS[currency].max);
    }
  });

  it('refuses what is not a plain amount', () => {
    for (const amount of ['', ' ', 'abc', '-5', '+5', '0', '1e3', '10.123', '10,123', '1 000', '1.000,50', '0x10', 'Infinity', '.5', '5.']) {
      assert.deepEqual(parseDonationForm(form({ currency: 'eur', frequency: 'once', amount })), { error: 'amount' }, JSON.stringify(amount));
    }
    assert.deepEqual(parseDonationForm(form({ currency: 'eur', frequency: 'once' })), { error: 'amount' });
  });

  it('reads decimals written with a comma or a dot', () => {
    const parse = (amount: string) => parseDonationForm(form({ currency: 'eur', frequency: 'once', amount })) as Donation;
    assert.equal(parse('12,50').amount, 12.5);
    assert.equal(parse('12.5').amount, 12.5);
    assert.equal(parse(' 25 ').amount, 25);
  });

  it('prefers the custom amount to the preset', () => {
    const donation = parseDonationForm(form({ currency: 'ron', frequency: 'once', amount: '50', customAmount: '75' })) as Donation;
    assert.equal(donation.amount, 75);
    const preset = parseDonationForm(form({ currency: 'ron', frequency: 'once', amount: '50', customAmount: '' })) as Donation;
    assert.equal(preset.amount, 50);
    // An invalid custom amount is an error, the preset is not used instead.
    assert.deepEqual(parseDonationForm(form({ currency: 'ron', frequency: 'once', amount: '50', customAmount: '5' })), { error: 'amount' });
  });

  it('cleans the animal name', () => {
    const parse = (animal: string) => (parseDonationForm(form({ currency: 'eur', frequency: 'monthly', amount: '10', animal })) as Donation).animal;
    assert.equal(parse('  Brownie '), 'Brownie');
    assert.equal(parse('Brownie\r\nx-injected: 1'), 'Brownie  x-injected: 1');
    assert.equal(parse('a'.repeat(200)), 'a'.repeat(80));
    assert.equal(parse('   '), null);
  });
});

describe('createDonationSession', () => {
  const session = (donation: Donation) =>
    createDonationSession({
      donation,
      locale: 'fr',
      productName: 'Don – association HOPE',
      successUrl: 'https://example.org/fr/donation-thank-you-page',
      cancelUrl: 'https://example.org/fr/doneaza?cancelled=1#card',
    });

  for (const { frequency, currency } of SIX_CASES) {
    it(`sends a ${frequency} donation in ${currency}`, async () => {
      const calls = mockStripe();
      const amount = AMOUNTS[currency].presets[1];
      assert.equal(await session({ amount, currency, frequency, animal: null }), CHECKOUT_URL);

      assert.equal(calls.length, 1);
      const [{ url, headers, params }] = calls;
      assert.equal(url, 'https://api.stripe.com/v1/checkout/sessions');
      assert.equal(headers.authorization, 'Bearer sk_test_unit');
      assert.equal(headers['content-type'], 'application/x-www-form-urlencoded');

      const monthly = frequency === 'monthly';
      const expected: Record<string, string> = {
        mode: monthly ? 'subscription' : 'payment',
        locale: 'fr',
        success_url: 'https://example.org/fr/donation-thank-you-page',
        cancel_url: 'https://example.org/fr/doneaza?cancelled=1#card',
        'line_items[0][quantity]': '1',
        'line_items[0][price_data][currency]': currency,
        'line_items[0][price_data][unit_amount]': String(amount * 100),
        'line_items[0][price_data][product_data][name]': 'Don – association HOPE',
        'metadata[source]': 'website',
        'metadata[frequency]': frequency,
      };
      if (monthly) {
        expected['line_items[0][price_data][recurring][interval]'] = 'month';
        expected['subscription_data[metadata][source]'] = 'website';
        expected['subscription_data[metadata][frequency]'] = frequency;
      } else {
        expected.submit_type = 'donate';
        expected['payment_intent_data[metadata][source]'] = 'website';
        expected['payment_intent_data[metadata][frequency]'] = frequency;
      }
      // Exact comparison: a parameter Stripe refuses in one mode (submit_type, recurring) must not leak into the other.
      assert.deepEqual(params, expected);
    });
  }

  it('converts the amount to the smallest unit without rounding errors', async () => {
    const calls = mockStripe();
    for (const amount of [19.99, 4.35, 2.05, 1234.56, 10_000]) await session({ amount, currency: 'eur', frequency: 'once', animal: null });
    assert.deepEqual(
      calls.map((call) => call.params['line_items[0][price_data][unit_amount]']),
      ['1999', '435', '205', '123456', '1000000'],
    );
  });

  it('repeats the sponsored animal in the metadata', async () => {
    const calls = mockStripe();
    await session({ amount: 10, currency: 'eur', frequency: 'monthly', animal: 'Patraulea' });
    await session({ amount: 10, currency: 'eur', frequency: 'once', animal: 'Patraulea' });
    assert.equal(calls[0].params['metadata[animal]'], 'Patraulea');
    assert.equal(calls[0].params['subscription_data[metadata][animal]'], 'Patraulea');
    assert.equal(calls[1].params['metadata[animal]'], 'Patraulea');
    assert.equal(calls[1].params['payment_intent_data[metadata][animal]'], 'Patraulea');
  });

  it('fails without a key, before any request', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const calls = mockStripe();
    assert.equal(isStripeConfigured(), false);
    await assert.rejects(session({ amount: 10, currency: 'eur', frequency: 'once', animal: null }), /STRIPE_SECRET_KEY is not set/);
    assert.equal(calls.length, 0);
  });

  it('fails with the message of Stripe when the session is refused', async () => {
    mockStripe({ status: 400, body: { error: { message: 'Invalid currency: xyz' } } });
    await assert.rejects(session({ amount: 10, currency: 'eur', frequency: 'once', animal: null }), /Stripe: Invalid currency: xyz/);
  });

  it('fails when Stripe answers without a URL', async () => {
    mockStripe({ body: { id: 'cs_test_123' } });
    await assert.rejects(session({ amount: 10, currency: 'eur', frequency: 'once', animal: null }), /Stripe: 200/);
  });
});

describe('POST /donate', () => {
  /** Calls the route the way Astro does, with the parts of the context it reads. */
  async function post(fields: Record<string, string>) {
    const request = new Request('http://127.0.0.1:4321/donate', { method: 'POST', body: form(fields) });
    const redirect = (location: string, status = 302) => new Response(null, { status, headers: { location } });
    const context = { request, redirect, site: new URL('https://www.adoptii-animale-hope.org') } as unknown as APIContext;
    const response = await POST(context);
    return { status: response.status, location: response.headers.get('location') };
  }
  const valid = (currency: Currency, frequency: Frequency) => ({ currency, frequency, amount: String(AMOUNTS[currency].presets[0]) });

  for (const { frequency, currency } of SIX_CASES) {
    it(`redirects a ${frequency} donation in ${currency} to Stripe Checkout`, async () => {
      const calls = mockStripe();
      assert.deepEqual(await post({ ...valid(currency, frequency), locale: 'ro' }), { status: 303, location: CHECKOUT_URL });
      assert.equal(calls.length, 1);
      const { params } = calls[0];
      assert.equal(params.mode, frequency === 'monthly' ? 'subscription' : 'payment');
      assert.equal(params['line_items[0][price_data][currency]'], currency);
      assert.equal(params['line_items[0][price_data][unit_amount]'], String(AMOUNTS[currency].presets[0] * 100));
    });
  }

  it('builds the return URLs from SITE_URL, in the language of the form', async () => {
    const calls = mockStripe();
    await post({ ...valid('eur', 'once'), locale: 'ro' });
    await post({ ...valid('eur', 'once'), locale: 'fr' });
    await post({ ...valid('eur', 'once'), locale: 'de' });
    assert.deepEqual(
      calls.map(({ params }) => [params.locale, params.success_url, params.cancel_url]),
      [
        ['ro', 'https://staging.example.org/donation-thank-you-page', 'https://staging.example.org/doneaza?cancelled=1#card'],
        ['fr', 'https://staging.example.org/fr/donation-thank-you-page', 'https://staging.example.org/fr/doneaza?cancelled=1#card'],
        ['de', 'https://staging.example.org/de/donation-thank-you-page', 'https://staging.example.org/de/doneaza?cancelled=1#card'],
      ],
    );
  });

  it('falls back to Romanian for an unknown or missing language', async () => {
    const calls = mockStripe();
    await post({ ...valid('ron', 'once'), locale: 'es' });
    await post(valid('ron', 'once'));
    for (const { params } of calls) {
      assert.equal(params.locale, 'ro');
      assert.equal(params.success_url, 'https://staging.example.org/donation-thank-you-page');
    }
  });

  it('names the product in the language of the donor, with the sponsored animal', async () => {
    const calls = mockStripe();
    await post({ ...valid('eur', 'once'), locale: 'fr' });
    await post({ ...valid('eur', 'monthly'), locale: 'fr', animal: 'Brownie' });
    await post({ ...valid('eur', 'monthly'), locale: 'de' });
    const name = 'line_items[0][price_data][product_data][name]';
    assert.equal(calls[0].params[name], 'Don – association HOPE');
    assert.equal(calls[1].params[name], 'Don mensuel – association HOPE (Brownie)');
    assert.equal(calls[1].params['metadata[animal]'], 'Brownie');
    assert.equal(calls[2].params[name], 'Monatliche Spende – Tierschutzverein HOPE');
  });

  it('sends the donor back to the form when the form is wrong, without calling Stripe', async () => {
    const calls = mockStripe();
    assert.deepEqual(await post({ currency: 'eur', frequency: 'once', amount: '1', locale: 'fr' }), { status: 303, location: '/fr/doneaza?error=amount#card' });
    assert.deepEqual(await post({ currency: 'ron', frequency: 'once', amount: '50001' }), { status: 303, location: '/doneaza?error=amount#card' });
    assert.deepEqual(await post({ currency: 'gbp', frequency: 'once', amount: '10', locale: 'en' }), { status: 303, location: '/en/doneaza?error=invalid#card' });
    assert.deepEqual(await post({}), { status: 303, location: '/doneaza?error=invalid#card' });
    assert.equal(calls.length, 0);
  });

  it('answers "unavailable" without STRIPE_SECRET_KEY, without calling Stripe', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const calls = mockStripe();
    assert.deepEqual(await post({ ...valid('eur', 'once'), locale: 'de' }), { status: 303, location: '/de/doneaza?error=unavailable#card' });
    assert.equal(calls.length, 0);
  });

  it('checks the form before the configuration', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    mockStripe();
    assert.equal((await post({ currency: 'eur', frequency: 'once', amount: '1' })).location, '/doneaza?error=amount#card');
  });

  it('answers "unavailable" when Stripe refuses or cannot be reached', async () => {
    mock.method(console, 'error', () => {});
    mockStripe({ status: 401, body: { error: { message: 'Invalid API Key provided' } } });
    assert.deepEqual(await post({ ...valid('usd', 'once'), locale: 'en' }), { status: 303, location: '/en/doneaza?error=unavailable#card' });

    mock.method(globalThis, 'fetch', async () => {
      throw new TypeError('fetch failed');
    });
    assert.deepEqual(await post({ ...valid('usd', 'monthly'), locale: 'en' }), { status: 303, location: '/en/doneaza?error=unavailable#card' });
  });
});
