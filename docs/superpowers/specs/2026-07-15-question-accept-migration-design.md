# 답변 채택 API 마이그레이션 설계 (#122)

## 배경 / 문제
FE가 BE에서 **제거된** `POST /api/v1/answers/{answerId}/accept` 를 호출한다
(`question-api.ts` `acceptAnswer`). 현재 채택 기능이 깨진 상태다.

BE는 다중 채택 계약으로 대체했다:
- `PUT /api/v1/questions/{questionId}/accepted-answers`
- 요청 `{ answerIds: [≥1] }`, 응답 `{ questionId, answerSelectionFinalized, acceptedAnswerIds[] }`

## 제품 규칙 (사용자 확정)
1. 질문당 **단일 채택, 1회만** (재채택·취소 없음)
2. 채택 완료 = **추가 답변 차단**
3. 채택된 질문은 **지도에 미표출**(핀 숨김)

## 핵심 발견 — 규칙은 이미 BE가 강제함
`../ieum_BE` 소스 확인:
- `AnswerService.finalizeSelection` — 이미 `isResolved`면 재채택 시 `ANSWER_SELECTION_FINALIZED`(409). 채택 성공 시 `question.markResolved()`로 `isResolved=true`.
- 답변 등록 — `if (question.isResolved()) throw AnswerSelectionFinalizedException`.
- `PinRepository` — 핀 조회 2곳 모두 `LEFT JOIN questions q ON ... AND q.is_resolved = false` → resolved 질문 핀 자동 제외.

→ **FE는 새 잠금/필터 로직을 만들지 않는다.** 엔드포인트 교체 + 상태 동기화 + graceful 에러 처리만 한다.
`isResolved` 하나로 모든 상태가 흐르므로 FE에 `answerSelectionFinalized` 필드는 추가하지 않는다.

## FE 변경 범위

1. **API** (`features/question/api/question-api.ts`)
   `acceptAnswer(answerId)` → `finalizeAcceptedAnswers(questionId, answerIds)` :
   `PUT /questions/{questionId}/accepted-answers` 에 `{ answerIds }`. 단일 채택이므로 호출부는 `[answerId]` 전달.

2. **타입** (`question-types.ts`)
   `FinalizeAcceptedAnswersResponse { questionId, answerSelectionFinalized, acceptedAnswerIds[] }` 추가.

3. **뮤테이션 훅** (`use-question-mutations.ts`)
   `useAcceptAnswer(questionId)` 가 `finalizeAcceptedAnswers(questionId, [answerId])` 호출.
   onSuccess: `questionKeys.detail` + `questionKeys.myList` + **`["pins"]`** 무효화(핀은 BE가 제외하므로 refetch만으로 사라짐).

4. **입력창 가드** (`question-detail-screen.tsx`)
   답변 입력창 노출 조건에 `!question.isResolved` 추가. race(채택 전 열어둠)로 전송돼도 BE가 409 반환 → 아래 에러 매핑으로 안내.

5. **작성자 답변 아이템 채택 버튼 게이트** (`question-answer-author-item.tsx`)
   `canAccept: boolean` prop 추가. 미채택·비본인 답변은 `canAccept`일 때만 채택 버튼 노출(resolved면 버튼 없음).
   호출부: 리스트는 `canAccept={!question.isResolved}`, 오버레이 프리뷰는 `canAccept={false}`.

6. **i18n** (7개 로케일)
   `question.errors.QUESTION_ALREADY_RESOLVED`(BE에 없는 코드) → 실제 BE 코드 **`ANSWER_SELECTION_FINALIZED`** 로 리네임. 메시지 "이미 채택된 질문이에요." 유지. 하드코딩 한국어 없음.

## 안 하는 것 (YAGNI)
- 지도 핀 숨김 FE 로직(BE 담당) · 답변 차단 FE 로직(BE 담당) · un-accept · 다중채택 UI · `answerSelectionFinalized` FE 필드.

## 검증
- `pnpm build` 클린.
- 수동: 작성자가 답변 채택 → resolved 뱃지·"채팅 시작" 노출, 다른 답변 채택 버튼 사라짐, 지도 재진입 시 핀 사라짐, 비작성자 입력창 미노출.
