# 모임 채팅 일정 관리 (#194) — 프론트엔드 설계

## 1. 목표

모임 채팅방의 일정 화면에서 사용자가 날짜를 고르고, `+` 버튼으로 제목·시간·위치를 입력해 일정을 등록한다. 본인 일정은 수정·삭제하고, 타인 일정은 신고하며, 방장은 타인 일정을 삭제할 수 있다.

## 2. 라우팅과 데이터 정본

`/chats/schedule?chatId={roomId}`는 더 이상 전역 `GET /meetings/calendar`을 일정 화면 정본으로 사용하지 않는다.

```text
chatId
  -> useChatRoom(roomId)
  -> group room + meetingId 확인
  -> useMeeting(meetingId) / useMeetingSchedules(meetingId, selectedMonthRange)
```

- group이 아니거나 `meetingId`가 없으면 전역 캘린더로 fallback하지 않고 invalid/domain-link state를 보인다.
- schedule API가 joined 권한을 검증하므로, non-member/kicked 오류는 기존 모임 오류 문구로 표시한다.
- 화면은 `MeetingScheduleItem.title`, `locationName`, `createdByUserId`, `canEdit`, `canDelete`, `canReport`만 소비한다. `isHost` 또는 클라이언트의 userId 추측으로 권한을 다시 계산하지 않는다.
- 기존 전역 calendar hook/API는 다른 소비자를 위해 유지한다. 이 route만 meeting-scoped query로 전환한다.

## 3. 화면과 상호작용

### 3.1 캘린더와 목록

현재 `ScheduleCalendar`, `MonthYearWheelPicker`, `ScheduleListItem`을 그대로 사용한다.

- 선택 날짜는 KST `YYYY-MM-DD`로 유지한다.
- 월 조회 범위는 해당 월의 첫날 `00:00:00+09:00`부터 마지막 날 `23:59:59.999+09:00`까지의 KST offset datetime이다. meeting-scoped controller가 `OffsetDateTime`을 바인딩하므로 date-only query를 보내지 않는다.
- 일정 카드는 기존 `rounded-2xl bg-gray-50 p-3`, 시계·map pin 아이콘, 상대시간 pill을 재사용한다.
- 일자 점, selected primary 원형, wheel picker 동작을 새로 구현하지 않는다.
- 카드 본문을 눌러 채팅방으로 이동하던 현재 동작은 이 채팅방 전용 화면에서는 제거한다. 카드의 목적은 해당 모임 일정 관리다.

### 3.2 등록·수정 editor

선택 날짜에서 primary 46px `Circle` + plus asset을 누르면 editor가 열린다.

```text
달력에서 날짜 선택
  -> +
  -> 제목 입력, 시간 선택, 위치 선택
  -> 등록
```

- 날짜는 선택된 KST 날짜로 초기화하고 editor 안에서는 읽기 전용 요약으로 보인다. 날짜 변경은 캘린더를 닫고 다시 선택해 한다.
- 시간은 기존 `MeetupTimePicker`, 위치는 기존 `MeetupLocationPicker`/`MeetupSelectField`를 사용한다.
- 위치 picker가 제공하는 label을 우선하고 없으면 address를 `locationName`으로 보낸다. 일정용 pin/좌표 생성은 하지 않는다.
- 제목 field와 `h-12 rounded-full bg-primary` submit button은 모임 생성 화면의 existing field/button style을 사용한다.
- editor는 create와 edit가 같은 component/state shape를 공유한다. edit에는 서버 item 값을 채우고 PATCH를 호출한다.
- 선택 날짜가 과거이거나 title/location/time이 비어 있으면 submit하지 않고 기존 form error style을 보인다.
- meeting type이 `recurring`이면 +를 숨긴다. 반복 회차는 현재 백엔드 recurrence engine 소유이며 이번 PR에서 manual create/edit를 만들지 않는다.

### 3.3 action menu

기존 `ChatContextMenu`의 dim overlay, `bg-white/80`, blur, destructive red action을 재사용한다. 메뉴는 서버 capability만으로 만들며, 클라이언트가 방장/작성자 여부를 추론하지 않는다.

| capability | 직접 제어하는 메뉴 |
| --- | --- |
| `canEdit` | 수정 |
| `canReport` | 신고 |
| `canDelete` | 삭제 |

- `buildScheduleActions`는 세 capability를 독립적으로 평가하고 `수정 → 신고 → 삭제` 순서로 true인 항목만 표시한다.
- 예를 들어 작성자 일정은 `canEdit + canDelete`로 수정·삭제를, 방장이 관리하는 타인 일정은 `canReport + canDelete`로 신고·삭제를 표시한다.
- 세 capability가 모두 false이면 더보기 버튼을 렌더링하지 않는다.

- 수정은 editor에 target item을 넣는다.
- 삭제는 현재 `ConfirmDialog`를 사용하고 pending 동안 confirm과 trigger를 disable한다.
- 신고는 기존 report reason 화면을 schedule target도 받을 수 있게 일반화한다. `ReportTarget = message | schedule` union과 일정 submit transport만 추가하고, 기존 reason option/UI를 복제하지 않는다.

## 4. API boundary

```ts
type MeetingScheduleItem = {
  scheduleId: number
  title: string
  locationName: string
  startsAt: string
  endsAt: string | null
  status: "scheduled" | "completed" | "cancelled"
  createdByUserId: number | null
  canEdit: boolean
  canDelete: boolean
  canReport: boolean
}

type ScheduleEditorRequest = {
  title: string
  locationName: string
  startsAt: string
  endsAt?: string
}
```

| 동작 | endpoint |
| --- | --- |
| 목록 | `GET /api/v1/meetings/{meetingId}/schedules` |
| 등록 | `POST /api/v1/meetings/{meetingId}/schedules` |
| 수정 | `PATCH /api/v1/meetings/{meetingId}/schedules/{scheduleId}` |
| 삭제 | `DELETE /api/v1/meetings/{meetingId}/schedules/{scheduleId}` |
| 신고 | `POST /api/v1/meetings/{meetingId}/schedules/{scheduleId}/report` |

`PATCH` 성공 응답은 갱신된 `MeetingScheduleItem`이다. 화면은 현재 응답을 직접 합성하지 않고 해당 meeting schedule cache를 invalidate한다.

create/update/delete/report 성공 시 이 meeting의 schedule query와 해당 month cache만 invalidate한다. unrelated global calendar queries와 chat message cache는 갱신하지 않는다.

## 5. 디자인 시스템 근거

Figma 연결 계정은 확인됐으나 현재 파일의 edit API 권한이 없어 원본 node를 조회하지 못했다. 이 작업은 사용자가 전달한 reference와 repository의 existing design system을 정본으로 한다.

- primary: `#fc7045`
- card: `bg-gray-50`, menu dim/blur: existing `ChatContextMenu`
- destructive: `text-red`
- mobile shell: `max-w-sm`
- tap target: FAB/menu/close는 최소 44px hit area

새 token, 새 UI library, 독자 icon set을 만들지 않는다.

## 6. 구현 경계

| 영역 | 책임 |
| --- | --- |
| `features/schedule/api/*` | meeting-scoped DTO, CRUD/report transport |
| `features/schedule/hooks/*` | meeting/month query와 targeted cache invalidation |
| `features/schedule/lib/*` | KST editor draft, server capability→menu action 순수 변환 |
| `features/schedule/components/schedule-page-content.tsx` | room→meeting gate, calendar/list/menu/editor orchestration |
| `features/schedule/components/schedule-editor-*` | title/time/location editor presentation |
| `features/report/*`, route parser | existing report reason UI의 schedule target transport 재사용 |
| `lib/i18n/messages/*` | 등록·수정·삭제·일정 target report copy를 지원 언어 전체에 추가 |

## 7. 최소 검증

1. 순수 schedule action builder: own/other/host permission matrix에서 edit/delete/report 메뉴가 맞는지.
2. KST draft builder: 선택 date와 picker time이 `startsAt`/`endsAt`으로 안정적으로 합쳐지는지.
3. API request contract: create/update/report body와 targeted query invalidation.
4. `pnpm typecheck`, 변경 module lint/build check. 전체 browser E2E나 전역 test suite는 이 이슈 범위가 아니다.

## 8. 완료 문서

BE #160의 실제 응답·오류가 확정되고 focused 검증이 통과한 뒤에만 로컬 API SSOT와 Notion에 CRUD/report contract를 동기화한다.
