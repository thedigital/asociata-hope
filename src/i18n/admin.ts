import type { AdminLocale } from './config.ts';
import type { FormError } from '../lib/admin-animals.ts';
import type { PageFormError } from '../lib/admin-pages.ts';
import type { IssueCode } from '../lib/animal-checks.ts';
import type { AdoptionType, Species, Status } from '../lib/taxonomy.ts';
import type { PatternId, ThemeId } from '../lib/themes.ts';

/** Strings of the admin interface (Romanian and French). Taxonomy labels come from `ui.ts`. */
export type AdminUi = {
  title: string;
  login: { title: string; email: string; password: string; code: string; codeHelp: string; submit: string; failed: string; locked: string };
  nav: { animals: string; pages: string; messages: string; redirects: string; theme: string; site: string; logout: string };
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
    body: string;
    bodyHelp: string;
    built: string;
    differs: (languages: string) => string;
    differsShort: string;
    errors: Record<PageFormError, string>;
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
  nav: { animals: 'Animale', pages: 'Pagini', messages: 'Mesaje', redirects: 'Redirectionari', theme: 'Tema', site: 'Vezi site-ul', logout: 'Deconectare' },
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
    intro: 'Textul si campurile SEO ale paginilor de continut, in cele patru limbi. Lista animalelor, pagina de start si pagina de contact nu se modifica aici.',
    page: 'Pagina',
    address: 'Adresa',
    updated: 'Ultima modificare',
    never: 'niciodata',
    edit: 'Modifica',
    unlisted: 'neindexata',
    seo: 'Titlu si descriere pentru motoarele de cautare',
    seoHelp: 'Lasati gol pentru a folosi valoarea automata, afisata in gri. Titlul apare in fila browserului si in rezultatele Google; descrierea, sub titlu, in rezultate.',
    automatic: 'Automat',
    body: 'Textul paginii (HTML)',
    bodyHelp: 'Textul este in format HTML: <p> pentru un paragraf, <h2> pentru un titlu, <ul><li> pentru o lista, <a href="…"> pentru un link. Pastrati aceleasi titluri si imagini in cele patru limbi.',
    built: 'Continutul acestei pagini este construit de site (date ale asociatiei, animale, formulare): aici se modifica doar titlul si descrierea SEO.',
    differs: (languages) => `Structura textului (titluri, imagini) difera de cea in romana pentru: ${languages}. O pagina trebuie sa arate la fel in toate limbile.`,
    differsShort: 'structura diferita intre limbi',
    errors: {
      body: 'Textul paginii lipseste in cel putin o limba.',
      tooLong: 'Un camp este prea lung (titlu SEO: 120 de caractere, descriere SEO: 300).',
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
  nav: { animals: 'Animaux', pages: 'Pages', messages: 'Messages', redirects: 'Redirections', theme: 'Thème', site: 'Voir le site', logout: 'Déconnexion' },
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
    intro: 'Le texte et les champs SEO des pages de contenu, dans les quatre langues. Les listes d’animaux, la page d’accueil et la page de contact ne se modifient pas ici.',
    page: 'Page',
    address: 'Adresse',
    updated: 'Dernière modification',
    never: 'jamais',
    edit: 'Modifier',
    unlisted: 'non indexée',
    seo: 'Titre et description pour les moteurs de recherche',
    seoHelp: 'Laissez vide pour utiliser la valeur automatique, affichée en gris. Le titre apparaît dans l’onglet du navigateur et dans les résultats de Google ; la description, sous le titre, dans les résultats.',
    automatic: 'Automatique',
    body: 'Texte de la page (HTML)',
    bodyHelp: 'Le texte est au format HTML : <p> pour un paragraphe, <h2> pour un titre, <ul><li> pour une liste, <a href="…"> pour un lien. Gardez les mêmes titres et les mêmes images dans les quatre langues.',
    built: 'Le contenu de cette page est construit par le site (coordonnées de l’association, animaux, formulaires) : seuls le titre et la description SEO se modifient ici.',
    differs: (languages) => `La structure du texte (titres, images) diffère de celle du roumain pour : ${languages}. Une page doit avoir le même aspect dans toutes les langues.`,
    differsShort: 'structure différente selon la langue',
    errors: {
      body: 'Le texte de la page manque dans au moins une langue.',
      tooLong: 'Un champ est trop long (titre SEO : 120 caractères, description SEO : 300).',
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
