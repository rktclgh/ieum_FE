#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/ieum-admin-contracts.XXXXXX")"
trap 'rm -rf "$tmp_dir"' EXIT

pnpm exec tsc \
  --project scripts/ci/tsconfig.admin-contracts.json \
  --outDir "$tmp_dir" \
  --incremental false

NODE_PATH="$repo_root/node_modules" node --test \
  "$tmp_dir/scripts/ci/test-admin-contracts.js" \
  "$tmp_dir/scripts/ci/test-admin-inquiry-lifecycle.js"
node --test scripts/ci/test-admin-source-contracts.mjs
