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
| Canonical et hreflang ro/en/fr | — | identiques partout, sauf `/shop` et Anais (voir plus bas) |
| Texte des pages | — | même volume partout |
| Liens internes et externes | — | tous repris ; les `/_files/ugd/*` redirigent en 301 vers `/files/*` |
| Allemand (`/de`) | n'existe pas (404) | 114 pages |

Les listes d'animaux, les textes, les photos des fiches et les documents à télécharger sont à parité.

## 1. Bloquant avant la mise en ligne

### Données
- [ ] **Anais / Serena.** Sur Wix, `/adoptii-pisici/anais` répond 301 vers `/adoptii-pisici/serena` (dans les trois langues), alors que les deux figurent encore dans la liste. C'était déjà le cas au moment du crawl : la baseline enregistre la page de Serena à l'URL d'Anais. En local les deux fiches sont publiées et répondent 200, avec des textes et des photos différents. Demander à l'association s'il s'agit de deux chats (la fiche d'Anais est alors inaccessible sur Wix par erreur, et le local a raison) ou d'un doublon (supprimer Anais et créer la redirection).
- [ ] 9 animaux sur 106 n'ont pas de date de naissance, 73 ont une date estimée à partir d'un âge Wix. À faire corriger par l'association dans l'admin.
- [ ] Descriptions vides : les chats parrainés Sun et Mars n'ont aucun texte sur Wix (« n/c » en roumain), donc rien non plus en anglais, en français et en allemand. À faire écrire par l'association.

### SEO
- [x] `/despre-noi` : `title` et description d'origine remis. `/in-memoriam` et `/adoptii-virtuale-caini` : description d'origine remise. `pnpm import:pages` reprend désormais ces champs depuis la baseline.
- [x] `/shop` : la page était une erreur sur Wix, elle n'existe pas sur le nouveau site et répond 410 dans toutes les langues (`REMOVED_PATHS`).
- [x] Un seul `h1` sur `/termeni-si-conditii` et `/confirmare-plata`, identique à celui de Wix.
- [x] `/confirmare-plata` et `/donation-thank-you-page` : `noindex` et hors sitemap (pages vues seulement après un paiement).
- [x] Test automatique de parité : `pnpm seo:check` compare les 351 URL de la baseline à un serveur lancé.
- [ ] **Anais** : seul écart restant de `pnpm seo:check` (3 URL). Dépend de la décision de l'association, voir « Données ».
- [x] **Comparaison complète des liens et du SEO entre la prod et le nouveau site** (5 octobre 2026). Les 18 sitemaps en ligne et tous les liens internes de chaque page de la prod ont été suivis : 360 URL, dont les 351 de la baseline et 9 documents `/_files/ugd/*`. Elles ont été comparées au build de production local, lui-même parcouru en entier (464 pages dans les quatre langues, plus les listes filtrées).
  - **Aucune URL de la prod n'est absente** : 345 répondent 200 des deux côtés, les 9 documents redirigent en 301, les 3 `/shop` répondent 410 (voulu). Reste Anais (voir « Données »).
  - Canonical et langue identiques sur les 345 pages ; hreflang identique, avec `de-de` en plus. Les écarts de `title`, description, `h1`, robots et Open Graph sont tous ceux de la partie 3.
  - Nouveau site : aucun lien interne cassé ni vers une redirection, un seul `h1` partout, canonical sur l'URL elle-même, hreflang réciproques dans les quatre langues, sitemap égal aux pages indexables, listes filtrées en `noindex` avec canonical sur la liste.
  - Liens externes : tous valides. Un contrôle automatique reçoit 400 de la page Facebook (filtrage des robots) et 403 d'adoptiicaini.ro et d'adoptiipisici.ro (challenge Cloudflare) : ce sont des faux positifs, confirmés à la main.
  - Redirections ajoutées : `/ro` et `/ro/…` vers l'URL sans préfixe (Wix le fait aussi), les anciens sitemaps Wix (`*-sitemap.xml`) vers `/sitemap.xml`, et l'ancien formulaire 230 en un seul saut au lieu de deux.
  - Liens de la prod absents du nouveau site, voulus : le formulaire en ligne de redirectioneaza.ro (affiché du 1er janvier au 25 mai seulement) et le scan du formulaire 230 de 2023 (remplacé par `/formular-230.pdf`).
- [ ] `/en/despre-noi` : sur Wix, le texte anglais contient un lien vers un profil Facebook personnel (`facebook.com/emil.pruna`), absent du roumain et du français. Il n'est pas repris. À confirmer avec l'association.
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
- [ ] Créer les comptes admin de l'association (`pnpm user:create`) ; il n'y a qu'un compte aujourd'hui.

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
- [ ] Admin des pages de contenu et de leurs champs SEO (déjà décidé, pas construit). C'est ce qui permettra de corriger les titres et descriptions du point 1 sans toucher au code.
- [ ] Gestion des comptes depuis l'admin (aujourd'hui uniquement en ligne de commande).
- [ ] Recette complète de l'admin avec l'association : création, modification, photos, changement d'URL, anomalies.

### Collectes de fonds
- [ ] **Système de collectes de fonds.** Une collecte est soit permanente (sans limite de temps), soit temporaire (limitée en durée et en montant). Elle porte sur l'un de ces quatre périmètres :
  - globale ;
  - un besoin précis (des croquettes pour chiens, par exemple) ;
  - un animal donné (une opération, par exemple) ;
  - un événement en cours (Noël 2026, par exemple).

### Contenu et traductions
- [x] Relecture complète des textes anglais et français issus des traductions automatiques de Wix (5 octobre 2026), faite par Claude contre l'original roumain, pas par un locuteur natif. Les 97 fiches d'animaux : 154 corrections ciblées dans `migration/translations/fixes.json` et trois textes français réécrits (`fr/animals.md`). Surtout des contresens (« même les chiens de race méritent un foyer » pour « sans race », « capturé par des chiens errants » pour « par la fourrière », « tabby » pour écaille de tortue, « 5 ans » pour 6 mois), « chiot » et « chaton » pour des adultes, des genres faux (Panda, Patraulea), « un homme » pour « une personne ». Pages venues de Wix : conditions générales et « Comment adopter » en français corrigées (`fr/pages/`).
- [x] Trois erreurs de l'original roumain corrigées au passage, dans les trois langues : la fiche de Bach citait Magnolia dans ses conditions d'adoption, celle d'Aramis parlait d'Athos, celle de Roa l'appelait « Runa ».
- [x] Page de remerciement après un don (`/donation-thank-you-page`, où Stripe renvoie le donateur) : en roumain, anglais et français elle affichait le modèle Wix non rempli (« Merci Nom du donateur… don de 0 RON… n° 1000 »). Remplacée par un vrai texte, comme en allemand.
- [x] Relecture complète de l'allemand (5 octobre 2026), faite par Claude contre l'original roumain, pas par un locuteur natif : les 95 fiches d'animaux, les 13 pages et les textes de l'interface. La traduction était fidèle ; 13 retouches dans les fiches (un contresens sur Javier, « nicht wirklich adoptiert » pour Shary et Zapp, tournures maladroites autour de « Teilen », « Hundefänger » puis « Henker » dans la même phrase pour Mura) et 5 dans les pages et l'interface : « Nutzungsbedingungen » au lieu de « Allgemeine Geschäftsbedingungen » (le site ne vend rien), « Gnadenhof » partout pour le sanctuaire, une phrase coupée en deux dans le guide du chat, vouvoiement sur la page de don.
- [ ] Faire relire l'allemand par un germanophone reste souhaitable avant de communiquer sur cette version. À noter : les pages « Comment adopter » et « Bénévolat » tutoient, comme l'original roumain, alors que l'interface et les autres pages vouvoient.
- [x] Une description par page en anglais, en français et en allemand (5 octobre 2026) : les 16 pages indexables hors accueil (`seo.descriptions` dans `src/i18n/ui.ts`). Le roumain garde les descriptions de Wix, identiques d'une page à l'autre : c'est la règle de parité que vérifie `pnpm seo:check`.
- [ ] Décider si le roumain reçoit lui aussi une description par page : il faudrait alors assouplir `pnpm seo:check`, qui exige aujourd'hui la description de Wix.
- [x] `alt` des 6 images de la page d'accueil, des 4 photos de `/proiect-2022` et de la photo placée à côté du texte des pages de contenu, dans les quatre langues (5 octobre 2026) : `photoAlts` dans `src/i18n/ui.ts`, par nom de fichier, et les fichiers de page de `/proiect-2022`.
- [x] **Lien vers redirectioneaza.ro** sur `/redirectioneaza` et `/doneaza` : corrigé à l'affichage dans les quatre langues (`fixRedirectFormLink`, `src/lib/page-body.ts`), l'adresse est partout `https://redirectioneaza.ro/asociatia-pentru-protectia-animalelor-hope/`. Sur Wix, le lien français pointait vers une adresse tronquée (404), le texte du lien était tronqué partout, plusieurs langues portaient un paramètre de suivi Facebook (`?fbclid=…`) et `/en/doneaza` n'avait que l'adresse tronquée en texte, sans lien.
- [ ] Signaler à l'association le lien cassé de `/fr/redirectioneaza` sur Wix (404), pour qu'elle le corrige tant que Wix est en ligne. Le message est rédigé (5 octobre 2026), il reste à l'envoyer.

### Écarts de contenu entre langues, à faire trancher par l'association

Constatés le 4 octobre 2026 en comparant les versions roumaine, anglaise et française en ligne sur Wix. Rien n'a été perdu à la migration : ces écarts existent déjà sur Wix et le nouveau site les reproduit tels quels. L'allemand, traduit depuis le roumain, suit le roumain. Aucun texte n'a été modifié en attendant la décision.

**`/cum-pot-adopta` (Comment adopter)** : le roumain (original), le français et l'allemand concordent ; l'anglais en dit plus.

| Passage | Roumain, français, allemand | Anglais |
|---|---|---|
| Section 6, frais | « Nu percepem o „taxa de adopție". » et rien d'autre | Ajoute : « However, we request a donation to help cover: Vaccinations, Medical treatments, Food, Veterinary care. Your support helps save the next animal. » |
| Section 4, étapes | « Vizită la domiciliu » | « Home visit (if required) » |
| Section 10, liens | Voir les animaux, Nous contacter | Ajoute « Submit Adoption Application » |

- [ ] **Question 1.** La demande de don à l'adoption et la visite à domicile « si nécessaire » sont-elles voulues, ou est-ce un ancien texte resté en anglais ? Selon la réponse : retirer ces passages de l'anglais, ou les ajouter au roumain, au français et à l'allemand.
- [ ] **Question 2.** Le lien « Submit Adoption Application » doit-il exister (vers le formulaire de contact) dans toutes les langues, ou disparaître de l'anglais ?

**`/ghid-de-crestere-si-ingrijire-pisici` (Guide de soins du chat)** : le roumain, l'anglais et l'allemand concordent ; le français est une réécriture plus courte et plus douce.

| Passage | Roumain, anglais, allemand | Français |
|---|---|---|
| Section 8, vétérinaires | « Din pacate, multi medici veterinari nu sunt ceea ce trebuie, ori nu stiu meserie, ori sunt nepasatori, ori ii intereseaza doar banii ori toate la un loc. » | Absent |
| Section 9, plantes | « Multe pisicute si-au gasit sfarsitul. » | Remplacé par « Certaines peuvent être mortelles s'ils en ingèrent une petite quantité. » |
| Section 6, fenêtres | Cite le magasin : « magazinele de profil gen Hornbach » | « magasins spécialisés (type bricolage) », sans nom |
| Sections 7 et 9 | « Cautati pe google si veti gasi mai multe » / « liste intregi de plante » | Absent |
| Section 7, aliments toxiques | Une phrase : « ciocolata, strugurii, ceapa, usturoiul sunt cateva dintre ele » | Une liste à puces (chocolat, raisins, oignon, ail) |

- [x] **Question 3**, tranchée le 5 octobre 2026 : le français reprend le texte complet des autres langues, critique des vétérinaires comprise (`migration/translations/fr/pages/ghid-de-crestere-si-ingrijire-pisici.html`, traduit du roumain). Seul écart voulu : le français dit « magasins spécialisés (type bricolage) » là où le roumain, l'anglais et l'allemand citent Hornbach. Le tableau ci-dessus décrit l'ancien texte français de Wix.
- [ ] Une fois les réponses connues, aligner les langues concernées. Les textes roumain et anglais du guide du chat et l'anglais de « Comment adopter » sont dans `migration/translations/{ro,en}/pages/` ; le français de « Comment adopter » est dans `migration/translations/fr/pages/` ; il ne reste à aligner que « Comment adopter » (questions 1 et 2).
- [ ] Les titres des dix sections du guide du chat en roumain, anglais et allemand (« 1. Sterilizarea », « 6. Geamuri si balcoane »…) ont été ajoutés lors de la refonte pour aligner la présentation sur le français : à faire valider.

### SEO, finitions
- [x] JSON-LD (`src/lib/json-ld.ts`), dans la langue de chaque page. Accueil : `AnimalShelter` complété (nom traduit en variante, mission, année de fondation, code fiscal) et `WebSite`, comme le `LocalBusiness` + `WebSite` de Wix. Toutes les pages indexables des quatre langues : la page elle-même (`WebPage`, `CollectionPage` pour les listes, `AboutPage`, `ContactPage`) et son fil d'Ariane (`BreadcrumbList`), absents de Wix. Rien sur les pages en `noindex`.
- [x] Icônes Facebook et Instagram du pied de page remplacées par des liens texte ; lien « Acasa » absent du menu (le logo y mène) : validé (5 octobre 2026).
- [x] Bandeau cookies : Wix en affiche un, le local non, et il n'en faut pas (vérifié le 5 octobre 2026). Le site ne charge aucune ressource tierce (polices, images, vidéos et scripts viennent du site, Facebook et Instagram ne sont que des liens) et ne pose que deux cookies, tous deux fonctionnels : `lang` (la langue choisie, un an) et la session de l'admin. À revoir seulement si on installe un outil de statistiques qui pose des cookies.
- [ ] Statistiques de fréquentation : rien en local. Choisir un outil (de préférence sans cookie) pour suivre le trafic après la bascule.

### Qualité
- [ ] Deux contrôles automatiques existent : `pnpm seo:check` (parité SEO avec Wix) et `pnpm pages:check` (même structure des pages de contenu dans les quatre langues), et `pnpm test` couvre les dons. Restent à tester, au minimum : redirections, formulaire de contact, connexion admin.
- [ ] Comparaison visuelle page par page sur ordinateur et mobile, et audit de performance.
- [ ] Analyse de sécurité complète : connexion admin et sessions, envoi de fichiers, formulaires publics, route `/donate`, en-têtes, dépendances.

### Design
- [x] Refonte fidèle à la charte Wix (4 octobre 2026) : titres plus marqués, texte plus lisible, composants harmonisés, bandeau d'accueil en vert profond, photo à côté du texte sur six pages, photos réparties dans le texte sur `/proiect-2022`, même présentation dans les quatre langues.
- [ ] Choisir la direction graphique définitive : cinq pistes sont présentées dans un artefact (https://claude.ai/artifact/XW2oNzJxWH2QzAgKUpDuA8, privé, à partager depuis la page). La piste 1 est celle du code.
- [x] **Système de thèmes modifiable depuis l'admin** (5 octobre 2026). Le rendu actuel est le thème « classic » (identifiant `classic`), qui reste le thème par défaut ; cinq thèmes de saison sont fournis : `christmas` (rouge, flocons), `valentine` (rose, cœurs), `easter` (lilas, œufs), `summer` (bleu mer, plage), `halloween` (orange citrouille, citrouilles et chauves-souris). Un thème fixe la couleur principale du site (titres, liens, boutons, fonds colorés) et le motif du bandeau de titre et du pied de page ; `/admin/theme` permet de choisir le thème actif et de modifier la couleur et le motif de chacun. Les traits des titres, les puces, le soulignement des liens et les fonds pâles sont des teintes calculées en CSS à partir de la couleur principale ; seuls les états « c'est fait » des formulaires restent verts. La base demande `pnpm db:migrate` (nouvelle table `settings`).
- [x] Thème classique validé (5 octobre 2026) : les traits et les puces en bleu-vert clair et les fonds pâles en gris-bleu très clair, calculés depuis le vert sarcelle, remplacent le vert du logo.
- [x] Thèmes : contrôle visuel sur mobile fait (5 octobre 2026).
- [ ] Thèmes, contrôle visuel restant : Saint-Valentin, Pâques et Été n'ont été vus qu'en partie (accueil ou une page), et l'aperçu en direct de `/admin/theme` n'a pas été essayé dans un navigateur. En Halloween, le bouton orange du bandeau d'accueil et la section « Faire un don » de l'accueil se détachent peu de la couleur du thème.
- [ ] Thèmes : activation automatique sur une période (Noël du 1er décembre au 6 janvier, par exemple, de même pour les autres thèmes de saison), aujourd'hui le changement se fait à la main dans l'admin.
- [ ] Faire valider par l'association les photos d'illustration choisies pour les six pages de texte (`PAGE_ILLUSTRATIONS` dans `src/lib/site.ts`).
- [ ] Contrôle visuel restant : contact, in memoriam, listes de chats et de parrainages, et l'ensemble du site sur mobile (seules quelques pages ont été vues en largeur mobile).

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
