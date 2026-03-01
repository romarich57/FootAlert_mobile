#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

violations="$(rg -n "from ['\"](@ui/|@/ui/)" src/data --glob '*.ts' --glob '*.tsx' || true)"
if [[ -n "$violations" ]]; then
  echo "Data layer import boundary violations detected (src/data -> src/ui):"
  echo "$violations"
  exit 1
fi

echo "Data layer boundaries check passed."
