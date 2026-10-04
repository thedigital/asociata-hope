import type { Locale } from './config.ts';
import type { PageKey } from '../lib/site.ts';
import type { Color, Sex, Size, Trait } from '../lib/taxonomy.ts';

/** A label that agrees with the animal's sex: [masculine, feminine]. */
type Gendered = string | [string, string];
type Cta = { title: string; text: string; button: string };

export type Ui = {
  home: string;
  donate: string;
  menu: string;
  skip: string;
  nav: { virtual: string; info: string };
  pages: Record<PageKey, string>;
  seo: { homeTitle: string; description: string };
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
    redirectTitle: string;
    redirectIntro: string;
    redirectLink: string;
    redirectDownload: string;
    redirectForms: string;
    redirectCosts: string;
    redirectFacts: string[];
    redirectThanks: string;
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
    adult: string;
    senior: string;
    apply: string;
    reset: string;
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
  footer: { address: string; contact: string; socials: string; rights: string };
  contactPage: { intro: string; email: string; about: (name: string) => string };
  notFound: { title: string; text: string; back: string };
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
/** Romanian inserts "de" after numbers ending in 00 or 20–99 ("20 de ani"). */
const roCount = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${n % 100 === 0 || n % 100 >= 20 ? 'de ' : ''}${many}`);

const ro: Ui = {
  home: 'Acasa',
  donate: 'Doneaza',
  menu: 'Meniu',
  skip: 'Sari la continut',
  nav: { virtual: 'Adoptii virtuale', info: 'Info' },
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
    'raport-2024': 'Raport 2024',
    'ghid-de-crestere-si-ingrijire-pisici': 'Ghid de crestere si ingrijire pisici',
    'in-memoriam': 'In memoriam',
    voluntariat: 'Voluntariat',
    contact: 'Contact',
    doneaza: 'Doneaza',
    'termeni-si-conditii': 'Termeni si conditii',
    'donation-thank-you-page': 'Multumim pentru donatie',
    'confirmare-plata': 'Confirmare plata',
  },
  seo: {
    homeTitle: 'Adoptii caini pisici | Bucuresti | Asociatia protectia animalelor HOPE',
    description: 'Asociatia protectia animalelor HOPE : Adoptii caini, pui si adulti',
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
    redirectTitle: 'Redirectionare 3,5%',
    redirectIntro:
      'Printr-un gest GRATUIT puteti ajuta 170 de catei si pisicute. Completati va rugam formularul pentru directionarea a 3,5% din impozitul salarial pentru anul 2025. Dureaza 1 minut, este simplu, este online:',
    redirectLink: 'Completeaza formularul',
    redirectDownload: 'Descarca formular',
    redirectForms: 'Toate formularele completate si semnate ajung automat la noi pe email iar ulterior le depunem la ANAF.',
    redirectCosts: 'Cheltuielile lunare sunt uriase pentru a le asigura tuturor hrana si tratamentele.',
    redirectFacts: [
      '50 de animalute au varsta intre 10 si 17 ani.',
      '3 pisici sunt oarbe complet.',
      '2 catei sunt paralizati.',
      '2 catei au alte dizabilitati.',
      '170 de animalute ingrijim in total.',
    ],
    redirectThanks: 'Va multumim pentru fiecare formular completat, semnat si trimis pentru animalutele Hope.',
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
    adult: '1 – 7 ani',
    senior: '8 ani si peste',
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
  footer: { address: 'Adresa', contact: 'Contact', socials: 'Retele sociale', rights: 'Toate drepturile rezervate.' },
  contactPage: {
    intro: 'Pentru adoptii, adoptii virtuale, voluntariat sau orice alta intrebare, scrieti-ne. Va raspundem cat mai repede.',
    email: 'Scrieti-ne pe e-mail',
    about: (name) => `Doriti sa aflati mai multe despre ${name}? Mentionati numele in mesajul dvs.`,
  },
  notFound: { title: 'Pagina nu a fost gasita', text: 'Pagina cautata nu exista sau a fost mutata.', back: 'Inapoi la pagina principala' },
};

const en: Ui = {
  home: 'Home',
  donate: 'Donate',
  menu: 'Menu',
  skip: 'Skip to content',
  nav: { virtual: 'Sponsorship', info: 'Info' },
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
    'raport-2024': 'Report 2024',
    'ghid-de-crestere-si-ingrijire-pisici': 'Cat care guide',
    'in-memoriam': 'In loving memory',
    voluntariat: 'Volunteering',
    contact: 'Contact',
    doneaza: 'Donate',
    'termeni-si-conditii': 'Terms and conditions',
    'donation-thank-you-page': 'Thank you for your donation',
    'confirmare-plata': 'Payment confirmation',
  },
  seo: {
    homeTitle: 'Dog and cat adoption | Bucharest | HOPE Animal Protection Association',
    description: 'HOPE Animal Protection Association: dogs and cats for adoption in Bucharest, puppies and adults.',
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
    redirectTitle: 'Redirect 3.5% of your income tax',
    redirectIntro:
      'With a FREE gesture you can help 170 dogs and cats. Please fill in the form to redirect 3.5% of your 2025 income tax. It takes one minute, it is simple and it is online:',
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
    adult: '1 – 7 years',
    senior: '8 years and over',
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
  footer: { address: 'Address', contact: 'Contact', socials: 'Social media', rights: 'All rights reserved.' },
  contactPage: {
    intro: 'For adoptions, sponsorships, volunteering or any other question, write to us. We will reply as soon as we can.',
    email: 'Email us',
    about: (name) => `Would you like to know more about ${name}? Please mention the name in your message.`,
  },
  notFound: { title: 'Page not found', text: 'The page you are looking for does not exist or has moved.', back: 'Back to the home page' },
};

const fr: Ui = {
  home: 'Accueil',
  donate: 'Faire un don',
  menu: 'Menu',
  skip: 'Aller au contenu',
  nav: { virtual: 'Parrainage', info: 'Info' },
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
    'raport-2024': 'Rapport 2024',
    'ghid-de-crestere-si-ingrijire-pisici': 'Guide de soins du chat',
    'in-memoriam': 'In memoriam',
    voluntariat: 'Bénévolat',
    contact: 'Contact',
    doneaza: 'Faire un don',
    'termeni-si-conditii': 'Conditions générales',
    'donation-thank-you-page': 'Merci pour votre don',
    'confirmare-plata': 'Confirmation de paiement',
  },
  seo: {
    homeTitle: 'Adoption de chiens et de chats | Bucarest | Association de protection des animaux HOPE',
    description: 'Association de protection des animaux HOPE : chiens et chats à adopter à Bucarest, jeunes et adultes.',
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
    redirectTitle: 'Redirection de 3,5 % de votre impôt sur le revenu',
    redirectIntro:
      'Un geste GRATUIT suffit pour aider 170 chiens et chats. Remplissez le formulaire pour reverser 3,5 % de votre impôt sur le revenu 2025. Cela prend une minute, c’est simple et en ligne :',
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
    adult: '1 à 7 ans',
    senior: '8 ans et plus',
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
  footer: { address: 'Adresse', contact: 'Contact', socials: 'Réseaux sociaux', rights: 'Tous droits réservés.' },
  contactPage: {
    intro: 'Pour une adoption, un parrainage, du bénévolat ou toute autre question, écrivez-nous. Nous vous répondrons dès que possible.',
    email: 'Nous écrire par e-mail',
    about: (name) => `Vous souhaitez en savoir plus sur ${name} ? Indiquez son nom dans votre message.`,
  },
  notFound: { title: 'Page introuvable', text: 'La page que vous cherchez n’existe pas ou a été déplacée.', back: 'Retour à l’accueil' },
};

const de: Ui = {
  home: 'Startseite',
  donate: 'Spenden',
  menu: 'Menü',
  skip: 'Zum Inhalt springen',
  nav: { virtual: 'Patenschaft', info: 'Info' },
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
    'raport-2024': 'Bericht 2024',
    'ghid-de-crestere-si-ingrijire-pisici': 'Ratgeber Katzenpflege',
    'in-memoriam': 'In memoriam',
    voluntariat: 'Ehrenamt',
    contact: 'Kontakt',
    doneaza: 'Spenden',
    'termeni-si-conditii': 'Allgemeine Geschäftsbedingungen',
    'donation-thank-you-page': 'Danke für Ihre Spende',
    'confirmare-plata': 'Zahlungsbestätigung',
  },
  seo: {
    homeTitle: 'Hunde und Katzen adoptieren | Bukarest | Tierschutzverein HOPE',
    description: 'Tierschutzverein HOPE: Hunde und Katzen zur Adoption in Bukarest, Jungtiere und erwachsene Tiere.',
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
    redirectTitle: '3,5 % der Einkommensteuer umleiten',
    redirectIntro:
      'Mit einer KOSTENLOSEN Geste können Sie 170 Hunden und Katzen helfen. Füllen Sie das Formular aus, um 3,5 % Ihrer Einkommensteuer 2025 umzuleiten. Es dauert eine Minute, ist einfach und online:',
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
    adult: '1 bis 7 Jahre',
    senior: '8 Jahre und älter',
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
  footer: { address: 'Adresse', contact: 'Kontakt', socials: 'Soziale Netzwerke', rights: 'Alle Rechte vorbehalten.' },
  contactPage: {
    intro: 'Für Adoptionen, Patenschaften, ehrenamtliche Mitarbeit oder andere Fragen schreiben Sie uns. Wir antworten so schnell wie möglich.',
    email: 'E-Mail schreiben',
    about: (name) => `Sie möchten mehr über ${name} erfahren? Bitte nennen Sie den Namen in Ihrer Nachricht.`,
  },
  notFound: { title: 'Seite nicht gefunden', text: 'Die gesuchte Seite existiert nicht oder wurde verschoben.', back: 'Zurück zur Startseite' },
};

const DICTIONARIES: Record<Locale, Ui> = { ro, en, fr, de };
export const useUi = (locale: Locale): Ui => DICTIONARIES[locale];

/** Picks the form that agrees with the animal's sex (masculine for groups and unknown). */
export const gendered = (label: Gendered, sex: Sex | null): string => (typeof label === 'string' ? label : label[sex === 'female' ? 1 : 0]);

/** "A, B and C" in the page language. */
export function joinList(items: string[], and: string): string {
  if (items.length < 2) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${and} ${items[items.length - 1]}`;
}

/** Age in months below one year, in whole years after. */
export const formatAge = (ui: Ui, months: number): string => (months < 12 ? ui.months(Math.max(months, 1)) : ui.years(Math.floor(months / 12)));
