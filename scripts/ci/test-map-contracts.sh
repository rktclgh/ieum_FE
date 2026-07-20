#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/ieum-map-contracts.XXXXXX")"
trap 'rm -rf "$tmp_dir"' EXIT

pnpm exec tsc \
  --target ES2022 \
  --module NodeNext \
  --moduleResolution NodeNext \
  --strict \
  --skipLibCheck \
  --esModuleInterop \
  --rootDir . \
  --outDir "$tmp_dir" \
  scripts/ci/test-initial-map-center.ts \
  scripts/ci/test-geolocation-initial-status.ts \
  src/features/map/lib/last-known-location-sync.ts

node --test "$tmp_dir/scripts/ci/test-initial-map-center.js"
node --test "$tmp_dir/scripts/ci/test-geolocation-initial-status.js"
node --no-warnings --experimental-strip-types --import ./scripts/ci/register-ts-path-loader.mjs --test src/features/map/lib/last-known-location-sync.test.ts
node --test scripts/ci/test-map-source-contracts.mjs
