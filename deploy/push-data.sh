#!/usr/bin/env bash
# Sends the local database and uploads to the VPS. Run from the workstation, at the root of the
# project, for the first installation (or to replace the content of a test server):
#
#   deploy/push-data.sh hope@vps.example.org
#
# The data on the server is REPLACED. The image cache and the contact attachments are not sent.
set -euo pipefail

TARGET="${1:?Usage: deploy/push-data.sh user@host}"
APP_DIR="${APP_DIR:-/srv/hope}"
APP_NAME="${APP_NAME:-hope}"
DATABASE="${DATABASE_PATH:-data/hope.db}"
UPLOADS="${DATA_DIR:-data}/uploads"
REMOTE_DATA="$APP_DIR/shared/data"

[ -f "$DATABASE" ] && [ -d "$UPLOADS" ] || { echo "Run from the project root: $DATABASE or $UPLOADS not found." >&2; exit 1; }

echo "This replaces the database and the uploads in $TARGET:$REMOTE_DATA"
echo "with $DATABASE ($(du -h "$DATABASE" | cut -f1)) and $UPLOADS ($(du -sh "$UPLOADS" | cut -f1))."
read -r -p "Type the host name to confirm (${TARGET#*@}): " answer
[ "$answer" = "${TARGET#*@}" ] || { echo "Cancelled."; exit 1; }

# A consistent copy of the database, including what is still in the write-ahead log.
WORK="$(mktemp -d)"
trap 'rm -r -- "$WORK"' EXIT
DATABASE="$DATABASE" SNAPSHOT="$WORK/hope.db" node --input-type=module -e "
  import Database from 'better-sqlite3';
  await new Database(process.env.DATABASE, { readonly: true }).backup(process.env.SNAPSHOT);
"

echo "Uploads..."
rsync -a --delete --info=progress2 "$UPLOADS/" "$TARGET:$REMOTE_DATA/uploads/"

echo "Database..."
# The app is stopped while its database file is replaced (nothing to stop before the first deployment).
ssh "$TARGET" "pm2 stop $APP_NAME >/dev/null 2>&1 || true"
rsync -a "$WORK/hope.db" "$TARGET:$REMOTE_DATA/hope.db.new"
ssh "$TARGET" "cd $REMOTE_DATA && rm -f hope.db-wal hope.db-shm && mv hope.db.new hope.db && { pm2 start $APP_NAME >/dev/null 2>&1 || true; }"

echo "Done. Run hope-deploy on the server so the migrations are applied to this database."
