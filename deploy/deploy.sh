#!/usr/bin/env bash
# Deploys a version on the VPS. Run through the `hope-deploy` command installed by install.sh:
#
#   hope-deploy              # deploy the tip of the main branch
#   hope-deploy <ref>        # deploy a branch, a tag or a commit
#   hope-deploy --rollback   # go back to the previous release (the database is not restored)
#
# Each version is built in its own directory under releases/ while the current one keeps serving;
# the `current` symlink is switched only once the build and the migrations have succeeded.
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/hope}"
APP_NAME="${APP_NAME:-hope}"
BRANCH="${BRANCH:-main}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
KEEP_BACKUPS="${KEEP_BACKUPS:-10}"

REPO="$APP_DIR/repo.git"
ENV_FILE="$APP_DIR/shared/.env"
export APP_DIR APP_NAME

step() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
fail() { echo "Error: $*" >&2; exit 1; }
setting() { node --env-file="$ENV_FILE" -p "process.env.$1 || ''"; }
releases() { find "$APP_DIR/releases" -mindepth 1 -maxdepth 1 -type d | sort; }

# Points `current` at a release (atomic rename) and restarts the process from it.
activate() {
  ln -sfn "$1" "$APP_DIR/current.new"
  mv -T "$APP_DIR/current.new" "$APP_DIR/current"
  pm2 startOrReload "$1/deploy/ecosystem.config.cjs" --update-env >/dev/null
  pm2 save >/dev/null
}

# The Node server answers on the home page; without Accept-Language there is no language redirect.
healthy() {
  local url
  url="http://127.0.0.1:$(setting PORT)/"
  for _ in $(seq 1 20); do
    curl -fsS -o /dev/null --max-time 5 "$url" 2>/dev/null && return 0
    sleep 1
  done
  return 1
}

current_release() {
  if [ -L "$APP_DIR/current" ]; then readlink -f "$APP_DIR/current"; fi
}

rollback() {
  local current previous
  current="$(current_release)"
  previous="$(releases | grep -vxF "$current" | tail -n 1 || true)"
  [ -n "$previous" ] || fail "no other release to go back to."
  step "Rolling back to $(basename "$previous") ($(cat "$previous/REVISION" 2>/dev/null || echo '?'))"
  activate "$previous"
  healthy || fail "the previous release does not answer either: pm2 logs $APP_NAME"
  echo "Done. The database was left as it is; snapshots taken before each deployment are in $APP_DIR/shared/backups."
}

deploy() {
  local ref="${1:-$BRANCH}" sha previous database snapshot
  sha="$(git --git-dir="$REPO" rev-parse --verify --quiet "$ref^{commit}")" || fail "unknown version: $ref"
  # Not local: the exit trap below still needs it once this function has returned or failed.
  release="$APP_DIR/releases/$(date -u +%Y%m%d-%H%M%S)-${sha:0:7}"
  previous="$(current_release)"

  step "Preparing $(basename "$release")"
  mkdir -p "$release"
  # An unfinished release is removed, whatever the step that failed.
  trap '[ -e "$release/.complete" ] || { echo "Deployment aborted, the running version is unchanged."; rm -rf -- "$release"; }' EXIT
  git --git-dir="$REPO" archive "$sha" | tar -x -C "$release"
  echo "$sha" > "$release/REVISION"
  cd "$release"

  step "Installing dependencies"
  pnpm install --frozen-lockfile

  # The prebuilt binary of better-sqlite3 needs a recent C library (glibc 2.33). Where it does not
  # load, the module is compiled here and its prebuilt binary removed, so the compiled one is used.
  if ! node -e "new (require('better-sqlite3'))(':memory:')" 2>/dev/null; then
    step "Compiling better-sqlite3 for this system"
    (
      cd "$(node -p "path.dirname(require.resolve('better-sqlite3/package.json'))")"
      pnpm dlx node-gyp@10 rebuild --release --force_build=1 >/dev/null 2>&1 \
        || fail "better-sqlite3 could not be compiled (build-essential and python3 are needed)."
      rm -f -- "$(node -p "require('./lib/binding.js').getPrebuildPath()")"
    )
    node -e "new (require('better-sqlite3'))(':memory:')"
  fi

  step "Building"
  # SITE_URL is the only setting read at build time (hosts accepted behind the proxy, astro.config.ts).
  SITE_URL="$(setting SITE_URL)" pnpm build

  step "Database"
  database="$(setting DATABASE_PATH)"
  if [ -f "$database" ]; then
    snapshot="$APP_DIR/shared/backups/hope-$(date -u +%Y%m%d-%H%M%S).db"
    SNAPSHOT="$snapshot" node --env-file="$ENV_FILE" --input-type=module -e "
      import Database from 'better-sqlite3';
      await new Database(process.env.DATABASE_PATH, { readonly: true }).backup(process.env.SNAPSHOT);
    "
    echo "Snapshot: $snapshot"
    find "$APP_DIR/shared/backups" -name 'hope-*.db' | sort | head -n -"$KEEP_BACKUPS" | xargs -r rm --
  else
    echo "No database yet at $database: the migrations create an empty one (send the real one with deploy/push-data.sh)."
  fi
  node --env-file="$ENV_FILE" scripts/migrate.ts

  step "Switching to the new version"
  touch "$release/.complete"
  activate "$release"
  if ! healthy; then
    echo "The new version does not answer." >&2
    pm2 logs "$APP_NAME" --lines 30 --nostream >&2 || true
    if [ -n "$previous" ]; then
      echo "Going back to $(basename "$previous")." >&2
      activate "$previous"
    fi
    fail "deployment failed; $(basename "$release") is kept for inspection."
  fi

  step "Cleaning up"
  releases | { grep -vxF "$release" || true; } | head -n -"$((KEEP_RELEASES - 1))" | xargs -r rm -rf --

  echo
  echo "Deployed $(basename "$release") ($sha)."
}

main() {
  [ "$(id -u)" -ne 0 ] || fail "run as the application user (use the hope-deploy command)."
  [ -d "$REPO" ] && [ -f "$ENV_FILE" ] || fail "$APP_DIR is not prepared: run deploy/install.sh first."
  # One deployment at a time.
  exec 9>"$APP_DIR/shared/deploy.lock"
  flock -n 9 || fail "another deployment is running."

  case "${1:-}" in
    --rollback) rollback ;;
    *) deploy "$@" ;;
  esac
}

main "$@"
