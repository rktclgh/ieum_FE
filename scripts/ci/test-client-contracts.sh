#!/usr/bin/env bash
set -euo pipefail

bash scripts/ci/test-route-contracts.sh
bash scripts/ci/test-session-contracts.sh
bash scripts/ci/test-transport-contracts.sh
node --test scripts/ci/test-chat-session-contracts.mjs
