# 새 모임 작성 날짜 미정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 날짜가 정해지지 않은 one-time 모임을 기존 작성 화면에서 만들고, 서버에는 `schedule` 키 없이 전송한다.

**Architecture:** `useCreateMeetupForm`이 날짜 미정 상태를 보유하고, `MeetupDatePicker`는 날짜 또는 날짜 미정이라는 명시적 선택값만 반환한다. 순수 helper가 폼의 날짜·시간 상태를 optional API schedule로 변환해 화면 컴포넌트의 요청 조립을 단순하게 유지한다. 기존 Drawer/WheelPicker와 primary/gray 디자인 토큰을 사용하며 새 에셋이나 의존성을 추가하지 않는다.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, pnpm, Node built-in test runner.

## Global Constraints

- `one_time` 날짜 미정 요청은 `schedule: null`이 아니라 `schedule` 속성 자체를 생략한다.
- `recurring` 요청은 계속 `schedule`을 필수로 유지한다.
- 날짜 미정은 명시적 사용자 선택일 때만 유효하며, 빈 날짜/시간 누락과 구분한다.
- 새 아이콘, 이미지, 의존성, 백엔드 변경을 추가하지 않는다.
- 시간 필드는 native `disabled` 버튼으로 비활성화한다.
- 기존 날짜·시간 선택과 이미지 업로드 오류 흐름은 바꾸지 않는다.
- 모든 새 동작은 테스트를 먼저 RED로 확인하고 최소 구현으로 GREEN으로 만든다.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/features/meetup/constants/create-meetup.ts` | `MeetupDateSelection`의 날짜/미정 선택 계약을 제공한다. |
| `src/features/meetup/lib/create-meetup-schedule.ts` | 선택 상태를 optional `MeetingScheduleInput`으로 바꾸고 제출 가능 일정 조건을 순수하게 판단한다. |
| `src/features/meetup/hooks/use-create-meetup-form.ts` | 날짜 미정 상태, 날짜 전환 시 시간 초기화, 폼 전체 제출 가능 여부를 소유한다. |
| `src/features/meetup/components/meetup-date-picker.tsx` | 날짜 미정 체크 UI와 inert 휠 비활성화·확정 콜백을 맡는다. |
| `src/features/meetup/components/meetup-select-field.tsx` | 선택 필드의 native disabled 표현을 추가한다. |
| `src/features/meetup/components/create-meetup-screen.tsx` | 날짜 미정 라벨, 시간 비활성화, optional schedule 요청을 조립한다. |
| `src/features/meetup/api/meetup-types.ts` | one-time optional/recurring required `schedule`과 nullable `firstScheduleId` 타입을 제공한다. |
| `src/lib/i18n/messages/*.ts` | `createMeetup.dateUndecidedLabel` 번역을 제공한다. |
| `scripts/ci/test-meetup-contracts.ts` | schedule 생략과 날짜 미정 제출 조건을 Node 테스트로 고정한다. |
| `scripts/ci/test-meetup-contracts.sh` | TypeScript 계약 테스트를 임시 디렉터리로 컴파일해 실행한다. |
| `scripts/ci/test-meetup-source-contracts.mjs` | 시간 disabled·조건부 schedule 전달·접근성 마크업의 연결을 정적 계약으로 확인한다. |
| `scripts/ci/test-client-contracts.sh` | 새 meetup 계약 묶음을 기존 CI 진입점에 연결한다. |

### Task 1: 날짜 미정 도메인 계약과 RED 테스트

**Files:**
- Modify: `src/features/meetup/constants/create-meetup.ts`
- Create: `src/features/meetup/lib/create-meetup-schedule.ts`
- Create: `scripts/ci/test-meetup-contracts.ts`
- Create: `scripts/ci/test-meetup-contracts.sh`

**Interfaces:**
- Produces: `MeetupDateSelection`, `buildMeetupSchedule`, `hasCompleteMeetupSchedule`.
- Consumes: `MeetupDateValue`, `MeetupTimeValue`, `toKstIso`, `MeetingScheduleInput`.

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { buildMeetupSchedule, hasCompleteMeetupSchedule } from "../../src/features/meetup/lib/create-meetup-schedule"

const date = { year: 2026, month: 7, day: 16 }
const time = { period: "pm" as const, hour: 7, minute: 0 }

test("날짜 미정 모임은 schedule을 만들지 않는다", () => {
  assert.equal(buildMeetupSchedule({ date: null, time: null, isDateUndecided: true }), undefined)
  assert.equal(hasCompleteMeetupSchedule({ date: null, time: null, isDateUndecided: true }), true)
})

test("실제 날짜와 시간은 KST schedule을 만든다", () => {
  assert.deepEqual(buildMeetupSchedule({ date, time, isDateUndecided: false }), {
    startsAt: "2026-07-16T19:00:00+09:00",
  })
  assert.equal(hasCompleteMeetupSchedule({ date, time, isDateUndecided: false }), true)
})

test("명시적 날짜 미정 없이 날짜 또는 시간이 빠지면 일정 조건이 불완전하다", () => {
  assert.equal(hasCompleteMeetupSchedule({ date, time: null, isDateUndecided: false }), false)
  assert.equal(buildMeetupSchedule({ date: null, time, isDateUndecided: false }), undefined)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash scripts/ci/test-meetup-contracts.sh` (Expected: TypeScript cannot resolve `create-meetup-schedule` before the helper exists.)

- [ ] **Step 3: Write the minimal domain implementation**

```ts
export interface MeetupDateSelection {
  date: MeetupDateValue | null
  isDateUndecided: boolean
}

interface MeetupScheduleState {
  date: MeetupDateValue | null
  time: MeetupTimeValue | null
  isDateUndecided: boolean
}

function hasCompleteMeetupSchedule({ date, time, isDateUndecided }: MeetupScheduleState): boolean {
  return isDateUndecided || (date !== null && time !== null)
}

function buildMeetupSchedule({ date, time, isDateUndecided }: MeetupScheduleState) {
  if (isDateUndecided || !date || !time) return undefined
  return { startsAt: toKstIso(date, time) }
}
```

Use a shell runner matching the existing route-contract runner: compile `scripts/ci/test-meetup-contracts.ts` with `pnpm exec tsc --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$tmp_dir"`, then run `node --test` on its output.

- [ ] **Step 4: Run test to verify it passes**

Run: `bash scripts/ci/test-meetup-contracts.sh` (Expected: three named tests pass with no TypeScript errors.)

- [ ] **Step 5: Commit**

```bash
git add src/features/meetup/constants/create-meetup.ts src/features/meetup/lib/create-meetup-schedule.ts scripts/ci/test-meetup-contracts.ts scripts/ci/test-meetup-contracts.sh
git commit -m "test: #173 날짜 미정 모임 계약 추가"
```

### Task 2: 폼과 API 타입을 날짜 미정 계약으로 연결

**Files:**
- Modify: `src/features/meetup/hooks/use-create-meetup-form.ts`
- Modify: `src/features/meetup/api/meetup-types.ts`
- Test: `scripts/ci/test-meetup-contracts.ts`

**Interfaces:**
- Consumes: `MeetupDateSelection`, `hasCompleteMeetupSchedule` from Task 1.
- Produces: `isDateUndecided`, `setDateSelection`, and a `canSubmit` that accepts the explicit date-undecided case.

- [ ] **Step 1: Extend the failing test**

```ts
test("날짜 미정은 제목·장소·내용 검증을 우회하지 않는다", () => {
  assert.equal(hasCompleteMeetupSchedule({ date: null, time: null, isDateUndecided: true }), true)
  assert.equal(hasCompleteMeetupSchedule({ date: null, time: null, isDateUndecided: false }), false)
})
```

Add a compile-time usage in the test file that permits `const request: CreateMeetingRequest = { ..., type: "one_time", location, maxMembers: 99 }` without `schedule`, accepts `firstScheduleId: null`, and uses `@ts-expect-error` to reject a recurring request without `schedule`.

- [ ] **Step 2: Run test to verify it fails**

Run: `bash scripts/ci/test-meetup-contracts.sh` (Expected: one-time request without `schedule` fails before the API type change.)

- [ ] **Step 3: Write the minimal form/type implementation**

```ts
const [isDateUndecided, setIsDateUndecided] = React.useState(false)

const setDateSelection = ({ date, isDateUndecided }: MeetupDateSelection) => {
  setIsDateUndecided(isDateUndecided)
  setDate(isDateUndecided ? null : date)
  setTime(null)
}

const canSubmit =
  title.trim().length > 0 &&
  !titleTooLong &&
  hasCompleteMeetupSchedule({ date, time, isDateUndecided }) &&
  place !== null &&
  description.trim().length > 0
```

Model request types as a discriminated union so the schedule exception cannot leak into recurring meetings:

```ts
interface CreateMeetingRequestBase {
  title: string
  content?: string
  location: LocationSnapshot
  recurrenceRule?: string
  maxMembers: number
  imageFileId?: string
}

interface OneTimeCreateMeetingRequest extends CreateMeetingRequestBase {
  type: "one_time"
  schedule?: MeetingScheduleInput
}

interface RecurringCreateMeetingRequest extends CreateMeetingRequestBase {
  type: "recurring"
  schedule: MeetingScheduleInput
}

type CreateMeetingRequest = OneTimeCreateMeetingRequest | RecurringCreateMeetingRequest

interface CreateMeetingResponse {
  meetingId: number
  pinId: number
  roomId: number
  firstScheduleId: number | null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash scripts/ci/test-meetup-contracts.sh && pnpm typecheck` (Expected: contract tests pass and TypeScript reports no type errors.)

- [ ] **Step 5: Commit**

```bash
git add src/features/meetup/hooks/use-create-meetup-form.ts src/features/meetup/api/meetup-types.ts scripts/ci/test-meetup-contracts.ts
git commit -m "feat: #173 날짜 미정 모임 상태 추가"
```

### Task 3: 날짜 선택 UI와 시간 필드 비활성화

**Files:**
- Modify: `src/features/meetup/components/meetup-date-picker.tsx`
- Modify: `src/features/meetup/components/meetup-select-field.tsx`
- Modify: `src/features/meetup/components/create-meetup-screen.tsx`
- Modify: `src/lib/i18n/messages/ko.ts`
- Modify: `src/lib/i18n/messages/en.ts`
- Modify: `src/lib/i18n/messages/ja.ts`
- Modify: `src/lib/i18n/messages/vi.ts`
- Modify: `src/lib/i18n/messages/ru.ts`
- Modify: `src/lib/i18n/messages/th.ts`
- Modify: `src/lib/i18n/messages/zh.ts`
- Create: `scripts/ci/test-meetup-source-contracts.mjs`
- Modify: `scripts/ci/test-client-contracts.sh`

**Interfaces:**
- Consumes: Task 2 form fields and `MeetupDateSelection`.
- Produces: a controlled date picker that confirms `{ date, isDateUndecided }`, a disabled time field, and an optional schedule creation request.

- [ ] **Step 1: Write the failing source contract**

```js
import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const screen = fs.readFileSync("src/features/meetup/components/create-meetup-screen.tsx", "utf8")
const picker = fs.readFileSync("src/features/meetup/components/meetup-date-picker.tsx", "utf8")

test("날짜 미정은 시간 선택을 disabled로 만들고 schedule을 조건부로 보낸다", () => {
  assert.match(screen, /disabled=\{form\.isDateUndecided\}/)
  assert.match(screen, /\.\.\.\(schedule \? \{ schedule \} : \{\}\)/)
})

test("날짜 미정 선택은 접근 가능한 체크 상태로 노출한다", () => {
  assert.match(picker, /role="checkbox"/)
  assert.match(picker, /aria-checked=\{isDateUndecided\}/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/ci/test-meetup-source-contracts.mjs` (Expected: missing `disabled`, conditional `schedule`, and checkbox assertions fail.)

- [ ] **Step 3: Write the minimal UI implementation**

Make `MeetupDatePicker` accept `isDateUndecided` and return a `MeetupDateSelection`. Its content keeps a local `isDateUndecided` draft; render this control between the wheel and footer:

```tsx
<button
  type="button"
  role="checkbox"
  aria-checked={isDateUndecided}
  onClick={() => setIsDateUndecided((current) => !current)}
  className="flex w-full items-center gap-2 px-1 text-left"
>
  <span className={cn("flex size-5 items-center justify-center rounded-full border-[1.5px]", isDateUndecided ? "border-primary-400" : "border-gray-200")}>
    {isDateUndecided ? <span className="size-2.5 rounded-full bg-primary-400" /> : null}
  </span>
  <span className="text-body-regular-14 text-gray-700">{t.dateUndecidedLabel}</span>
</button>
```

Wrap the existing wheel in `inert={isDateUndecided}` and `cn(isDateUndecided && "pointer-events-none opacity-40")`; on confirm return `{ date: isDateUndecided ? null : selectedDate, isDateUndecided }`.

Add `disabled?: boolean` to `MeetupSelectFieldProps`, pass it to the button, and add `disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-300` classes. In `CreateMeetupScreen`, display `t.dateUndecidedLabel` instead of a formatted date while enabled, pass `disabled={form.isDateUndecided}` to the time field, and connect `onConfirm={form.setDateSelection}`.

Build the request once after the existing form guard:

```ts
const schedule = buildMeetupSchedule({
  date: form.date,
  time: form.time,
  isDateUndecided: form.isDateUndecided,
})

await createMeeting.mutateAsync({
  title: form.title.trim(),
  content: form.description.trim() || undefined,
  type: "one_time",
  location: { lat: form.place.lat, lng: form.place.lng, address: form.place.address, label: form.place.label },
  ...(schedule ? { schedule } : {}),
  maxMembers: DEFAULT_MAX_MEMBERS,
  imageFileId,
})
```

Add `dateUndecidedLabel` to the `createMeetup` type in `ko.ts` and every locale object: Korean `날짜 미정`, English `Date undecided`, Japanese `日程未定`, Vietnamese `Chưa chọn ngày`, Russian `Дата не определена`, Thai `ยังไม่กำหนดวันที่`, Chinese `日期待定`.

Append both `bash scripts/ci/test-meetup-contracts.sh` and `node --test scripts/ci/test-meetup-source-contracts.mjs` to `scripts/ci/test-client-contracts.sh`.

- [ ] **Step 4: Run tests to verify the UI contract passes**

Run: `pnpm test:contracts && pnpm lint && pnpm typecheck` (Expected: all client contracts, ESLint, and TypeScript pass without output errors.)

- [ ] **Step 5: Commit**

```bash
git add src/features/meetup/components/meetup-date-picker.tsx src/features/meetup/components/meetup-select-field.tsx src/features/meetup/components/create-meetup-screen.tsx src/lib/i18n/messages src/features/meetup/lib/create-meetup-schedule.ts scripts/ci/test-meetup-source-contracts.mjs scripts/ci/test-client-contracts.sh
git commit -m "feat: #173 날짜 미정 모임 작성 지원"
```

### Task 4: 브라우저·정적 배포 회귀 검증 및 PR 준비

**Files:**
- Modify only if verification exposes a #173-specific defect; otherwise no source change.

**Interfaces:**
- Consumes: Tasks 1–3 completed feature and contract suite.
- Produces: evidence that mobile creation flow, type checks, static build, and static-export handoff still work.

- [ ] **Step 1: Start the local frontend and open the creation flow**

Run: `pnpm exec next dev --port 30173`
Use Playwright to open the map home, invoke the create-meetup UI, and open the date picker.

- [ ] **Step 2: Verify the date-undecided interaction**

Check these visible and interactive assertions:

```text
1. The date picker exposes a "날짜 미정" checkbox.
2. Selecting it and completing closes the picker and displays "날짜 미정" in the date field.
3. The time field has native disabled state and cannot open its picker.
4. After filling title, location, and description, the submit button becomes enabled without date/time.
5. Selecting a real date again clears date-undecided and requires a newly chosen time.
```

- [ ] **Step 3: Run repository verification**

Run: `pnpm verify` (Expected: contracts, lint, typecheck, production build, and `verify:out` all pass. If Turbopack is sandbox-blocked from binding a port, rerun the exact build command with approved unrestricted sandbox and record that as environment setup, not a product failure.)

- [ ] **Step 4: Inspect final diff**

Run: `git diff origin/develop...HEAD --check && git status --short` (Expected: no whitespace errors and only intended #173 tracked files.)

- [ ] **Step 5: Commit any verification-only fix and open PR**

```bash
git add src/features/meetup/constants/create-meetup.ts src/features/meetup/lib/create-meetup-schedule.ts src/features/meetup/hooks/use-create-meetup-form.ts src/features/meetup/api/meetup-types.ts src/features/meetup/components/meetup-date-picker.tsx src/features/meetup/components/meetup-select-field.tsx src/features/meetup/components/create-meetup-screen.tsx src/lib/i18n/messages scripts/ci/test-meetup-contracts.ts scripts/ci/test-meetup-contracts.sh scripts/ci/test-meetup-source-contracts.mjs scripts/ci/test-client-contracts.sh
git commit -m "fix: #173 날짜 미정 작성 회귀 보완"
git push -u origin feat/#173-meetup-date-undecided
```

Open a non-draft pull request to `develop` with `Closes #173`, the API omission contract, the time-field accessibility behavior, and exact verification output. Mention the calendar rendering of `meetingAt: null` as explicitly out of scope/follow-up risk.

## Plan Self-Review

- **Spec coverage:** Tasks 1–3 cover explicit date-undecided state, no schedule key, disabled time input, accessible design, translations, API types, and regressions. Task 4 covers browser and static-export verification.
- **No placeholders:** Every task names exact files, interfaces, test commands, and minimal implementation content; there are no open design decisions.
- **Type consistency:** `MeetupDateSelection`, `isDateUndecided`, `buildMeetupSchedule`, and `hasCompleteMeetupSchedule` use the same names and nullable input contracts throughout.
