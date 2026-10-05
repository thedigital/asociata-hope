import { randomBytes } from 'node:crypto';
import { defineMiddleware } from 'astro:middleware';
import { eq } from 'drizzle-orm';
import { db, schema } from './db/client.ts';
import { localizePath, preferredLocale, splitLocale } from './i18n/config.ts';
import { SESSION_COOKIE, getSessionUser } from './lib/auth.ts';
import './lib/shutdown.ts';

/** Redirects stay on the site: a target starting with `//` or `/\` would be read as another host. */
const redirect = (location: string, status = 301) => new Response(null, { status, headers: { location: location.replace(/^[/\\]+/, '/') } });

const isFormPost = (request: Request) => request.method === 'POST' && /^(application\/x-www-form-urlencoded|multipart\/form-data)\b/i.test(request.headers.get('content-type') ?? '');

const STRIPE_WEBHOOK = '/stripe/webhook';
const LANGUAGE_COOKIE = 'lang';
const ONE_YEAR = 60 * 60 * 24 * 365;
/** Public HTML pages only: not media, documents, the admin, or files such as sitemap.xml. */
const isPublicPage = (pathname: string) => !/^\/(media|files|admin|stripe|_)/.test(pathname) && !/\.[a-z0-9]+$/i.test(pathname);

/**
 * Content-Security-Policy of an HTML page: everything comes from the site itself. Inline scripts and
 * the theme style carry the nonce of the request. The donation form is redirected to Stripe Checkout,
 * which `form-action` must allow. Theme previews of the admin use `style` attributes.
 */
const contentSecurityPolicy = (nonce: string, admin: boolean) =>
  [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'nonce-${nonce}'`,
    ...(admin ? ["style-src-attr 'unsafe-inline'"] : []),
    "img-src 'self' data: blob:",
    // Vite writes the smallest font files into the stylesheet as data: URLs.
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com",
    "frame-ancestors 'self'",
  ].join('; ');

const secure = (response: Response, nonce?: string, admin = false) => {
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  response.headers.set('x-frame-options', 'SAMEORIGIN');
  response.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()');
  if (response.headers.get('content-type')?.startsWith('text/html')) {
    // Pages are built for each request (animals, theme, language): browsers and proxies must ask again.
    if (!response.headers.has('cache-control')) response.headers.set('cache-control', 'no-cache');
    // The dev server injects its own inline scripts and styles, which the policy would block.
    if (nonce && import.meta.env.PROD) response.headers.set('content-security-policy', contentSecurityPolicy(nonce, admin));
  }
  return response;
};

export const onRequest = defineMiddleware(async ({ url, request, cookies, locals }, next) => {
  const { pathname, search } = url;
  locals.cspNonce = randomBytes(16).toString('base64');

  // Wix URLs have no trailing slash; keep a single canonical form.
  if (pathname.length > 1 && pathname.endsWith('/')) return redirect(pathname.replace(/\/+$/, '') + search);

  // Every POST of the site is an HTML form. Astro only checks the origin of form content types, so
  // anything else is refused here rather than failing later when the form is read.
  // The only exception is the Stripe webhook, a signed JSON request (src/pages/stripe/webhook.ts).
  if (request.method !== 'GET' && request.method !== 'HEAD' && !isFormPost(request) && !(pathname === STRIPE_WEBHOOK && request.method === 'POST')) return new Response('Unsupported Media Type', { status: 415 });

  // Admin: every page requires a valid session, except the login form and the page of a setup link
  // (it checks the token of the link itself).
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const token = cookies.get(SESSION_COOKIE)?.value;
    locals.user = (token && getSessionUser(token)) || undefined;
    if (!locals.user && pathname !== '/admin/login' && pathname !== '/admin/setup') return redirect('/admin/login', 302);
    const response = secure(await next(), locals.cspNonce, true);
    response.headers.set('cache-control', 'no-store');
    response.headers.set('x-robots-tag', 'noindex, nofollow');
    return response;
  }

  // Rules of the `redirects` table, managed from the admin: every redirect of one address to another
  // is there, and they come first so that an old address is answered in one hop. A rule without
  // target answers 410 Gone.
  const rule = db.select().from(schema.redirects).where(eq(schema.redirects.fromPath, pathname)).get();
  if (rule) return rule.toPath ? redirect(rule.toPath, rule.status) : new Response('Gone', { status: 410 });

  // Documents kept their file name but moved out of the Wix-specific path.
  const legacyFile = pathname.match(/^(?:\/[a-z]{2})?\/_files\/ugd\/([\w.-]+)$/);
  if (legacyFile) return redirect(`/files/${legacyFile[1]}`);

  // Wix also answered under /ro, redirected to the root; Romanian has no prefix here either.
  if (pathname === '/ro' || pathname.startsWith('/ro/')) return redirect((pathname.slice(3) || '/') + search);

  // The Wix sitemaps (one index and one set per language) are replaced by a single file.
  if (/^\/[\w-]+-sitemap\.xml$/.test(pathname)) return redirect('/sitemap.xml');

  const { locale, path } = splitLocale(pathname);

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

  return secure(await next(), locals.cspNonce);
});
