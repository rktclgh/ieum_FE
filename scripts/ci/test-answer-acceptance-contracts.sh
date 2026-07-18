#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/ieum-answer-acceptance-contracts.XXXXXX")"
trap 'rm -rf "$tmp_dir"' EXIT

pnpm exec tsc \
  --project scripts/ci/tsconfig.test.json \
  --outDir "$tmp_dir"

node --test "$tmp_dir/features/question/lib/answer-acceptance.test.js"
