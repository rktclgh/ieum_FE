#!/usr/bin/env bash
set -euo pipefail

bash scripts/ci/test-route-contracts.sh
bash scripts/ci/test-session-contracts.sh
bash scripts/ci/test-transport-contracts.sh
bash scripts/ci/test-chat-avatar-contracts.sh
bash scripts/ci/test-web-push-contracts.sh
bash scripts/ci/test-admin-contracts.sh
node --test scripts/ci/test-static-export-routes.mjs
node --test scripts/ci/test-static-source-contracts.mjs
