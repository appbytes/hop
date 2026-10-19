#!/usr/bin/env bash
# Packages the app and its service, installs them on the TV and starts the app.
# Reads TV_NAME from .env (see .env.example).
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Missing .env. Copy .env.example to .env and fill in your TV details." >&2
  exit 1
fi
# shellcheck disable=SC1091
set -a; . ./.env; set +a
: "${TV_NAME:?TV_NAME is not set in .env}"

APP_ID="$(python3 -c "import json; print(json.load(open('app/appinfo.json'))['id'])")"

mkdir -p build
rm -f build/*.ipk
ares-package app service -o build
IPK="$(ls build/*.ipk | head -n 1)"

ares-install --device "$TV_NAME" "$IPK"
ares-launch --device "$TV_NAME" "$APP_ID"
echo "Installed and started $APP_ID on '$TV_NAME'."
