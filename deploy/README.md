# Déploiement sur le VPS

Le site tourne dans un processus Node géré par PM2, derrière nginx, lui-même derrière Cloudflare
(qui porte le certificat public). Cible : Debian ou Ubuntu.

| Fichier | Où | Quand |
| --- | --- | --- |
| `install.sh` | VPS, en root | une fois : nginx, Node 24, pnpm, PM2, utilisateur `hope`, arborescence, accès au dépôt, commande `hope-deploy` |
| `setup-nginx.sh <domaine>` | VPS, en root | à l'installation, puis à chaque changement de domaine ou de certificat d'origine |
| `deploy.sh` | VPS, via `hope-deploy` | à chaque version |
| `push-data.sh hope@vps` | poste de travail | première installation : base et fichiers envoyés (ils sont hors git) |
| `ecosystem.config.cjs` | lu par PM2 | deux instances en mode cluster |

## Sur le serveur

```
/srv/hope/
  repo.git/            miroir du dépôt
  releases/<date>-<commit>/   une version construite par dossier (les 5 dernières sont gardées)
  current -> releases/…       version en service
  shared/.env          configuration (jamais dans git)
  shared/data/         hope.db, uploads/, cache/, contact/
  shared/backups/      copie de la base avant chaque déploiement (10 gardées)
```

## Première installation

1. Copier les deux scripts root et lancer l'installation. Le script affiche une clé publique à
   ajouter comme *deploy key* en lecture seule sur le dépôt GitHub, puis attend.

   ```bash
   scp deploy/install.sh deploy/setup-nginx.sh root@vps:
   ssh -t root@vps bash install.sh
   ```

2. Remplir `/srv/hope/shared/.env` : `SITE_URL` (tant que le domaine n'est pas le domaine
   définitif), `STRIPE_SECRET_KEY`, `SMTP_URL`.
3. Depuis le poste de travail, envoyer la base et les fichiers : `deploy/push-data.sh hope@vps`.
4. Sur le serveur : `hope-deploy`.
5. Dans Cloudflare, créer l'enregistrement DNS **proxifié** (nuage orange) du domaine vers le VPS,
   puis sur le serveur : `bash setup-nginx.sh <domaine>`.
6. Créer les comptes admin : `cd /srv/hope/current && node --env-file=/srv/hope/shared/.env scripts/create-user.ts --email … --name … --locale ro` (en tant que `hope`).

## Déployer une version

```bash
hope-deploy              # pointe de main
hope-deploy v1.2         # une étiquette, une branche ou un commit
hope-deploy --rollback   # revient à la version précédente
```

La nouvelle version est construite à côté pendant que l'ancienne répond ; la bascule n'a lieu
qu'après un build et des migrations réussis, et le script revient seul en arrière si le serveur
ne répond pas. Le retour arrière ne touche pas à la base : si une migration doit être défaite,
restaurer une copie de `shared/backups/`.

La bascule se fait sans coupure : PM2 fait tourner deux instances (mode cluster) et les remplace
l'une après l'autre, chaque ancienne instance terminant ses requêtes en cours. Contrepartie : les
limites anti-abus (connexion admin, formulaire de contact) sont comptées par instance.

`hope-deploy` exécute toujours le `deploy.sh` de la branche `main`. `SITE_URL` est lu au build :
après l'avoir changé, redéployer.

## Cloudflare

- **Mode SSL/TLS** : « Full (strict) » avec un *Origin Certificate* créé dans Cloudflare
  (SSL/TLS > Origin Server) et déposé dans `/etc/ssl/hope/origin.pem` et `origin.key`, puis
  relancer `setup-nginx.sh`. Sans ce certificat nginx n'écoute qu'en HTTP et la zone doit être en
  « Flexible ».
- nginx ne répond qu'aux adresses de Cloudflare (et au serveur lui-même), pour le seul domaine
  configuré. La liste des adresses est téléchargée par `setup-nginx.sh` : le relancer de temps en
  temps la rafraîchit.
- Un domaine autre que `www.adoptii-animale-hope.org` est servi avec `X-Robots-Tag: noindex` :
  la copie de test ne peut pas concurrencer le site Wix dans les moteurs.
- Ne pas activer « Cache Everything » : les pages HTML dépendent du cookie de langue (redirection
  de première visite) et de la session admin.
- Cloudflare refuse les envois de plus de 100 Mo (offres Free et Pro) : une vidéo d'animal plus
  lourde ne passera pas, alors que l'admin accepte 150 Mo.
- La redirection du domaine nu vers `www` et de HTTP vers HTTPS est faite par nginx ; le domaine
  nu doit donc aussi être proxifié vers le VPS.

## Au quotidien

```bash
sudo -iu hope
pm2 status            # état du processus
pm2 logs hope         # journaux (rotation par pm2-logrotate)
pm2 restart hope      # après une modification de shared/.env sans rapport avec SITE_URL
```

Pas encore en place : sauvegarde hors du serveur de `shared/data/` (la copie faite avant chaque
déploiement reste sur le même disque).
