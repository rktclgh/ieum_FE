#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

node --test --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
  scripts/ci/test-route-builders.ts
