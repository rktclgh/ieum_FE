# 채팅 답장 UI (#193) — 프론트엔드 설계

## 1. 목표

사용자가 타인의 user message를 길게 눌러 답장을 선택하고, 대상 발신자와 원문을 낮은 대비의 인용으로 표시한 뒤 텍스트 또는 이미지 답장을 보낸다. 모든 사용자는 REST history와 실시간 room event에서 같은 한 단계 답장 모습을 본다.

## 2. 범위와 비범위

### 범위

- 타인 user message 롱프레스 menu의 `답글 달기`
- composer의 선택 target preview/cancel
- text/image STOMP send에 `replyToMessageId`
- message bubble 위의 작은 sender→target label과 gray quote preview
- REST/WS adapter 및 optimistic echo reply id 매칭

### 비범위

- 원문 위치 scroll/jump, nested thread, reaction, reply edit/delete
- self/system/pending message reply action
- 기존 notice/report action의 정책 변경

## 3. wire/view model

```ts
type ChatReplyPreview = {
  messageId: number
  senderId: number
  senderNickname: string
  content: string | null
  imageUrl: string | null
}

type SendChatMessageRequest = {
  content?: string
  imageFileId?: string
  replyToMessageId?: number
}
```

`ChatMessageResponse`/`WsMessageEvent.replyTo`는 optional nullable로 둔다. 구 서버 응답이 field를 생략해도 adapter가 `undefined`로 처리한다. `ChatBubbleMessage`은 reply preview를 보존하며, `ChatSystemMessage`은 reply field를 갖지 않는다.

## 4. 사용자 흐름

```text
타인 user message 길게 누름
  -> context menu의 답글 달기
  -> selectedReply state + composer preview
  -> 텍스트 전송 또는 이미지 업로드/전송
  -> payload에 replyToMessageId 포함
  -> 성공 echo가 pending bubble을 reply id까지 비교해 대체
  -> selectedReply clear
```

- target은 image-only message도 가능하다. preview text는 원문 content가 있으면 content, 없고 imageUrl이 있으면 기존 image copy/thumbnail 상태를 사용한다.
- system, self, pending/uploading message에서는 action을 render하지 않는다.
- cancel은 target만 clear하며 작성 중인 input text를 지우지 않는다.
- `send()`가 false이거나 image upload/send이 실패하면 selected target을 유지해 사용자가 재시도하거나 직접 취소할 수 있다.

## 5. 렌더링과 디자인 시스템

실서비스 chat은 `ChatMessageGroup` + `MessageRow` + `ChatBubbleSegment` 경로를 사용한다. legacy `chat-bubble.tsx`의 reply variant는 통째로 연결하지 않고 그 visual token만 현행 segment 경로에 적용한다.

### 메시지 안의 reply block

```text
wakawak님이 김연두님에게 답장       // 타인 답장
김연두님에게 답장                  // 내 답장
[ 회색·낮은 대비 원문 preview ]
[ 기존 primary/gray 실제 답장 bubble ]
```

- label: `text-body-regular-12`, `text-gray-400`
- quote: `bg-gray-200`, `text-gray-700`, 기존 bubble radius와 같은 흐름
- actual message: 기존 `ChatBubbleSegment` 그대로
- image reply quote는 원문 preview를 충분히 식별할 수 있는 image indicator/thumbnail만 표시하고 원문 이미지 확대 기능을 추가하지 않는다.
- reply block은 message group의 sender/아바타/시각 규칙을 바꾸지 않는다.

### composer preview

입력창 위에 작은 target banner를 붙인다. `respond.svg`, target nickname, 한 줄 quote, 44px cancel target을 사용한다. input focus는 답장 선택 직후 유지/복원한다. safe-area와 기존 bottom padding을 보존한다.

`messages.chat.replyAction`은 menu label에 재사용한다. sender→target label은 지원 언어 전체에 template key를 추가해 문자열 연결로 인한 문법 오류를 피한다.

## 6. optimistic echo 규칙

현재 pending→server fallback은 text/image와 60초 window로만 비교한다. 같은 본문의 일반 메시지와 답장이 바뀌어 보이지 않도록 matching key에 reply target을 포함한다.

```text
text/image kind
+ normalized text (text only)
+ replyToMessageId (null 포함)
+ 60초 time window
```

서버 echo를 받으면 내 pending 중 위 key가 같은 첫 항목만 제거한다. REST backfill merge도 같은 key를 사용한다.

## 7. 구현 경계

| 영역 | 책임 |
| --- | --- |
| `features/chat/api/chat-types.ts` | reply wire types, optional send id |
| `features/chat/lib/chat-adapter.ts` | API preview→view model 정규화 |
| `features/chat/lib/chat-reply.ts` | reply eligibility/label/optimistic match 순수 함수 |
| `features/chat/components/chat-room-page-content.tsx` | selected target, menu action, text/image payload, rendering orchestration |
| `features/chat/components/chat-message-input.tsx` | target preview/cancel presentation와 focus |
| `features/chat/components/chat-bubble-segment.tsx` 또는 small reply presentation | gray quote + label을 existing bubble 경로에 합성 |
| `lib/i18n/messages/*` | reply label template/cancel copy 전체 locale 반영 |

## 8. 최소 검증

1. `chat-reply` 순수 test: self/system/pending eligibility, own/other label, reply id 포함 optimistic match.
2. adapter test: missing replyTo, text parent, image parent가 올바른 view model으로 변환되는지.
3. send payload test: 선택→취소→text/image send에서 `replyToMessageId`의 유지/clear.
4. `pnpm typecheck`와 변경 module lint/build check. 전체 browser suite는 이 이슈 범위가 아니다.

## 9. 호환성·문서 완료 조건

FE 먼저 배포되면 optional reply field 때문에 기존 메시지를 일반 bubble로 유지한다. BE 먼저 배포된 구 FE는 추가 JSON field를 무시한다. BE #161과 payload/preview fields가 AS-BUILT로 일치하고 focused 검증이 끝난 뒤에만 로컬 API SSOT와 Notion을 구현완료로 동기화한다.
