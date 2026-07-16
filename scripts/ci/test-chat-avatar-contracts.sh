#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/ieum-chat-avatar-contracts.XXXXXX")"
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
  scripts/ci/test-chat-avatar.ts

node --test "$tmp_dir/scripts/ci/test-chat-avatar.js"
