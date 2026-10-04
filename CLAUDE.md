# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Rebuild of https://www.adoptii-animale-hope.org (animal protection association HOPE, Bucharest), currently hosted on Wix. The new site must keep the same pages, content and search ranking, and adds a small admin to manage animals. The project owner communicates in French.

## Rules

- **Everything technical is in English**: identifiers, database values, tags, filter values, code comments, CLI messages. Human-facing labels are translated by the front end from those identifiers (`src/lib/taxonomy.ts`).
- **Animal names are never translated.** `animals.name` is deliberately outside the translations table. The Wix auto-translations mangled several names ("Brownie" → "Brown", "Patraulea" → "Patrol"); do not reintroduce that.
- **SEO parity is the main constraint.** URLs must stay identical to the Wix site: Romanian at the root, other languages under `/en`, `/fr`, `/de`, same slugs in every language, no trailing slash. `migration/seo-baseline.json` is the reference for titles, descriptions, h1, canonical and hreflang of all 351 existing URLs. Slugs imported from Wix are kept as-is even when odd (`/adoptii-pisici/-marzipan`, `/adoptii-virtuale-pisici/garfields`).
- An animal is either a real adoption or a virtual one (`adoptionType`: `real` | `virtual`), never both.
- A hook blocks `rm -rf`; use `gio trash` instead.

## Commands

```bash
pnpm dev                 # dev server
pnpm build               # astro check + build (type errors fail the build)
pnpm check               # type check only
pnpm start               # run the built server (dist/server/entry.mjs)
pnpm db:generate         # generate a migration in drizzle/ after editing src/db/schema.ts
pnpm db:migrate          # apply migrations
pnpm user:create --email a@b.org --name "Name" --locale ro|fr   # create an admin account (prompts for the password)
pnpm crawl [--media] [--refresh]   # re-crawl the Wix site into migration/
pnpm import:animals [--dry-run]    # import migration/wix-export/*.csv (replaces all animals)
pnpm import:pages [--dry-run]      # import content pages from the crawl (replaces all pages)
```

Scripts in `scripts/` run directly with Node 24 (native type stripping): relative imports need the `.ts` extension, and no path aliases, enums or parameter properties. There is no test suite yet.

pnpm must be allowed to build `better-sqlite3` and `esbuild` (`pnpm-workspace.yaml`). TypeScript is pinned to 6.x because `@astrojs/check` does not support 7.

## Architecture

Astro in server mode (`@astrojs/node`, standalone) with SQLite through `better-sqlite3` and Drizzle. Target hosting is a VPS; the database is a single file (`DATABASE_PATH`, default `data/hope.db`) and uploads live in `data/uploads/`, both outside git.

- `src/lib/taxonomy.ts` — controlled vocabularies (species, adoption type, sex, size, colour, traits, status) and the collection → URL segment map. The schema enums are built from these arrays, so adding a value means editing this file and generating a migration.
- `src/db/schema.ts` — `animals` holds the structured, filterable data (one colour identifier, booleans `vaccinated`/`sterilized`/`dewormed`, `birthDate`). Traits are many-to-many in `animal_traits`. Only free text is translated (`animal_translations`: description and SEO fields per locale).
- Age is never stored: it is computed from `birthDate` (`ageInMonths`). `birthDateEstimated` marks dates derived from a Wix age such as "3 ani" (counted back from the record's last Wix update) rather than from a real month of birth.
- `src/i18n/config.ts` — public locales (`ro`, `en`, `fr`, `de`), admin locales (`ro`, `fr`), and path helpers. `ENABLED_LOCALES` lists the languages actually served: German is defined everywhere but disabled (404, absent from hreflang and sitemap) until its content is translated.
- `src/i18n/ui.ts` — every interface string and taxonomy label in the four languages, including gendered forms (`[masculine, feminine]`) picked from the animal's sex.
- `src/pages/[...path].astro` — the single entry point of the public site: it splits the language prefix, resolves home / collection list / animal / content page / contact / 404, and computes the SEO tags. `src/layouts/Base.astro` renders head (canonical, hreflang, Open Graph), header, the shared call-to-action tiles and footer.
- `src/middleware.ts` — redirects (trailing slash, `/_files/ugd/*` → `/files/*`, `LEGACY_REDIRECTS` in `src/lib/site.ts`, then the `redirects` table) and security headers.
- Images are served by `/media/{animals|pages}/{width}/{file}`: resized to WebP with sharp on first request and cached in `data/cache/`. Only the widths in `IMAGE_WIDTHS` (`src/lib/media.ts`) exist. Videos and documents are streamed from `data/uploads/` with Range support.
- The language is always decided by the URL. The browser language only drives a dismissible banner suggesting the matching version (English when the browser language is not served); never add a redirect based on `Accept-Language`, it would hide the Romanian pages from search engines.
- List filters are plain GET parameters handled server-side; filtered URLs are `noindex` with the canonical pointing to the unfiltered list.
- `redirects` table — 301/410 rules meant to be managed from the admin.

## Migration data (`migration/`)

- `wix-export/*.csv` — the four Wix collection exports, source of truth for animals.
- `content.json`, `seo-baseline.json`, `urls.json`, `social-links.json` — output of the crawl. English and French animal descriptions come from the crawl because Wix does not export translations; they are machine translations to be reviewed, and German does not exist yet.
- `raw/` and `media/` are not versioned; `pnpm crawl --media` regenerates them.

## Decided, not built yet

Admin UI with session auth, contact/adoption form (the contact page currently only offers the e-mail address), Stripe donations (one-off and monthly, already in use; the donation page currently shows bank, PayPal and SMS details only), German content and review of the machine-translated English and French texts, automated SEO parity test against `migration/seo-baseline.json`.
