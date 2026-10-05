import './helpers/scratch.ts';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { afterEach, describe, it, mock } from 'node:test';
import type { APIContext } from 'astro';
import { eq } from 'drizzle-orm';
import { db, schema } from '../src/db/client.ts';
import { deleteCampaign, getCampaignForEdit, listCampaignsForAdmin, parseCampaignForm, saveCampaign } from '../src/lib/admin-campaigns.ts';
import { findCollection, listAnimals } from '../src/lib/animals.ts';
import { animalsWithCampaign, campaignForAnimal, campaignState, dateInRomania, formatMoney, formatShown, getCampaign, listCampaignPaths, listCampaigns } from '../src/lib/campaigns.ts';
import { FALLBACK_RATES, convert, fetchRates, parseRates } from '../src/lib/exchange-rates.ts';
import { recordCampaignDonation, verifyStripeSignature } from '../src/lib/stripe-webhook.ts';
import { POST as donate } from '../src/pages/donate.ts';
import { POST as webhook } from '../src/pages/stripe/webhook.ts';

const { animals, campaignDonations, redirects } = schema;
const NOW = new Date('2026-10-05T10:00:00Z');
const day = (offset: number) => new Date(NOW.getTime() + offset * 86_400_000).toISOString().slice(0, 10);

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}
const temporary = (fields: Record<string, string> = {}) =>
  form({ title_ro: 'Hrană pentru iarnă', scope: 'need', status: 'published', kind: 'temporary', goalAmount: '1000', currency: 'ron', endsOn: day(10), ...fields });
/** Rates stored with the campaigns of these tests: 1 EUR = 5 RON = 1.25 USD. */
const RATES = { ron: 5, eur: 1, usd: 1.25 };
const create = (data: FormData) => {
  const parsed = parseCampaignForm(data);
  assert.deepEqual(parsed.errors, []);
  const result = saveCampaign(null, parsed, RATES);
  assert.ok('id' in result);
  return result.id;
};
const paid = (id: string, campaign: number | string, amount: number, currency = 'ron') => ({
  type: 'checkout.session.completed',
  data: { object: { id, payment_status: 'paid', amount_total: amount, currency, metadata: { campaign: String(campaign) } } },
});

describe('campaignState', () => {
  it('keeps a permanent campaign open', () => {
    assert.equal(campaignState({ goalAmount: null, endsOn: null }, 1_000_000, NOW), 'open');
  });

  it('closes a temporary campaign after its last day, in Romanian time, or when the goal is reached', () => {
    assert.equal(campaignState({ goalAmount: 1000, endsOn: day(0) }, 999, NOW), 'open');
    assert.equal(campaignState({ goalAmount: 1000, endsOn: day(-1) }, 999, NOW), 'ended');
    assert.equal(campaignState({ goalAmount: 1000, endsOn: day(5) }, 1000, NOW), 'reached');
    assert.equal(campaignState({ goalAmount: 1000, endsOn: day(-5) }, 1200, NOW), 'reached');
    // 22:30 UTC on the last day is already the next day in Bucharest.
    assert.equal(dateInRomania(new Date('2026-10-05T22:30:00Z')), '2026-10-06');
    assert.equal(campaignState({ goalAmount: 1000, endsOn: '2026-10-05' }, 0, new Date('2026-10-05T22:30:00Z')), 'ended');
  });
});

describe('parseCampaignForm', () => {
  it('builds the address from the Romanian title and reads a temporary campaign', () => {
    const { data, texts, errors } = parseCampaignForm(temporary({ offline_ron: '250', offline_eur: '40', summary_fr: '  Une   phrase ' }));
    assert.deepEqual(errors, []);
    assert.deepEqual(data, { slug: 'hrana-pentru-iarna', scope: 'need', status: 'published', animalId: null, goalAmount: 1000, currency: 'ron', endsOn: day(10), offlineAmounts: { ron: 250, eur: 40, usd: 0 } });
    assert.equal(texts.find((t) => t.locale === 'fr')!.summary, 'Une phrase');
  });

  it('gives a permanent campaign no goal and no end, whatever is sent', () => {
    const { data, errors } = parseCampaignForm(temporary({ kind: 'permanent' }));
    assert.deepEqual(errors, []);
    assert.deepEqual([data.goalAmount, data.endsOn], [null, null]);
  });

  it('requires the Romanian title, a goal and a last day for a temporary campaign, an animal for an animal campaign', () => {
    assert.deepEqual(parseCampaignForm(temporary({ title_ro: ' ', slug: 'x' })).errors, ['title']);
    assert.deepEqual(parseCampaignForm(temporary({ goalAmount: '0' })).errors, ['goal']);
    assert.deepEqual(parseCampaignForm(temporary({ goalAmount: '12.5' })).errors, ['goal']);
    assert.deepEqual(parseCampaignForm(temporary({ endsOn: '' })).errors, ['endsOn']);
    assert.deepEqual(parseCampaignForm(temporary({ scope: 'animal' })).errors, ['animal']);
    assert.deepEqual(parseCampaignForm(temporary({ scope: 'animal', animalId: '999' })).errors, ['animal']);
    assert.deepEqual(parseCampaignForm(temporary({ slug: 'Not A Slug' })).errors, ['slug']);
    assert.deepEqual(parseCampaignForm(temporary({ scope: 'other' })).errors, ['invalid']);
    assert.deepEqual(parseCampaignForm(temporary({ offline_eur: '-5' })).errors, ['invalid']);
  });
});

describe('a campaign', () => {
  let id = 0;

  it('is listed once published, with the Romanian texts where a translation is missing', () => {
    id = create(temporary({ title_fr: 'Des croquettes pour l’hiver', summary_ro: 'O tonă de hrană.', offline_ron: '250' }));
    create(form({ title_ro: 'Ciornă', scope: 'global', status: 'draft', kind: 'permanent', currency: 'ron' }));
    assert.deepEqual(listCampaigns('fr', NOW).map((c) => c.title), ['Des croquettes pour l’hiver']);
    const german = getCampaign('hrana-pentru-iarna', 'de', NOW)!;
    assert.deepEqual([german.title, german.summary, german.textLocale], ['Hrană pentru iarnă', 'O tonă de hrană.', 'ro']);
    assert.deepEqual([german.temporary, german.raised, german.percent, german.daysLeft, german.state], [true, 250, 25, 11, 'open']);
    assert.equal(getCampaign('ciorna', 'ro', NOW), null);
    assert.deepEqual(listCampaignPaths().map((c) => c.path), ['/campanii/hrana-pentru-iarna']);
    assert.deepEqual(listCampaignsForAdmin(NOW).find((c) => c.id === id)!.untranslated, ['en', 'de']);
  });

  it('refuses an address already used, and redirects the old one when it changes', () => {
    assert.deepEqual(saveCampaign(null, parseCampaignForm(temporary())), { error: 'slugTaken' });
    assert.deepEqual(saveCampaign(id, parseCampaignForm(temporary({ slug: 'iarna-2026', offline_ron: '250' }))), { id });
    assert.deepEqual(db.select().from(redirects).where(eq(redirects.fromPath, '/fr/campanii/hrana-pentru-iarna')).get()?.toPath, '/fr/campanii/iarna-2026');
    assert.ok(getCampaign('iarna-2026', 'ro', NOW));
  });

  it('counts the card donations of every currency, once each, converted with its own rates', () => {
    assert.equal(recordCampaignDonation(paid('cs_1', id, 15_000)), true);
    assert.equal(recordCampaignDonation(paid('cs_1', id, 15_000)), false, 'the same event twice');
    assert.equal(recordCampaignDonation(paid('cs_2', id, 5_000, 'eur')), true);
    const campaign = getCampaign('iarna-2026', 'ro', NOW)!;
    // 150 RON by card, 250 RON by hand, and 50 EUR by card counted as 250 RON.
    assert.deepEqual([campaign.raised, campaign.percent], [650, 65]);
    assert.equal(db.select().from(schema.campaigns).where(eq(schema.campaigns.id, id)).get()!.rates.ron, 5, 'saving again keeps the rates of the creation');
  });

  it('shows the total and the goal in the currency of each language', () => {
    const shown = (locale: 'ro' | 'en' | 'fr' | 'de') => {
      const { raised, goal } = getCampaign('iarna-2026', locale, NOW)!.shown;
      return [formatShown(raised, locale), formatShown(goal!, locale)].map((text) => text.replace(/\s/g, ' '));
    };
    assert.deepEqual(shown('ro'), ['≈ 650 RON', '1.000 RON']);
    assert.deepEqual(shown('fr'), ['≈ 130 €', '≈ 200 €']);
    assert.deepEqual(shown('de'), ['≈ 130 €', '≈ 200 €']);
    assert.deepEqual(shown('en'), ['≈ $162', '≈ $250']);
  });

  it('gives the admin the real amounts per currency', () => {
    const edit = getCampaignForEdit(id)!;
    assert.deepEqual(edit.card, { ron: { count: 1, total: 150 }, eur: { count: 1, total: 50 }, usd: { count: 0, total: 0 } });
    assert.deepEqual(edit.received, { ron: 400, eur: 50, usd: 0 });
    assert.deepEqual(edit.total('ron'), { amount: 650, currency: 'ron', approximate: true });
    const listed = listCampaignsForAdmin(NOW).find((c) => c.id === id)!;
    assert.deepEqual([listed.received, listed.raised.amount], [{ ron: 400, eur: 50, usd: 0 }, 650]);
  });

  it('counts the later payments of a monthly gift, wherever Stripe puts the metadata', () => {
    const invoice = (invoiceId: string, reason: string, details: object) => ({ type: 'invoice.paid', data: { object: { id: invoiceId, billing_reason: reason, amount_paid: 2_500, currency: 'ron', ...details } } });
    const metadata = { metadata: { campaign: String(id) } };
    assert.equal(recordCampaignDonation(invoice('in_1', 'subscription_create', { subscription_details: metadata })), false, 'the first payment is the Checkout session');
    assert.equal(recordCampaignDonation(invoice('in_2', 'subscription_cycle', { subscription_details: metadata })), true);
    assert.equal(recordCampaignDonation(invoice('in_3', 'subscription_cycle', { parent: { subscription_details: metadata } })), true);
    assert.equal(getCampaign('iarna-2026', 'ro', NOW)!.raised, 700);
  });

  it('ignores what is not a paid gift for a known campaign', () => {
    assert.equal(recordCampaignDonation({ type: 'checkout.session.completed', data: { object: { id: 'cs_3', payment_status: 'unpaid', amount_total: 100, currency: 'ron', metadata: { campaign: String(id) } } } }), false);
    assert.equal(recordCampaignDonation(paid('cs_4', 9999, 100)), false);
    assert.equal(recordCampaignDonation(paid('cs_5', 'abc', 100)), false);
    assert.equal(recordCampaignDonation(paid('cs_6', id, 100, 'gbp')), false);
    assert.equal(recordCampaignDonation({ type: 'checkout.session.completed', data: { object: { id: 'cs_7', payment_status: 'paid', amount_total: 100, currency: 'ron', metadata: {} } } }), false);
    assert.equal(recordCampaignDonation({ type: 'charge.succeeded', data: { object: { id: 'ch_1' } } }), false);
    assert.equal(recordCampaignDonation({}), false);
  });

  it('closes when the goal is reached, and is then listed after the open ones', () => {
    const other = create(form({ title_ro: 'Fond de urgențe', scope: 'global', status: 'published', kind: 'permanent', currency: 'ron' }));
    recordCampaignDonation(paid('cs_8', id, 6_000, 'eur'));
    assert.equal(getCampaign('iarna-2026', 'ro', NOW)!.state, 'reached');
    assert.deepEqual(listCampaigns('ro', NOW).map((c) => [c.id, c.state]), [[other, 'open'], [id, 'reached']]);
    assert.equal(listCampaignsForAdmin(NOW).find((c) => c.id === id)!.state, 'reached');
  });

  it('is shown on the page of its animal while it is open', () => {
    const animalId = db.insert(animals).values({ species: 'dog', adoptionType: 'virtual', slug: 'rex', name: 'Rex', status: 'published' }).returning({ id: animals.id }).get().id;
    create(form({ title_ro: 'Operație pentru Rex', scope: 'animal', animalId: String(animalId), status: 'published', kind: 'temporary', goalAmount: '3000', currency: 'ron', endsOn: day(3) }));
    const campaign = campaignForAnimal(animalId, 'ro', NOW)!;
    assert.deepEqual([campaign.title, campaign.animal], ['Operație pentru Rex', { name: 'Rex', path: '/adoptii-virtuale-caini/rex' }]);
    assert.equal(campaignForAnimal(animalId, 'ro', new Date(NOW.getTime() + 5 * 86_400_000)), null);
    // Its card is marked in the lists, where the campaign is also a filter.
    assert.deepEqual([...animalsWithCampaign(NOW)], [animalId]);
    assert.equal(animalsWithCampaign(new Date(NOW.getTime() + 5 * 86_400_000)).size, 0);
    assert.deepEqual(listAnimals(findCollection('adoptii-virtuale-caini')!).map((a) => [a.name, a.campaign]), [['Rex', true]]);
  });

  it('is deleted with its donations', async () => {
    await deleteCampaign(id);
    assert.equal(getCampaign('iarna-2026', 'ro', NOW), null);
    assert.equal(db.select().from(campaignDonations).where(eq(campaignDonations.campaignId, id)).all().length, 0);
  });

  it('writes amounts in the way of each language', () => {
    assert.match(formatMoney(1500.9, 'ron', 'ro'), /^1\.500\sRON$/);
    assert.match(formatMoney(1500, 'eur', 'en'), /^€1,500$/);
  });
});

describe('exchange rates', () => {
  afterEach(() => mock.restoreAll());
  const ECB = "<Cube time='2026-10-02'><Cube currency='USD' rate='1.1225'/><Cube currency='JPY' rate='170.1'/><Cube currency='RON' rate='5.3488'/></Cube>";

  it('reads the rates of the day', async () => {
    mock.method(globalThis, 'fetch', async () => new Response(ECB));
    assert.deepEqual(await fetchRates(), { eur: 1, usd: 1.1225, ron: 5.3488 });
    assert.equal(parseRates("<Cube currency='USD' rate='1.1225'/>"), null, 'a currency is missing');
  });

  it('falls back on fixed rates when they cannot be read', async () => {
    mock.method(console, 'error', () => {});
    mock.method(globalThis, 'fetch', async () => new Response('<html>', { status: 200 }));
    assert.equal(await fetchRates(), FALLBACK_RATES);
    mock.method(globalThis, 'fetch', async () => Promise.reject(new Error('offline')));
    assert.equal(await fetchRates(), FALLBACK_RATES);
  });

  it('converts through the euro, and leaves an amount in its own currency untouched', () => {
    assert.equal(convert(100, 'eur', 'ron', RATES), 500);
    assert.equal(convert(500, 'ron', 'usd', RATES), 125);
    assert.equal(convert(33.33, 'ron', 'ron', FALLBACK_RATES), 33.33);
  });
});

describe('POST /donate for a campaign', () => {
  afterEach(() => {
    mock.restoreAll();
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.SITE_URL;
  });

  async function post(fields: Record<string, string>) {
    const calls: Record<string, string>[] = [];
    mock.method(globalThis, 'fetch', async (_url: string | URL, init: RequestInit = {}) => {
      calls.push(Object.fromEntries(init.body as URLSearchParams));
      return Response.json({ url: 'https://checkout.stripe.com/c/pay/cs_test' });
    });
    process.env.STRIPE_SECRET_KEY = 'sk_test_unit';
    // The return URLs are built from the configured address (the route reads the build mode otherwise).
    process.env.SITE_URL = 'https://staging.example.org';
    const request = new Request('http://127.0.0.1:4321/donate', { method: 'POST', body: form(fields) });
    const redirect = (location: string, status = 302) => new Response(null, { status, headers: { location } });
    const response = await donate({ request, redirect, site: new URL('https://www.adoptii-animale-hope.org') } as unknown as APIContext);
    return { location: response.headers.get('location'), params: calls[0] };
  }

  it('names the campaign for Stripe and comes back to its page', async () => {
    const id = create(temporary({ title_ro: 'Crăciun 2026', title_fr: 'Noël 2026', endsOn: dateInRomania(new Date(Date.now() + 5 * 86_400_000)) }));
    const { location, params } = await post({ campaign: 'craciun-2026', locale: 'fr', currency: 'ron', frequency: 'once', amount: '50' });
    assert.equal(location, 'https://checkout.stripe.com/c/pay/cs_test');
    assert.equal(params['metadata[campaign]'], String(id));
    assert.equal(params['payment_intent_data[metadata][campaign]'], String(id));
    assert.match(params['line_items[0][price_data][product_data][name]'], /Noël 2026/);
    assert.match(params.cancel_url, /\/fr\/campanii\/craciun-2026\?cancelled=1#card$/);
  });

  it('accepts only one-off gifts for a temporary campaign, in any currency', async () => {
    assert.equal((await post({ campaign: 'craciun-2026', locale: 'ro', currency: 'eur', frequency: 'once', amount: '50' })).location, 'https://checkout.stripe.com/c/pay/cs_test');
    assert.equal((await post({ campaign: 'craciun-2026', locale: 'ro', currency: 'ron', frequency: 'monthly', amount: '50' })).location, '/campanii/craciun-2026?error=invalid#card');
  });

  it('accepts monthly gifts in any currency for a permanent campaign', async () => {
    create(form({ title_ro: 'Fond permanent', scope: 'global', status: 'published', kind: 'permanent', currency: 'ron' }));
    const { params } = await post({ campaign: 'fond-permanent', locale: 'ro', currency: 'eur', frequency: 'monthly', amount: '10' });
    assert.equal(params.mode, 'subscription');
    assert.ok(params['subscription_data[metadata][campaign]']);
  });

  it('refuses a gift for a campaign that is unknown, a draft or closed, without calling Stripe', async () => {
    create(temporary({ title_ro: 'Încheiată', endsOn: '2025-01-01' }));
    for (const [campaign, back] of [['unknown', '/doneaza'], ['ciorna', '/doneaza'], ['incheiata', '/campanii/incheiata']]) {
      const { location, params } = await post({ campaign, locale: 'ro', currency: 'ron', frequency: 'once', amount: '50' });
      assert.equal(location, `${back}?error=campaign#card`);
      assert.equal(params, undefined);
    }
  });
});

describe('Stripe webhook', () => {
  const SECRET = 'whsec_test';
  const sign = (payload: string, timestamp = Math.floor(Date.now() / 1000), secret = SECRET) => `t=${timestamp},v1=${createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex')}`;

  afterEach(() => void delete process.env.STRIPE_WEBHOOK_SECRET);

  it('accepts only a recent signature made with the signing secret', () => {
    const payload = '{"id":"evt_1"}';
    assert.equal(verifyStripeSignature(payload, sign(payload), SECRET), true);
    assert.equal(verifyStripeSignature(payload, `${sign(payload, undefined, 'other')},${sign(payload).split(',')[1]}`, SECRET), true, 'one valid signature among several');
    assert.equal(verifyStripeSignature(`${payload} `, sign(payload), SECRET), false);
    assert.equal(verifyStripeSignature(payload, sign(payload, undefined, 'other'), SECRET), false);
    assert.equal(verifyStripeSignature(payload, sign(payload, Math.floor(Date.now() / 1000) - 600), SECRET), false);
    for (const header of [null, '', 't=abc,v1=00', 'v1=00', `t=${Math.floor(Date.now() / 1000)},v1=zz`]) assert.equal(verifyStripeSignature(payload, header, SECRET), false);
  });

  const call = (payload: string, signature: string | null) =>
    webhook({ request: new Request('http://127.0.0.1:4321/stripe/webhook', { method: 'POST', body: payload, headers: signature ? { 'stripe-signature': signature } : {} }) } as unknown as APIContext);

  it('answers 503 without its secret, 400 to an unsigned request, and records a signed gift', async () => {
    const id = create(temporary({ title_ro: 'Prin webhook' }));
    const payload = JSON.stringify(paid('cs_hook', id, 12_300));
    assert.equal((await call(payload, sign(payload))).status, 503);
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
    assert.equal((await call(payload, null)).status, 400);
    assert.equal((await call(payload, sign(payload, undefined, 'forged'))).status, 400);
    assert.equal(getCampaign('prin-webhook', 'ro')!.raised, 0);
    assert.deepEqual(await (await call(payload, sign(payload))).json(), { received: true, recorded: true });
    assert.deepEqual(await (await call(payload, sign(payload))).json(), { received: true, recorded: false });
    assert.equal(getCampaign('prin-webhook', 'ro')!.raised, 123);
    assert.equal((await call('not json', sign('not json'))).status, 400);
    const other = JSON.stringify({ type: 'customer.created', data: { object: { id: 'cus_1' } } });
    assert.deepEqual(await (await call(other, sign(other))).json(), { received: true, recorded: false });
  });
});
