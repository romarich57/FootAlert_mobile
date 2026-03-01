#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

npm run check:data-layer-boundaries
npm run check:lazy-screens
npm run check:hermes-enabled
npm run check:mobile-design-controls
npm run check:background-refresh-policy

echo "Architecture checks passed."
