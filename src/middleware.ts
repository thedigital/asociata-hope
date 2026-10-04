import { defineMiddleware } from 'astro:middleware';
import { eq } from 'drizzle-orm';
import { db, schema } from './db/client.ts';
import { localizePath, splitLocale } from './i18n/config.ts';
import { LEGACY_REDIRECTS } from './lib/site.ts';

const redirect = (location: string, status = 301) => new Response(null, { status, headers: { location } });

export const onRequest = defineMiddleware(async ({ url }, next) => {
  const { pathname, search } = url;

  // Wix URLs have no trailing slash; keep a single canonical form.
  if (pathname.length > 1 && pathname.endsWith('/')) return redirect(pathname.replace(/\/+$/, '') + search);

  // Documents kept their file name but moved out of the Wix-specific path.
  const legacyFile = pathname.match(/^(?:\/[a-z]{2})?\/_files\/ugd\/([\w.-]+)$/);
  if (legacyFile) return redirect(`/files/${legacyFile[1]}`);

  const { locale, path } = splitLocale(pathname);
  if (path in LEGACY_REDIRECTS) return redirect(localizePath(LEGACY_REDIRECTS[path], locale));

  // Rules managed from the admin. A rule without target answers 410 Gone.
  const rule = db.select().from(schema.redirects).where(eq(schema.redirects.fromPath, pathname)).get();
  if (rule) return rule.toPath ? redirect(rule.toPath, rule.status) : new Response('Gone', { status: 410 });

  const response = await next();
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  response.headers.set('x-frame-options', 'SAMEORIGIN');
  return response;
});
