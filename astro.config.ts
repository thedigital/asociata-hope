import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://www.adoptii-animale-hope.org',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  // Wix URLs have no trailing slash: keep the same shape so canonicals do not change.
  trailingSlash: 'never',
  security: { checkOrigin: true },
  vite: { ssr: { external: ['better-sqlite3', '@node-rs/argon2'] } },
});
