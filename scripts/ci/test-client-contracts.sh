#!/usr/bin/env bash
set -euo pipefail

bash scripts/ci/test-route-contracts.sh
bash scripts/ci/test-session-contracts.sh
node --no-warnings --experimental-strip-types --import ./scripts/ci/register-ts-path-loader.mjs --test scripts/ci/test-language-sync.ts
bash scripts/ci/test-transport-contracts.sh
bash scripts/ci/test-chat-avatar-contracts.sh
bash scripts/ci/test-web-push-contracts.sh
node --test scripts/ci/test-web-push-worker.mjs
node --test scripts/ci/test-notification-copy-contracts.mjs
bash scripts/ci/test-admin-contracts.sh
bash scripts/ci/test-map-contracts.sh
bash scripts/ci/test-meetup-contracts.sh
node --test scripts/ci/test-meetup-source-contracts.mjs
node --test scripts/ci/test-translation-source-contracts.mjs
node --test scripts/ci/test-translation-ui-surface-contracts.mjs
node --test scripts/ci/test-question-translation-ui.mjs
node --test scripts/ci/test-static-export-routes.mjs
node --test scripts/ci/test-static-source-contracts.mjs
node --experimental-strip-types --test src/features/chat/lib/chat-timeline.test.ts
node --experimental-strip-types --test src/features/chat/lib/chat-room-message-subscription.test.ts
node --experimental-strip-types --test src/features/chat/lib/chat-reply.test.ts
node --experimental-strip-types --test src/features/chat/components/chat-system-message.test.ts
node --experimental-strip-types --test src/features/chat/lib/chat-leave.test.ts
node --experimental-strip-types --test src/features/chat/lib/chat-pin.test.ts
node --experimental-strip-types --test src/features/chat/lib/chat-member-management.test.ts
node --experimental-strip-types --test src/features/chat/lib/chat-room-event.test.ts
node --experimental-strip-types --test src/features/schedule/lib/schedule-actions.test.ts
node --experimental-strip-types --test src/features/schedule/lib/schedule-contract.test.ts
node --experimental-strip-types --test src/features/schedule/lib/schedule-editor.test.ts
node --experimental-strip-types --test src/features/schedule/lib/schedule-query-error.test.ts
node --experimental-strip-types --test src/features/schedule/lib/schedule-query-range.test.ts
node --experimental-strip-types --test src/features/map/lib/map-tile-error.test.ts
node --experimental-strip-types --test src/features/report/lib/report-target.test.ts
node --experimental-strip-types --test src/features/pwa/lib/install-availability.test.ts
node --experimental-strip-types --test src/features/pwa/lib/platform.test.ts
node --no-warnings --experimental-strip-types --import ./scripts/ci/register-ts-path-loader.mjs --test src/lib/long-press-styles.test.ts
node --no-warnings --experimental-strip-types --import ./scripts/ci/register-ts-path-loader.mjs --test src/features/chat/lib/context-menu-geometry.test.ts
node --no-warnings --experimental-strip-types --import ./scripts/ci/register-ts-path-loader.mjs --test src/features/question/lib/question-adapter.test.ts
node --no-warnings --experimental-strip-types --import ./scripts/ci/register-ts-path-loader.mjs --test src/features/question/lib/answer-acceptance.test.ts
node --no-warnings --experimental-strip-types --import ./scripts/ci/register-ts-path-loader.mjs --test src/features/notification/lib/notification-adapter.test.ts
node --no-warnings --experimental-strip-types --import ./scripts/ci/register-ts-path-loader.mjs --test src/features/notification/lib/notification-link.test.ts
node --no-warnings --experimental-strip-types --import ./scripts/ci/register-ts-path-loader.mjs --test src/features/navigation/lib/tab-transition.test.ts
node --no-warnings --experimental-strip-types --import ./scripts/ci/register-ts-path-loader.mjs --test src/lib/files/save-image.test.ts
