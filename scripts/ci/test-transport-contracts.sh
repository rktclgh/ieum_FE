#!/usr/bin/env bash
set -euo pipefail

node \
  --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
  --experimental-strip-types \
  --test scripts/ci/test-transport.ts
