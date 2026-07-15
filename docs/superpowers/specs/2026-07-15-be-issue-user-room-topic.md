# [BE 이슈] 채팅 목록용 사용자 단위 WebSocket 토픽 (`/user/queue/rooms`)

> 등록됨: rktclgh/ieum_BE#103. 아래는 계약 명세 원본.

## 배경

채팅 **목록** 화면은 "내가 속한 어느 방이든 요약(안읽음·마지막 메시지·핀·정렬)이
바뀌면 갱신"되어야 한다. 이는 본질적으로 **사용자 단위** 관심사다.

현재 WS 토픽은 방 단위 `/topic/rooms/{roomId}`와 `/user/queue/errors`뿐이라,
목록은 폴링(5초, FE#125에서 임시 적용)으로 갱신 중이다. 정식 실시간을 위해 사용자 단위 토픽이 필요하다.

## 요청: 사용자 단위 방 요약 이벤트 토픽

- **목적지**: `/user/queue/rooms` (STOMP user-destination, 세션 principal 기준)
- **인증**: 기존 방 토픽과 동일한 WS 핸드셰이크 세션.

### 발행 트리거 (해당 사용자가 방 멤버인 경우)

1. 새 메시지 도착 → 해당 방 요약 이벤트
2. 안읽음 수 변경
3. 핀/알림 설정 변경
4. 새 방 생성(내가 멤버로 추가됨)
5. 방 나감/해체(내 목록에서 제거)

### 페이로드 (제안)

```jsonc
// upsert: ChatRoomSummaryResponse와 동일 스키마 재사용
{ "type": "upsert", "room": { "roomId": 12, "roomType": "direct", "meetingId": null,
  "questionId": null, "pinned": false, "notifyEnabled": true, "unreadCount": 3,
  "lastMessage": { "messageId": 987, "roomId": 12, "senderId": 45, "senderNickname": "지혜",
    "content": "안녕하세요", "imageUrl": null, "createdAt": "2026-07-15T09:12:33+09:00" } } }

// remove: 나감/해체
{ "type": "remove", "roomId": 12 }
```

### 팬아웃 트레이드오프

방 이벤트 1건당 온라인 멤버 수만큼 push(팬아웃) + 유저별 WS 연결 유지가 필요하다.
STOMP user-destination은 연결된 세션에만 전달하므로 오프라인 멤버 비용은 0(다음 REST 조회 시 반영).
완화책: 온라인만 전달(기본), 연타 coalescing, 풀 페이로드 대신 가벼운 invalidate 핑 후 클라 refetch.

## 완료 조건

- [ ] `/user/queue/rooms` 토픽 발행 (위 5개 트리거)
- [ ] 페이로드는 `ChatRoomSummaryResponse` 재사용 + `type`(`upsert`/`remove`)
- [ ] 방 멤버가 아닌 사용자에게는 발행되지 않음(권한 격리)
- [ ] 기존 `/topic/rooms/{roomId}` 메시지 스트림 유지

## 참고
- FE 소비/전환: FE#126
- 전체 설계: `docs/superpowers/specs/2026-07-15-chat-list-realtime-design.md`
