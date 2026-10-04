/** Site-wide constants: organisation details, page slugs and navigation structure. */

export const SITE = {
  name: 'Hope',
  legalName: 'Asociatia Pentru Protectia Animalelor HOPE',
  email: 'asociatia.animale.hope@gmail.com',
  /** Tax identification number and RON account, as written on the 3.5 % redirection form. */
  fiscalCode: '36067265',
  iban: 'RO63INGB0000999905937826',
  /** Bank details for donations by transfer: one account per currency. */
  bank: 'ING Bank',
  swift: 'INGBROBU',
  accounts: { RON: 'RO63INGB0000999905937826', EUR: 'RO54INGB0000999905938085', USD: 'RO87INGB0000999912576365' },
  /** Donation by SMS: text to send and short number (Romanian operators). */
  sms: { text: 'DAU', number: '8845' },
  social: {
    facebook: 'https://www.facebook.com/Hope.Animal.Protection.Organization/',
    instagram: 'https://www.instagram.com/asociatia_hope',
  },
} as const;

/** Ways of giving, in the order of the donation page; each one is a section with this anchor. */
export const DONATION_METHODS = ['card', 'transfer', 'paypal', 'sms', 'redirect'] as const;
export type DonationMethod = (typeof DONATION_METHODS)[number];

/** The association's page on redirectioneaza.ro, where the 3.5 % income tax form is filled in. */
export const REDIRECT_FORM_URL = 'https://redirectioneaza.ro/asociatia-pentru-protectia-animalelor-hope/';

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

/**
 * Text-heavy pages shown with a photo beside the text, like the redirection block of the home page.
 * Files are in `data/uploads/pages`; a page without an entry keeps the single-column sheet.
 * The photo that closes the body is shown in the same column (`splitClosingPhoto`), or under the introduction for `OPENING_PHOTO_PAGES`; naming it here
 * makes it the only photo of the page.
 */
export const PAGE_ILLUSTRATIONS: Partial<Record<ContentPage, string>> = {
  'despre-noi': '313291_9419d3ada2c44ed7a96a12b568a4523b_mv2.jpg',
  'ai-gasit-un-animal': '313291_079206781e9a4fb7b249e7f0bebe6f31_mv2.jpg',
  'cum-pot-adopta': '313291_e05ab76e725f4fd481f29bddd0e83c61_mv2.jpg',
  'ghid-de-crestere-si-ingrijire-pisici': '23c494_793de495bdea4797a48a44f4619b418b_mv2.jpg',
  voluntariat: '313291_8712b4a1e5f1447f9dc063ff9ccaee48_mv2.webp',
  redirectioneaza: '23c494_92f4e22fa9db4ce5b1a853d2850a5388_mv2.jpeg',
};

/** Illustrated pages whose closing photo is a landscape: it opens the text, under the introduction, instead of joining the illustration. */
export const OPENING_PHOTO_PAGES: readonly ContentPage[] = ['despre-noi'];

/** Pages whose closing photo gallery is spread along the text, one photo per paragraph (`interleaveGallery`). */
export const STORY_PAGES: readonly ContentPage[] = ['proiect-2022'];

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

/** Pages reached only after a payment: not indexed and kept out of the sitemap. */
export const UNLISTED_PAGES: readonly ContentPage[] = ['donation-thank-you-page', 'confirmare-plata'];

/** Wix paths dropped on purpose (the shop page was published by mistake): they answer 410 Gone in every language. */
export const REMOVED_PATHS: readonly string[] = ['/shop'];

/** Paths that no longer exist, with their permanent redirect target. */
export const LEGACY_REDIRECTS: Record<string, string> = {
  // The scanned redirection form of 2023, replaced by the form generated for the current year.
  '/files/313291_0ee1b28245244859bb09190fb50db677.pdf': '/formular-230.pdf',
};
