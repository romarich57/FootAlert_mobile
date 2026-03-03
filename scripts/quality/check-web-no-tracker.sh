#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

readonly TRACKER_PATTERNS=(
  "googletagmanager\\.com"
  "google-analytics\\.com"
  "gtag\\("
  "plausible\\.io"
  "segment\\.com"
  "mixpanel"
  "amplitude"
  "hotjar"
  "clarity\\.ms"
  "facebook\\.net/en_US/fbevents"
  "doubleclick\\.net"
)

for pattern in "${TRACKER_PATTERNS[@]}"; do
  if rg -n -i \
    --glob '!web/node_modules/**' \
    --glob '!web/dist/**' \
    --glob '!web/package-lock.json' \
    "$pattern" web >/tmp/footalert-no-tracker-check.txt; then
    echo "Web no-tracker gate failed: detected forbidden tracker pattern '$pattern'."
    cat /tmp/footalert-no-tracker-check.txt
    exit 1
  fi
done

if rg -n -i '<script[^>]+src="https?://[^"]+"' web/index.html >/tmp/footalert-external-script-check.txt; then
  echo 'Web no-tracker gate failed: external script tag detected in web/index.html.'
  cat /tmp/footalert-external-script-check.txt
  exit 1
fi

echo 'Web no-tracker gate passed.'
