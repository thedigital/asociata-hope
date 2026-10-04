import { defineMiddleware } from 'astro:middleware';
import { eq } from 'drizzle-orm';
import { db, schema } from './db/client.ts';
import { localizePath, preferredLocale, splitLocale } from './i18n/config.ts';
import { SESSION_COOKIE, getSessionUser } from './lib/auth.ts';
import { LEGACY_REDIRECTS } from './lib/site.ts';

const redirect = (location: string, status = 301) => new Response(null, { status, headers: { location } });

const LANGUAGE_COOKIE = 'lang';
const ONE_YEAR = 60 * 60 * 24 * 365;
/** Public HTML pages only: not media, documents, the admin, or files such as sitemap.xml. */
const isPublicPage = (pathname: string) => !/^\/(media|files|admin|_)/.test(pathname) && !/\.[a-z0-9]+$/i.test(pathname);

const secure = (response: Response) => {
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  response.headers.set('x-frame-options', 'SAMEORIGIN');
  return response;
};

export const onRequest = defineMiddleware(async ({ url, request, cookies, locals }, next) => {
  const { pathname, search } = url;

  // Wix URLs have no trailing slash; keep a single canonical form.
  if (pathname.length > 1 && pathname.endsWith('/')) return redirect(pathname.replace(/\/+$/, '') + search);

  // Admin: every page except the login form requires a valid session.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const token = cookies.get(SESSION_COOKIE)?.value;
    locals.user = (token && getSessionUser(token)) || undefined;
    if (!locals.user && pathname !== '/admin/login') return redirect('/admin/login', 302);
    const response = secure(await next());
    response.headers.set('cache-control', 'no-store');
    response.headers.set('x-robots-tag', 'noindex, nofollow');
    return response;
  }

  // Documents kept their file name but moved out of the Wix-specific path.
  const legacyFile = pathname.match(/^(?:\/[a-z]{2})?\/_files\/ugd\/([\w.-]+)$/);
  if (legacyFile) return redirect(`/files/${legacyFile[1]}`);

  const { locale, path } = splitLocale(pathname);
  if (path in LEGACY_REDIRECTS) return redirect(localizePath(LEGACY_REDIRECTS[path], locale));

  // Rules managed from the admin. A rule without target answers 410 Gone.
  const rule = db.select().from(schema.redirects).where(eq(schema.redirects.fromPath, pathname)).get();
  if (rule) return rule.toPath ? redirect(rule.toPath, rule.status) : new Response('Gone', { status: 410 });

  // First visit only: send the visitor to the version matching the browser language. The cookie
  // records that the choice was made, so the language switcher is never overridden afterwards.
  // Requests without Accept-Language (search engine crawlers) are never redirected, so every
  // language stays crawlable at its own URL.
  if (request.method === 'GET' && isPublicPage(pathname) && !cookies.has(LANGUAGE_COOKIE)) {
    const preferred = preferredLocale(request.headers.get('accept-language'));
    if (preferred) {
      const cookie = `${LANGUAGE_COOKIE}=${preferred}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax`;
      if (preferred !== locale) {
        return new Response(null, {
          status: 302,
          headers: { location: localizePath(path, preferred) + search, 'set-cookie': cookie, vary: 'Accept-Language, Cookie', 'cache-control': 'no-store' },
        });
      }
      cookies.set(LANGUAGE_COOKIE, preferred, { path: '/', maxAge: ONE_YEAR, sameSite: 'lax' });
    }
  }

  return secure(await next());
});
