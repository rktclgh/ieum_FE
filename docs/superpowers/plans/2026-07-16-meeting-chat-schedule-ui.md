# 모임 채팅 일정 캘린더 UI 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모임 채팅방에서 날짜별 일정을 보고, 참가자가 새 일정을 등록·자기 일정 수정/삭제·타인 일정 신고를 수행하며, 방장은 타인 일정을 삭제할 수 있게 한다.

**Architecture:** schedule route는 room을 먼저 조회해 `meetingId`를 확인하고 해당 모임의 일정 query만 사용한다. 서버가 내려준 capability로 action menu를 만들고, editor와 report screen은 기존 design system/flow를 재사용한다.

**Tech Stack:** Next.js/React, TanStack Query, Tailwind design tokens, existing chat/meetup/report components, TypeScript module tests.

## Guardrails

- 이 워크트리 밖의 파일과 backend contract definition을 수정하지 않는다.
- 기존 전역 calendar consumer는 유지하며 `/chats/schedule` route만 meeting-scoped data로 전환한다.
- manual create/edit는 one-time meeting만; recurring room에서는 editor FAB를 보이지 않게 한다.
- 새 디자인 token, UI library, icon set, 별도 report reason screen을 만들지 않는다.
- 전체 E2E 대신 순수 lib/API module tests와 affected typecheck/lint만 실행한다.

## File map

| Area | Primary files |
| --- | --- |
| Schedule API/query | `src/features/schedule/api/*`, `src/features/schedule/hooks/*`, `src/features/schedule/lib/*` |
| Route/orchestration | `src/app/chats/schedule/page.tsx`, `src/features/schedule/components/schedule-page-content.tsx` |
| Reused UI | `src/features/schedule/components/{schedule-calendar,schedule-list-item,month-year-wheel-picker}.tsx`, `src/components/ui/circle.tsx`, `src/features/meetup/components/*picker*`, `src/features/chat/components/chat-context-menu.tsx` |
| Report reuse | `src/features/report/{api,hooks,components,lib}/*`, `src/app/chats/report/page.tsx` |
| Copy/tests | `src/lib/i18n/messages/*`, `src/features/schedule/**/*.test.ts` |

## Implementation tasks

- [ ] **Task 1 — Define meeting schedule types and focused API/query tests.**
  - Expand `MeetingScheduleItem` with title, locationName, creator, status, and server capabilities; add create/update/report request/response types.
  - Add GET/POST/PATCH/DELETE/report transport functions with the #160 endpoint paths and targeted query keys.
  - Extend schedule mutations so a success invalidates only the relevant meeting/month schedules; do not invalidate global calendar or chat-message caches.
  - Add module tests for the body/endpoint/query-key contract.

- [ ] **Task 2 — Add pure action and KST draft helpers.**
  - Create a pure capability-to-menu-action function that returns edit/delete/report from `canEdit/canDelete/canReport`; its output must be the only menu source.
  - Create a KST date/time draft helper for selected calendar date plus `MeetupTimePicker` output. Test valid composition and invalid/past selection handling.
  - Use the helper rather than reconstructing dates in component render code.

- [ ] **Task 3 — Gate the route by chat room and render scoped schedule data.**
  - Resolve `chatId` through the existing chat-room query; require a group room with `meetingId` before rendering the calendar.
  - Query the selected month range from `useMeetingSchedules(meetingId, from, to)` and map cards from server fields.
  - Keep `ScheduleCalendar`, `MonthYearWheelPicker`, and `ScheduleListItem` visual primitives. Remove the current card-to-chat navigation for this management screen.
  - Present the existing invalid/domain-link state instead of falling back to the global meeting calendar.

- [ ] **Task 4 — Implement editor and capability-driven context actions.**
  - Build one create/edit editor state using existing time picker, location picker/select field, Circle FAB, field styles, primary submit, and form error presentation.
  - Initialize editor date from the calendar selection; use title and location label/address without creating a schedule-level map pin.
  - Render FAB only for valid one-time rooms and non-past selection. Render more trigger only when the pure capability action list is non-empty.
  - Wire edit, `ConfirmDialog`-backed delete, pending disabled states, and cache refresh after success.

- [ ] **Task 5 — Reuse the report flow for schedule targets.**
  - Generalize report route target parsing and mutation types from message-only to a small discriminated union that supports schedule `meetingId/scheduleId`.
  - Reuse the existing reason selection UI and errors; add only schedule-specific transport and route entry.
  - Ensure ordinary message reporting behavior remains unchanged through a targeted test or static type assertion.

- [ ] **Task 6 — Complete copy and focused verification.**
  - Add required schedule editor/action/report copy to every supported message bundle using the repository's existing type-safe shape.
  - Run pure helper/API tests, `pnpm typecheck`, and targeted lint/build checks. Inspect the schedule UI at mobile width if the local app is available.
  - Leave API SSOT/Notion changes to the integration owner after #160's actual payload is verified.

## Acceptance checklist

- [ ] No schedule data is displayed until the room resolves to a valid group `meetingId`.
- [ ] The selected date drives a KST-safe create/edit draft.
- [ ] Visible actions equal server capabilities; delete confirmation and pending state are usable.
- [ ] Existing calendar, card, picker, FAB, context-menu, and report designs are reused.
- [ ] Module tests/typecheck establish the request and view-model contract.
