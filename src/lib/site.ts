/** Site-wide constants: organisation details, page slugs and navigation structure. */

export const SITE = {
  name: 'Hope',
  legalName: 'Asociatia Pentru Protectia Animalelor HOPE',
  email: 'asociatia.animale.hope@gmail.com',
  social: {
    facebook: 'https://www.facebook.com/Hope.Animal.Protection.Organization/',
    instagram: 'https://www.instagram.com/asociatia_hope',
  },
} as const;

/** Pages whose body is stored in the database. Slugs are the Wix ones, shared by every language. */
export const CONTENT_PAGES = [
  'despre-noi',
  'proiect-2022',
  'ai-gasit-un-animal',
  'cum-pot-adopta',
  'raport-2024',
  'ghid-de-crestere-si-ingrijire-pisici',
  'in-memoriam',
  'voluntariat',
  'redirectioneaza',
  'doneaza',
  'termeni-si-conditii',
  'donation-thank-you-page',
  'confirmare-plata',
] as const;
export type ContentPage = (typeof CONTENT_PAGES)[number];

/** Keys of `ui.pages` (src/i18n/ui.ts); each one is also the URL path of the page. */
export type PageKey = ContentPage | 'contact' | 'adoptii-caini' | 'adoptii-pisici' | 'adoptii-virtuale-caini' | 'adoptii-virtuale-pisici';

type NavItem = { page: PageKey } | { group: 'virtual' | 'info'; items: PageKey[] };

/** Same order and grouping as the Wix menu. */
export const NAV: NavItem[] = [
  { page: 'despre-noi' },
  { group: 'virtual', items: ['adoptii-virtuale-pisici', 'adoptii-virtuale-caini'] },
  { page: 'adoptii-caini' },
  { page: 'adoptii-pisici' },
  { page: 'redirectioneaza' },
  { group: 'info', items: ['proiect-2022', 'ai-gasit-un-animal', 'cum-pot-adopta', 'raport-2024', 'ghid-de-crestere-si-ingrijire-pisici', 'in-memoriam'] },
  { page: 'voluntariat' },
  { page: 'contact' },
];

/** Paths that no longer exist, with their permanent redirect target. */
export const LEGACY_REDIRECTS: Record<string, string> = {
  '/shop': '/',
};
