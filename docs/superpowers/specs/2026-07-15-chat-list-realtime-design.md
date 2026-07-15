# 채팅·친구 상태 변경 실시간 반영 설계 (FE#125)

작성일: 2026-07-15
관련 이슈: FE#125(3버그 묶음), FE#126(C 전환), BE 사용자 단위 토픽 rktclgh/ieum_BE#103

새로고침해야만 반영되던 상태 변경 버그 3건을 한 브랜치(`fix/#125`)에서 처리한다.

---

## 버그 1. 채팅 목록이 실시간으로 안 바뀜 (확정 FE 버그)

### 근본 원인 (코드 확인 완료)

- 목록 화면([chat-list-page-content.tsx](../../../src/features/chat/components/chat-list-page-content.tsx))의
  데이터 소스는 `useChatRoomsView()`(React Query `getRooms`) 하나뿐이다.
- 이 화면에는 STOMP/WebSocket 구독이 **전혀 없다**. `useChatRoomSocket`은 채팅 **방**에서만 호출된다.
- 목록에 머무는 동안 방 요약을 갱신할 트리거가 없고, 전역 `staleTime: 60s`라 재마운트해도 재요청 안 함.

### 해결: A(폴링)

`useChatRoomsView`의 `roomsQuery`에만 옵션 추가.

```ts
const ROOMS_POLL_INTERVAL_MS = 5000

const roomsQuery = useQuery({
  queryKey: chatKeys.rooms(type),
  queryFn: () => getRooms(type),
  enabled: session.authenticated,
  refetchInterval: ROOMS_POLL_INTERVAL_MS,
  refetchOnWindowFocus: "always",
})
```

- 요약(unread·lastMessage·정렬)은 전부 `getRooms`에서 나오므로 이 쿼리만 폴링하면 충분.
- 방 상세(제목/아바타)는 `staleTime 60s` 유지 → 폴링이 N+1 상세 재조회를 유발하지 않음.
- `enabled`(인증)일 때만 폴링. 백그라운드 탭은 일시정지, 복귀 시 `"always"`로 즉시 최신화.

### 정식 실시간(C)은 별도

"진짜 실시간"의 올바른 아키텍처는 사용자 단위 서버 push 토픽(C, BE#103)이다.
방별 토픽 팬아웃(B)은 확장성·스테일 갭·연결 중복·페이로드 불일치로 스톱갭이라 채택 안 함.
C는 BE 의존이라 지금은 폴링으로 두고, 토픽 착지 시 구독으로 교체한다(FE#126).

**팬아웃 트레이드오프(기록):** C는 방 이벤트마다 온라인 멤버 수만큼 push(팬아웃) + 유저별 WS 연결 유지가 필요하다.
폴링은 이를 통째로 회피(pull, stateless GET)하는 대신 5초 baseline 요청을 낸다. 해커톤 규모엔 폴링으로 충분.

---

## 버그 2. 채팅 방에서 내가 보낸 말풍선이 안 뜸 (낙관적 반영 없음)

### 원인

[chat-room-page-content.tsx](../../../src/features/chat/components/chat-room-page-content.tsx)의
`handleSend`가 STOMP `send()`만 호출하고 `liveMessages`에 즉시 추가하지 않는다 →
내 말풍선은 서버가 `/topic/rooms/{id}`로 되돌려주는 에코를 받아야만 표시된다.
소켓이 느리거나 끊기면 새로고침 전까지 안 보인다.

### 해결: 낙관적 append + 에코 dedup

- 전송 시 임시 메시지를 즉시 `liveMessages`에 추가(임시 `messageId`).
- 서버 에코 도착 시 기존 `mergeMessages`가 `messageId`로 dedup — 단, 낙관적 항목은 서버 `messageId`와
  다르므로 낙관 항목을 식별해 서버 에코로 대체한다. `clientNonce`(전송 시 생성) 기준으로 매칭.
- 전송 실패(소켓 미연결) 시 `send()`가 false 반환 → 낙관 추가하지 않음(또는 실패 표시).

> 주의: 서버 `WsMessageEvent`에 `clientNonce`가 없으면 에코를 nonce로 매칭할 수 없다.
> 그 경우 fallback: (senderId==나) && content 동일 && 근접 시각으로 낙관 항목을 서버 항목으로 대체.

---

## 버그 3. 친구 수락 후 목록 반영 안 됨 (한 계층 아래)

### 현황

FE 캐시 배선은 정상: 수락 성공 시 `["friends"]` invalidate → 활성 쿼리 재요청,
목록은 query 데이터를 직접 읽음. 그럼에도 반영이 안 되면 원인은
(a) POST 실패 무음 (b) 백엔드 read-after-write 지연 (c) HTTP 캐시 중 하나다.

### 해결: 원인 무관 견고한 낙관적 업데이트

- 수락 `onMutate`: 받은요청 캐시(`friendKeys.requests("received")`)에서 해당 유저 제거 +
  친구 목록 캐시(`friendKeys.list()`)에 삽입. 이전 스냅샷 저장.
- `onError`: 스냅샷으로 롤백 + 에러 토스트.
- `onSettled`: 기존 invalidate로 서버 정합성 재조회.

이로써 백엔드 타이밍/캐시 이슈와 무관하게 즉시 UI가 반영되고, 실제 실패 시 되돌아간다.

---

## 검증

- 채팅 목록: 두 계정으로 메시지 전송, 상대는 목록 유지 → 5초 내 갱신 + 탭 복귀 즉시 갱신.
- 채팅 방: 전송 즉시 내 말풍선 표시, 에코 후 중복 없음.
- 친구 수락: 수락 즉시 요청→친구 이동, (강제 실패 시) 롤백.
- `pnpm build` 클린.

## 범위 밖
- 채팅 목록 pin/mute/leave onError 부재 → 별도 개선(이번 범위 아님).
- B(방별 목록 구독) 미채택.
