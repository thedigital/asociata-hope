/** Reading and checking what a form or a URL sends: shared by every parser of the site. */

/** The value when it belongs to a controlled vocabulary, else null: unknown values are never stored. */
export const oneOf = <T extends string>(values: readonly T[], value: unknown): T | null => ((values as readonly unknown[]).includes(value) ? (value as T) : null);

/** Reader of the text fields of a form: a missing field is an empty text, and spaces around are dropped. */
export const formText = (form: FormData) => (key: string) => String(form.get(key) ?? '').trim();

export const isEmail = (value: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);

/** A real day written `YYYY-MM-DD`. */
export const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

const ROMANIAN_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest', year: 'numeric', month: '2-digit', day: '2-digit' });

/** Date in Romania (ISO `YYYY-MM-DD`): deadlines end at midnight there, wherever the server is. */
export const dateInRomania = (now = new Date()) => ROMANIAN_DAY.format(now);
