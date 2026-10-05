import { env } from './env.ts';
import { oneOf } from './input.ts';
import { CURRENCIES, type Currency } from './stripe.ts';

/** Value of one euro in each currency. */
export type Rates = Record<Currency, number>;

/** Reference rates of the European Central Bank, published every working day. */
const RATES_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';

/** Used when the rates of the day cannot be read (ECB, 2 October 2026). */
export const FALLBACK_RATES: Rates = { ron: 5.3488, eur: 1, usd: 1.1225 };

/** Reads the rates out of the ECB file: `<Cube currency='USD' rate='1.1225'/>`. Null when one is missing. */
export function parseRates(xml: string): Rates | null {
  const rates: Partial<Rates> = { eur: 1 };
  for (const [, code, rate] of xml.matchAll(/currency=["']([A-Z]{3})["']\s+rate=["']([\d.]+)["']/g)) {
    const currency = oneOf(CURRENCIES, code.toLowerCase());
    if (currency && Number(rate) > 0) rates[currency] = Number(rate);
  }
  return CURRENCIES.every((c) => rates[c]) ? (rates as Rates) : null;
}

/**
 * The rates of the day, stored with a campaign when it is created. They only serve to show an
 * approximate total, so a failure is not an error: the fallback rates are used instead.
 * `EXCHANGE_RATES_URL` replaces the address of the file (tests).
 */
export async function fetchRates(): Promise<Rates> {
  try {
    const response = await fetch(env('EXCHANGE_RATES_URL') ?? RATES_URL, { signal: AbortSignal.timeout(4000) });
    const rates = response.ok ? parseRates(await response.text()) : null;
    if (rates) return rates;
    console.error('Exchange rates: unexpected answer, fallback rates used');
  } catch (error) {
    console.error('Exchange rates: could not be read, fallback rates used', error);
  }
  return FALLBACK_RATES;
}

/** Converts an amount with the rates of a campaign. */
export const convert = (amount: number, from: Currency, to: Currency, rates: Rates) => (from === to ? amount : (amount / rates[from]) * rates[to]);
