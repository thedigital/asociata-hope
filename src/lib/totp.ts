import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Time-based one-time passwords (RFC 6238) as used by authenticator apps:
 * HMAC-SHA1, 6 digits, 30-second steps.
 */
const PERIOD = 30;
const DIGITS = 6;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(bytes: Uint8Array): string {
  let bits = '';
  for (const byte of bytes) bits += byte.toString(2).padStart(8, '0');
  return (bits.match(/.{1,5}/g) ?? []).map((chunk) => ALPHABET[parseInt(chunk.padEnd(5, '0'), 2)]).join('');
}

export function base32Decode(text: string): Buffer {
  let bits = '';
  for (const char of text.toUpperCase().replace(/[^A-Z2-7]/g, '')) bits += ALPHABET.indexOf(char).toString(2).padStart(5, '0');
  return Buffer.from((bits.match(/.{8}/g) ?? []).map((byte) => parseInt(byte, 2)));
}

/** 160-bit secret, the size recommended for HMAC-SHA1. */
export const generateSecret = () => base32Encode(randomBytes(20));

export const currentStep = (now = Date.now()) => Math.floor(now / 1000 / PERIOD);

export function totpCode(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const value = hmac.readUInt32BE(offset) & 0x7fffffff;
  return String(value % 10 ** DIGITS).padStart(DIGITS, '0');
}

/**
 * Returns the time step the code belongs to, or null when it is wrong.
 * One step of clock drift is tolerated either way. Steps up to `lastUsedStep` are refused, so a
 * code that was already used (or an older one) cannot be replayed.
 */
export function verifyTotp(secret: string, code: string, lastUsedStep = 0, now = Date.now()): number | null {
  const digits = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(digits)) return null;
  const step = currentStep(now);
  for (const candidate of [step, step - 1, step + 1]) {
    if (candidate <= lastUsedStep) continue;
    if (timingSafeEqual(Buffer.from(totpCode(secret, candidate)), Buffer.from(digits))) return candidate;
  }
  return null;
}

/** URI encoded in the QR code scanned by the authenticator app. */
export function otpauthUrl(secret: string, account: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${PERIOD}`;
}
