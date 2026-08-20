#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/shop.maestro.com.kz}"
cd "$APP_DIR"

exec 9>"$APP_DIR/.deploy.lock"
flock -n 9 || exit 0

git fetch origin main --quiet
CURRENT_SHA="$(git rev-parse HEAD)"
TARGET_SHA="$(git rev-parse origin/main)"
[ "$CURRENT_SHA" = "$TARGET_SHA" ] && exit 0

mkdir -p .runtime-data/uploads
[ -f .runtime-data/products.json ] || cp data/products.json .runtime-data/products.json
[ -f .runtime-data/courses.json ] || cp data/courses.json .runtime-data/courses.json
if [ -d public/uploads ]; then
  cp -Rn public/uploads/. .runtime-data/uploads/ || true
fi

OLD_LOCK_HASH="$(sha256sum package-lock.json 2>/dev/null | cut -d' ' -f1 || true)"
git reset --hard origin/main --quiet
NEW_LOCK_HASH="$(sha256sum package-lock.json 2>/dev/null | cut -d' ' -f1 || true)"

if [ "$OLD_LOCK_HASH" != "$NEW_LOCK_HASH" ] || [ ! -d node_modules ]; then
  npm install --legacy-peer-deps --no-audit --no-fund
fi

npm run build:client
pm2 reload ecosystem.config.cjs --update-env
pm2 save --force >/dev/null

echo "$(date -Is) deployed $TARGET_SHA"
