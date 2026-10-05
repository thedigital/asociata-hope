# ROADMAP

Ce qu'il reste à faire avant de remplacer le site Wix par le nouveau site.

Établi le 4 octobre 2026 en comparant, page par page, les 351 URL de `migration/seo-baseline.json` entre le site réel (https://www.adoptii-animale-hope.org) et le serveur local (`pnpm dev`, plus le build de production pour les redirections et les en-têtes).

Comparé automatiquement : statut HTTP, `title`, description, `h1`, canonical, hreflang, robots, Open Graph, JSON-LD, volume de texte, nombre d'images, liens, sitemaps, `robots.txt`.
**Non comparé** : le rendu visuel (aucune capture d'écran côté à côté), les performances, l'affichage mobile, et l'admin (non testé dans cette passe).

## État des lieux

| | Site réel (Wix) | Local |
|---|---|---|
| URL de la baseline répondant 200 | 351 | 348 (les 3 `/shop` répondent 410, voulu) |
| URL dans le sitemap | 351 | 456 (342 + 114 pages allemandes) |
| Animaux listés (chiens / chats / parrainage chiens / parrainage chats) | 39 / 24 / 13 / 21 | 39 / 24 / 13 / 21 |
| Canonical et hreflang ro/en/fr | — | identiques partout, sauf `/shop` et Anais, redirigée par erreur sur Wix (voir plus bas) |
| Texte des pages | — | même volume partout |
| Liens internes et externes | — | tous repris ; les `/_files/ugd/*` redirigent en 301 vers `/files/*` |
| Allemand (`/de`) | n'existe pas (404) | 114 pages |

Les listes d'animaux, les textes, les photos des fiches et les documents à télécharger sont à parité.

## 1. Bloquant avant la mise en ligne

### Données
- [x] **Anais / Serena** : ce sont bien deux chats différents (confirmé le 5 octobre 2026). Les deux fiches restent publiées, comme en local. Sur Wix, `/adoptii-pisici/anais` redirige par erreur vers Serena, et la baseline a enregistré la page de Serena à l'URL d'Anais : `pnpm seo:check` en tient compte (`WIX_MISDIRECTED`).
- [ ] 9 animaux sur 106 n'ont pas de date de naissance, 73 ont une date estimée à partir d'un âge Wix. À faire corriger par l'association dans l'admin.
- [ ] Descriptions vides : les chats parrainés Sun et Mars n'ont aucun texte sur Wix (« n/c » en roumain), donc rien non plus en anglais, en français et en allemand. À faire écrire par l'association.

### SEO
- [x] `/despre-noi` : `title` et description d'origine remis. `/in-memoriam` et `/adoptii-virtuale-caini` : description d'origine remise. `pnpm import:pages` reprend désormais ces champs depuis la baseline.
- [x] `/shop` : la page était une erreur sur Wix, elle n'existe pas sur le nouveau site et répond 410 dans toutes les langues (`REMOVED_PATHS`).
- [x] Un seul `h1` sur `/termeni-si-conditii` et `/confirmare-plata`, identique à celui de Wix.
- [x] `/confirmare-plata` et `/donation-thank-you-page` : `noindex` et hors sitemap (pages vues seulement après un paiement).
- [x] Test automatique de parité : `pnpm seo:check` compare les 351 URL de la baseline à un serveur lancé.
- [x] **Anais** : c'était le seul écart restant de `pnpm seo:check` (3 URL). Deux chats différents : le contrôle attend désormais la fiche d'Anais à sa propre URL et ne signale plus aucun écart.
- [x] **Comparaison complète des liens et du SEO entre la prod et le nouveau site** (5 octobre 2026). Les 18 sitemaps en ligne et tous les liens internes de chaque page de la prod ont été suivis : 360 URL, dont les 351 de la baseline et 9 documents `/_files/ugd/*`. Elles ont été comparées au build de production local, lui-même parcouru en entier (464 pages dans les quatre langues, plus les listes filtrées).
  - **Aucune URL de la prod n'est absente** : 345 répondent 200 des deux côtés, les 9 documents redirigent en 301, les 3 `/shop` répondent 410 (voulu). Anais est une fiche à part entière (voir « Données »).
  - Canonical et langue identiques sur les 345 pages ; hreflang identique, avec `de-de` en plus. Les écarts de `title`, description, `h1`, robots et Open Graph sont tous ceux de la partie 3.
  - Nouveau site : aucun lien interne cassé ni vers une redirection, un seul `h1` partout, canonical sur l'URL elle-même, hreflang réciproques dans les quatre langues, sitemap égal aux pages indexables, listes filtrées en `noindex` avec canonical sur la liste.
  - Liens externes : tous valides. Un contrôle automatique reçoit 400 de la page Facebook (filtrage des robots) et 403 d'adoptiicaini.ro et d'adoptiipisici.ro (challenge Cloudflare) : ce sont des faux positifs, confirmés à la main.
  - Redirections ajoutées : `/ro` et `/ro/…` vers l'URL sans préfixe (Wix le fait aussi), les anciens sitemaps Wix (`*-sitemap.xml`) vers `/sitemap.xml`, et l'ancien formulaire 230 en un seul saut au lieu de deux.
  - Liens de la prod absents du nouveau site, voulus : le formulaire en ligne de redirectioneaza.ro (affiché du 1er janvier au 25 mai seulement) et le scan du formulaire 230 de 2023 (remplacé par `/formular-230.pdf`).
- [x] `/en/despre-noi` : sur Wix, le texte anglais contient un lien vers un profil Facebook personnel (`facebook.com/emil.pruna`), absent du roumain et du français. Il n'est pas repris, et c'est voulu (confirmé le 5 octobre 2026).
- [ ] Search Console : revalider la propriété (aucune balise de vérification dans le HTML de Wix, elle passe sans doute par Wix ou le DNS), soumettre le nouveau `/sitemap.xml`. Les anciens sitemaps Wix (`en_en-sitemap.xml`, `fr_fr-sitemap.xml`, `pages-sitemap.xml`…) y redirigent en 301 ; les retirer de la Search Console.

### Fonctionnel
- [ ] **Dons Stripe, bac à sable** : créer un compte Stripe de test (sandbox) et y essayer les six cas du formulaire avec ses clés (`STRIPE_SECRET_KEY`) : paiement unique et paiement récurrent (mensuel), chacun en EUR, en RON et en USD. Vérifier à chaque fois le montant et la devise affichés par Stripe, le retour sur le site après paiement et après abandon, et pour le récurrent l'abonnement créé dans Stripe. Vérifier aussi que Stripe envoie bien un reçu par e-mail : la page de remerciement l'annonce (« Vous recevrez bientôt un e-mail de confirmation »), et cet envoi se règle dans le compte Stripe.
- [x] **Dons Stripe, tests unitaires automatiques** (5 octobre 2026) : `pnpm test` (`tests/donate.test.ts`, 32 tests avec le lanceur de tests de Node, sans dépendance ajoutée) couvre `src/lib/stripe.ts` et la route `/donate` sans appeler Stripe : validation du formulaire (devise, fréquence, bornes de montant de `AMOUNTS` en RON, en EUR et en USD, formats de montant refusés), paramètres exacts de la session Checkout pour chacun des six cas (mode `payment` ou `subscription`, devise, montant en centimes), URL de retour par langue, réponse quand `STRIPE_SECRET_KEY` manque ou quand Stripe refuse. Non couvert : l'adresse de retour prise dans la configuration du site quand `SITE_URL` est vide (les tests fixent `SITE_URL`).
- [ ] **Dons Stripe, production** : une fois le bac à sable validé, test réel avec les clés de l'association, en paiement unique et mensuel.
- [ ] **Dons Stripe en USD, à régler avec l'association** : le formulaire propose désormais le dollar en plus du leu et de l'euro. Vérifier dans le compte Stripe de l'association vers quel compte bancaire les dons en USD sont versés : sans compte de versement en USD (l'association a un IBAN en USD), Stripe les convertit dans la devise du compte, avec des frais de change. Faire valider aussi les montants proposés (10, 25, 50 USD, de 2 à 10 000 USD, repris de l'euro).
- [ ] **E-mail du formulaire de contact** : configurer `SMTP_URL`, `MAIL_FROM`, `CONTACT_TO` et tester un envoi réel.
- [x] Le site réel a un module de don directement sur la page d'accueil (une fois / mensuel, montant). En local l'accueil n'a qu'un lien vers `/doneaza` : validé tel quel (5 octobre 2026).
- [x] **Formulaire 230 (redirection de 3,5 %)** : le scan pré-rempli pour 2023 est remplacé par `/formular-230.pdf`, généré à partir du formulaire vierge d'ANAF avec la bonne année et les coordonnées de l'association, mis en cache par année. Le bouton vers le formulaire en ligne n'apparaît que du 1er janvier au 25 mai ; le reste de l'année, seul le formulaire papier est proposé, avec la date de réouverture.
- [x] **Textes sur la redirection harmonisés** : un seul bloc court, identique sur l'accueil et sur `/doneaza`, et une version détaillée sur `/redirectioneaza`, dans les quatre langues, avec l'année calculée. Les textes Wix correspondants (année 2025 en dur, lien permanent vers le formulaire en ligne) ne sont plus affichés.
- [x] Textes de la redirection validés (5 octobre 2026), y compris en roumain.
- [x] Formulaire 230 confirmé (5 octobre 2026) : le modèle d'ANAF utilisé (`230_OPANAF_15_2021.pdf`) est le bon. Le formulaire papier rempli est transmis en pièce jointe par le formulaire de contact (motif « redirection »), sinon remis en main propre.
- [ ] Créer les comptes admin de l'association ; il n'y a qu'un compte aujourd'hui. Depuis le 5 octobre 2026 cela se fait dans l'admin (« Comptes ») : chaque personne reçoit un lien à lui transmettre par un canal sûr.

### Hébergement et bascule
- [x] Scripts d'installation et de déploiement dans `deploy/` (procédure dans `deploy/README.md`) : VPS avec Node 24, PM2, nginx derrière Cloudflare, versions dans des dossiers séparés avec retour arrière. Testés à blanc en local et en conteneur, pas encore sur le VPS.
- [ ] Exécuter l'installation sur le VPS quand l'accès sera disponible ; pas d'intégration continue.
- [x] Redirection `adoptii-animale-hope.org` → `www.adoptii-animale-hope.org` et HTTP → HTTPS : dans la configuration nginx générée, avec la compression et HSTS.
- [x] `Cache-Control` et CSP (5 octobre 2026), envoyés par le middleware. Les pages HTML répondent `no-cache` (elles sont construites à chaque requête), l'admin `no-store`. La `Content-Security-Policy` n'autorise que le site lui-même : les scripts en ligne et le style du thème portent un jeton propre à chaque requête, et le formulaire de don peut rediriger vers Stripe Checkout. Vérifié dans Chrome sur le build, pages publiques et admin : aucune violation. Elle n'est pas envoyée par le serveur de dev.
- [x] Sauvegarde automatique de la base, des uploads et des pièces jointes : `deploy/backup.sh`, chaque nuit par cron, 14 sauvegardes gardées.
- [ ] Choisir la destination des sauvegardes hors du VPS (`BACKUP_REMOTE`, une destination rsync) : sans elle, tout reste sur le même disque.
- [ ] **Migrer le domaine `adoptii-animale-hope.org`, aujourd'hui hébergé chez Wix, vers Cloudflare.** Le déploiement prévu (nginx derrière Cloudflare, qui porte le certificat public) en dépend. Avant de changer quoi que ce soit, relever tous les enregistrements DNS actuels chez Wix, en particulier ceux de la messagerie (MX, SPF, DKIM) et de vérification (Search Console), pour les recréer à l'identique dans Cloudflare.
- [ ] Plan de bascule DNS : baisser le TTL avant, garder Wix actif quelques jours, puis surveiller les 404 et la Search Console.
- [x] `favicon.ico` ajouté (`public/favicon.ico`, la patte de `favicon.svg` en 16, 32 et 48 px) : les navigateurs et robots le demandent même sans balise.

## 2. À faire, non bloquant

### Admin
- [x] Admin des pages de contenu, réduit au SEO (5 octobre 2026) : `/admin/pages` ne montre et ne modifie que le titre et la description SEO des 13 pages de contenu, dans les quatre langues (un champ vide garde la valeur automatique, affichée en gris). Le texte des pages n'y apparaît plus et ne s'y modifie plus : il change par les fichiers de `migration/translations/` et les scripts d'import. Non couvert : les titres et descriptions de l'accueil, des listes d'animaux, des collectes et du contact, qui restent dans le code (`src/i18n/ui.ts`).
- [x] Pas d'éditeur visuel pour le texte des pages (décidé le 5 octobre 2026) : l'admin des pages ne sert qu'au SEO.
- [ ] Après la mise en ligne, ne plus lancer `pnpm import:pages` ni `pnpm import:translations` sur la base de production : ils remplacent les titres et descriptions SEO saisis dans l'admin des pages.
- [x] Tableaux de l'admin sur mobile (5 octobre 2026) : sous 720 px, chaque ligne d'un tableau devient un bloc (animaux, pages, redirections, collectes, comptes) et le menu de l'admin passe sur sa propre ligne. Plus aucun défilement horizontal à 390 px, vérifié dans Chrome.
- [x] Gestion des comptes depuis l'admin (5 octobre 2026) : `/admin/users`. Créer un compte ou réinitialiser un accès affiche une seule fois un lien à usage unique, valable 72 heures ; la personne y choisit son mot de passe et enregistre son application d'authentification, que personne d'autre ne connaît. Une réinitialisation annule tout de suite l'ancien accès et déconnecte le compte partout. On peut changer la langue d'un compte et supprimer un compte, sauf le sien. Tous les comptes ont les mêmes droits. La ligne de commande reste pour le premier compte et en dernier recours.
- [ ] Recette complète de l'admin avec l'association : création, modification, photos, changement d'URL, anomalies.

### Collectes de fonds
- [x] **Système de collectes de fonds** (5 octobre 2026). Une collecte est permanente (sans fin ni montant) ou temporaire (un montant à atteindre et un dernier jour), et porte sur l'un des quatre périmètres : l'association, un besoin précis, un animal, un événement. Elle se crée dans l'admin (« Collectes ») : textes dans les quatre langues (une langue sans titre affiche le roumain), image, statut brouillon ou publiée.
  - Pages publiques : `/campanii` (la liste, hors index et hors sitemap tant qu'aucune collecte n'est publiée) et `/campanii/{adresse}`, avec la barre d'avancement, le formulaire de don par carte et un renvoi vers les autres moyens de donner. Les collectes ouvertes apparaissent aussi sur l'accueil (trois au plus), en haut de la page de don, dans le pied de page et, pour une collecte destinée à un animal, sur la fiche de cet animal. Le menu du haut n'a pas changé.
  - Montant collecté : les dons par carte, comptés automatiquement par un webhook Stripe (`/stripe/webhook`), plus un montant « reçu hors du site » (virement, PayPal, espèces) saisi à la main dans l'admin. Rien n'est enregistré sur le donateur.
  - Choix faits, à valider : une collecte temporaire se ferme quand le montant est atteint ou après son dernier jour (heure de Roumanie) ; elle n'accepte que des dons uniques, dans sa devise, pour que l'avancement soit exact (les donateurs étrangers paient en lei avec leur carte) ; une collecte permanente accepte le formulaire complet (unique ou mensuel, trois devises) et n'affiche pas de montant. Une collecte fermée garde sa page, sans formulaire.
  - Vérifié dans Chrome sur le build (aucune violation de la politique de sécurité) : liste et page d'une collecte en français, accueil et fiche animal en roumain, page de don en allemand, collecte fermée en anglais, sur ordinateur ou à 390 px selon la page. La base demande `pnpm db:migrate`.
- [ ] Collectes : valider les choix ci-dessus et le mot « Campanii » (adresse `/campanii`, « Collectes » en français, « Campaigns », « Spendenaktionen »).
- [ ] Collectes : créer le webhook dans Stripe et renseigner `STRIPE_WEBHOOK_SECRET` (procédure dans `deploy/README.md`), puis l'essayer avec le bac à sable. Sans lui, seul le montant saisi à la main est affiché. Testé ici avec des requêtes signées simulées, jamais avec Stripe.

### Contenu et traductions
- [x] Relecture complète des textes anglais et français issus des traductions automatiques de Wix (5 octobre 2026), faite par Claude contre l'original roumain, pas par un locuteur natif. Les 97 fiches d'animaux : 154 corrections ciblées dans `migration/translations/fixes.json` et trois textes français réécrits (`fr/animals.md`). Surtout des contresens (« même les chiens de race méritent un foyer » pour « sans race », « capturé par des chiens errants » pour « par la fourrière », « tabby » pour écaille de tortue, « 5 ans » pour 6 mois), « chiot » et « chaton » pour des adultes, des genres faux (Panda, Patraulea), « un homme » pour « une personne ». Pages venues de Wix : conditions générales et « Comment adopter » en français corrigées (`fr/pages/`).
- [x] Trois erreurs de l'original roumain corrigées au passage, dans les trois langues : la fiche de Bach citait Magnolia dans ses conditions d'adoption, celle d'Aramis parlait d'Athos, celle de Roa l'appelait « Runa ».
- [x] Page de remerciement après un don (`/donation-thank-you-page`, où Stripe renvoie le donateur) : en roumain, anglais et français elle affichait le modèle Wix non rempli (« Merci Nom du donateur… don de 0 RON… n° 1000 »). Remplacée par un vrai texte, comme en allemand.
- [x] Relecture complète de l'allemand (5 octobre 2026), faite par Claude contre l'original roumain, pas par un locuteur natif : les 95 fiches d'animaux, les 13 pages et les textes de l'interface. La traduction était fidèle ; 13 retouches dans les fiches (un contresens sur Javier, « nicht wirklich adoptiert » pour Shary et Zapp, tournures maladroites autour de « Teilen », « Hundefänger » puis « Henker » dans la même phrase pour Mura) et 5 dans les pages et l'interface : « Nutzungsbedingungen » au lieu de « Allgemeine Geschäftsbedingungen » (le site ne vend rien), « Gnadenhof » partout pour le sanctuaire, une phrase coupée en deux dans le guide du chat, vouvoiement sur la page de don.
- [x] Allemand validé tel quel, sans relecture par un germanophone (décidé le 5 octobre 2026). Les pages « Comment adopter » et « Bénévolat » sont passées au vouvoiement, comme l'interface et les autres pages. Restent au tutoiement, volontairement : les fiches d'animaux (le ton familier de l'original) et les passages de `/proiect-2022` qui s'adressent aux donateurs au pluriel.
- [x] Une description par page en anglais, en français et en allemand (5 octobre 2026) : les 16 pages indexables hors accueil (`seo.descriptions` dans `src/i18n/ui.ts`). Le roumain garde les descriptions de Wix, identiques d'une page à l'autre : c'est la règle de parité que vérifie `pnpm seo:check`.
- [ ] Décider si le roumain reçoit lui aussi une description par page : il faudrait alors assouplir `pnpm seo:check`, qui exige aujourd'hui la description de Wix.
- [x] `alt` des 6 images de la page d'accueil, des 4 photos de `/proiect-2022` et de la photo placée à côté du texte des pages de contenu, dans les quatre langues (5 octobre 2026) : `photoAlts` dans `src/i18n/ui.ts`, par nom de fichier, et les fichiers de page de `/proiect-2022`.
- [x] **Lien vers redirectioneaza.ro** sur `/redirectioneaza` et `/doneaza` : corrigé à l'affichage dans les quatre langues (`fixRedirectFormLink`, `src/lib/page-body.ts`), l'adresse est partout `https://redirectioneaza.ro/asociatia-pentru-protectia-animalelor-hope/`. Sur Wix, le lien français pointait vers une adresse tronquée (404), le texte du lien était tronqué partout, plusieurs langues portaient un paramètre de suivi Facebook (`?fbclid=…`) et `/en/doneaza` n'avait que l'adresse tronquée en texte, sans lien.
- [x] Lien cassé de `/fr/redirectioneaza` sur Wix (404, le même sur l'accueil anglais `/en`) : laissé tel quel sur Wix, décidé le 5 octobre 2026. Il est corrigé sur le nouveau site, rien à signaler à l'association.

### Écarts de contenu entre langues, tranchés

Constatés le 4 octobre 2026 en comparant les versions roumaine, anglaise et française en ligne sur Wix. Rien n'a été perdu à la migration : ces écarts existent déjà sur Wix et le nouveau site les reproduit tels quels. L'allemand, traduit depuis le roumain, suit le roumain. Tous ont été tranchés le 5 octobre 2026 et les textes alignés : les deux tableaux ci-dessous décrivent les textes de Wix, pas ceux du nouveau site.

**`/cum-pot-adopta` (Comment adopter)** : sur Wix, le roumain (original) et le français concordent ; l'anglais en dit plus.

| Passage | Roumain, français, allemand | Anglais |
|---|---|---|
| Section 6, frais | « Nu percepem o „taxa de adopție". » et rien d'autre | Ajoute : « However, we request a donation to help cover: Vaccinations, Medical treatments, Food, Veterinary care. Your support helps save the next animal. » |
| Section 4, étapes | « Vizită la domiciliu » | « Home visit (if required) » |
| Section 10, liens | Voir les animaux, Nous contacter | Ajoute « Submit Adoption Application » |

- [x] **Question 1**, tranchée le 5 octobre 2026 : il n'y a pas de frais d'adoption et la visite à domicile est systématique avant l'adoption. La demande de don et « (if required) » sont retirés de l'anglais (`migration/translations/en/pages/cum-pot-adopta.html`), qui dit maintenant la même chose que les trois autres langues.
- [x] **Question 2**, tranchée le 5 octobre 2026 : la ligne « 👉 Submit Adoption Application » de la section 10 est gardée et ajoutée au roumain, au français et à l'allemand. Le roumain a pour cela son propre fichier (`migration/translations/ro/pages/cum-pot-adopta.html`, le texte de Wix avec cette ligne en plus). Comme sur Wix, les lignes de cette section sont du texte simple, sans lien. Formulation roumaine (« Trimite cererea de adopție ») validée le 5 octobre 2026. Les dix titres de section, écrits avec des chiffres en émoji sur Wix (« 1️⃣ … »), sont des titres numérotés ordinaires (« 1. … ») dans les quatre langues, comme ceux du guide du chat.

**`/ghid-de-crestere-si-ingrijire-pisici` (Guide de soins du chat)** : sur Wix, le roumain et l'anglais concordent ; le français est une réécriture plus courte et plus douce.

| Passage | Roumain, anglais, allemand | Français |
|---|---|---|
| Section 8, vétérinaires | « Din pacate, multi medici veterinari nu sunt ceea ce trebuie, ori nu stiu meserie, ori sunt nepasatori, ori ii intereseaza doar banii ori toate la un loc. » | Absent |
| Section 9, plantes | « Multe pisicute si-au gasit sfarsitul. » | Remplacé par « Certaines peuvent être mortelles s'ils en ingèrent une petite quantité. » |
| Section 6, fenêtres | Cite le magasin : « magazinele de profil gen Hornbach » | « magasins spécialisés (type bricolage) », sans nom |
| Sections 7 et 9 | « Cautati pe google si veti gasi mai multe » / « liste intregi de plante » | Absent |
| Section 7, aliments toxiques | Une phrase : « ciocolata, strugurii, ceapa, usturoiul sunt cateva dintre ele » | Une liste à puces (chocolat, raisins, oignon, ail) |

- [x] **Question 3**, tranchée le 5 octobre 2026 : le français reprend le texte complet des autres langues, critique des vétérinaires comprise (`migration/translations/fr/pages/ghid-de-crestere-si-ingrijire-pisici.html`, traduit du roumain). Seul écart voulu : le français dit « magasins spécialisés (type bricolage) » là où le roumain, l'anglais et l'allemand citent Hornbach.
- [x] Langues alignées (5 octobre 2026) : « Comment adopter » dit la même chose dans les quatre langues, le guide du chat aussi, à l'exception voulue de Hornbach en français.
- [x] Les titres des dix sections du guide du chat en roumain, anglais et allemand (« 1. Sterilizarea », « 6. Geamuri si balcoane »…) ont été ajoutés lors de la refonte pour aligner la présentation sur le français : validés le 5 octobre 2026.

### SEO, finitions
- [x] JSON-LD (`src/lib/json-ld.ts`), dans la langue de chaque page. Accueil : `AnimalShelter` complété (nom traduit en variante, mission, année de fondation, code fiscal) et `WebSite`, comme le `LocalBusiness` + `WebSite` de Wix. Toutes les pages indexables des quatre langues : la page elle-même (`WebPage`, `CollectionPage` pour les listes, `AboutPage`, `ContactPage`) et son fil d'Ariane (`BreadcrumbList`), absents de Wix. Rien sur les pages en `noindex`.
- [x] Icônes Facebook et Instagram du pied de page remplacées par des liens texte ; lien « Acasa » absent du menu (le logo y mène) : validé (5 octobre 2026).
- [x] Bandeau cookies : Wix en affiche un, le local non, et il n'en faut pas (vérifié le 5 octobre 2026). Le site ne charge aucune ressource tierce (polices, images, vidéos et scripts viennent du site, Facebook et Instagram ne sont que des liens) et ne pose que deux cookies, tous deux fonctionnels : `lang` (la langue choisie, un an) et la session de l'admin. À revoir seulement si on installe un outil de statistiques qui pose des cookies.
- [ ] Statistiques de fréquentation : rien en local. Choisir un outil (de préférence sans cookie) pour suivre le trafic après la bascule.

### Qualité
- [x] Tests automatiques (5 octobre 2026). `pnpm test` : 98 tests unitaires (dons, collectes et webhook Stripe, formulaire de contact, connexion admin avec TOTP, sessions et limitation des essais, comptes, admin des pages). `pnpm test:server` : 39 tests sur le serveur construit, lancé sur une base de test : redirections, langue de première visite, en-têtes de sécurité, formulaires, contact avec pièce jointe, connexion admin, création d'un compte par lien, SEO d'une page, collecte publiée et comptée par le webhook. S'ajoutent `pnpm seo:check` et `pnpm pages:check`. Non couvert : la fiche animal de l'admin (création, photos, vidéo, changement d'URL), l'envoi d'e-mail et Stripe réel.
- [x] Défaut trouvé par ces tests et corrigé : un en-tête `Accept-Language: *` (envoyé par beaucoup de programmes, pas par les navigateurs) redirigeait vers l'anglais. Il n'y a plus de redirection quand l'en-tête ne nomme aucune langue.
- [x] Comparaison visuelle côte à côte avec Wix (5 octobre 2026) : treize pages capturées sur le site en ligne et sur le build, à 1280 px et à 390 px (accueil en roumain et en français, liste de chiens, fiche d'un animal, à propos en roumain et en anglais, don, contact, redirection, sanctuaire, comment adopter, parrainage de chats, in memoriam). Quatre paires ont été regardées en détail, sur ordinateur (accueil, fiche d'un animal, à propos, contact) : aucun contenu manquant ni défaut sur le nouveau site ; les autres n'ont été contrôlées que par leur hauteur de page. Seuls écarts : ceux déjà décidés (pas de module de don sur l'accueil, liens texte à la place des icônes) et l'âge des animaux, calculé depuis la date de naissance alors que Wix affiche un texte figé (Brownie : « 4 luni » sur Wix, 1 an ici). Les captures mobiles de Wix ne sont pas exploitables : Wix choisit sa version mobile d'après le navigateur, pas d'après la largeur.
- [x] Audit de performance (5 octobre 2026), Lighthouse sur le build, téléphone simulé : performance 91 à 97 selon la page (Wix : 74 sur l'accueil, 67 sur la liste des chiens), accessibilité 95, bonnes pratiques 100, SEO 100. L'accueil pèse 0,9 Mo en 28 requêtes, contre 2,5 Mo en 247 requêtes sur Wix. Corrigé à cette occasion : priorité de chargement de l'image principale sur les listes et les pages avec photo, ordre des titres sur les listes (`h1` puis `h2`), taille réservée pour les images du texte des pages, contraste de la pastille « En savoir plus » des cartes, logo allégé (14 Ko au lieu de 28) et mis en cache définitivement. Mesuré sans compression : en production nginx compresse le HTML et la feuille de style (65 Ko, environ 12 Ko compressée).
- [ ] Contraste des boutons orange : le texte blanc sur l'orange de Wix a un contraste de 3,7:1, sous le seuil de 4,5:1 recommandé (WCAG AA). C'est le seul point d'accessibilité que Lighthouse relève encore. Décider entre garder l'orange de la charte ou le foncer légèrement.
- [ ] Refaire l'audit de performance sur le serveur de production (compression nginx, Cloudflare), et la comparaison mobile avec un vrai téléphone.
- [x] Analyse de sécurité (5 octobre 2026), par lecture du code et essais sur le build : connexion admin et sessions, envoi de fichiers, formulaires publics, route `/donate`, redirections, en-têtes, dépendances. Rien d'exploitable trouvé. Durcissements faits : une redirection ne peut plus sortir du site (`//domaine`), un POST qui n'est pas un formulaire reçoit 415 au lieu d'une erreur 500, taille des requêtes bornée côté Node, listes de limitation en mémoire bornées, en-tête `Permissions-Policy`, JSON-LD échappé, règles de redirection de l'admin refusant `/\`, `http-cache-semantics` mis à jour (alerte « high » de `pnpm audit`). Reste une alerte « moderate » sur un `esbuild` tiré par `drizzle-kit`, outil de développement absent du serveur.
- [x] Sécurité, limites connues et acceptées (confirmé le 5 octobre 2026) : huit essais ratés bloquent la connexion d'une adresse e-mail pendant quinze minutes, donc quelqu'un peut empêcher un compte de se connecter en se trompant exprès ; les limites sont comptées par worker (deux en production).
- [x] Tailles d'envoi alignées de bout en bout (5 octobre 2026). Formulaire de contact : pièce jointe de 5 Mo, refusée proprement par le site jusqu'à 8 Mo (limite nginx), sous les 100 Mo de Cloudflare. Admin : Cloudflare refuse plus de 100 Mo par requête alors que l'admin annonçait une vidéo de 150 Mo ; la vidéo passe à 80 Mo, le formulaire refuse avant l'envoi une sélection (photos et vidéo) de plus de 95 Mo, nginx et Node acceptent 100 Mo. `setup-nginx.sh` est à relancer sur un VPS déjà installé. La vidéo à 80 Mo est acceptée pour l'instant (5 octobre 2026) ; au-delà, il faudrait un envoi séparé de la vidéo ou une offre Cloudflare supérieure.

### Design
- [x] Refonte fidèle à la charte Wix (4 octobre 2026) : titres plus marqués, texte plus lisible, composants harmonisés, bandeau d'accueil en vert profond, photo à côté du texte sur six pages, photos réparties dans le texte sur `/proiect-2022`, même présentation dans les quatre langues.
- [x] Direction graphique définitive validée (5 octobre 2026) : la piste 1, celle du code. Les quatre autres pistes restent dans l'artefact (https://claude.ai/artifact/XW2oNzJxWH2QzAgKUpDuA8, privé) et ne sont pas retenues.
- [x] **Système de thèmes modifiable depuis l'admin** (5 octobre 2026). Le rendu actuel est le thème « classic » (identifiant `classic`), qui reste le thème par défaut ; cinq thèmes de saison sont fournis : `christmas` (rouge, flocons), `valentine` (rose, cœurs), `easter` (lilas, œufs), `summer` (bleu mer, plage), `halloween` (orange citrouille, citrouilles et chauves-souris). Un thème fixe la couleur principale du site (titres, liens, boutons, fonds colorés) et le motif du bandeau de titre et du pied de page ; `/admin/theme` permet de choisir le thème actif et de modifier la couleur et le motif de chacun. Les traits des titres, les puces, le soulignement des liens et les fonds pâles sont des teintes calculées en CSS à partir de la couleur principale ; seuls les états « c'est fait » des formulaires restent verts. La base demande `pnpm db:migrate` (nouvelle table `settings`).
- [x] Thème classique validé (5 octobre 2026) : les traits et les puces en bleu-vert clair et les fonds pâles en gris-bleu très clair, calculés depuis le vert sarcelle, remplacent le vert du logo.
- [x] Thèmes : contrôle visuel sur mobile fait (5 octobre 2026).
- [x] Thèmes, contrôle visuel (5 octobre 2026) : Saint-Valentin, Pâques, Été et Noël vus sur l'accueil, une liste, une page de texte et la page de don ; l'aperçu en direct de `/admin/theme` essayé dans Chrome (couleur, motif, refus d'une couleur trop claire). Halloween : les boutons et la section « Faire un don » passent en violet nuit, l'orange ne se détachait pas du fond citrouille ; la couleur des boutons est désormais une valeur du thème (`call`).
- [x] Validé le 5 octobre 2026 : le violet des boutons en Halloween ; en Noël, le bouton orange sur le bandeau rouge, moins détaché que dans les autres thèmes, est jugé suffisant.
- [x] Thèmes : pas d'activation automatique sur une période, décidé le 5 octobre 2026. Le thème de saison se choisit à la main dans `/admin/theme`.
- [x] Photos d'illustration des six pages de texte (`PAGE_ILLUSTRATIONS` dans `src/lib/site.ts`) : validées le 5 octobre 2026.
- [x] Contrôle visuel (5 octobre 2026) : contact (avec le questionnaire chat), in memoriam, listes de chats et de parrainages sur ordinateur ; seize pages en largeur mobile (390 px), une de chaque type, dans les quatre langues. Un seul défaut, corrigé : un trait sans objet sous le bouton de la page 404.

## 3. Écarts voulus (rien à faire)

Ces différences sont sorties de la comparaison mais sont des améliorations assumées.

- **Fiches animaux** : Wix a pour `title` le seul nom (« Ambra ») et pour description un identifiant technique (« 9b836935-98da-… »). Le local génère un vrai titre et une vraie description, et ajoute une image Open Graph (absente sur Wix pour les 291 fiches).
- **Pages anglaises et françaises** : Wix y laisse les titres et descriptions en roumain ; le local les traduit.
- **`h1`** : 12 pages de contenu par langue n'en ont aucun sur Wix, le local en a un partout. Les fiches de parrainage avaient deux `h1` sur Wix, une seule en local. La faute « Asociata » du `h1` d'accueil est corrigée.
- **`meta keywords`** (51 pages) et `robots: index` : non repris, sans effet sur le référencement.
- **Titres de listes** normalisés (« Adoptii-pisici » → « Adoptii pisici | Hope »).
- **Vidéos** : les fiches locales ont un lecteur ou un lien vidéo dans le HTML ; Wix n'en expose aucun dans le sien (il les charge sans doute en JavaScript, non vérifié).
- **Images** : deux de moins par page, ce sont les icônes Facebook et Instagram du pied de page.
- **Allemand** : entièrement nouveau.
- **Balises Twitter** : Wix envoie `twitter:title`, `twitter:description` et `twitter:image` ; le local n'a que `twitter:card`. L'association n'a pas de compte, et X reprend de toute façon les balises Open Graph quand ces trois-là manquent.
