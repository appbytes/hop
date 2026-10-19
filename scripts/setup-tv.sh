#!/usr/bin/env bash
# Registers your TV with the webOS CLI and fetches its SSH key.
# Reads TV_NAME, TV_IP and TV_PASSPHRASE from .env (see .env.example).
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Missing .env. Copy .env.example to .env and fill in your TV details." >&2
  exit 1
fi
# shellcheck disable=SC1091
set -a; . ./.env; set +a
: "${TV_NAME:?TV_NAME is not set in .env}"
: "${TV_IP:?TV_IP is not set in .env}"
: "${TV_PASSPHRASE:?TV_PASSPHRASE is not set in .env}"

command -v ares-setup-device >/dev/null || { echo "webOS CLI not found. Run: npm install -g @webos-tools/cli" >&2; exit 1; }

if ares-setup-device --list | awk '{print $1}' | grep -qx "$TV_NAME"; then
  ares-setup-device --modify "$TV_NAME" --info "{'host':'$TV_IP','port':'9922','username':'prisoner','passphrase':'$TV_PASSPHRASE'}"
else
  ares-setup-device --add "$TV_NAME" --info "{'host':'$TV_IP','port':'9922','username':'prisoner','passphrase':'$TV_PASSPHRASE'}"
fi

echo "Fetching the SSH key from the TV. Enter the passphrase again if the TV asks for it."
ares-novacom --device "$TV_NAME" --getkey
ares-setup-device --modify "$TV_NAME" --info "{'privatekey':'${TV_NAME}_webos','passphrase':'$TV_PASSPHRASE'}"

echo "Checking the connection..."
ares-device --system-info --device "$TV_NAME"
echo "Done. The TV is registered as '$TV_NAME'."
