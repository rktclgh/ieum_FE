#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/ieum-session-contracts.XXXXXX")"
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
  scripts/ci/test-auth-state.ts \
  scripts/ci/test-session-cache.ts \
  scripts/ci/test-session-events.ts \
  scripts/ci/test-session-retry.ts

NODE_PATH="$repo_root/node_modules" node --test \
  "$tmp_dir/scripts/ci/test-auth-state.js" \
  "$tmp_dir/scripts/ci/test-session-cache.js" \
  "$tmp_dir/scripts/ci/test-session-events.js" \
  "$tmp_dir/scripts/ci/test-session-retry.js"
