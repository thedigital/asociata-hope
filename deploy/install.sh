#!/usr/bin/env bash
# One-time preparation of the VPS (Debian or Ubuntu), run as root:
#
#   scp deploy/install.sh deploy/setup-nginx.sh root@vps:   # from the workstation
#   sudo bash install.sh
#
# Installs nginx, Node 24, pnpm and PM2, creates the application user and the directory layout,
# gives the server read access to the repository and installs the `hope-deploy` command.
# Safe to run again: existing files (configuration, key, clone) are kept.
set -euo pipefail

APP_USER="${APP_USER:-hope}"
APP_DIR="${APP_DIR:-/srv/hope}"
APP_PORT="${APP_PORT:-4321}"
REPO_URL="${REPO_URL:-git@github.com:thedigital/asociata-hope.git}"
BRANCH="${BRANCH:-main}"
NODE_MAJOR=24

step() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
as_app() { sudo -u "$APP_USER" -H "$@"; }

[ "$(id -u)" -eq 0 ] || { echo "Run this script as root (sudo bash install.sh)." >&2; exit 1; }
command -v apt-get >/dev/null || { echo "This script expects Debian or Ubuntu (apt-get)." >&2; exit 1; }

step "System packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
# build-essential and python3: fallback when better-sqlite3 has no prebuilt binary for the platform.
apt-get install -y -q nginx git curl ca-certificates rsync sudo cron build-essential python3

step "Node $NODE_MAJOR, pnpm, PM2"
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt "$NODE_MAJOR" ]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -q nodejs
fi
npm install --global --no-fund --no-audit pnpm@11 pm2
echo "node $(node -v), pnpm $(pnpm -v)"

step "User $APP_USER and directories in $APP_DIR"
id "$APP_USER" >/dev/null 2>&1 || useradd --create-home --shell /bin/bash "$APP_USER"
APP_HOME="$(getent passwd "$APP_USER" | cut -d: -f6)"
install -d -o "$APP_USER" -g "$APP_USER" "$APP_DIR" "$APP_DIR/releases" "$APP_DIR/shared" "$APP_DIR/shared/backups"
install -d -o "$APP_USER" -g "$APP_USER" -m 750 "$APP_DIR/shared/data"
install -d -o "$APP_USER" -g "$APP_USER" -m 700 "$APP_HOME/.ssh"

# Let the administrators who can sign in as root (or as the sudo user) sign in as the application
# user too: deploy/push-data.sh sends the database and the uploads over that connection.
ADMIN_KEYS="$(getent passwd "${SUDO_USER:-root}" | cut -d: -f6)/.ssh/authorized_keys"
if [ ! -e "$APP_HOME/.ssh/authorized_keys" ] && [ -s "$ADMIN_KEYS" ]; then
  install -o "$APP_USER" -g "$APP_USER" -m 600 "$ADMIN_KEYS" "$APP_HOME/.ssh/authorized_keys"
  echo "SSH keys of ${SUDO_USER:-root} copied to $APP_USER."
fi

step "Configuration file $APP_DIR/shared/.env"
if [ ! -e "$APP_DIR/shared/.env" ]; then
  install -o "$APP_USER" -g "$APP_USER" -m 600 /dev/null "$APP_DIR/shared/.env"
  cat > "$APP_DIR/shared/.env" <<ENV
# Read by the Node process (PM2) and by the deploy script. Redeploy after a change: hope-deploy
HOST=127.0.0.1
PORT=$APP_PORT

# Database, uploads and image cache: outside the releases, never replaced by a deployment.
DATABASE_PATH=$APP_DIR/shared/data/hope.db
DATA_DIR=$APP_DIR/shared/data

# Public address when it is not https://www.adoptii-animale-hope.org (test domain before the
# switch). Used for the Stripe return URLs and to accept forms posted on that domain.
SITE_URL=

# Card donations (Stripe Checkout). Without it the donation page says card payment is unavailable.
STRIPE_SECRET_KEY=
# Signing secret of the Stripe webhook (https://<domain>/stripe/webhook): counts the card donations of the campaigns.
STRIPE_WEBHOOK_SECRET=

# E-mail notification of contact messages: smtps://user:password@smtp.example.org:465
SMTP_URL=
MAIL_FROM=
CONTACT_TO=

# Nightly backup (deploy/backup.sh). Copy of the backups outside this server: an rsync destination
# such as backup@host:/backups/hope, reached with the SSH key of $APP_USER. Empty: local backups only.
BACKUP_REMOTE=
# Number of nightly backups kept.
BACKUP_KEEP=14
ENV
  echo "Created. Fill in SITE_URL, STRIPE_SECRET_KEY and SMTP_URL before the first deployment."
else
  echo "Already there, left untouched."
fi

step "Read access to the repository"
if [ ! -e "$APP_HOME/.ssh/id_ed25519" ]; then
  as_app ssh-keygen -q -t ed25519 -N '' -C "$APP_USER@$(hostname)" -f "$APP_HOME/.ssh/id_ed25519"
fi
REPO_HOST="$(printf '%s' "$REPO_URL" | sed -E 's#^(ssh://)?([^@/]+@)?([^:/]+).*#\3#')"
as_app touch "$APP_HOME/.ssh/known_hosts"
as_app ssh-keygen -F "$REPO_HOST" -f "$APP_HOME/.ssh/known_hosts" >/dev/null \
  || as_app sh -c "ssh-keyscan -t ed25519,rsa '$REPO_HOST' >> '$APP_HOME/.ssh/known_hosts' 2>/dev/null"

if [ ! -d "$APP_DIR/repo.git" ]; then
  until as_app git ls-remote --heads "$REPO_URL" >/dev/null 2>&1; do
    echo
    echo "The server cannot read $REPO_URL yet."
    echo "Add this public key as a read-only deploy key of the repository"
    echo "(GitHub: Settings > Deploy keys > Add deploy key), then press Enter:"
    echo
    cat "$APP_HOME/.ssh/id_ed25519.pub"
    echo
    read -r _ </dev/tty || { echo "No terminal to wait on: add the key and run the script again." >&2; exit 1; }
  done
  as_app git clone --quiet --mirror "$REPO_URL" "$APP_DIR/repo.git"
  echo "Repository cloned."
else
  echo "Already cloned."
fi

step "Command hope-deploy"
cat > /usr/local/bin/hope-deploy <<LAUNCHER
#!/usr/bin/env bash
# Installed by deploy/install.sh. Fetches the repository and runs the deploy script of the
# $BRANCH branch as $APP_USER, so the procedure is always the versioned one.
set -euo pipefail
[ "\$(id -un)" = "$APP_USER" ] || exec sudo -u "$APP_USER" -H "\$0" "\$@"
export APP_DIR="$APP_DIR" BRANCH="$BRANCH"
cd "\$APP_DIR"
git --git-dir="\$APP_DIR/repo.git" remote update --prune >/dev/null
exec bash <(git --git-dir="\$APP_DIR/repo.git" show "$BRANCH:deploy/deploy.sh") "\$@"
LAUNCHER
chmod 755 /usr/local/bin/hope-deploy

step "Nightly backup"
cat > /etc/cron.d/hope-backup <<CRON
# Installed by deploy/install.sh: database, uploads and contact attachments, every night.
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
30 3 * * * $APP_USER APP_DIR=$APP_DIR $APP_DIR/current/deploy/backup.sh >> $APP_DIR/shared/backups/backup.log 2>&1
CRON
chmod 644 /etc/cron.d/hope-backup
echo "Every night at 03:30 (server time), log in $APP_DIR/shared/backups/backup.log."

step "PM2 at boot and log rotation"
env PATH="$PATH" pm2 startup systemd -u "$APP_USER" --hp "$APP_HOME" >/dev/null
as_app pm2 install pm2-logrotate >/dev/null 2>&1 || echo "pm2-logrotate could not be installed (logs will not be rotated)."

cat <<DONE

Server ready. Next steps:

  1. Fill in $APP_DIR/shared/.env (as root or $APP_USER), including BACKUP_REMOTE.
  2. From the workstation, send the database and the uploads:
       deploy/push-data.sh $APP_USER@<server>
  3. Deploy the application:
       hope-deploy
  4. Configure nginx for the domain served through Cloudflare:
       sudo bash setup-nginx.sh <domain>
DONE
