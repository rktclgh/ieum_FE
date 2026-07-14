# 채팅 말풍선 그룹화 (#78) — 설계

## 목표

연속된 **같은 발신자 + 같은 분(minute)** 메시지를 하나의 말풍선 스택으로 묶어, 이름 1회 + 말풍선 묶음 + 시각 1회로 표시한다. 현재는 메시지마다 개별 말풍선 + 이름/시각이 반복되어 Figma 디자인과 불일치한다.

- Figma: https://www.figma.com/design/FPRPYHC1ukJph6hjRiyU0Z/신한해커톤?node-id=1210-4620
- 예) `김연두`: `맛있는거?` / `떡볶이 먹을까?` / `어떡할래` → 이름 1회 + 3개 스택 + `오전 8:21` 1회

## 결정된 접근: 행 분할 (split rows)

메시지 1개 = 여전히 **독립 렌더 단위**로 유지하고, 그룹화는 **시각적 조립 + 반복 요소(이름·아바타·시각) 조건부 숨김**으로 구현한다.

대안(run 전체를 `ChatBubble` 하나로 `texts[]` 병합)은 diff는 작지만 롱프레스가 개별 메시지를 타깃하려면 줄(line)별 프레스 감지를 프리미티브에 배선해야 해 상호작용 로직이 presentation 컴포넌트로 유입된다. 행 분할은 **롱프레스 messageId 정확도를 무비용으로 보존**하고 `ChatBubble` 계열을 presentation 순수로 유지한다. (레포 clean-architecture 규칙 부합.)

Figma 확인 결과 그룹 chrome 배치:
- **others 묶음**: 이름 1회(상단, 아바타 폭만큼 들여쓰기) → 말풍선 tight 스택 → 아바타 1회 + 시각 1회(하단, `items-end`로 바닥 정렬).
- **me 묶음**: 우측 정렬 스택 → 시각 1회(하단 우측), 아바타 없음.

## 데이터 모델 변경

- `ChatBubbleMessage`에 `senderId: number` 추가. `adaptMessage`에서 `message.senderId`로 채운다. (그룹핑 키를 이름 문자열이 아닌 안정적 id로.)
- `src/lib/date/kst.ts`에 `getKstMinuteKey(input): string` 추가 — KST 기준 `"YYYY-MM-DD HH:mm"` 분 단위 키. 그룹핑 비교용.

## 그룹핑 로직 (page)

`chat-room-page-content.tsx`에서 기존 `dateGroups`(KST 일 단위) **하위에 run 레벨**을 파생한다.

```
buildRuns(messages: ChatBubbleMessage[]): Run[]
  // 연속 메시지를 (senderId 동일 && getKstMinuteKey 동일) 기준으로 묶음
  // 경계가 바뀌면 새 run 시작
Run = { runKey: string; sender: "me"|"others"; name?: string; time: string; messages: ChatBubbleMessage[] }
```

- 날짜 경계는 `dateGroups`가 이미 분리하므로 run은 하루 안에서만 형성된다(정합 보장).
- run 크기 상한 없음(반경 로직이 임의 개수 처리; Figma의 3개는 예시).
- `name`/`time`은 run의 대표값(others일 때 이름, 시각은 분 단위라 run 내 동일).

## 컴포넌트 분해 (presentation 순수)

1. **`ChatBubbleSegment`** (신규, `src/features/chat/components/`) — 단일 메시지 말풍선 div. props: `sender`, `text`, `position`("solo"|"first"|"middle"|"last"), `variant`("long"|"short" 폭). 반경 맵(`ME_RADIUS`/`OTHERS_RADIUS`)과 `bubblePosition`을 여기로 이동/공유. `ChatBubble`은 이 세그먼트를 내부적으로 재사용하거나, 최소한 반경 로직을 공유한다.
2. **`ChatMessageGroup`** (신규, `src/features/chat/components/`) — run 하나의 chrome. others: `flex items-end gap-2`로 아바타(1회, 하단 정렬) + 컬럼(이름 1회 상단 → children → 시각 1회 하단). me: 우측 정렬 컬럼(children → 시각 1회). `children`으로 세그먼트 행들을 받는다.
3. **`MessageRow`** (기존, page 내부) — 세그먼트 1개를 감싸 롱프레스 + 컨텍스트 메뉴. **messageId 타깃·메뉴 배치(top/bottom)·`activeMessageId` 플로우 그대로 유지.** 렌더 대상만 전체 `ChatBubble` → `ChatBubbleSegment`로 교체하고 이름/아바타/시각은 렌더하지 않는다(그룹이 담당).

### 렌더 트리

```
dateGroups.map(dateGroup)
  ├ ChatDateDivider
  └ buildRuns(dateGroup.messages).map(run)
       └ <ChatMessageGroup sender name time>
            └ run.messages.map((msg, i) =>
                 <MessageRow message={msg} ...menu>
                   <ChatBubbleSegment position={bubblePosition(i, run.length)} variant={msg.variant} />
                 )
```

## 스타일 세부

- 스택 내부(run) 간격 tight: 세그먼트 컬럼 `gap-1`(4px).
- run 간 간격: `ChatMessageGroup` wrapper의 `py`(기존 `ChatBubble`의 `py-2` 상당)로.
- others 세그먼트는 아바타 폭(26 + gap 8 = 34px)만큼 들여쓰기되어 이름/스택 정렬 유지(컬럼이 아바타 우측에 있으므로 자연 정렬).
- 롱프레스 메뉴 오프셋(`left-[34px]`/`right-0`)은 세그먼트 기준으로 재확인.

## 영향 없음 (회귀 방지)

- `dateGroups` / `dateGroupRefs` / 스크롤 날짜 뱃지 / `mergeMessages` / 소켓 수신·백필 로직: **변경 없음**. run은 순수 파생 렌더 계층.
- `ChatBubble`의 `reply` variant 등 다른 경로: 불변.
- `#65`(말풍선 고정폭)와 파일 겹침 주의 — 이미 develop 병합됨, 재확인.

## 상호작용

- 롱프레스 → 해당 세그먼트의 `messageId` 타깃. 신고(`messageId` + `name`) / 공지 등록(`text`) 정확도 보존.
- 그룹 내 개별 메시지 각각 롱프레스 가능(무비용, 기존 플로우 유지).

## 검증

- `pnpm build` / `pnpm lint` 클린.
- 실제 그룹 채팅방(2인 이상, 같은 분 연속 메시지)에서 육안 확인: 이름/아바타/시각 1회, 반경 first/middle/last, me/others/solo 케이스, 날짜 경계 run 분할, 롱프레스 개별 신고.

## 범위 제외

- 이미지 메시지 실제 렌더(현재 `"사진"` 텍스트 placeholder 유지).
- `reply`/꼬리질문 채팅(#76) 경로.
