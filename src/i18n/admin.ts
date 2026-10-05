import type { AdminLocale } from './config.ts';
import type { FormError } from '../lib/admin-animals.ts';
import type { CampaignFormError } from '../lib/admin-campaigns.ts';
import type { PageFormError } from '../lib/admin-pages.ts';
import type { SetupError, UserFormError, UserState } from '../lib/admin-users.ts';
import type { IssueCode } from '../lib/animal-checks.ts';
import type { CampaignState } from '../lib/campaigns.ts';
import type { AdoptionType, CampaignScope, CampaignStatus, Species, Status } from '../lib/taxonomy.ts';
import type { PatternId, ThemeId } from '../lib/themes.ts';

/** Strings of the admin interface (Romanian and French). Taxonomy labels come from `ui.ts`. */
export type AdminUi = {
  title: string;
  login: { title: string; email: string; password: string; code: string; codeHelp: string; submit: string; failed: string; locked: string };
  nav: { animals: string; campaigns: string; pages: string; messages: string; redirects: string; theme: string; users: string; site: string; logout: string };
  messages: { intro: string; empty: string; pending: string; handled: string; all: string; markHandled: string; markPending: string; reply: string; confirmDelete: string; language: string; attachment: string };
  list: { add: string; search: string; all: string; empty: string; photo: string; name: string; age: string; status: string; order: string; up: string; down: string; edit: string; estimated: string };
  form: {
    newTitle: string;
    identity: string;
    name: string;
    slug: string;
    slugHelp: string;
    species: string;
    adoptionType: string;
    status: string;
    characteristics: string;
    sex: string;
    size: string;
    color: string;
    none: string;
    birthDate: string;
    birthDateEstimated: string;
    traits: string;
    health: string;
    vaccinated: string;
    sterilized: string;
    dewormed: string;
    texts: string;
    description: string;
    seo: string;
    seoTitle: string;
    seoDescription: string;
    seoHelp: string;
    photos: string;
    addPhotos: string;
    photosHelp: string;
    main: string;
    makeMain: string;
    left: string;
    right: string;
    remove: string;
    video: string;
    videoUrl: string;
    videoFile: string;
    uploadTooLarge: string;
    removeVideo: string;
    save: string;
    create: string;
    view: string;
    delete: string;
    confirmDelete: string;
    back: string;
    saved: string;
    rejected: (n: number) => string;
    videoRejected: string;
  };
  errors: Record<FormError, string>;
  issues: {
    title: (errors: number, warnings: number) => string;
    intro: string;
    column: string;
    none: string;
    filter: string;
    error: string;
    warning: string;
    languages: string;
    messages: Record<IssueCode, string>;
  };
  species: Record<Species, string>;
  adoptionType: Record<AdoptionType, string>;
  status: Record<Status, string>;
  redirects: { intro: string; from: string; to: string; toHelp: string; code: string; add: string; gone: string; empty: string; invalid: string };
  pages: {
    intro: string;
    page: string;
    address: string;
    updated: string;
    never: string;
    edit: string;
    unlisted: string;
    seo: string;
    seoHelp: string;
    automatic: string;
    written: string;
    errors: Record<PageFormError, string>;
  };
  campaigns: {
    intro: string;
    add: string;
    empty: string;
    title: string;
    summary: string;
    summaryHelp: string;
    textsHelp: string;
    what: string;
    scope: string;
    scopes: Record<CampaignScope, string>;
    animal: string;
    animalHelp: string;
    slugHelp: string;
    statuses: Record<CampaignStatus, string>;
    states: Record<Exclude<CampaignState, 'open'>, string>;
    kind: string;
    permanent: string;
    permanentHelp: string;
    temporary: string;
    temporaryHelp: string;
    goal: string;
    currency: string;
    currencyHelp: string;
    endsOn: string;
    endsOnHelp: string;
    received: string;
    byCard: string;
    offline: string;
    offlineHelp: string;
    total: string;
    /** Total converted to one currency, and the rates used: "1 EUR = 5,3488 RON = 1,1225 USD". */
    approxTotal: (amount: string, rates: string) => string;
    raised: string;
    cardOff: string;
    image: string;
    addImage: string;
    replaceImage: string;
    removeImage: string;
    imageHelp: string;
    untranslated: (languages: string) => string;
    delete: string;
    confirmDelete: string;
    errors: Record<CampaignFormError, string>;
  };
  users: {
    intro: string;
    add: string;
    name: string;
    email: string;
    language: string;
    state: string;
    states: Record<UserState, string>;
    created: string;
    you: string;
    reset: string;
    confirmReset: (name: string) => string;
    confirmResetSelf: string;
    confirmDelete: (name: string) => string;
    link: (name: string) => string;
    linkHelp: (hours: number) => string;
    errors: Record<UserFormError, string>;
  };
  setup: {
    title: string;
    intro: (name: string, email: string) => string;
    password: string;
    passwordHelp: (length: number) => string;
    confirmation: string;
    app: string;
    appHelp: string;
    key: string;
    submit: string;
    invalid: string;
    done: string;
    errors: Record<SetupError, string>;
  };
  theme: {
    intro: string;
    use: string;
    active: string;
    color: string;
    pattern: string;
    preview: string;
    save: string;
    reset: string;
    tooLight: string;
    names: Record<ThemeId, string>;
    patterns: Record<PatternId, string>;
  };
};

const ro: AdminUi = {
  title: 'Administrare Hope',
  login: {
    title: 'Autentificare',
    email: 'E-mail',
    password: 'Parola',
    code: 'Cod de autentificare',
    codeHelp: 'Codul din 6 cifre afisat de aplicatia de autentificare.',
    submit: 'Intra in cont',
    failed: 'E-mail, parola sau cod incorecte.',
    locked: 'Prea multe incercari. Incercati din nou peste 15 minute.',
  },
  nav: { animals: 'Animale', campaigns: 'Campanii', pages: 'Pagini', messages: 'Mesaje', redirects: 'Redirectionari', theme: 'Tema', users: 'Conturi', site: 'Vezi site-ul', logout: 'Deconectare' },
  messages: {
    intro: 'Mesajele trimise prin formularul de contact al site-ului.',
    empty: 'Niciun mesaj.',
    pending: 'De tratat',
    handled: 'Tratat',
    all: 'Toate',
    markHandled: 'Marcheaza ca tratat',
    markPending: 'Marcheaza ca netratat',
    reply: 'Raspunde pe e-mail',
    confirmDelete: 'Stergeti definitiv acest mesaj?',
    language: 'Limba vizitatorului',
    attachment: 'Document atasat',
  },
  list: {
    add: 'Adauga un animal',
    search: 'Cauta dupa nume',
    all: 'Toate statusurile',
    empty: 'Niciun animal.',
    photo: 'Foto',
    name: 'Nume',
    age: 'Varsta',
    status: 'Status',
    order: 'Ordine',
    up: 'Muta mai sus',
    down: 'Muta mai jos',
    edit: 'Modifica',
    estimated: 'data estimata',
  },
  form: {
    newTitle: 'Animal nou',
    identity: 'Identitate',
    name: 'Nume',
    slug: 'Adresa (URL)',
    slugHelp: 'Litere mici, cifre si cratime. Lasati gol pentru a o genera din nume. Daca o modificati, vechea adresa este redirectionata automat.',
    species: 'Specie',
    adoptionType: 'Tip de adoptie',
    status: 'Status',
    characteristics: 'Caracteristici',
    sex: 'Sex',
    size: 'Talie',
    color: 'Colorit',
    none: '—',
    birthDate: 'Data nasterii',
    birthDateEstimated: 'Data estimata (de verificat)',
    traits: 'Caracter',
    health: 'Sanatate',
    vaccinated: 'Vaccinat',
    sterilized: 'Sterilizat / castrat',
    dewormed: 'Deparazitat',
    texts: 'Texte',
    description: 'Descriere',
    seo: 'Referentiere (optional)',
    seoTitle: 'Titlu SEO',
    seoDescription: 'Descriere SEO',
    seoHelp: 'Lasati gol pentru a folosi titlul si descrierea generate automat.',
    photos: 'Fotografii',
    addPhotos: 'Adauga fotografii',
    photosHelp: 'JPEG, PNG sau WebP, maximum 15 MB fiecare. Prima fotografie este cea principala.',
    main: 'Principala',
    makeMain: 'Seteaza ca principala',
    left: 'Muta la stanga',
    right: 'Muta la dreapta',
    remove: 'Sterge',
    video: 'Video',
    videoUrl: 'Link video (Facebook, YouTube…)',
    videoFile: 'Fisier video (MP4, maximum 80 MB)',
    uploadTooLarge: 'Fisierele alese depasesc 95 MB in total. Trimiteti fotografiile si fisierul video in mai multe etape.',
    removeVideo: 'Sterge fisierul video actual',
    save: 'Salveaza',
    create: 'Creeaza',
    view: 'Vezi pe site',
    delete: 'Sterge animalul',
    confirmDelete: 'Stergeti definitiv acest animal si fotografiile lui?',
    back: 'Inapoi la lista',
    saved: 'Modificarile au fost salvate.',
    rejected: (n) => `${n} fisier(e) refuzat(e): nu sunt imagini valide sau sunt prea mari.`,
    videoRejected: 'Fisierul video a fost refuzat: nu este un MP4 sau este prea mare.',
  },
  errors: {
    name: 'Numele este obligatoriu (maximum 80 de caractere).',
    slug: 'Adresa poate contine doar litere mici, cifre si cratime.',
    slugTaken: 'Aceasta adresa este deja folosita de alt animal din aceeasi categorie.',
    birthDate: 'Data nasterii nu este valida.',
    videoUrl: 'Linkul video trebuie sa inceapa cu http:// sau https://.',
    invalid: 'Formularul contine o valoare nevalida.',
  },
  issues: {
    title: (errors, warnings) => [errors ? `${errors} ${errors === 1 ? 'anomalie' : 'anomalii'}` : '', warnings ? `${warnings} de verificat` : ''].filter(Boolean).join(', '),
    intro: 'Aceste puncte sunt detectate automat din datele fisei. Dispar imediat ce sunt corectate.',
    column: 'Anomalii',
    none: 'Fara anomalii',
    filter: 'Doar fisele cu anomalii',
    error: 'De corectat',
    warning: 'De verificat',
    languages: 'Limbi',
    messages: {
      noPhoto: 'Nicio fotografie.',
      noSex: 'Sexul nu este completat.',
      noBirthDate: 'Data nasterii nu este completata: varsta nu poate fi afisata.',
      noSize: 'Talia nu este completata.',
      noColor: 'Coloritul nu este completat.',
      noTraits: 'Niciun caracter selectat.',
      noDescription: 'Descrierea in romana lipseste sau este prea scurta.',
      missingTranslation: 'Traducerea descrierii lipseste.',
      untranslated: 'Descrierea este identica cu textul in romana (netradusa).',
      nameMissing: 'Numele animalului nu apare in traducere (posibil tradus din greseala).',
      missingSeo: 'Titlul sau descrierea SEO lipseste.',
      seoTooLong: 'Titlul SEO depaseste 65 de caractere sau descrierea SEO 200.',
      birthDateEstimated: 'Data nasterii este estimata: de verificat, apoi debifati „Data estimata”.',
    },
  },
  species: { dog: 'Caine', cat: 'Pisica' },
  adoptionType: { real: 'Adoptie reala', virtual: 'Adoptie virtuala' },
  status: { draft: 'Ciorna', published: 'Publicat', adopted: 'Adoptat', deceased: 'Decedat (In memoriam)' },
  redirects: {
    intro: 'O redirectionare trimite o adresa veche catre una noua, ca sa nu se piarda referentierea.',
    from: 'Adresa veche',
    to: 'Adresa noua',
    toHelp: 'Lasati gol pentru a raspunde „pagina stearsa definitiv” (410).',
    code: 'Cod',
    add: 'Adauga',
    gone: 'stearsa (410)',
    empty: 'Nicio redirectionare.',
    invalid: 'Adresele trebuie sa inceapa cu / si sa fie diferite.',
  },
  pages: {
    intro: 'Titlul si descrierea SEO ale paginilor de continut, in cele patru limbi. Textul paginilor nu se modifica aici.',
    written: 'Scrise de mana',
    page: 'Pagina',
    address: 'Adresa',
    updated: 'Ultima modificare',
    never: 'niciodata',
    edit: 'Modifica',
    unlisted: 'neindexata',
    seo: 'Titlu si descriere pentru motoarele de cautare',
    seoHelp: 'Lasati gol pentru a folosi valoarea automata, afisata in gri. Titlul apare in fila browserului si in rezultatele Google; descrierea, sub titlu, in rezultate.',
    automatic: 'Automat',
    errors: {
      tooLong: 'Un camp este prea lung (titlu SEO: 120 de caractere, descriere SEO: 300).',
    },
  },
  campaigns: {
    intro: 'Strângeri de fonduri, fiecare cu pagina ei pe site. O campanie permanentă nu are termen; una temporară are o sumă de atins și o ultimă zi.',
    add: 'Campanie nouă',
    empty: 'Nicio campanie.',
    title: 'Titlu',
    summary: 'Rezumat',
    summaryHelp: 'O frază, afișată sub titlu și pe cartonașul campaniei.',
    textsHelp: 'Titlul în română este obligatoriu. O limbă fără titlu afișează textele în română.',
    what: 'Pentru ce',
    scope: 'Destinație',
    scopes: { global: 'Asociația în ansamblu', need: 'O nevoie concretă (hrană, tratamente…)', animal: 'Un animal anume', event: 'Un eveniment (Crăciun…)' },
    animal: 'Animal',
    animalHelp: 'De ales doar pentru o campanie destinată unui animal: campania apare pe fișa lui.',
    slugHelp: 'Litere mici, cifre și cratime. Lăsați gol pentru a o genera din titlu. Dacă o modificați, vechea adresă este redirecționată automat.',
    statuses: { draft: 'Ciornă', published: 'Publicată' },
    states: { reached: 'Obiectiv atins', ended: 'Încheiată' },
    kind: 'Durată',
    permanent: 'Permanentă',
    permanentHelp: 'fără termen și fără sumă de atins; donații unice sau lunare, în orice monedă.',
    temporary: 'Temporară',
    temporaryHelp: 'se închide în ultima zi sau când suma este atinsă; donații unice, în orice monedă.',
    goal: 'Suma de atins',
    currency: 'Moneda',
    currencyHelp: 'Moneda sumei de atins. Donațiile sunt primite în orice monedă.',
    endsOn: 'Ultima zi',
    endsOnHelp: 'Campania primește donații până la sfârșitul acestei zile, ora României.',
    received: 'Donații primite',
    byCard: 'Cu cardul (număr de donații)',
    offline: 'În afara site-ului',
    offlineHelp: 'În afara site-ului: virament, PayPal, numerar. Treceți suma totală primită în fiecare monedă și actualizați-o manual; se adaugă la donațiile cu cardul.',
    total: 'Total',
    approxTotal: (amount, rates) => `Total aproximativ: ${amount}, cu cursurile înregistrate la crearea campaniei (${rates}). Site-ul afișează acest total în moneda fiecărei limbi: RON în română, EUR în franceză și germană, USD în engleză.`,
    raised: 'Strâns',
    cardOff: 'Înregistrarea automată a donațiilor cu cardul nu este configurată pe server (STRIPE_WEBHOOK_SECRET): până atunci, treceți toate donațiile în coloana „În afara site-ului”.',
    image: 'Imagine',
    addImage: 'Adaugă o imagine',
    replaceImage: 'Înlocuiește imaginea',
    removeImage: 'Șterge imaginea actuală',
    imageHelp: 'JPEG, PNG sau WebP, maximum 15 MB. Fără imagine, o campanie pentru un animal afișează fotografia lui.',
    untranslated: (languages) => `Fără titlu în: ${languages}. Aceste limbi afișează textele în română.`,
    delete: 'Șterge campania',
    confirmDelete: 'Ștergeți definitiv această campanie și donațiile înregistrate pentru ea?',
    errors: {
      title: 'Titlul în română este obligatoriu.',
      slug: 'Adresa poate conține doar litere mici, cifre și cratime.',
      slugTaken: 'Această adresă este deja folosită de altă campanie.',
      animal: 'Alegeți animalul căruia îi este destinată campania.',
      goal: 'O campanie temporară are nevoie de o sumă de atins (număr întreg, mai mare decât zero).',
      endsOn: 'O campanie temporară are nevoie de o ultimă zi.',
      invalid: 'Formularul conține o valoare nevalidă sau un text prea lung.',
    },
  },
  users: {
    intro: 'Persoanele care se pot conecta la administrare. Un cont nou primeste un link: persoana isi alege singura parola si isi inregistreaza aplicatia de autentificare.',
    add: 'Creeaza contul',
    name: 'Nume',
    email: 'E-mail',
    language: 'Limba',
    state: 'Stare',
    states: { ready: 'Activ', pending: 'Asteapta folosirea linkului', expired: 'Link expirat' },
    created: 'Creat la',
    you: 'dumneavoastra',
    reset: 'Reseteaza accesul',
    confirmReset: (name) => `Parola si aplicatia de autentificare ale contului „${name}” nu vor mai functiona, iar contul va fi deconectat peste tot. Veti primi un link de trimis persoanei. Continuati?`,
    confirmResetSelf: 'Parola si aplicatia dumneavoastra de autentificare nu vor mai functiona. Veti primi un link pentru a alege altele: daca il pierdeti, doar alt administrator va poate reda accesul. Continuati?',
    confirmDelete: (name) => `Stergeti definitiv contul „${name}”?`,
    link: (name) => `Link de trimis catre ${name}`,
    linkHelp: (hours) => `Linkul este afisat o singura data si poate fi folosit o singura data, in urmatoarele ${hours} de ore. Trimiteti-l persoanei pe un canal sigur. Daca se pierde, creati altul cu „Reseteaza accesul”.`,
    errors: {
      email: 'Adresa de e-mail nu este valida.',
      name: 'Numele este obligatoriu (maximum 80 de caractere).',
      emailTaken: 'Exista deja un cont cu aceasta adresa de e-mail.',
    },
  },
  setup: {
    title: 'Configurarea contului',
    intro: (name, email) => `Buna ziua, ${name}. Alegeti parola contului ${email} si inregistrati o aplicatie de autentificare: ambele vor fi cerute la fiecare conectare.`,
    password: 'Parola',
    passwordHelp: (length) => `Cel putin ${length} caractere.`,
    confirmation: 'Confirmati parola',
    app: 'Aplicatia de autentificare',
    appHelp: 'Scanati acest cod QR cu o aplicatie de autentificare (Google Authenticator, Authy, 1Password…), apoi introduceti mai jos codul pe care il afiseaza.',
    key: 'Sau introduceti manual aceasta cheie:',
    submit: 'Salveaza si mergi la conectare',
    invalid: 'Acest link nu mai este valabil: a fost deja folosit sau a expirat. Cereti unul nou unui administrator.',
    done: 'Contul este configurat. Va puteti conecta.',
    errors: {
      password: 'Parola este prea scurta.',
      mismatch: 'Cele doua parole nu sunt identice.',
      code: 'Codul aplicatiei de autentificare nu este corect. Verificati ca ati scanat codul QR si incercati cu codul afisat acum.',
    },
  },
  theme: {
    intro: 'Tema stabileste culoarea principala a site-ului (titluri, linkuri, butoane, fundaluri colorate) si motivul benzii de sub meniu si al subsolului, pe toate paginile.',
    use: 'Foloseste aceasta tema',
    active: 'Tema activa',
    color: 'Culoare',
    pattern: 'Motiv',
    preview: 'Titlul paginii',
    save: 'Salveaza',
    reset: 'Revino la culoarea si motivul initiale',
    tooLight: 'Culoarea aleasa este prea deschisa: textul alb al benzii nu s-ar mai citi. Alegeti o culoare mai inchisa.',
    names: { classic: 'Clasic', christmas: 'Craciun', valentine: 'Sfantul Valentin', easter: 'Paste', summer: 'Vara', halloween: 'Halloween' },
    patterns: { paws: 'Urme de labute', snowflakes: 'Fulgi de zapada', hearts: 'Inimi', eggs: 'Oua de Paste', beach: 'Plaja', pumpkins: 'Dovleci si lilieci', none: 'Fara motiv' },
  },
};

const fr: AdminUi = {
  title: 'Administration Hope',
  login: {
    title: 'Connexion',
    email: 'E-mail',
    password: 'Mot de passe',
    code: 'Code d’authentification',
    codeHelp: 'Le code à 6 chiffres affiché par l’application d’authentification.',
    submit: 'Se connecter',
    failed: 'E-mail, mot de passe ou code incorrect.',
    locked: 'Trop de tentatives. Réessayez dans 15 minutes.',
  },
  nav: { animals: 'Animaux', campaigns: 'Collectes', pages: 'Pages', messages: 'Messages', redirects: 'Redirections', theme: 'Thème', users: 'Comptes', site: 'Voir le site', logout: 'Déconnexion' },
  messages: {
    intro: 'Les messages envoyés depuis le formulaire de contact du site.',
    empty: 'Aucun message.',
    pending: 'À traiter',
    handled: 'Traité',
    all: 'Tous',
    markHandled: 'Marquer comme traité',
    markPending: 'Marquer comme non traité',
    reply: 'Répondre par e-mail',
    confirmDelete: 'Supprimer définitivement ce message ?',
    language: 'Langue du visiteur',
    attachment: 'Pièce jointe',
  },
  list: {
    add: 'Ajouter un animal',
    search: 'Rechercher par nom',
    all: 'Tous les statuts',
    empty: 'Aucun animal.',
    photo: 'Photo',
    name: 'Nom',
    age: 'Âge',
    status: 'Statut',
    order: 'Ordre',
    up: 'Monter',
    down: 'Descendre',
    edit: 'Modifier',
    estimated: 'date estimée',
  },
  form: {
    newTitle: 'Nouvel animal',
    identity: 'Identité',
    name: 'Nom',
    slug: 'Adresse (URL)',
    slugHelp: 'Minuscules, chiffres et tirets. Laissez vide pour la générer depuis le nom. Si vous la modifiez, l’ancienne adresse est redirigée automatiquement.',
    species: 'Espèce',
    adoptionType: 'Type d’adoption',
    status: 'Statut',
    characteristics: 'Caractéristiques',
    sex: 'Sexe',
    size: 'Taille',
    color: 'Couleur',
    none: '—',
    birthDate: 'Date de naissance',
    birthDateEstimated: 'Date estimée (à vérifier)',
    traits: 'Caractère',
    health: 'Santé',
    vaccinated: 'Vacciné',
    sterilized: 'Stérilisé / castré',
    dewormed: 'Vermifugé',
    texts: 'Textes',
    description: 'Description',
    seo: 'Référencement (facultatif)',
    seoTitle: 'Titre SEO',
    seoDescription: 'Description SEO',
    seoHelp: 'Laissez vide pour utiliser le titre et la description générés automatiquement.',
    photos: 'Photos',
    addPhotos: 'Ajouter des photos',
    photosHelp: 'JPEG, PNG ou WebP, 15 Mo maximum chacune. La première photo est la photo principale.',
    main: 'Principale',
    makeMain: 'Définir comme principale',
    left: 'Déplacer à gauche',
    right: 'Déplacer à droite',
    remove: 'Supprimer',
    video: 'Vidéo',
    videoUrl: 'Lien vidéo (Facebook, YouTube…)',
    videoFile: 'Fichier vidéo (MP4, 80 Mo maximum)',
    uploadTooLarge: 'Les fichiers choisis dépassent 95 Mo au total. Envoyez les photos et la vidéo en plusieurs fois.',
    removeVideo: 'Supprimer le fichier vidéo actuel',
    save: 'Enregistrer',
    create: 'Créer',
    view: 'Voir sur le site',
    delete: 'Supprimer l’animal',
    confirmDelete: 'Supprimer définitivement cet animal et ses photos ?',
    back: 'Retour à la liste',
    saved: 'Les modifications ont été enregistrées.',
    rejected: (n) => `${n} fichier(s) refusé(s) : ce ne sont pas des images valides ou ils sont trop volumineux.`,
    videoRejected: 'Le fichier vidéo a été refusé : ce n’est pas un MP4 ou il est trop volumineux.',
  },
  errors: {
    name: 'Le nom est obligatoire (80 caractères maximum).',
    slug: 'L’adresse ne peut contenir que des minuscules, des chiffres et des tirets.',
    slugTaken: 'Cette adresse est déjà utilisée par un autre animal de la même catégorie.',
    birthDate: 'La date de naissance n’est pas valide.',
    videoUrl: 'Le lien vidéo doit commencer par http:// ou https://.',
    invalid: 'Le formulaire contient une valeur non valide.',
  },
  issues: {
    title: (errors, warnings) => [errors ? `${errors} anomalie${errors > 1 ? 's' : ''}` : '', warnings ? `${warnings} point${warnings > 1 ? 's' : ''} à vérifier` : ''].filter(Boolean).join(', '),
    intro: 'Ces points sont détectés automatiquement à partir des données de la fiche. Ils disparaissent dès qu’ils sont corrigés.',
    column: 'Anomalies',
    none: 'Aucune anomalie',
    filter: 'Seulement les fiches avec anomalies',
    error: 'À corriger',
    warning: 'À vérifier',
    languages: 'Langues',
    messages: {
      noPhoto: 'Aucune photo.',
      noSex: 'Le sexe n’est pas renseigné.',
      noBirthDate: 'La date de naissance n’est pas renseignée : l’âge ne peut pas être affiché.',
      noSize: 'La taille n’est pas renseignée.',
      noColor: 'La couleur n’est pas renseignée.',
      noTraits: 'Aucun caractère sélectionné.',
      noDescription: 'La description en roumain est absente ou trop courte.',
      missingTranslation: 'La traduction de la description est absente.',
      untranslated: 'La description est identique au texte roumain (non traduite).',
      nameMissing: 'Le nom de l’animal n’apparaît pas dans la traduction (peut-être traduit par erreur).',
      missingSeo: 'Le titre ou la description SEO est absent.',
      seoTooLong: 'Le titre SEO dépasse 65 caractères ou la description SEO 200.',
      birthDateEstimated: 'La date de naissance est estimée : à vérifier, puis décocher « Date estimée ».',
    },
  },
  species: { dog: 'Chien', cat: 'Chat' },
  adoptionType: { real: 'Adoption réelle', virtual: 'Adoption virtuelle (parrainage)' },
  status: { draft: 'Brouillon', published: 'Publié', adopted: 'Adopté', deceased: 'Décédé (In memoriam)' },
  redirects: {
    intro: 'Une redirection envoie une ancienne adresse vers une nouvelle, pour ne pas perdre le référencement.',
    from: 'Ancienne adresse',
    to: 'Nouvelle adresse',
    toHelp: 'Laissez vide pour répondre « page supprimée définitivement » (410).',
    code: 'Code',
    add: 'Ajouter',
    gone: 'supprimée (410)',
    empty: 'Aucune redirection.',
    invalid: 'Les adresses doivent commencer par / et être différentes.',
  },
  pages: {
    intro: 'Le titre et la description SEO des pages de contenu, dans les quatre langues. Le texte des pages ne se modifie pas ici.',
    written: 'Écrits à la main',
    page: 'Page',
    address: 'Adresse',
    updated: 'Dernière modification',
    never: 'jamais',
    edit: 'Modifier',
    unlisted: 'non indexée',
    seo: 'Titre et description pour les moteurs de recherche',
    seoHelp: 'Laissez vide pour utiliser la valeur automatique, affichée en gris. Le titre apparaît dans l’onglet du navigateur et dans les résultats de Google ; la description, sous le titre, dans les résultats.',
    automatic: 'Automatique',
    errors: {
      tooLong: 'Un champ est trop long (titre SEO : 120 caractères, description SEO : 300).',
    },
  },
  campaigns: {
    intro: 'Les collectes de fonds, chacune avec sa page sur le site. Une collecte permanente n’a pas de fin ; une collecte temporaire a un montant à atteindre et un dernier jour.',
    add: 'Nouvelle collecte',
    empty: 'Aucune collecte.',
    title: 'Titre',
    summary: 'Résumé',
    summaryHelp: 'Une phrase, affichée sous le titre et sur la carte de la collecte.',
    textsHelp: 'Le titre en roumain est obligatoire. Une langue sans titre affiche les textes en roumain.',
    what: 'Pour quoi',
    scope: 'Destination',
    scopes: { global: 'L’association dans son ensemble', need: 'Un besoin précis (croquettes, soins…)', animal: 'Un animal donné', event: 'Un événement (Noël…)' },
    animal: 'Animal',
    animalHelp: 'À choisir seulement pour une collecte destinée à un animal : la collecte apparaît sur sa fiche.',
    slugHelp: 'Minuscules, chiffres et tirets. Laissez vide pour la générer depuis le titre. Si vous la modifiez, l’ancienne adresse est redirigée automatiquement.',
    statuses: { draft: 'Brouillon', published: 'Publiée' },
    states: { reached: 'Objectif atteint', ended: 'Terminée' },
    kind: 'Durée',
    permanent: 'Permanente',
    permanentHelp: 'sans fin ni montant à atteindre ; dons uniques ou mensuels, dans toutes les devises.',
    temporary: 'Temporaire',
    temporaryHelp: 'se ferme le dernier jour ou quand le montant est atteint ; dons uniques, dans toutes les devises.',
    goal: 'Montant à atteindre',
    currency: 'Devise',
    currencyHelp: 'La devise du montant à atteindre. Les dons sont reçus dans toutes les devises.',
    endsOn: 'Dernier jour',
    endsOnHelp: 'La collecte reçoit des dons jusqu’à la fin de ce jour, heure de Roumanie.',
    received: 'Dons reçus',
    byCard: 'Par carte (nombre de dons)',
    offline: 'Hors du site',
    offlineHelp: 'Hors du site : virement, PayPal, espèces. Indiquez le total reçu dans chaque devise et mettez-le à jour à la main ; il s’ajoute aux dons par carte.',
    total: 'Total',
    approxTotal: (amount, rates) => `Total approximatif : ${amount}, avec les taux enregistrés à la création de la collecte (${rates}). Le site affiche ce total dans la devise de chaque langue : RON en roumain, EUR en français et en allemand, USD en anglais.`,
    raised: 'Collecté',
    cardOff: 'L’enregistrement automatique des dons par carte n’est pas configuré sur le serveur (STRIPE_WEBHOOK_SECRET) : en attendant, reportez tous les dons dans la colonne « Hors du site ».',
    image: 'Image',
    addImage: 'Ajouter une image',
    replaceImage: 'Remplacer l’image',
    removeImage: 'Supprimer l’image actuelle',
    imageHelp: 'JPEG, PNG ou WebP, 15 Mo maximum. Sans image, une collecte pour un animal affiche sa photo.',
    untranslated: (languages) => `Sans titre en : ${languages}. Ces langues affichent les textes en roumain.`,
    delete: 'Supprimer la collecte',
    confirmDelete: 'Supprimer définitivement cette collecte et les dons enregistrés pour elle ?',
    errors: {
      title: 'Le titre en roumain est obligatoire.',
      slug: 'L’adresse ne peut contenir que des minuscules, des chiffres et des tirets.',
      slugTaken: 'Cette adresse est déjà utilisée par une autre collecte.',
      animal: 'Choisissez l’animal auquel la collecte est destinée.',
      goal: 'Une collecte temporaire a besoin d’un montant à atteindre (nombre entier, supérieur à zéro).',
      endsOn: 'Une collecte temporaire a besoin d’un dernier jour.',
      invalid: 'Le formulaire contient une valeur non valide ou un texte trop long.',
    },
  },
  users: {
    intro: 'Les personnes qui peuvent se connecter à l’administration. Un nouveau compte reçoit un lien : la personne choisit elle-même son mot de passe et enregistre son application d’authentification.',
    add: 'Créer le compte',
    name: 'Nom',
    email: 'E-mail',
    language: 'Langue',
    state: 'État',
    states: { ready: 'Actif', pending: 'En attente du lien', expired: 'Lien expiré' },
    created: 'Créé le',
    you: 'vous',
    reset: 'Réinitialiser l’accès',
    confirmReset: (name) => `Le mot de passe et l’application d’authentification du compte « ${name} » ne fonctionneront plus, et le compte sera déconnecté partout. Vous obtiendrez un lien à lui envoyer. Continuer ?`,
    confirmResetSelf: 'Votre mot de passe et votre application d’authentification ne fonctionneront plus. Vous obtiendrez un lien pour en choisir d’autres : si vous le perdez, seul un autre administrateur pourra vous rendre l’accès. Continuer ?',
    confirmDelete: (name) => `Supprimer définitivement le compte « ${name} » ?`,
    link: (name) => `Lien à envoyer à ${name}`,
    linkHelp: (hours) => `Ce lien n’est affiché qu’une fois et ne sert qu’une fois, dans les ${hours} heures. Envoyez-le à la personne par un canal sûr. S’il est perdu, créez-en un autre avec « Réinitialiser l’accès ».`,
    errors: {
      email: 'L’adresse e-mail n’est pas valide.',
      name: 'Le nom est obligatoire (80 caractères maximum).',
      emailTaken: 'Un compte existe déjà avec cette adresse e-mail.',
    },
  },
  setup: {
    title: 'Configuration du compte',
    intro: (name, email) => `Bonjour ${name}. Choisissez le mot de passe du compte ${email} et enregistrez une application d’authentification : les deux seront demandés à chaque connexion.`,
    password: 'Mot de passe',
    passwordHelp: (length) => `Au moins ${length} caractères.`,
    confirmation: 'Confirmez le mot de passe',
    app: 'Application d’authentification',
    appHelp: 'Scannez ce code QR avec une application d’authentification (Google Authenticator, Authy, 1Password…), puis saisissez ci-dessous le code qu’elle affiche.',
    key: 'Ou saisissez cette clé à la main :',
    submit: 'Enregistrer et aller à la connexion',
    invalid: 'Ce lien n’est plus valable : il a déjà servi ou il a expiré. Demandez-en un nouveau à un administrateur.',
    done: 'Le compte est configuré. Vous pouvez vous connecter.',
    errors: {
      password: 'Le mot de passe est trop court.',
      mismatch: 'Les deux mots de passe ne sont pas identiques.',
      code: 'Le code de l’application d’authentification n’est pas correct. Vérifiez que vous avez scanné le code QR et réessayez avec le code affiché maintenant.',
    },
  },
  theme: {
    intro: 'Le thème fixe la couleur principale du site (titres, liens, boutons, fonds colorés) et le motif du bandeau sous le menu et du pied de page, sur toutes les pages.',
    use: 'Utiliser ce thème',
    active: 'Thème actif',
    color: 'Couleur',
    pattern: 'Motif',
    preview: 'Titre de la page',
    save: 'Enregistrer',
    reset: 'Revenir à la couleur et au motif d’origine',
    tooLight: 'La couleur choisie est trop claire : le texte blanc du bandeau ne serait plus lisible. Choisissez une couleur plus foncée.',
    names: { classic: 'Classique', christmas: 'Noël', valentine: 'Saint-Valentin', easter: 'Pâques', summer: 'Été', halloween: 'Halloween' },
    patterns: { paws: 'Empreintes de pattes', snowflakes: 'Flocons de neige', hearts: 'Cœurs', eggs: 'Œufs de Pâques', beach: 'Plage', pumpkins: 'Citrouilles et chauves-souris', none: 'Aucun motif' },
  },
};

const DICTIONARIES: Record<AdminLocale, AdminUi> = { ro, fr };
export const useAdminUi = (locale: AdminLocale): AdminUi => DICTIONARIES[locale];
