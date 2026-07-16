# 모임 채팅방 나가기·회원관리와 이탈 시스템 메시지 (#171, BE #145) — 프론트엔드 설계

> **구현 현황 (2026-07-16):** 이 설계의 프론트 범위는 `5ba6850`, `04b0bc7`, `0b12de4`, `f25e42d`와 후속 active-room `remove` 캐시 보완으로 구현됐다. `messageType=system`은 일반 말풍선과 분리된 정적 중앙 회색 pill로만 렌더되며, group 나가기는 모임 나가기 API만 사용한다. 회원관리는 참여자 API를 정본으로 기존 강퇴 UI/API를 연결했고, 열린 방에서 받은 자기 `remove` 이벤트는 모든 로드된 채팅 목록과 모임 detail/participants 캐시를 정리한 뒤 채팅 목록으로 이동시킨다. 로컬 API SSOT·Notion 동기화는 완료됐고, PR 검증은 별도 인계 단계에서 처리한다.

## 1. 문제와 목표

모임(group) 채팅방에서 일반 참가자가 나가기를 선택하면 현재 프론트는 방 타입과 무관하게 `POST /api/v1/chat/rooms/{roomId}/leave`를 호출한다. group 방의 이 API는 의도적으로 `409 GROUP_LEAVE_VIA_MEETING`을 반환하므로, 사용자가 모임을 떠날 수 없다.

같은 오류는 두 경로에 있다.

1. 채팅방 상세의 더보기 패널 → 나가기 확인
2. 채팅 목록의 길게 누른 메뉴 → 삭제

이번 작업의 UX 목표는 다음과 같다.

- group 방의 채팅 나가기는 모임 나가기 API로 연결한다.
- direct/question 방의 기존 채팅 나가기는 그대로 유지한다.
- 방장은 모임 채팅방의 더보기 패널에서 joined 참여자를 확인하고, 자신을 제외한 일반 참여자를 내보낼 수 있다.
- 누군가 자진으로 나가거나 방장이 참여자를 내보내면, 남은 참여자 화면에 중앙 정렬된 회색 system pill을 즉시 표시한다.
- system 메시지는 재연결·새로고침·과거 이력 로딩에도 같은 모습으로 보인다.
- system 메시지에는 아바타, 발신자명 chrome, 시각, 롱프레스 신고/공지 액션을 표시하지 않는다.

## 2. 정본 API 선택

프론트는 room의 도메인 정보를 기준으로 단일 mutation을 사용한다.

```ts
type LeaveChatRoomTarget = {
  roomId: number
  roomType: "direct" | "group" | "question"
  meetingId: number | null
}
```

| 방 타입 | 호출 | 성공 후 캐시 처리 |
|---|---|---|
| `direct`, `question` | `POST /api/v1/chat/rooms/{roomId}/leave` | 채팅 목록 무효화, 현재 room/messages 캐시 제거 |
| `group` + 유효 `meetingId` | `POST /api/v1/meetings/{meetingId}/leave` | 위 처리 + 모임 detail/participants 캐시 무효화 |
| `group` + `meetingId=null` | 호출하지 않고 도메인 연결 오류로 실패 | chat leave로 fallback 금지 |

group 방을 일반 chat leave로 fallback하면 다시 `409`이 발생하고, 잘못된 연결 정보를 숨긴다. 따라서 fail-closed로 처리한다.

`ChatListEntry`에는 이미 있는 summary의 `roomType`, `meetingId`를 전달해 목록 길게 누른 메뉴도 같은 mutation을 사용한다.

## 3. 회원관리: 기존 화면·에셋·API 재사용

새 디자인 에셋과 새 API는 필요하지 않다. 현재 채팅 더보기 패널과 아래 요소를 그대로 재사용한다.

| 기존 요소 | 재사용 방식 |
|---|---|
| `ChatRoomMemberItem` | 이미 구현된 왕관, `내보내기` outline 버튼, 프로필/국기 행을 사용한다. 현재 누락된 `isOwner`, `onRemove`만 연결한다. |
| `/icons/chat/crown.svg` | host 행에 기존 왕관 표시를 사용한다. |
| `ConfirmDialog` + `messages.meetup.kickConfirm*` | 강퇴 전 확인 다이얼로그와 기존 문구를 재사용한다. |
| `POST /api/v1/meetings/{meetingId}/kick` + `useKickMember` | 요청 body `{ userId }`, 서버의 `NOT_HOST`/`VALIDATION_FAILED`/`PARTICIPANT_NOT_FOUND` 계약을 그대로 쓴다. |
| `GET /api/v1/meetings/{meetingId}/participants` | 더보기 패널이 열려 있을 때만 조회해 joined 회원 목록의 정본으로 쓴다. |

`meeting_participants`가 도메인 정본이므로, member list/count/host 여부는 `useMeetingParticipants(meetingId)`로 만든다. `room.members`는 같은 `userId`의 nationality flag 보강에만 쓴다. host는 항상 첫 행·왕관으로 보이고, host 본인과 현재 사용자의 행에는 내보내기 버튼을 렌더하지 않는다.

강퇴 버튼은 `isGroup && isMeetingHost && participant.userId !== session.userId`에서만 렌더한다. 클릭하면 target을 state에 보관하고 기존 `ConfirmDialog`를 열며, confirm 시 `useKickMember(meetingId)`를 호출한다. pending 동안 target 행 버튼과 `ConfirmDialog.confirmDisabled`를 모두 disable하고 dialog close/cancel 요청도 무시해 같은 target의 중복 mutation을 막는다. 성공 시에만 dialog를 닫고 target을 clear하며, 실패 시에는 target/dialog를 유지해 패널 내 오류를 확인한 뒤 재시도하거나 취소할 수 있게 한다. 프론트 표시 조건은 UX만 담당하며 서버의 방장 권한 검증을 대체하지 않는다.

## 4. 문구와 상호작용

### 상세 패널

- group 방 버튼과 확인 다이얼로그는 기존 `messages.meetup.leaveButton`, `leaveConfirmTitle`, `leaveConfirmDescription`을 사용한다.
- direct/question은 기존 `messages.chat.leaveChat*` 문구를 유지한다.
- group 나가기 실패는 `getMeetupErrorMessage`로 `HOST_CANNOT_LEAVE`, `PARTICIPANT_NOT_FOUND` 등을 기존 모임 화면과 일관되게 보여 준다.
- 성공하면 현재 사용자의 목록에서 방을 제거하고 `/chats`로 이동한다.

### 채팅 목록 메뉴

- group 항목의 destructive action은 사용자가 모임까지 떠난다는 의미가 드러나도록 `messages.meetup.leaveButton`을 사용한다.
- direct/question 항목은 기존 채팅 삭제/나가기 문구와 API를 유지한다.

### 강퇴 후 화면 동기화

- 강퇴 성공: `useKickMember`의 기존 meeting detail/participants invalidation을 유지하고, 현재 room detail도 invalidation한다.
- 남아 있는 방장: system message 수신 시 `chatKeys.room(roomId)`와 `meetupKeys.participants(meetingId)`를 invalidation하여 member count와 행이 즉시 줄어든다.
- 강퇴 대상이 방을 열고 있는 경우: 기존 `/user/queue/rooms`의 `remove` event를 `useChatRoomSocket`도 구독한다. 같은 `roomId`의 remove를 받으면 모든 로드된 type별 채팅 목록 캐시에서 방을 먼저 제거하고, group이면 meeting detail/participants 캐시도 제거한다. 이어서 room/messages cache와 side panel을 정리한 뒤 `router.replace(routes.chats())`한다. 자진 나가기 mutation 진행 중에는 mutation이 열린 방 정리·이동을 소유하지만, 목록/모임 캐시는 즉시 같은 방식으로 동기화한다. 이 경로는 메시지 topic만으로 접근권한을 추정하지 않는다.

## 5. system 메시지 wire contract

백엔드는 REST history와 `/topic/rooms/{roomId}` event에 같은 필드를 추가한다.

```ts
type ChatMessageType = "user" | "system"

interface ChatMessageResponse {
  // 기존 필드
  messageType?: ChatMessageType
}
```

`messageType`은 서버 최종 계약에서는 required다. 프론트 타입은 롤링 배포 동안 구 백엔드 응답을 수용하기 위해 optional로 두고, adapter에서 다음처럼 정규화한다.

```ts
const messageType = message.messageType ?? "user"
```

system 메시지는 `content`을 그대로 표시한다. sender 정보는 API 호환성과 감사 정보로 남지만 화면에는 표시하지 않는다. 두 이탈 사유는 사용자의 요청대로 같은 중립 문구를 사용한다. 따라서 새 i18n key나 클라이언트 측 사유 분기 없이, 서버가 저장한 nickname snapshot 문장을 사용한다.

```json
{
  "messageType": "system",
  "content": "민지님이 모임을 떠났습니다",
  "imageUrl": null
}
```

새 WebSocket 구독이나 polling은 추가하지 않는다. 기존 `/topic/rooms/{roomId}` → `onMessage` → `adaptMessage` → `liveMessages` 경로와 REST 재연결 backfill이 이 계약을 그대로 처리한다.

이 payload는 자진 나가기와 방장 강퇴에서 모두 동일하게 생성된다. 강퇴 사유를 공개하는 별도 field나 UI는 이번 범위에 없다.

## 6. 화면 모델과 렌더 트리

일반 말풍선과 system 메시지를 같은 run에 넣으면, 같은 분에 같은 사용자가 나간 경우 일반 sender 그룹에 합쳐지거나 롱프레스 대상이 될 수 있다. 따라서 adapter는 명시적인 timeline union을 만든다.

```text
ChatTimelineItem
├─ userRun: 같은 senderId + 같은 분의 user message stack
└─ system: 단일 system message
```

`system`은 항상 독립 item이다. 앞뒤 user message와 시간이 같아도 합쳐지지 않는다.

이 분리 규칙은 alias/runtime 의존성이 없는 신규 `chat-timeline.ts`의 순수 함수로 둔다. 함수는 `messages`와 `minuteKeyFor(createdAt)`만 받고 timeline item을 반환한다. adapter는 KST `getKstMinuteKey`를 주입하고, `node:test`는 단순 minute key 함수를 주입해 일반 → system → 일반 경계와 같은 분 경계를 독립적으로 고정한다.

```text
dateGroups.map(date)
  ├─ ChatDateDivider
  └─ buildChatTimeline(date.messages).map(item)
       ├─ userRun → ChatMessageGroup → MessageRow → ChatBubbleSegment
       └─ system  → ChatSystemMessage
```

### `ChatSystemMessage`

신규 presentation component는 참고 이미지와 같은 중립적인 공지 pill을 렌더한다.

- 컨테이너: 전체 폭에서 `justify-center`
- pill: 참고 이미지와 같은 `rounded-full bg-gray-700 px-3 py-1`, 긴 닉네임도 넘치지 않게 max-width와 `break-words`
- 텍스트: `text-body-regular-12 text-white`, 가운데 정렬
- 표시 요소: `content`만
- 표시하지 않는 요소: profile, sender nickname, timestamp, image, long-press context menu

시스템 메시지는 클릭이나 롱프레스 이벤트를 가지지 않으므로 공지 등록·신고 API의 messageId target으로 전달되지 않는다.

## 7. 변경 파일과 책임

| 파일 | 변경 책임 |
|---|---|
| `src/features/chat/api/chat-types.ts` | `ChatMessageType`, REST/WS `messageType`, leave target 타입 |
| `src/features/chat/api/chat-api.ts` | 기존 direct/question leave 유지 |
| `src/features/chat/hooks/use-chat-mutations.ts` | room type별 정본 leave mutation과 cache invalidation |
| `src/features/chat/lib/chat-adapter.ts` | API event를 user/system view model로 변환, timeline 분리, list entry에 room type/meeting id 전달 |
| `src/features/chat/lib/chat-timeline.ts` | runtime 의존성 없는 user run/system item 분리 순수 함수 |
| `src/features/chat/lib/chat-timeline.test.ts` | Node 내장 `node:test`로 timeline 경계 회귀 고정 |
| `src/features/chat/components/chat-system-message.tsx` | 중앙 system pill presentation |
| `src/features/chat/components/chat-room-member-item.tsx` | 기존 제거 버튼에 pending disabled/접근성 보강 |
| `src/features/chat/components/chat-room-danger-actions.tsx` | group 별 leave label 주입 |
| `src/features/chat/components/chat-room-page-content.tsx` | group leave target 선택, host member management, group error message, timeline item 분기 렌더, kick/cache sync |
| `src/features/chat/components/chat-list-page-content.tsx` | 목록 길게 누른 leave target 선택과 group 문구 |
| `src/features/chat/lib/chat-socket.ts` | 열린 방에서 `/user/queue/rooms` remove 수신 및 강퇴 대상 redirect |
| `src/features/meetup/hooks/use-meetup-queries.ts` | 기존 participants query를 panel-open 조건에 맞춰 재사용 |
| `src/lib/i18n/messages/*` | 이번 범위는 서버 snapshot content를 그대로 쓰므로 변경하지 않는다. 새 문구가 필요해지면 지원 언어 전체를 함께 갱신한다. |

이번 설계는 새 i18n key를 추가하지 않는다. 지원 언어 전체의 번역 누락을 만들지 않으며, system `content`은 백엔드가 보낸 immutable snapshot으로 렌더한다.

## 8. 호환성과 실패 처리

1. **FE 먼저 배포:** 새 프론트는 없는 `messageType`을 `user`로 처리하므로 기존 백엔드와 동작한다.
2. **BE 먼저 배포:** 구 프론트는 추가 JSON 필드를 무시한다. system 메시지는 짧은 배포 전환 구간에 일반 메시지로 보일 수 있으므로, 두 PR을 연속 배포한다.
3. **group의 meeting 연결 누락:** 잘못된 chat leave로 fallback하지 않고 명확한 실패 메시지를 보여 준다.
4. **동일 이벤트 REST+WS 중복:** 기존 `mergeMessages`의 양수 `messageId` dedupe를 유지한다.
5. **나간 본인:** 성공 후 방 캐시를 제거하고 목록으로 이동한다. 남은 사용자는 room topic event와 participants invalidation으로 즉시 반영된다.
6. **강퇴 대상:** 열려 있는 방에서도 user queue remove event로 cache가 정리되고 목록으로 이동한다. remove event를 놓친 재연결/새로고침은 기존 room access guard의 실패 상태로 회복한다.

## 9. 검증 계획

### 정적·계약 검증

- `node --experimental-strip-types --test src/features/chat/lib/chat-timeline.test.ts`
- `pnpm test:contracts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm verify:out`

현재 저장소에는 독립 TypeScript unit test runner가 없다. Node 22의 built-in type stripping과 `node:test`를 사용하므로 새 테스트 의존성은 추가하지 않는다. 컴포넌트 외관은 lint/typecheck/build와 두 사용자 browser smoke로 검증한다.

### 두 사용자 smoke 시나리오

1. A와 B가 같은 모임 group 채팅방에 참여한다.
2. A가 채팅방 상세에서 `모임 나가기`를 확인한다.
3. 네트워크가 `POST /meetings/{meetingId}/leave`만 호출하고 `/chat/rooms/{roomId}/leave`를 호출하지 않는지 확인한다.
4. A의 채팅 목록에서 방이 사라지고 `/chats`로 이동하는지 확인한다.
5. B의 열린 채팅방에 중앙 회색 `A님이 모임을 떠났습니다` pill이 즉시 나타나는지 확인한다.
6. B가 새로고침하고 과거 메시지를 로드해도 같은 pill이 남는지 확인한다.
7. B의 system pill에 아바타·시각·롱프레스 신고/공지 메뉴가 없는지 확인한다.
8. 목록 길게 누른 group 나가기에도 3~6이 같은지 확인한다.
9. B가 방장이면 더보기 패널에서 B만 내보내기 버튼을 보고, host 행은 왕관만 보이는지 확인한다.
10. B가 A를 내보내면 기존 `POST /meetings/{meetingId}/kick`만 호출되고, B의 member count/행은 즉시 갱신되며 A의 열린 방은 `/chats`로 이동하는지 확인한다.
11. B의 화면과 새로고침 후 이력에서 자진 나가기·강퇴 모두 중앙 system pill 한 개씩으로 보이는지 확인한다.

자동 테스트에는 다음을 포함한다.

- `user → system → user`, 같은 분 경계, REST+WS 중복에서 system item이 일반 run에 합쳐지지 않는 timeline 테스트
- host-only remove button, host/self target 제외, pending disable, 두 이탈 사유의 동일 pill 렌더 테스트
- system message 수신 후 member room/participants cache invalidation과 matching room remove event의 redirect 테스트

## 10. 범위 제외

- 재초대 또는 참여 요청 UI
- system 메시지의 image/reply/notice/report 지원
- 채팅방 뒤로가기의 서버 상태 변경
- 기존 일반 말풍선 그룹화·이미지 전송 로직의 재설계
