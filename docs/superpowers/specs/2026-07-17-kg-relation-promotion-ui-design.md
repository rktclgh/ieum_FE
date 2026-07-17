# KG 관계 후보 운영자 UI 설계

## 상태

- 결정일: 2026-07-17
- 브랜치: `feat/kg-promotion-approval`
- 핵심 원칙: 후보는 검색에 쓰지 않고, 운영자 승인 뒤에만 KG relation이 된다.

## 화면

`/admin/knowledge/`는 고정 정적 목록 route다. 상세는 기존 admin detail pattern처럼 `?candidateId=` query를 사용한다.

- 목록: 상태, subject/predicate/object, confidence, source, evidence excerpt, 생성 시각, 상세 이동
- 상세: 질문 제목·채택답변 excerpt·evidence·source eligibility·동일 source relation을 한 문맥에서 표시
- 승인: `subject`, `object` 수정 가능, `predicate`는 API의 allowlist select만 허용
- 반려: 선택 사유 또는 선택적 설명

기본 filter는 `pending`이며 terminal 상태도 조회할 수 있다. `approved`, `rejected`, `invalidated`에는 action을 보이지 않는다.

## API 상태 경계

```text
GET  /api/v1/admin/knowledge/relation-candidates
GET  /api/v1/admin/knowledge/relation-candidates/{candidateId}
POST /api/v1/admin/knowledge/relation-candidates/{candidateId}/approve
POST /api/v1/admin/knowledge/relation-candidates/{candidateId}/reject
```

approve/reject 요청은 `version`을 포함한다. `409`이면 성공으로 추정하지 않고 detail/list query를 invalidate·refetch해 canonical candidate를 다시 렌더한다. source가 채택 취소되어 `invalidated`가 된 경우도 같은 방식으로 안내한다.

## UX·접근성

- evidence는 HTML 주입 없이 text로만 렌더한다.
- confidence는 우선순위 보조값이며, 신뢰도 색만으로 승인 가능 여부를 표현하지 않는다.
- loading, error/retry, empty, invalid query 상태는 기존 `AdminAsyncState`와 admin detail guard를 재사용한다.
- sidebar `지식` 항목은 이 route/API가 함께 존재하는 이 브랜치에서만 추가한다.

## 제외

- 자동 승인 버튼
- relation 직접 수정/삭제 UI
- entity alias 관리
- 공개 사용자 화면 노출
