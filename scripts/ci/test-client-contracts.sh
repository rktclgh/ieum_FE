#!/usr/bin/env bash
set -euo pipefail

bash scripts/ci/test-route-contracts.sh
bash scripts/ci/test-session-contracts.sh
bash scripts/ci/test-transport-contracts.sh
bash scripts/ci/test-chat-avatar-contracts.sh
bash scripts/ci/test-web-push-contracts.sh
node --test scripts/ci/test-web-push-worker.mjs
bash scripts/ci/test-admin-contracts.sh
bash scripts/ci/test-map-contracts.sh
bash scripts/ci/test-meetup-contracts.sh
node --test scripts/ci/test-meetup-source-contracts.mjs
node --test scripts/ci/test-static-export-routes.mjs
node --test scripts/ci/test-static-source-contracts.mjs
node --experimental-strip-types --test src/features/chat/lib/chat-timeline.test.ts
node --experimental-strip-types --test src/features/chat/components/chat-system-message.test.ts
node --experimental-strip-types --test src/features/chat/lib/chat-leave.test.ts
node --experimental-strip-types --test src/features/chat/lib/chat-member-management.test.ts
node --experimental-strip-types --test src/features/chat/lib/chat-room-event.test.ts
