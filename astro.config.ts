import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

const site = 'https://www.adoptii-animale-hope.org';

// Behind the reverse proxy (deploy/setup-nginx.sh), Astro only reads X-Forwarded-Proto (without it
// every URL is http and form posts are refused by checkOrigin) and X-Forwarded-For (the visitor's
// address, used by the rate limits) for the hosts listed here. SITE_URL (test domain) is read when
// the site is built.
const siteUrl = process.env.SITE_URL;
const proxiedHosts = [site, ...(siteUrl && URL.canParse(siteUrl) ? [siteUrl] : [])].map((url) => ({ hostname: new URL(url).hostname }));

export default defineConfig({
  site,
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  // Wix URLs have no trailing slash: keep the same shape so canonicals do not change.
  trailingSlash: 'never',
  security: { checkOrigin: true, allowedDomains: proxiedHosts },
  vite: { ssr: { external: ['better-sqlite3', '@node-rs/argon2'] } },
});
