import type { Locale } from './config.ts';
import type { ContentPage, NavGroup, PageKey, UnlistedPage } from '../lib/site.ts';
import type { CampaignScope, Color, Sex, Size, Trait } from '../lib/taxonomy.ts';

/** A label that agrees with the animal's sex: [masculine, feminine]. */
type Gendered = string | [string, string];
type Cta = { title: string; text: string; button: string };

export type Ui = {
  home: string;
  donate: string;
  download: string;
  /** Note under a Word document to download; the documents exist in Romanian only. */
  wordDocument: string;
  menu: string;
  skip: string;
  /** Names of the groups of the header menu, also the titles of the footer columns. */
  nav: Record<NavGroup, string>;
  pages: Record<PageKey, string>;
  /** `lists`: description of a collection list when it has its own, otherwise `description` is used. */
  /** Short sentence under the title of a content page; the about page shows `homePage.lead` there. */
  pageLeads: Record<Exclude<ContentPage, 'despre-noi'>, string>;
  /** Alternative text of the photos shown by the templates, by file name in `data/uploads/pages`. */
  photoAlts: Record<string, string>;
  /** `description` is the one of the home page and the default; `descriptions` gives every other indexable page its own, in every language. */
  seo: { homeTitle: string; description: string; descriptions: Record<Exclude<PageKey, UnlistedPage>, string> };
  homePage: {
    h1: string;
    adoptions: string;
    dogs: string;
    cats: string;
    virtual: string;
    virtualCats: string;
    virtualDogs: string;
    donateTitle: string;
    donateText: string;
    /** The mission in one sentence: under the title of the home hero and of the about page. */
    lead: string;
    /** Captions of the figures of the hero (`SITE.figures`): animals in care, years of activity, kilograms of food per month. */
    stats: { animals: string; years: string; food: string };
    /** Short word above each figure of the hero ("more than", "already", "about"). */
    statsOver: { animals: string; years: string; food: string };
    /** Also shown under the title of the two adoption lists. */
    adoptionsLead: string;
    /** Title of the animals shown on the home page, a different set each day. */
    waiting: string;
    /** What sponsoring means; also shown under the title of the two sponsorship lists. */
    virtualLead: string;
    redirectTitle: string;
    /** The year is the income year of the form (`redirectCampaign`). */
    redirectIntro: (year: number) => string;
    /** Shown only while the online form is open. */
    redirectOnline: string;
    /** Shown the rest of the year; the year is the one in which the online form opens again. */
    redirectClosed: (year: number) => string;
    redirectPaper: string;
    redirectLink: string;
    redirectDownload: string;
    redirectForms: string;
    redirectCosts: string;
    redirectFacts: string[];
    redirectThanks: string;
    /** Label of the link from the short block to the redirection page. */
    redirectMore: string;
    /** Shown under the buttons of the redirection page when the online form is closed. */
    redirectReopens: (year: number) => string;
    /** Detailed version, on the redirection page (`RedirectDetail.astro`). */
    redirectPageLead: string;
    redirectPageFreeTitle: string;
    redirectPageFree: (year: number) => string;
    redirectPageHowTitle: string;
    redirectPageOnline: string;
    redirectPagePaper: string;
    redirectPageRealityTitle: string;
    redirectPageCosts: string;
    redirectPageEvery: string;
    redirectPageThanks: string;
  };
  cta: { dogs: Cta; cats: Cta; donate: Cta; volunteer: Cta };
  animal: {
    age: string;
    size: string;
    sex: string;
    color: string;
    behavior: string;
    health: string;
    back: string;
    contact: string;
    seeOthers: { dog: string; cat: string };
    virtualAdoption: string;
    sponsor: string;
    learnMore: string;
    photoOf: (name: string, index: number) => string;
  };
  filters: {
    title: string;
    any: string;
    trait: string;
    ageGroup: string;
    young: string;
    youngAdult: string;
    adult: string;
    senior: string;
    apply: string;
    reset: string;
    /** Checkbox: only the animals that have an open campaign. */
    withCampaign: string;
    none: string;
    count: (n: number) => string;
  };
  sex: Record<Sex, string>;
  size: Record<Size, Gendered>;
  color: Record<Color, string>;
  traits: Record<Trait, Gendered>;
  health: { vaccinated: Gendered; sterilized: Gendered; dewormed: Gendered };
  and: string;
  years: (n: number) => string;
  months: (n: number) => string;
  footer: { contact: string; socials: string; rights: string };
  contactPage: { intro: string; email: string; about: (name: string) => string };
  /** Fundraising campaigns: the list, the page of a campaign, and the blocks shown on the home, donation and animal pages. */
  campaigns: {
    /** Sentence under the title of the list. */
    lead: string;
    empty: string;
    past: string;
    scopes: Record<CampaignScope, string>;
    permanent: string;
    /** Follows the amount collected: "raised of 3,000 RON". */
    raisedOf: (goal: string) => string;
    /** Under the amounts when gifts or the goal were converted to the currency of the language ("EUR"). */
    converted: (currency: string) => string;
    /** Days left, the last one included. */
    daysLeft: (n: number) => string;
    until: (date: string) => string;
    reached: string;
    ended: string;
    /** On the card of an animal that has an open campaign. */
    badge: string;
    see: string;
    give: string;
    giveHint: string;
    closedText: string;
    otherWays: string;
    otherWaysText: (title: string) => string;
    otherWaysLink: string;
    forAnimal: (name: string) => string;
    seeAnimal: string;
    all: string;
    /** Title and sentence of the block of the home and donation pages. */
    inProgress: string;
    inProgressLead: string;
    /** Label of the block shown on the page of the animal a campaign is for. */
    animalBox: string;
  };
  notFound: { title: string; text: string; back: string };
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
/** Romanian inserts "de" after numbers ending in 00 or 20–99 ("20 de ani"). */
const roCount = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${n % 100 === 0 || n % 100 >= 20 ? 'de ' : ''}${many}`);

const ro: Ui = {
  home: 'Acasa',
  donate: 'Doneaza',
  download: 'Descarca',
  wordDocument: 'Document Word',
  menu: 'Meniu',
  skip: 'Sari la continut',
  nav: { adopt: 'Adoptii', virtual: 'Adoptii virtuale', help: 'Ajuta-ne', info: 'Asociatia' },
  pages: {
    'despre-noi': 'Despre noi',
    'adoptii-virtuale-pisici': 'Adoptii virtuale pisici',
    'adoptii-virtuale-caini': 'Adoptii virtuale caini',
    'adoptii-caini': 'Adoptii caini',
    'adoptii-pisici': 'Adoptii pisici',
    redirectioneaza: 'Redirectioneaza 3,5%',
    'proiect-2022': 'Sanctuarul nostru',
    'ai-gasit-un-animal': 'Ai gasit un animal',
    'cum-pot-adopta': 'Cum pot adopta',
    'rapoarte-de-activitate': 'Rapoarte de activitate',
    'ghid-de-crestere-si-ingrijire-pisici': 'Ghid de crestere si ingrijire pisici',
    'in-memoriam': 'In memoriam',
    voluntariat: 'Voluntariat',
    contact: 'Contact',
    campanii: 'Campanii',
    doneaza: 'Doneaza',
    'termeni-si-conditii': 'Termeni si conditii',
    'donation-thank-you-page': 'Multumim pentru donatie',
    'confirmare-plata': 'Confirmare plata',
  },
  pageLeads: {
    'proiect-2022': 'Patru ani de muncă pentru a le oferi câinilor noștri un adăpost sigur.',
    'ai-gasit-un-animal': 'Ce este de făcut înainte de a-i căuta o familie.',
    'cum-pot-adopta': 'Pașii și condițiile unei adopții responsabile.',
    'rapoarte-de-activitate': 'Bilanțul activității noastre, an de an.',
    'ghid-de-crestere-si-ingrijire-pisici': 'Regulile de aur pentru a avea grijă de pisica dumneavoastră.',
    'in-memoriam': 'Au făcut parte din familia noastră. Nu îi uităm.',
    voluntariat: 'Dăruiți puțin din timpul dumneavoastră animalelor fără cămin.',
    redirectioneaza: 'Un gest gratuit pentru animale, dacă plătiți impozit pe venit în România.',
    doneaza: 'Fiecare donație hrănește și îngrijește animalele pe care le-am salvat.',
    'termeni-si-conditii': 'Condițiile de utilizare a acestui site.',
    'donation-thank-you-page': 'Sprijinul dumneavoastră schimbă viața animalelor de care avem grijă.',
    'confirmare-plata': 'Datorită dumneavoastră, putem continua să le hrănim și să le îngrijim.',
  },
  photoAlts: {
    '313291_9419d3ada2c44ed7a96a12b568a4523b_mv2.jpg': 'Câine alb cu blană lungă, cu gura deschisă a zâmbet',
    '23c494_793de495bdea4797a48a44f4619b418b_mv2.jpg': 'Pisică tărcată cu alb, așezată, care privește în sus',
    '313291_079206781e9a4fb7b249e7f0bebe6f31_mv2.jpg': 'Pisică albă cu pete tărcate, așezată pe podea',
    '313291_e05ab76e725f4fd481f29bddd0e83c61_mv2.jpg': 'Câine negru cu alb, așezat în țarcul său',
    '23c494_b230480b309a4402bfc3e96f472913dc_mv2.png': 'Trei câini și trei pisici ale asociației HOPE',
    '23c494_92f4e22fa9db4ce5b1a853d2850a5388_mv2.jpeg': 'Câini pe aleea sanctuarului, între iarbă și copaci',
    '313291_8712b4a1e5f1447f9dc063ff9ccaee48_mv2.webp': 'Câine alb cu negru, cu blană lungă, așezat',
  },
  seo: {
    homeTitle: 'Adoptii caini pisici | Bucuresti | Asociatia protectia animalelor HOPE',
    description: 'Asociatia protectia animalelor HOPE : Adoptii caini, pui si adulti',
    descriptions: {
      campanii: 'Campaniile de strângere de fonduri ale asociației HOPE pentru câinii și pisicile salvate.',
      'despre-noi': 'HOPE este o asociație pentru protecția animalelor înființată la București în 2016: salvăm, îngrijim și dăm spre adopție câini și pisici fără stăpân.',
      'adoptii-caini': 'Câini pentru adopție în București: pui și câini adulți salvați de asociația HOPE, fiecare în așteptarea unei familii.',
      'adoptii-pisici': 'Pisici pentru adopție în București: pui și pisici adulte salvate de asociația HOPE, fiecare în așteptarea unei familii.',
      'adoptii-virtuale-caini': 'Adoptă virtual un câine al asociației HOPE: îi susții de la distanță hrana și îngrijirea, iar el rămâne în grija noastră.',
      'adoptii-virtuale-pisici': 'Adoptă virtual o pisică a asociației HOPE: îi susții de la distanță hrana și îngrijirea, iar ea rămâne în grija noastră.',
      redirectioneaza: 'Redirecționează 3,5% din impozitul pe venit către asociația HOPE: nu te costă nimic și ajută la hrănirea și tratarea animalelor salvate.',
      'proiect-2022': 'Povestea sanctuarului HOPE: patru ani de muncă pentru a construi un adăpost sigur pentru câinii noștri, cu ajutorul donatorilor.',
      'ai-gasit-un-animal': 'Ai găsit un câine sau o pisică fără stăpân? Ce trebuie făcut mai întâi, înainte de a-i căuta o familie: sfaturile asociației HOPE.',
      'cum-pot-adopta': 'Cum poți adopta un câine sau o pisică de la asociația HOPE: pașii și condițiile unei adopții responsabile.',
      'rapoarte-de-activitate': 'Rapoartele de activitate ale asociației HOPE, an de an: bilanțul muncii noastre pentru câinii și pisicile fără stăpân, cu cifrele-cheie.',
      'ghid-de-crestere-si-ingrijire-pisici': 'Ghidul asociației HOPE pentru îngrijirea pisicilor: regulile de aur, de la sterilizare la geamuri și balcoane sigure, hrană și plante toxice.',
      'in-memoriam': 'În amintirea câinilor și pisicilor asociației HOPE care nu mai sunt printre noi. Au făcut parte din familia noastră.',
      voluntariat: 'Devino voluntar al asociației HOPE din București: oferă puțin din timpul tău câinilor și pisicilor fără cămin.',
      contact: 'Contactează asociația HOPE din București: adopția unui câine sau a unei pisici, adopție virtuală, voluntariat sau orice altă întrebare.',
      doneaza: 'Donează pentru asociația HOPE: cu cardul, prin transfer bancar, PayPal, SMS sau redirecționând 3,5% din impozitul pe venit.',
      'termeni-si-conditii': 'Termenii și condițiile de utilizare a site-ului Asociației pentru protecția animalelor HOPE.',
    },
  },
  homePage: {
    h1: 'Asociatia pentru protectia animalelor HOPE',
    adoptions: 'Adoptii animale',
    dogs: 'Adoptii Caini',
    cats: 'Adoptii Pisici',
    virtual: 'Adoptii virtuale',
    virtualCats: 'Adoptii virtuale pisici',
    virtualDogs: 'Adoptii virtuale caini',
    donateTitle: 'Doneaza',
    donateText: 'Doneaza pentru ingrijirea cateilor si pisicilor Asociatiei pentru protectia animalelor HOPE',
    lead: 'Salvăm, îngrijim și dăm spre adopție câini și pisici fără stăpân din București și din împrejurimi.',
    stats: { animals: 'animale în grija noastră', years: 'ani de activitate', food: 'kg de hrană în fiecare lună' },
    statsOver: { animals: 'peste', years: 'deja', food: 'aproximativ' },
    adoptionsLead: 'Fiecare dintre ei așteaptă o familie care să îl iubească. Poate chiar pe a dumneavoastră.',
    waiting: 'Își caută o familie',
    virtualLead: 'Nu puteți adopta? Alegeți un animăluț și susțineți-i de la distanță hrana și îngrijirea: el rămâne în grija noastră, iar dumneavoastră îi deveniți părinte virtual.',
    redirectTitle: 'Redirecționare 3,5%',
    redirectIntro: (year) => `Printr-un gest GRATUIT puteți ajuta 170 de căței și pisicuțe. Completați, vă rugăm, formularul pentru direcționarea a 3,5% din impozitul pe salariu pentru anul ${year}.`,
    redirectOnline: 'Durează 1 minut, este simplu, este online:',
    redirectClosed: (year) => `Formularul online este deschis între 1 ianuarie și 25 mai și se redeschide la 1 ianuarie ${year}. Până atunci puteți descărca formularul pe hârtie, deja completat cu datele asociației: adăugați datele dumneavoastră, semnați-l și contactați-ne pentru a ni-l trimite.`,
    redirectPaper: 'Preferați varianta pe hârtie? Descărcați formularul deja completat cu datele asociației, adăugați datele dumneavoastră, semnați-l și contactați-ne pentru a ni-l trimite.',
    redirectLink: 'Completează formularul',
    redirectDownload: 'Descarcă formularul',
    redirectForms: 'Toate formularele completate și semnate ajung automat la noi pe email, iar ulterior le depunem la ANAF.',
    redirectCosts: 'Cheltuielile lunare sunt uriașe pentru a le asigura tuturor hrana și tratamentele.',
    redirectFacts: [
      '50 de animaluțe au vârste între 10 și 17 ani.',
      '3 pisici sunt complet oarbe.',
      '2 căței sunt paralizați.',
      '2 căței au alte dizabilități.',
      'În total, îngrijim 170 de animaluțe.',
    ],
    redirectThanks: 'Vă mulțumim pentru fiecare formular completat, semnat și trimis pentru animaluțele Hope.',
    redirectMore: 'Totul despre redirecționarea a 3,5%',
    redirectReopens: (year) => `Formularul online se redeschide la 1 ianuarie ${year}. Pentru a ne trimite formularul pe hârtie:`,
    redirectPageLead: 'Prin intermediul contribuțiilor tale ne vei ajuta să oferim o viață mai bună animalelor abandonate, în fiecare zi.',
    redirectPageFreeTitle: 'Un gest GRATUIT care poate schimba vieți',
    redirectPageFree: (year) => `Prin completarea formularului de redirecționare a 3,5% din impozitul pe salariu pentru anul ${year}, poți ajuta 170 de căței și pisicuțe care depind zilnic de noi.`,
    redirectPageHowTitle: 'Cum procedezi',
    redirectPageOnline: 'Online, între 1 ianuarie și 25 mai: durează doar 1 minut, este simplu și nu te costă nimic. Toate formularele completate și semnate ajung automat la noi pe email, iar noi ne ocupăm de depunerea lor la ANAF.',
    redirectPagePaper: 'Pe hârtie, tot anul: descarcă formularul deja completat cu datele asociației, adaugă datele tale, semnează-l și contactează-ne pentru a ni-l trimite.',
    redirectPageRealityTitle: 'Realitatea din spatele cifrelor',
    redirectPageCosts: 'Cheltuielile lunare sunt uriașe pentru a le asigura tuturor hrană, tratamente și îngrijire medicală:',
    redirectPageEvery: 'Fiecare formular contează. Fiecare semnătură înseamnă hrană, medicamente și o șansă la o viață mai bună.',
    redirectPageThanks: 'Îți mulțumim din suflet pentru fiecare formular completat și trimis pentru animaluțele Hope. Pentru ele, acest gest mic înseamnă enorm.',
  },
  cta: {
    dogs: { title: 'Adoptii caini', text: 'Descoperă toți câinii disponibili pentru adopție', button: 'Vezi caini' },
    cats: { title: 'Adoptii pisici', text: 'Descoperă toate pisicile disponibile pentru adopție', button: 'Vezi pisici' },
    donate: { title: 'Doneaza', text: 'Doneaza pentru a ne ajuta să salvăm mai multe animale', button: 'Doneaza' },
    volunteer: { title: 'Voluntariat', text: 'Deveniți voluntar și ajutați-ne să ajutăm animalele asociației.', button: 'Deveniti voluntar' },
  },
  animal: {
    age: 'Varsta',
    size: 'Talie',
    sex: 'Sex',
    color: 'Colorit',
    behavior: 'Comportament',
    health: 'Vaccin',
    back: 'Inapoi',
    contact: 'Contact',
    seeOthers: { dog: 'Vezi alti caini', cat: 'Vezi alte pisici' },
    virtualAdoption: 'Adoptie virtuala',
    sponsor: 'Adopta virtual',
    learnMore: 'Afla mai multe',
    photoOf: (name, index) => `${name} – fotografia ${index}`,
  },
  filters: {
    title: 'Filtre',
    any: 'Toate',
    trait: 'Caracter',
    ageGroup: 'Varsta',
    young: 'Sub 1 an',
    youngAdult: '1 – 3 ani',
    adult: '4 – 7 ani',
    senior: '8 ani si peste',
    withCampaign: 'Animale cu o campanie',
    apply: 'Filtreaza',
    reset: 'Sterge filtrele',
    none: 'Niciun animal nu corespunde filtrelor alese.',
    count: (n) => (n === 1 ? '1 animal' : `${roCount(n, 'animal', 'animale')}`),
  },
  sex: { male: 'Mascul', female: 'Femela', mixed: 'Mascul si femela' },
  size: { small: ['Mic', 'Mica'], medium: ['Mediu', 'Medie'], large: 'Mare' },
  color: {
    white: 'Alb',
    black: 'Negru',
    grey: 'Gri',
    orange: 'Portocaliu',
    'white-black': 'Alb cu negru',
    'white-grey': 'Alb cu gri',
    'white-orange': 'Alb cu portocaliu',
    'white-beige': 'Alb cu bej',
    'black-grey': 'Gri cu negru',
    'white-grey-beige': 'Alb cu gri si bej',
    tricolor: 'Tricolor',
  },
  traits: {
    affectionate: ['Afectuos', 'Afectuoasa'],
    calm: ['Calm', 'Calma'],
    cheerful: ['Vesel', 'Vesela'],
    cuddly: ['Lipicios', 'Lipicioasa'],
    delicate: ['Delicat', 'Delicata'],
    docile: ['Docil', 'Docila'],
    energetic: ['Energic', 'Energica'],
    fearful: ['Sperios', 'Sperioasa'],
    friendly: ['Prietenos', 'Prietenoasa'],
    gentle: ['Bland', 'Blanda'],
    intelligent: ['Inteligent', 'Inteligenta'],
    loving: ['Iubitor', 'Iubitoare'],
    playful: ['Jucaus', 'Jucausa'],
    reserved: ['Sfios', 'Sfioasa'],
    shy: ['Timid', 'Timida'],
    sociable: ['Sociabil', 'Sociabila'],
    'well-behaved': 'Cuminte',
  },
  health: { vaccinated: ['Vaccinat', 'Vaccinata'], sterilized: ['Castrat', 'Sterilizata'], dewormed: ['Deparazitat', 'Deparazitata'] },
  and: 'si',
  years: (n) => roCount(n, 'an', 'ani'),
  months: (n) => roCount(n, 'luna', 'luni'),
  footer: { contact: 'Contact', socials: 'Retele sociale', rights: 'Toate drepturile rezervate.' },
  contactPage: {
    intro: 'Pentru adoptii, adoptii virtuale, voluntariat sau orice alta intrebare, scrieti-ne. Va raspundem cat mai repede.',
    email: 'Scrieti-ne pe e-mail',
    about: (name) => `Doriti sa aflati mai multe despre ${name}? Mentionati numele in mesajul dvs.`,
  },
  campaigns: {
    lead: 'Strângeri de fonduri pentru nevoile animalelor noastre: fiecare donație contează.',
    empty: 'Nu există nicio campanie în desfășurare în acest moment. Puteți susține oricând asociația printr-o donație.',
    past: 'Campanii încheiate',
    scopes: { global: 'Pentru asociație', need: 'Nevoie concretă', animal: 'Pentru un animal', event: 'Eveniment' },
    permanent: 'Campanie permanentă',
    raisedOf: (goal) => `strânși din ${goal}`,
    converted: (currency) => `Sume aproximative, convertite în ${currency}`,
    daysLeft: (n) => (n === 1 ? 'Ultima zi' : `Încă ${roCount(n, 'zi', 'zile')}`),
    until: (date) => `Până pe ${date}`,
    reached: 'Obiectiv atins. Vă mulțumim!',
    ended: 'Campanie încheiată',
    badge: 'Campanie în desfășurare',
    see: 'Vezi campania',
    give: 'Donează pentru această campanie',
    giveHint: 'Online, cu cardul',
    closedText: 'Această campanie nu mai primește donații. Puteți susține în continuare animalele asociației.',
    otherWays: 'Alte modalități de a dona',
    otherWaysText: (title) => `Puteți dona și prin virament bancar sau PayPal: menționați „${title}” în detaliile plății.`,
    otherWaysLink: 'Vezi toate modalitățile',
    forAnimal: (name) => `Această campanie este pentru ${name}.`,
    seeAnimal: 'Vezi fișa animalului',
    all: 'Toate campaniile',
    inProgress: 'Campanii în desfășurare',
    inProgressLead: 'Nevoi concrete, pentru care fiecare donație contează.',
    animalBox: 'Campanie în desfășurare',
  },
  notFound: { title: 'Pagina nu a fost gasita', text: 'Pagina cautata nu exista sau a fost mutata.', back: 'Inapoi la pagina principala' },
};

const en: Ui = {
  home: 'Home',
  donate: 'Donate',
  download: 'Download',
  wordDocument: 'Word document, in Romanian',
  menu: 'Menu',
  skip: 'Skip to content',
  nav: { adopt: 'Adoption', virtual: 'Sponsorship', help: 'Help us', info: 'The association' },
  pages: {
    'despre-noi': 'About us',
    'adoptii-virtuale-pisici': 'Sponsor a cat',
    'adoptii-virtuale-caini': 'Sponsor a dog',
    'adoptii-caini': 'Dogs for adoption',
    'adoptii-pisici': 'Cats for adoption',
    redirectioneaza: 'Redirect 3.5% of your tax',
    'proiect-2022': 'Our sanctuary',
    'ai-gasit-un-animal': 'Found an animal?',
    'cum-pot-adopta': 'How can I adopt?',
    'rapoarte-de-activitate': 'Activity reports',
    'ghid-de-crestere-si-ingrijire-pisici': 'Cat care guide',
    'in-memoriam': 'In loving memory',
    voluntariat: 'Volunteering',
    contact: 'Contact',
    campanii: 'Campaigns',
    doneaza: 'Donate',
    'termeni-si-conditii': 'Terms and conditions',
    'donation-thank-you-page': 'Thank you for your donation',
    'confirmare-plata': 'Payment confirmation',
  },
  pageLeads: {
    'proiect-2022': 'Four years of work to give our dogs a safe shelter.',
    'ai-gasit-un-animal': 'What to do before finding it a family.',
    'cum-pot-adopta': 'The steps and conditions of a responsible adoption.',
    'rapoarte-de-activitate': 'A summary of our work, year by year.',
    'ghid-de-crestere-si-ingrijire-pisici': 'The golden rules for taking good care of your cat.',
    'in-memoriam': 'They were part of our family. We do not forget them.',
    voluntariat: 'Give a little of your time to animals without a home.',
    redirectioneaza: 'A free gesture for the animals, if you pay income tax in Romania.',
    doneaza: 'Every donation feeds and treats the animals we have rescued.',
    'termeni-si-conditii': 'The conditions for using this website.',
    'donation-thank-you-page': 'Your support changes the lives of the animals in our care.',
    'confirmare-plata': 'Thanks to you, we can keep feeding and treating them.',
  },
  photoAlts: {
    '313291_9419d3ada2c44ed7a96a12b568a4523b_mv2.jpg': 'White long-haired dog with a happy open mouth',
    '23c494_793de495bdea4797a48a44f4619b418b_mv2.jpg': 'Tabby and white cat sitting and looking up',
    '313291_079206781e9a4fb7b249e7f0bebe6f31_mv2.jpg': 'White cat with tabby patches sitting on the floor',
    '313291_e05ab76e725f4fd481f29bddd0e83c61_mv2.jpg': 'Black and white dog sitting in its enclosure',
    '23c494_b230480b309a4402bfc3e96f472913dc_mv2.png': 'Three dogs and three cats of the HOPE association',
    '23c494_92f4e22fa9db4ce5b1a853d2850a5388_mv2.jpeg': 'Dogs on the path of the sanctuary, among grass and trees',
    '313291_8712b4a1e5f1447f9dc063ff9ccaee48_mv2.webp': 'Black and white long-haired dog sitting',
  },
  seo: {
    homeTitle: 'Dog and cat adoption | Bucharest | HOPE Animal Protection Association',
    description: 'HOPE Animal Protection Association: dogs and cats for adoption in Bucharest, puppies and adults.',
    descriptions: {
      campanii: 'Fundraising campaigns of the HOPE association for the dogs and cats it has rescued.',
      'despre-noi': 'HOPE is an animal protection association founded in Bucharest in 2016: we rescue, care for and rehome stray dogs and cats.',
      'adoptii-caini': 'Dogs for adoption in Bucharest: puppies and adult dogs rescued by the HOPE association, each waiting for a family.',
      'adoptii-pisici': 'Cats for adoption in Bucharest: kittens and adult cats rescued by the HOPE association, each waiting for a family.',
      'adoptii-virtuale-caini': 'Sponsor a dog of the HOPE association: you support its food and care from a distance, and it stays in our care.',
      'adoptii-virtuale-pisici': 'Sponsor a cat of the HOPE association: you support its food and care from a distance, and it stays in our care.',
      redirectioneaza: 'Redirect 3.5% of your Romanian income tax to the HOPE association: it costs you nothing and helps feed and treat rescued animals.',
      'proiect-2022': 'The story of the HOPE sanctuary: four years of work to build a safe shelter for our dogs, with the help of our donors.',
      'ai-gasit-un-animal': 'Found a stray dog or cat? What to do first, before looking for a family for it: the advice of the HOPE association.',
      'cum-pot-adopta': 'How to adopt a dog or a cat from the HOPE association: the steps and the conditions of a responsible adoption.',
      'rapoarte-de-activitate': 'Activity reports of the HOPE association, year by year: a summary of our work for stray dogs and cats, with key figures.',
      'ghid-de-crestere-si-ingrijire-pisici': 'Cat care guide of the HOPE association: the golden rules, from neutering to safe windows and balconies, food and toxic plants.',
      'in-memoriam': 'In memory of the dogs and cats of the HOPE association who are no longer with us. They were part of our family.',
      voluntariat: 'Volunteer with the HOPE association in Bucharest: give a little of your time to dogs and cats without a home.',
      contact: 'Contact the HOPE association in Bucharest: adopting a dog or a cat, sponsorship, volunteering or any other question.',
      doneaza: 'Donate to the HOPE association: by card, bank transfer, PayPal, SMS or by redirecting 3.5% of your income tax.',
      'termeni-si-conditii': 'Terms and conditions for using the website of the HOPE Animal Protection Association.',
    },
  },
  homePage: {
    h1: 'HOPE Animal Protection Association',
    adoptions: 'Animal adoptions',
    dogs: 'Dogs for adoption',
    cats: 'Cats for adoption',
    virtual: 'Sponsorship',
    virtualCats: 'Sponsor a cat',
    virtualDogs: 'Sponsor a dog',
    donateTitle: 'Donate',
    donateText: 'Donate to support the care of the dogs and cats of the HOPE Animal Protection Association',
    lead: 'We rescue, care for and rehome stray dogs and cats in and around Bucharest.',
    stats: { animals: 'animals in our care', years: 'years of activity', food: 'kg of food every month' },
    statsOver: { animals: 'more than', years: 'already', food: 'about' },
    adoptionsLead: 'Each of them is waiting for a family to love them. It could be yours.',
    waiting: 'Looking for a family',
    virtualLead: 'Can’t adopt? Choose an animal and support its food and care from a distance: it stays in our care, and you become its sponsor.',
    redirectTitle: 'Redirect 3.5% of your income tax',
    redirectIntro: (year) => `With a FREE gesture you can help 170 dogs and cats. Please fill in the form to redirect 3.5% of your ${year} income tax.`,
    redirectOnline: 'It takes one minute, it is simple and it is online:',
    redirectClosed: (year) => `The online form is open from 1 January to 25 May and opens again on 1 January ${year}. Until then you can download the paper form, already filled in with the association’s details: add your own, sign it and contact us to send it.`,
    redirectPaper: 'Prefer paper? Download the form already filled in with the association’s details, add your own, sign it and contact us to send it.',
    redirectLink: 'Fill in the form',
    redirectDownload: 'Download the form',
    redirectForms: 'All completed and signed forms reach us automatically by email, and we then submit them to ANAF (the Romanian tax authority).',
    redirectCosts: 'The monthly costs of feeding and treating all of them are huge.',
    redirectFacts: [
      '50 animals are between 10 and 17 years old.',
      '3 cats are completely blind.',
      '2 dogs are paralysed.',
      '2 dogs have other disabilities.',
      'We care for 170 animals in total.',
    ],
    redirectThanks: 'Thank you for every form completed, signed and sent for the Hope animals.',
    redirectMore: 'All about redirecting 3.5% of your tax',
    redirectReopens: (year) => `The online form opens again on 1 January ${year}. To send us the paper form:`,
    redirectPageLead: 'Through your contributions, you help us give abandoned animals a better life, every day.',
    redirectPageFreeTitle: 'A FREE gesture that can change lives',
    redirectPageFree: (year) => `By completing the form that redirects 3.5% of your ${year} income tax, you help 170 dogs and cats who depend on us every day.`,
    redirectPageHowTitle: 'How to do it',
    redirectPageOnline: 'Online, from 1 January to 25 May: it only takes one minute, it is simple and it costs you nothing. Completed and signed forms reach us automatically by email, and we submit them to ANAF (the Romanian tax authority).',
    redirectPagePaper: 'On paper, all year round: download the form already filled in with the association’s details, add your own, sign it and contact us to send it.',
    redirectPageRealityTitle: 'The reality behind the numbers',
    redirectPageCosts: 'The monthly costs of providing food, treatment and medical care for all of them are huge:',
    redirectPageEvery: 'Every form counts. Every signature means food, medicine and a chance at a better life.',
    redirectPageThanks: 'Thank you from the bottom of our hearts for every form completed and sent for the Hope animals. For them, this small gesture means a lot.',
  },
  cta: {
    dogs: { title: 'Dogs for adoption', text: 'Discover all the dogs available for adoption', button: 'See the dogs' },
    cats: { title: 'Cats for adoption', text: 'Discover all the cats available for adoption', button: 'See the cats' },
    donate: { title: 'Donate', text: 'Donate to help us save more animals', button: 'Donate' },
    volunteer: { title: 'Volunteering', text: 'Become a volunteer and help us care for the animals of the association.', button: 'Become a volunteer' },
  },
  animal: {
    age: 'Age',
    size: 'Size',
    sex: 'Sex',
    color: 'Colour',
    behavior: 'Temperament',
    health: 'Health',
    back: 'Back',
    contact: 'Contact',
    seeOthers: { dog: 'See other dogs', cat: 'See other cats' },
    virtualAdoption: 'Sponsorship',
    sponsor: 'Sponsor',
    learnMore: 'Learn more',
    photoOf: (name, index) => `${name} – photo ${index}`,
  },
  filters: {
    title: 'Filters',
    any: 'All',
    trait: 'Temperament',
    ageGroup: 'Age',
    young: 'Under 1 year',
    youngAdult: '1 – 3 years',
    adult: '4 – 7 years',
    senior: '8 years and over',
    withCampaign: 'Animals with a fundraiser',
    apply: 'Filter',
    reset: 'Clear filters',
    none: 'No animal matches the selected filters.',
    count: (n) => plural(n, 'animal', 'animals'),
  },
  sex: { male: 'Male', female: 'Female', mixed: 'Male and female' },
  size: { small: 'Small', medium: 'Medium', large: 'Large' },
  color: {
    white: 'White',
    black: 'Black',
    grey: 'Grey',
    orange: 'Ginger',
    'white-black': 'Black and white',
    'white-grey': 'Grey and white',
    'white-orange': 'Ginger and white',
    'white-beige': 'Beige and white',
    'black-grey': 'Grey and black',
    'white-grey-beige': 'White, grey and beige',
    tricolor: 'Tricolour',
  },
  traits: {
    affectionate: 'Affectionate',
    calm: 'Calm',
    cheerful: 'Cheerful',
    cuddly: 'Cuddly',
    delicate: 'Delicate',
    docile: 'Docile',
    energetic: 'Energetic',
    fearful: 'Fearful',
    friendly: 'Friendly',
    gentle: 'Gentle',
    intelligent: 'Intelligent',
    loving: 'Loving',
    playful: 'Playful',
    reserved: 'Reserved',
    shy: 'Shy',
    sociable: 'Sociable',
    'well-behaved': 'Well-behaved',
  },
  health: { vaccinated: 'Vaccinated', sterilized: ['Neutered', 'Spayed'], dewormed: 'Dewormed' },
  and: 'and',
  years: (n) => plural(n, 'year', 'years'),
  months: (n) => plural(n, 'month', 'months'),
  footer: { contact: 'Contact', socials: 'Social media', rights: 'All rights reserved.' },
  contactPage: {
    intro: 'For adoptions, sponsorships, volunteering or any other question, write to us. We will reply as soon as we can.',
    email: 'Email us',
    about: (name) => `Would you like to know more about ${name}? Please mention the name in your message.`,
  },
  campaigns: {
    lead: 'Fundraisers for the needs of our animals: every gift counts.',
    empty: 'There is no campaign in progress at the moment. You can support the association at any time with a donation.',
    past: 'Past campaigns',
    scopes: { global: 'For the association', need: 'A specific need', animal: 'For one animal', event: 'Event' },
    permanent: 'Ongoing campaign',
    raisedOf: (goal) => `raised of ${goal}`,
    converted: (currency) => `Approximate amounts, converted to ${currency}`,
    daysLeft: (n) => (n === 1 ? 'Last day' : `${n} days left`),
    until: (date) => `Until ${date}`,
    reached: 'Goal reached. Thank you!',
    ended: 'Campaign ended',
    badge: 'Fundraiser in progress',
    see: 'See the campaign',
    give: 'Donate to this campaign',
    giveHint: 'Online, by card',
    closedText: 'This campaign no longer takes donations. You can still support the animals of the association.',
    otherWays: 'Other ways to give',
    otherWaysText: (title) => `You can also give by bank transfer or PayPal: mention “${title}” in the payment details.`,
    otherWaysLink: 'See all the ways to give',
    forAnimal: (name) => `This campaign is for ${name}.`,
    seeAnimal: 'See the animal’s page',
    all: 'All campaigns',
    inProgress: 'Campaigns in progress',
    inProgressLead: 'Specific needs, where every gift counts.',
    animalBox: 'Campaign in progress',
  },
  notFound: { title: 'Page not found', text: 'The page you are looking for does not exist or has moved.', back: 'Back to the home page' },
};

const fr: Ui = {
  home: 'Accueil',
  donate: 'Faire un don',
  download: 'Télécharger',
  wordDocument: 'Document Word, en roumain',
  menu: 'Menu',
  skip: 'Aller au contenu',
  nav: { adopt: 'Adoption', virtual: 'Parrainage', help: 'Nous aider', info: 'L’association' },
  pages: {
    'despre-noi': 'À propos de nous',
    'adoptii-virtuale-pisici': 'Parrainer un chat',
    'adoptii-virtuale-caini': 'Parrainer un chien',
    'adoptii-caini': 'Chiens à adopter',
    'adoptii-pisici': 'Chats à adopter',
    redirectioneaza: 'Redirection de 3,5 %',
    'proiect-2022': 'Notre sanctuaire',
    'ai-gasit-un-animal': 'Vous avez trouvé un animal',
    'cum-pot-adopta': 'Comment adopter ?',
    'rapoarte-de-activitate': 'Rapports d’activité',
    'ghid-de-crestere-si-ingrijire-pisici': 'Guide de soins du chat',
    'in-memoriam': 'In memoriam',
    voluntariat: 'Bénévolat',
    contact: 'Contact',
    campanii: 'Collectes',
    doneaza: 'Faire un don',
    'termeni-si-conditii': 'Conditions générales',
    'donation-thank-you-page': 'Merci pour votre don',
    'confirmare-plata': 'Confirmation de paiement',
  },
  pageLeads: {
    'proiect-2022': 'Quatre ans de travail pour offrir à nos chiens un refuge sûr.',
    'ai-gasit-un-animal': 'Ce qu’il faut faire avant de lui chercher une famille.',
    'cum-pot-adopta': 'Les étapes et les conditions d’une adoption responsable.',
    'rapoarte-de-activitate': 'Le bilan de notre activité, année après année.',
    'ghid-de-crestere-si-ingrijire-pisici': 'Les règles d’or pour bien prendre soin de son chat.',
    'in-memoriam': 'Ils ont fait partie de notre famille. Nous ne les oublions pas.',
    voluntariat: 'Donnez un peu de votre temps aux animaux sans foyer.',
    redirectioneaza: 'Un geste gratuit pour les animaux, si vous payez l’impôt en Roumanie.',
    doneaza: 'Chaque don nourrit et soigne les animaux que nous avons recueillis.',
    'termeni-si-conditii': 'Les conditions d’utilisation de ce site.',
    'donation-thank-you-page': 'Votre soutien change la vie des animaux dont nous prenons soin.',
    'confirmare-plata': 'Grâce à vous, nous pouvons continuer à les nourrir et à les soigner.',
  },
  photoAlts: {
    '313291_9419d3ada2c44ed7a96a12b568a4523b_mv2.jpg': 'Chien blanc à poil long, la gueule ouverte comme un sourire',
    '23c494_793de495bdea4797a48a44f4619b418b_mv2.jpg': 'Chat tigré et blanc assis, qui regarde vers le haut',
    '313291_079206781e9a4fb7b249e7f0bebe6f31_mv2.jpg': 'Chat blanc à taches tigrées assis sur le sol',
    '313291_e05ab76e725f4fd481f29bddd0e83c61_mv2.jpg': 'Chien noir et blanc assis dans son enclos',
    '23c494_b230480b309a4402bfc3e96f472913dc_mv2.png': 'Trois chiens et trois chats de l’association HOPE',
    '23c494_92f4e22fa9db4ce5b1a853d2850a5388_mv2.jpeg': 'Des chiens sur l’allée du sanctuaire, entre l’herbe et les arbres',
    '313291_8712b4a1e5f1447f9dc063ff9ccaee48_mv2.webp': 'Chien noir et blanc à poil long, assis',
  },
  seo: {
    homeTitle: 'Adoption de chiens et de chats | Bucarest | Association de protection des animaux HOPE',
    description: 'Association de protection des animaux HOPE : chiens et chats à adopter à Bucarest, jeunes et adultes.',
    descriptions: {
      campanii: 'Les collectes de fonds de l’association HOPE pour les chiens et les chats qu’elle a recueillis.',
      'despre-noi': 'HOPE est une association de protection des animaux fondée à Bucarest en 2016 : nous recueillons, soignons et faisons adopter chiens et chats errants.',
      'adoptii-caini': 'Chiens à adopter à Bucarest : chiots et chiens adultes recueillis par l’association HOPE, qui attendent chacun une famille.',
      'adoptii-pisici': 'Chats à adopter à Bucarest : chatons et chats adultes recueillis par l’association HOPE, qui attendent chacun une famille.',
      'adoptii-virtuale-caini': 'Parrainez un chien de l’association HOPE : vous financez à distance sa nourriture et ses soins, et il reste sous notre garde.',
      'adoptii-virtuale-pisici': 'Parrainez un chat de l’association HOPE : vous financez à distance sa nourriture et ses soins, et il reste sous notre garde.',
      redirectioneaza: 'Redirigez 3,5 % de votre impôt sur le revenu roumain vers l’association HOPE : un geste gratuit qui aide à nourrir et soigner les animaux.',
      'proiect-2022': 'L’histoire du sanctuaire de l’association HOPE : quatre ans de travail pour construire un refuge sûr pour nos chiens, grâce à nos donateurs.',
      'ai-gasit-un-animal': 'Vous avez trouvé un chien ou un chat errant ? Ce qu’il faut faire avant de lui chercher une famille : les conseils de l’association HOPE.',
      'cum-pot-adopta': 'Comment adopter un chien ou un chat de l’association HOPE : les étapes et les conditions d’une adoption responsable.',
      'rapoarte-de-activitate': 'Rapports d’activité de l’association HOPE, année après année : le bilan de notre travail pour les chiens et les chats errants, avec les chiffres clés.',
      'ghid-de-crestere-si-ingrijire-pisici': 'Guide de soins du chat de l’association HOPE : les règles d’or, de la stérilisation aux fenêtres et balcons, à l’alimentation et aux plantes toxiques.',
      'in-memoriam': 'À la mémoire des chiens et des chats de l’association HOPE qui nous ont quittés. Ils ont fait partie de notre famille.',
      voluntariat: 'Devenez bénévole de l’association HOPE à Bucarest : donnez un peu de votre temps aux chiens et aux chats sans foyer.',
      contact: 'Contactez l’association HOPE à Bucarest : adoption d’un chien ou d’un chat, parrainage, bénévolat ou toute autre question.',
      doneaza: 'Faites un don à l’association HOPE : par carte, virement, PayPal, SMS ou en redirigeant 3,5 % de votre impôt sur le revenu.',
      'termeni-si-conditii': 'Conditions générales d’utilisation du site de l’association de protection des animaux HOPE.',
    },
  },
  homePage: {
    h1: 'Association pour la protection des animaux HOPE',
    adoptions: 'Animaux à adopter',
    dogs: 'Chiens à adopter',
    cats: 'Chats à adopter',
    virtual: 'Parrainage',
    virtualCats: 'Parrainer un chat',
    virtualDogs: 'Parrainer un chien',
    donateTitle: 'Faire un don',
    donateText: 'Soutenez les chiens et les chats de l’association HOPE en faisant un don',
    lead: 'Nous recueillons, soignons et faisons adopter des chiens et des chats errants de Bucarest et de ses environs.',
    stats: { animals: 'animaux à notre charge', years: "années d'activité", food: 'kg de nourriture chaque mois' },
    statsOver: { animals: 'plus de', years: 'déjà', food: 'environ' },
    adoptionsLead: 'Chacun d’eux attend une famille qui l’aimera. Peut-être la vôtre.',
    waiting: 'Ils cherchent une famille',
    virtualLead: 'Vous ne pouvez pas adopter ? Choisissez un animal et financez à distance sa nourriture et ses soins : il reste sous notre garde, et vous devenez son parrain ou sa marraine.',
    redirectTitle: 'Redirection de 3,5 % de votre impôt sur le revenu',
    redirectIntro: (year) => `Un geste GRATUIT suffit pour aider 170 chiens et chats. Remplissez le formulaire pour reverser 3,5 % de votre impôt sur le revenu ${year}.`,
    redirectOnline: 'Cela prend une minute, c’est simple et en ligne :',
    redirectClosed: (year) => `Le formulaire en ligne est ouvert du 1er janvier au 25 mai et rouvrira le 1er janvier ${year}. D’ici là, vous pouvez télécharger le formulaire papier, déjà rempli avec les coordonnées de l’association : ajoutez les vôtres, signez-le et contactez-nous pour nous le transmettre.`,
    redirectPaper: 'Vous préférez le papier ? Téléchargez le formulaire déjà rempli avec les coordonnées de l’association, ajoutez les vôtres, signez-le et contactez-nous pour nous le transmettre.',
    redirectLink: 'Remplir le formulaire',
    redirectDownload: 'Télécharger le formulaire',
    redirectForms: 'Tous les formulaires remplis et signés nous parviennent automatiquement par e-mail, puis nous les déposons auprès de l’ANAF (l’administration fiscale roumaine).',
    redirectCosts: 'Les dépenses mensuelles pour nourrir et soigner tous les animaux sont énormes.',
    redirectFacts: [
      '50 animaux ont entre 10 et 17 ans.',
      '3 chats sont complètement aveugles.',
      '2 chiens sont paralysés.',
      '2 chiens ont d’autres handicaps.',
      'Nous prenons soin de 170 animaux au total.',
    ],
    redirectThanks: 'Merci pour chaque formulaire rempli, signé et envoyé pour les animaux de Hope.',
    redirectMore: 'Tout savoir sur la redirection de 3,5 %',
    redirectReopens: (year) => `Le formulaire en ligne rouvrira le 1er janvier ${year}. Pour nous transmettre le formulaire papier :`,
    redirectPageLead: 'Grâce à votre contribution, vous nous aidez à offrir chaque jour une vie meilleure aux animaux abandonnés.',
    redirectPageFreeTitle: 'Un geste GRATUIT qui peut changer des vies',
    redirectPageFree: (year) => `En remplissant le formulaire de redirection de 3,5 % de votre impôt sur le revenu ${year}, vous aidez 170 chiens et chats qui dépendent de nous au quotidien.`,
    redirectPageHowTitle: 'Comment faire',
    redirectPageOnline: 'En ligne, du 1er janvier au 25 mai : cela ne prend qu’une minute, c’est simple et cela ne vous coûte rien. Les formulaires remplis et signés nous parviennent automatiquement par e-mail, et nous nous chargeons de les déposer auprès de l’ANAF (l’administration fiscale roumaine).',
    redirectPagePaper: 'Sur papier, toute l’année : téléchargez le formulaire déjà rempli avec les coordonnées de l’association, ajoutez les vôtres, signez-le et contactez-nous pour nous le transmettre.',
    redirectPageRealityTitle: 'La réalité derrière les chiffres',
    redirectPageCosts: 'Les dépenses mensuelles sont énormes pour assurer à tous nourriture, traitements et soins médicaux :',
    redirectPageEvery: 'Chaque formulaire compte. Chaque signature, c’est de la nourriture, des médicaments et la chance d’une vie meilleure.',
    redirectPageThanks: 'Nous vous remercions du fond du cœur pour chaque formulaire rempli et envoyé pour les animaux de Hope. Pour eux, ce petit geste compte énormément.',
  },
  cta: {
    dogs: { title: 'Chiens à adopter', text: 'Découvrez tous les chiens disponibles à l’adoption', button: 'Voir les chiens' },
    cats: { title: 'Chats à adopter', text: 'Découvrez tous les chats disponibles à l’adoption', button: 'Voir les chats' },
    donate: { title: 'Faire un don', text: 'Faites un don pour nous aider à sauver plus d’animaux', button: 'Faire un don' },
    volunteer: { title: 'Bénévolat', text: 'Devenez bénévole et aidez-nous à prendre soin des animaux de l’association.', button: 'Devenir bénévole' },
  },
  animal: {
    age: 'Âge',
    size: 'Taille',
    sex: 'Sexe',
    color: 'Couleur',
    behavior: 'Caractère',
    health: 'Santé',
    back: 'Retour',
    contact: 'Contact',
    seeOthers: { dog: 'Voir d’autres chiens', cat: 'Voir d’autres chats' },
    virtualAdoption: 'Parrainage',
    sponsor: 'Parrainer',
    learnMore: 'En savoir plus',
    photoOf: (name, index) => `${name} – photo ${index}`,
  },
  filters: {
    title: 'Filtres',
    any: 'Tous',
    trait: 'Caractère',
    ageGroup: 'Âge',
    young: 'Moins d’un an',
    youngAdult: '1 à 3 ans',
    adult: '4 à 7 ans',
    senior: '8 ans et plus',
    withCampaign: 'Animaux avec une collecte',
    apply: 'Filtrer',
    reset: 'Effacer les filtres',
    none: 'Aucun animal ne correspond aux filtres choisis.',
    count: (n) => plural(n, 'animal', 'animaux'),
  },
  sex: { male: 'Mâle', female: 'Femelle', mixed: 'Mâle et femelle' },
  size: { small: ['Petit', 'Petite'], medium: ['Moyen', 'Moyenne'], large: ['Grand', 'Grande'] },
  color: {
    white: 'Blanc',
    black: 'Noir',
    grey: 'Gris',
    orange: 'Roux',
    'white-black': 'Noir et blanc',
    'white-grey': 'Gris et blanc',
    'white-orange': 'Roux et blanc',
    'white-beige': 'Beige et blanc',
    'black-grey': 'Gris et noir',
    'white-grey-beige': 'Blanc, gris et beige',
    tricolor: 'Tricolore',
  },
  traits: {
    affectionate: ['Affectueux', 'Affectueuse'],
    calm: 'Calme',
    cheerful: ['Joyeux', 'Joyeuse'],
    cuddly: ['Câlin', 'Câline'],
    delicate: ['Délicat', 'Délicate'],
    docile: 'Docile',
    energetic: 'Énergique',
    fearful: ['Craintif', 'Craintive'],
    friendly: ['Amical', 'Amicale'],
    gentle: ['Doux', 'Douce'],
    intelligent: ['Intelligent', 'Intelligente'],
    loving: ['Aimant', 'Aimante'],
    playful: ['Joueur', 'Joueuse'],
    reserved: ['Réservé', 'Réservée'],
    shy: 'Timide',
    sociable: 'Sociable',
    'well-behaved': 'Sage',
  },
  health: { vaccinated: ['Vacciné', 'Vaccinée'], sterilized: ['Castré', 'Stérilisée'], dewormed: ['Vermifugé', 'Vermifugée'] },
  and: 'et',
  years: (n) => plural(n, 'an', 'ans'),
  months: (n) => `${n} mois`,
  footer: { contact: 'Contact', socials: 'Réseaux sociaux', rights: 'Tous droits réservés.' },
  contactPage: {
    intro: 'Pour une adoption, un parrainage, du bénévolat ou toute autre question, écrivez-nous. Nous vous répondrons dès que possible.',
    email: 'Nous écrire par e-mail',
    about: (name) => `Vous souhaitez en savoir plus sur ${name} ? Indiquez son nom dans votre message.`,
  },
  campaigns: {
    lead: 'Des collectes pour les besoins de nos animaux : chaque don compte.',
    empty: 'Aucune collecte n’est en cours pour le moment. Vous pouvez soutenir l’association à tout moment par un don.',
    past: 'Collectes terminées',
    scopes: { global: 'Pour l’association', need: 'Un besoin précis', animal: 'Pour un animal', event: 'Événement' },
    permanent: 'Collecte permanente',
    raisedOf: (goal) => `collectés sur ${goal}`,
    converted: (currency) => `Montants approximatifs, convertis en ${currency}`,
    daysLeft: (n) => (n === 1 ? 'Dernier jour' : `Encore ${n} jours`),
    until: (date) => `Jusqu’au ${date}`,
    reached: 'Objectif atteint. Merci !',
    ended: 'Collecte terminée',
    badge: 'Collecte en cours',
    see: 'Voir la collecte',
    give: 'Donner pour cette collecte',
    giveHint: 'En ligne, par carte',
    closedText: 'Cette collecte ne reçoit plus de dons. Vous pouvez toujours soutenir les animaux de l’association.',
    otherWays: 'Autres moyens de donner',
    otherWaysText: (title) => `Vous pouvez aussi donner par virement ou par PayPal : indiquez « ${title} » dans le libellé du paiement.`,
    otherWaysLink: 'Voir tous les moyens de donner',
    forAnimal: (name) => `Cette collecte est pour ${name}.`,
    seeAnimal: 'Voir sa fiche',
    all: 'Toutes les collectes',
    inProgress: 'Collectes en cours',
    inProgressLead: 'Des besoins précis, pour lesquels chaque don compte.',
    animalBox: 'Collecte en cours',
  },
  notFound: { title: 'Page introuvable', text: 'La page que vous cherchez n’existe pas ou a été déplacée.', back: 'Retour à l’accueil' },
};

const de: Ui = {
  home: 'Startseite',
  donate: 'Spenden',
  download: 'Herunterladen',
  wordDocument: 'Word-Dokument, auf Rumänisch',
  menu: 'Menü',
  skip: 'Zum Inhalt springen',
  nav: { adopt: 'Adoption', virtual: 'Patenschaft', help: 'Helfen', info: 'Der Verein' },
  pages: {
    'despre-noi': 'Über uns',
    'adoptii-virtuale-pisici': 'Patenschaft für eine Katze',
    'adoptii-virtuale-caini': 'Patenschaft für einen Hund',
    'adoptii-caini': 'Hunde zur Adoption',
    'adoptii-pisici': 'Katzen zur Adoption',
    redirectioneaza: '3,5 % der Steuer umleiten',
    'proiect-2022': 'Unser Gnadenhof',
    'ai-gasit-un-animal': 'Tier gefunden?',
    'cum-pot-adopta': 'Wie kann ich adoptieren?',
    'rapoarte-de-activitate': 'Tätigkeitsberichte',
    'ghid-de-crestere-si-ingrijire-pisici': 'Ratgeber Katzenpflege',
    'in-memoriam': 'In memoriam',
    voluntariat: 'Ehrenamt',
    contact: 'Kontakt',
    campanii: 'Spendenaktionen',
    doneaza: 'Spenden',
    'termeni-si-conditii': 'Nutzungsbedingungen',
    'donation-thank-you-page': 'Danke für Ihre Spende',
    'confirmare-plata': 'Zahlungsbestätigung',
  },
  pageLeads: {
    'proiect-2022': 'Vier Jahre Arbeit, um unseren Hunden eine sichere Zuflucht zu geben.',
    'ai-gasit-un-animal': 'Was zu tun ist, bevor Sie ein Zuhause für das Tier suchen.',
    'cum-pot-adopta': 'Die Schritte und Bedingungen einer verantwortungsvollen Adoption.',
    'rapoarte-de-activitate': 'Unsere Arbeit im Überblick, Jahr für Jahr.',
    'ghid-de-crestere-si-ingrijire-pisici': 'Die goldenen Regeln für die gute Pflege Ihrer Katze.',
    'in-memoriam': 'Sie waren Teil unserer Familie. Wir vergessen sie nicht.',
    voluntariat: 'Schenken Sie Tieren ohne Zuhause ein wenig Ihrer Zeit.',
    redirectioneaza: 'Eine kostenlose Geste für die Tiere, wenn Sie in Rumänien Einkommensteuer zahlen.',
    doneaza: 'Jede Spende ernährt und versorgt die Tiere, die wir gerettet haben.',
    'termeni-si-conditii': 'Die Bedingungen für die Nutzung dieser Website.',
    'donation-thank-you-page': 'Ihre Unterstützung verändert das Leben der Tiere in unserer Obhut.',
    'confirmare-plata': 'Dank Ihnen können wir sie weiter füttern und versorgen.',
  },
  photoAlts: {
    '313291_9419d3ada2c44ed7a96a12b568a4523b_mv2.jpg': 'Weißer langhaariger Hund mit fröhlich geöffnetem Maul',
    '23c494_793de495bdea4797a48a44f4619b418b_mv2.jpg': 'Getigerte Katze mit Weiß, die sitzt und nach oben schaut',
    '313291_079206781e9a4fb7b249e7f0bebe6f31_mv2.jpg': 'Weiße Katze mit getigerten Flecken, die auf dem Boden sitzt',
    '313291_e05ab76e725f4fd481f29bddd0e83c61_mv2.jpg': 'Schwarz-weißer Hund, der in seinem Gehege sitzt',
    '23c494_b230480b309a4402bfc3e96f472913dc_mv2.png': 'Drei Hunde und drei Katzen des Tierschutzvereins HOPE',
    '23c494_92f4e22fa9db4ce5b1a853d2850a5388_mv2.jpeg': 'Hunde auf dem Weg des Gnadenhofs, zwischen Gras und Bäumen',
    '313291_8712b4a1e5f1447f9dc063ff9ccaee48_mv2.webp': 'Schwarz-weißer langhaariger Hund, sitzend',
  },
  seo: {
    homeTitle: 'Hunde und Katzen adoptieren | Bukarest | Tierschutzverein HOPE',
    description: 'Tierschutzverein HOPE: Hunde und Katzen zur Adoption in Bukarest, Jungtiere und erwachsene Tiere.',
    descriptions: {
      campanii: 'Die Spendenaktionen des Tierschutzvereins HOPE für die geretteten Hunde und Katzen.',
      'despre-noi': 'HOPE ist ein 2016 in Bukarest gegründeter Tierschutzverein: Wir retten, versorgen und vermitteln herrenlose Hunde und Katzen.',
      'adoptii-caini': 'Hunde zur Adoption in Bukarest: Welpen und erwachsene Hunde, gerettet vom Tierschutzverein HOPE, warten auf eine Familie.',
      'adoptii-pisici': 'Katzen zur Adoption in Bukarest: Kätzchen und erwachsene Katzen, gerettet vom Tierschutzverein HOPE, warten auf eine Familie.',
      'adoptii-virtuale-caini': 'Übernehmen Sie die Patenschaft für einen Hund des Tierschutzvereins HOPE: Sie unterstützen Futter und Pflege, er bleibt in unserer Obhut.',
      'adoptii-virtuale-pisici': 'Übernehmen Sie die Patenschaft für eine Katze des Tierschutzvereins HOPE: Sie unterstützen Futter und Pflege, sie bleibt in unserer Obhut.',
      redirectioneaza: 'Leiten Sie 3,5 % Ihrer rumänischen Einkommensteuer an den Tierschutzverein HOPE um: kostenlos für Sie, eine Hilfe für Futter und Pflege der Tiere.',
      'proiect-2022': 'Die Geschichte des Gnadenhofs von HOPE: vier Jahre Arbeit, um unseren Hunden eine sichere Zuflucht zu bauen, dank unserer Spender.',
      'ai-gasit-un-animal': 'Sie haben einen herrenlosen Hund oder eine Katze gefunden? Was zu tun ist, bevor Sie ein Zuhause suchen: die Ratschläge des Tierschutzvereins HOPE.',
      'cum-pot-adopta': 'So adoptieren Sie einen Hund oder eine Katze vom Tierschutzverein HOPE: die Schritte und Bedingungen einer verantwortungsvollen Adoption.',
      'rapoarte-de-activitate': 'Tätigkeitsberichte des Tierschutzvereins HOPE, Jahr für Jahr: unsere Arbeit für herrenlose Hunde und Katzen im Überblick, mit den wichtigsten Zahlen.',
      'ghid-de-crestere-si-ingrijire-pisici': 'Ratgeber zur Katzenpflege des Tierschutzvereins HOPE: die goldenen Regeln, von der Kastration über sichere Fenster und Balkone bis zu Futter und giftigen Pflanzen.',
      'in-memoriam': 'In Erinnerung an die Hunde und Katzen des Tierschutzvereins HOPE, die nicht mehr bei uns sind. Sie waren Teil unserer Familie.',
      voluntariat: 'Helfen Sie ehrenamtlich beim Tierschutzverein HOPE in Bukarest: Schenken Sie Hunden und Katzen ohne Zuhause ein wenig Ihrer Zeit.',
      contact: 'Kontakt zum Tierschutzverein HOPE in Bukarest: Adoption eines Hundes oder einer Katze, Patenschaft, Ehrenamt oder jede andere Frage.',
      doneaza: 'Spenden Sie an den Tierschutzverein HOPE: per Karte, Überweisung, PayPal, SMS oder durch Umleitung von 3,5 % Ihrer Einkommensteuer.',
      'termeni-si-conditii': 'Nutzungsbedingungen der Website des Tierschutzvereins HOPE.',
    },
  },
  homePage: {
    h1: 'Tierschutzverein HOPE',
    adoptions: 'Tiere zur Adoption',
    dogs: 'Hunde zur Adoption',
    cats: 'Katzen zur Adoption',
    virtual: 'Patenschaft',
    virtualCats: 'Patenschaft für eine Katze',
    virtualDogs: 'Patenschaft für einen Hund',
    donateTitle: 'Spenden',
    donateText: 'Unterstützen Sie mit Ihrer Spende die Hunde und Katzen des Tierschutzvereins HOPE',
    lead: 'Wir retten, versorgen und vermitteln herrenlose Hunde und Katzen aus Bukarest und Umgebung.',
    stats: { animals: 'Tiere in unserer Obhut', years: 'Jahre im Einsatz', food: 'kg Futter jeden Monat' },
    statsOver: { animals: 'über', years: 'bereits', food: 'rund' },
    adoptionsLead: 'Jedes von ihnen wartet auf eine Familie, die es liebt. Vielleicht auf Ihre.',
    waiting: 'Sie suchen ein Zuhause',
    virtualLead: 'Sie können kein Tier aufnehmen? Wählen Sie ein Tier aus und unterstützen Sie aus der Ferne sein Futter und seine Pflege: Es bleibt in unserer Obhut, und Sie werden sein Pate oder seine Patin.',
    redirectTitle: '3,5 % der Einkommensteuer umleiten',
    redirectIntro: (year) => `Mit einer KOSTENLOSEN Geste können Sie 170 Hunden und Katzen helfen. Füllen Sie das Formular aus, um 3,5 % Ihrer Einkommensteuer ${year} umzuleiten.`,
    redirectOnline: 'Es dauert eine Minute, ist einfach und online:',
    redirectClosed: (year) => `Das Online-Formular ist vom 1. Januar bis zum 25. Mai geöffnet und öffnet wieder am 1. Januar ${year}. Bis dahin können Sie das Papierformular herunterladen, das bereits mit den Angaben des Vereins ausgefüllt ist: Ergänzen Sie Ihre Angaben, unterschreiben Sie es und kontaktieren Sie uns für die Übermittlung.`,
    redirectPaper: 'Lieber auf Papier? Laden Sie das bereits mit den Angaben des Vereins ausgefüllte Formular herunter, ergänzen Sie Ihre Angaben, unterschreiben Sie es und kontaktieren Sie uns für die Übermittlung.',
    redirectLink: 'Formular ausfüllen',
    redirectDownload: 'Formular herunterladen',
    redirectForms: 'Alle ausgefüllten und unterschriebenen Formulare erreichen uns automatisch per E-Mail; wir reichen sie anschließend bei der ANAF (der rumänischen Steuerbehörde) ein.',
    redirectCosts: 'Die monatlichen Kosten für Futter und Behandlungen aller Tiere sind enorm.',
    redirectFacts: [
      '50 Tiere sind zwischen 10 und 17 Jahre alt.',
      '3 Katzen sind vollständig blind.',
      '2 Hunde sind gelähmt.',
      '2 Hunde haben andere Behinderungen.',
      'Insgesamt versorgen wir 170 Tiere.',
    ],
    redirectThanks: 'Vielen Dank für jedes Formular, das für die Hope-Tiere ausgefüllt, unterschrieben und abgeschickt wird.',
    redirectMore: 'Alles zur Umleitung von 3,5 %',
    redirectReopens: (year) => `Das Online-Formular öffnet wieder am 1. Januar ${year}. So erreichen Sie uns für das Papierformular:`,
    redirectPageLead: 'Mit Ihrem Beitrag helfen Sie uns, verlassenen Tieren jeden Tag ein besseres Leben zu ermöglichen.',
    redirectPageFreeTitle: 'Eine KOSTENLOSE Geste, die Leben verändern kann',
    redirectPageFree: (year) => `Mit dem Formular zur Umleitung von 3,5 % Ihrer Einkommensteuer ${year} helfen Sie 170 Hunden und Katzen, die täglich auf uns angewiesen sind (für Steuerpflichtige in Rumänien).`,
    redirectPageHowTitle: 'So geht es',
    redirectPageOnline: 'Online, vom 1. Januar bis zum 25. Mai: Es dauert nur eine Minute, ist einfach und kostet Sie nichts. Die ausgefüllten und unterschriebenen Formulare erreichen uns automatisch per E-Mail; wir reichen sie bei der ANAF (der rumänischen Steuerbehörde) ein.',
    redirectPagePaper: 'Auf Papier, das ganze Jahr über: Laden Sie das bereits mit den Angaben des Vereins ausgefüllte Formular herunter, ergänzen Sie Ihre Angaben, unterschreiben Sie es und kontaktieren Sie uns für die Übermittlung.',
    redirectPageRealityTitle: 'Die Wirklichkeit hinter den Zahlen',
    redirectPageCosts: 'Die monatlichen Kosten für Futter, Behandlungen und medizinische Versorgung aller Tiere sind enorm:',
    redirectPageEvery: 'Jedes Formular zählt. Jede Unterschrift bedeutet Futter, Medikamente und die Chance auf ein besseres Leben.',
    redirectPageThanks: 'Wir danken Ihnen von Herzen für jedes Formular, das für die Hope-Tiere ausgefüllt und abgeschickt wird. Für sie bedeutet diese kleine Geste sehr viel.',
  },
  cta: {
    dogs: { title: 'Hunde zur Adoption', text: 'Entdecken Sie alle Hunde, die ein Zuhause suchen', button: 'Hunde ansehen' },
    cats: { title: 'Katzen zur Adoption', text: 'Entdecken Sie alle Katzen, die ein Zuhause suchen', button: 'Katzen ansehen' },
    donate: { title: 'Spenden', text: 'Spenden Sie, damit wir mehr Tiere retten können', button: 'Spenden' },
    volunteer: { title: 'Ehrenamt', text: 'Werden Sie ehrenamtlich aktiv und helfen Sie uns, die Tiere des Vereins zu versorgen.', button: 'Ehrenamtlich helfen' },
  },
  animal: {
    age: 'Alter',
    size: 'Größe',
    sex: 'Geschlecht',
    color: 'Farbe',
    behavior: 'Charakter',
    health: 'Gesundheit',
    back: 'Zurück',
    contact: 'Kontakt',
    seeOthers: { dog: 'Weitere Hunde ansehen', cat: 'Weitere Katzen ansehen' },
    virtualAdoption: 'Patenschaft',
    sponsor: 'Pate werden',
    learnMore: 'Mehr erfahren',
    photoOf: (name, index) => `${name} – Foto ${index}`,
  },
  filters: {
    title: 'Filter',
    any: 'Alle',
    trait: 'Charakter',
    ageGroup: 'Alter',
    young: 'Unter 1 Jahr',
    youngAdult: '1 bis 3 Jahre',
    adult: '4 bis 7 Jahre',
    senior: '8 Jahre und älter',
    withCampaign: 'Tiere mit Spendenaktion',
    apply: 'Filtern',
    reset: 'Filter zurücksetzen',
    none: 'Kein Tier entspricht den gewählten Filtern.',
    count: (n) => plural(n, 'Tier', 'Tiere'),
  },
  sex: { male: 'Männlich', female: 'Weiblich', mixed: 'Männlich und weiblich' },
  size: { small: 'Klein', medium: 'Mittel', large: 'Groß' },
  color: {
    white: 'Weiß',
    black: 'Schwarz',
    grey: 'Grau',
    orange: 'Rot',
    'white-black': 'Schwarz-weiß',
    'white-grey': 'Grau-weiß',
    'white-orange': 'Rot-weiß',
    'white-beige': 'Beige-weiß',
    'black-grey': 'Grau-schwarz',
    'white-grey-beige': 'Weiß, grau und beige',
    tricolor: 'Dreifarbig',
  },
  traits: {
    affectionate: 'Anhänglich',
    calm: 'Ruhig',
    cheerful: 'Fröhlich',
    cuddly: 'Verschmust',
    delicate: 'Zart',
    docile: 'Folgsam',
    energetic: 'Energiegeladen',
    fearful: 'Ängstlich',
    friendly: 'Freundlich',
    gentle: 'Sanft',
    intelligent: 'Intelligent',
    loving: 'Liebevoll',
    playful: 'Verspielt',
    reserved: 'Zurückhaltend',
    shy: 'Schüchtern',
    sociable: 'Gesellig',
    'well-behaved': 'Brav',
  },
  health: { vaccinated: 'Geimpft', sterilized: 'Kastriert', dewormed: 'Entwurmt' },
  and: 'und',
  years: (n) => plural(n, 'Jahr', 'Jahre'),
  months: (n) => plural(n, 'Monat', 'Monate'),
  footer: { contact: 'Kontakt', socials: 'Soziale Netzwerke', rights: 'Alle Rechte vorbehalten.' },
  contactPage: {
    intro: 'Für Adoptionen, Patenschaften, ehrenamtliche Mitarbeit oder andere Fragen schreiben Sie uns. Wir antworten so schnell wie möglich.',
    email: 'E-Mail schreiben',
    about: (name) => `Sie möchten mehr über ${name} erfahren? Bitte nennen Sie den Namen in Ihrer Nachricht.`,
  },
  campaigns: {
    lead: 'Spendenaktionen für die Bedürfnisse unserer Tiere: Jede Spende zählt.',
    empty: 'Zurzeit läuft keine Spendenaktion. Sie können den Verein jederzeit mit einer Spende unterstützen.',
    past: 'Beendete Spendenaktionen',
    scopes: { global: 'Für den Verein', need: 'Konkreter Bedarf', animal: 'Für ein Tier', event: 'Anlass' },
    permanent: 'Dauerhafte Spendenaktion',
    raisedOf: (goal) => `von ${goal} gesammelt`,
    converted: (currency) => `Ungefähre Beträge, in ${currency} umgerechnet`,
    daysLeft: (n) => (n === 1 ? 'Letzter Tag' : `Noch ${n} Tage`),
    until: (date) => `Bis zum ${date}`,
    reached: 'Ziel erreicht. Vielen Dank!',
    ended: 'Spendenaktion beendet',
    badge: 'Spendenaktion läuft',
    see: 'Zur Spendenaktion',
    give: 'Für diese Aktion spenden',
    giveHint: 'Online, mit Karte',
    closedText: 'Diese Spendenaktion nimmt keine Spenden mehr an. Sie können die Tiere des Vereins weiterhin unterstützen.',
    otherWays: 'Weitere Spendenmöglichkeiten',
    otherWaysText: (title) => `Sie können auch per Überweisung oder PayPal spenden: Geben Sie „${title}“ im Verwendungszweck an.`,
    otherWaysLink: 'Alle Spendenmöglichkeiten ansehen',
    forAnimal: (name) => `Diese Spendenaktion ist für ${name}.`,
    seeAnimal: 'Zum Steckbrief',
    all: 'Alle Spendenaktionen',
    inProgress: 'Laufende Spendenaktionen',
    inProgressLead: 'Konkrete Bedürfnisse, bei denen jede Spende zählt.',
    animalBox: 'Laufende Spendenaktion',
  },
  notFound: { title: 'Seite nicht gefunden', text: 'Die gesuchte Seite existiert nicht oder wurde verschoben.', back: 'Zurück zur Startseite' },
};

const DICTIONARIES: Record<Locale, Ui> = { ro, en, fr, de };
export const useUi = (locale: Locale): Ui => DICTIONARIES[locale];

/** Meta description of a page when none was written in the admin; pages left out of search engines share the one of the site. */
export const pageDescription = (ui: Ui, page: PageKey): string => (ui.seo.descriptions as Partial<Record<PageKey, string>>)[page] ?? ui.seo.description;

/** Picks the form that agrees with the animal's sex (masculine for groups and unknown). */
export const gendered = (label: Gendered, sex: Sex | null): string => (typeof label === 'string' ? label : label[sex === 'female' ? 1 : 0]);

/** "A, B and C" in the page language. */
export function joinList(items: string[], and: string): string {
  if (items.length < 2) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${and} ${items[items.length - 1]}`;
}

/** Age in months below one year, in whole years after. */
export const formatAge = (ui: Ui, months: number): string => (months < 12 ? ui.months(Math.max(months, 1)) : ui.years(Math.floor(months / 12)));
