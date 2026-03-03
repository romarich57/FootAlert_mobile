#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LICENSE_DOC="$ROOT_DIR/docs/compliance/api-football-licensing.md"

if [[ ! -f "$LICENSE_DOC" ]]; then
  echo "Missing compliance document: $LICENSE_DOC"
  exit 1
fi

read_field() {
  local field_name="$1"
  local value
  value="$(sed -n "s/^${field_name}:[[:space:]]*//p" "$LICENSE_DOC" | head -n 1 | tr -d '\r')"
  printf '%s' "$value"
}

status="$(read_field 'LICENSE_STATUS')"
proof_url="$(read_field 'WRITTEN_PROOF_URL')"
validation_date="$(read_field 'VALIDATION_DATE')"
validated_by="$(read_field 'VALIDATED_BY')"

if [[ "$status" != "APPROVED" ]]; then
  echo "API-Football license gate failed: LICENSE_STATUS must be APPROVED (current: ${status:-missing})."
  exit 1
fi

if [[ -z "$proof_url" || "$proof_url" == "MISSING" || "$proof_url" == "TBD" ]]; then
  echo "API-Football license gate failed: WRITTEN_PROOF_URL is missing."
  exit 1
fi

if [[ -z "$validated_by" || "$validated_by" == "MISSING" || "$validated_by" == "TBD" ]]; then
  echo "API-Football license gate failed: VALIDATED_BY is missing."
  exit 1
fi

if [[ -z "$validation_date" || ! "$validation_date" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "API-Football license gate failed: VALIDATION_DATE must be YYYY-MM-DD."
  exit 1
fi

echo "API-Football license gate passed."
