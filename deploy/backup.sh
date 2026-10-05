#!/usr/bin/env bash
# Backs up the database, the uploads and the contact attachments. Run every night on the VPS by
# the cron job that install.sh creates (/etc/cron.d/hope-backup), or by hand as the application user:
#
#   /srv/hope/current/deploy/backup.sh
#
# Each run creates shared/backups/daily/<date>-<time>/ with hope.db.gz (a consistent, verified
# copy), uploads/ and contact/. Files that did not change since the previous backup are hard links
# to it, so a backup only costs the space of what is new. The last BACKUP_KEEP backups are kept
# (default 14). When BACKUP_REMOTE is set in shared/.env (an rsync destination such as
# backup@host:/backups/hope), the whole directory is then copied there: without it the backups
# stay on the disk of the server. The image cache is not saved, it is rebuilt on demand.
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/hope}"
ENV_FILE="$APP_DIR/shared/.env"
DEST="$APP_DIR/shared/backups/daily"

fail() { echo "$(date -u +%FT%TZ) backup FAILED: $*" >&2; exit 1; }
setting() { node --env-file="$ENV_FILE" -p "process.env.$1 || ''"; }

[ -f "$ENV_FILE" ] || fail "$ENV_FILE not found."
DATABASE="$(setting DATABASE_PATH)"
DATA_DIR="$(setting DATA_DIR)"
KEEP="$(setting BACKUP_KEEP)"; KEEP="${KEEP:-14}"
REMOTE="$(setting BACKUP_REMOTE)"
[ -f "$DATABASE" ] || fail "no database at $DATABASE."

mkdir -p "$DEST"
exec 9>"$DEST/.lock"
flock -n 9 || fail "another backup is running."

stamp="$(date -u +%Y%m%d-%H%M%S)"
partial="$DEST/.partial-$stamp"
[ ! -e "$DEST/$stamp" ] || fail "$DEST/$stamp already exists."
previous="$(find "$DEST" -mindepth 1 -maxdepth 1 -type d -name '2*' | sort | tail -n 1)"
# A backup only gets its final name once it is complete.
trap 'rm -rf -- "$partial"' EXIT
mkdir "$partial"

# Database: copied through SQLite (the write-ahead log is included), then checked.
cd "$APP_DIR/current"
DATABASE="$DATABASE" SNAPSHOT="$partial/hope.db" node --input-type=module -e "
  import Database from 'better-sqlite3';
  await new Database(process.env.DATABASE, { readonly: true }).backup(process.env.SNAPSHOT);
  const check = new Database(process.env.SNAPSHOT, { readonly: true }).pragma('integrity_check', { simple: true });
  if (check !== 'ok') { console.error('integrity_check: ' + check); process.exit(1); }
" || fail "the copy of the database is not valid."
rm -f "$partial"/hope.db-wal "$partial"/hope.db-shm
gzip "$partial/hope.db"

# Files: unchanged ones are hard links to the previous backup.
for dir in uploads contact; do
  [ -d "$DATA_DIR/$dir" ] || continue
  link=()
  if [ -n "$previous" ] && [ -d "$previous/$dir" ]; then link=(--link-dest="$previous/$dir"); fi
  rsync -a "${link[@]}" "$DATA_DIR/$dir/" "$partial/$dir/"
done

mv "$partial" "$DEST/$stamp"
find "$DEST" -mindepth 1 -maxdepth 1 -type d -name '2*' | sort | head -n -"$KEEP" | xargs -r rm -rf --

if [ -n "$REMOTE" ]; then
  rsync -a -H --delete --exclude='.lock' --exclude='.partial-*' "$DEST/" "$REMOTE/" || fail "saved in $DEST/$stamp but not copied to $REMOTE."
  copied=", copied to $REMOTE"
else
  copied=", NOT copied off the server (BACKUP_REMOTE is empty)"
fi

echo "$(date -u +%FT%TZ) backup $stamp: database $(du -h "$DEST/$stamp/hope.db.gz" | cut -f1), $(find "$DEST/$stamp" -type f | wc -l) files, $(du -sh "$DEST" | cut -f1) for $(find "$DEST" -mindepth 1 -maxdepth 1 -type d -name '2*' | wc -l) backups$copied"
