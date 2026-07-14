# 홈 검색 오버레이 & 지도 핀 리스트 뷰 설계

- 작성일: 2026-07-14
- 이슈: [rktclgh/ieum_FE#75](https://github.com/rktclgh/ieum_FE/issues/75)
- 브랜치: `feat/#75`
- 대상 화면 (Figma, node-id): 검색 전체 `1677-8074` / 검색 모임 `1681-8722` / 검색 장소 `1716-12574` / 리스트 `1666-7875` / 리스트+상세 `1610-7683`
- 파일: `FPRPYHC1ukJph6hjRiyU0Z`

## 배경 / 목표

홈 지도에 두 진입점을 추가한다.

1. **검색 오버레이** — 홈 검색바를 focus하면 풀스크린 검색 결과 화면이 열린다. 전체/모임/질문/장소 탭으로 결과를 보여주며, 검색어를 제목에서 하이라이트한다.
2. **리스트 뷰** — 지도 우측 하단 리스트 버튼을 누르면, 지금 지도에 보이는(바운즈) 모임·질문 핀을 리스트로 정리해 보여준다. 카드를 탭하면 상세 시트가 뜬다.

## 결정된 제약 / 데이터 소스

전체 API 연동을 원칙으로 하되, 백엔드 현황상 다음과 같이 처리한다 (BE는 이슈 파일만 가능, 브랜치 푸시 불가):

| 필요 | 백엔드 | 처리 |
|---|---|---|
| 장소 검색 | `GET /api/places/search?query=&lat=&lng=` | 실연동 (`usePlaceSearch` 재사용) |
| 모임/질문 키워드 검색 | ❌ 엔드포인트 없음 | `GET /api/v1/pins/list`로 **전체 핀**을 받아 **제목 기준 클라이언트 텍스트 매칭**(`hangulIncludes`) |
| 리스트/검색 카드의 참여인원·설명·날짜 | ❌ `PinItem`에 없음 | 매칭/표시되는 **핀마다 상세 fetch**(`GET /meetings/{id}` · `GET /questions/{id}`), React Query 캐시 |
| 상세 시트 | `GET /meetings/{id}` · `GET /questions/{id}` | 기존 상세 컨테이너 재사용 |
| 질문 카드의 time-ago·국적 | ❌ `AuthorSummary.nationality` / `createdAt` 없음 | **이슈 #73에서 이미 추적 중.** FE는 필드만 준비, 값 도착 전엔 해당 줄 숨김. 새 BE 이슈 발행 안 함 |

`PinItem = { pinId, pinType('meeting'|'question'), targetId, title, thumbnailUrl, location, mine, createdAt }` — 텍스트 매칭은 `title`만 가능하다.

## 아키텍처

map 피처 내부의 **상태 기반 풀스크린 오버레이**(create-meetup-screen과 동일 패턴). `HomeMapScreen`이 오버레이 open 상태를 소유한다. 라우트 분리·별도 피처 분리는 하지 않는다.

### 파일 (모두 kebab-case)

```
src/features/map/
├─ api/
│  └─ pin-list-api.ts          # GET /api/v1/pins/list (커서 페이지, PinItem→MapPin) [신규]
├─ hooks/
│  ├─ use-pin-list.ts          # 전체 핀 페이지 순회 로드(상한+잘림 로깅) [신규]
│  ├─ use-pin-detail.ts        # 핀 targetId→모임/질문 상세, id 키 캐시 [신규]
│  └─ use-search-results.ts    # query→{meetups,questions,places} 조합 [신규]
├─ components/
│  ├─ home-map-screen.tsx      # isSearchOpen/isListOpen 배선 [수정]
│  ├─ map-controls.tsx         # 리스트 Circle에 onListView [수정]
│  ├─ map-search-bar.tsx       # onFocus 상위 전달 + 인라인 장소 드롭다운 제거 [수정]
│  ├─ search-overlay.tsx       # 화면 A (디자인 1·2·3) [신규]
│  ├─ pin-list-overlay.tsx     # 화면 B (디자인 4·5) [신규]
│  ├─ search-tab-bar.tsx       # 전체/모임/질문/장소 (4탭) [신규]
│  ├─ meetup-result-card.tsx   # 썸네일+제목+설명+날짜•인원 (공용) [신규]
│  ├─ question-result-card.tsx # 썸네일+제목+설명+(time-ago•국적 보류) (공용) [신규]
│  └─ place-result-row.tsx     # 핀아이콘+장소명+주소 (검색 전용) [신규]
```

## 화면 A — 검색 오버레이 (디자인 1·2·3)

- **트리거**: 홈 `MapSearchBar` focus → `search-overlay.tsx` 풀스크린. 자체 검색 입력(뒤로 `<` + 입력 + `X`) 자동 포커스, 홈 입력 텍스트 이어받음.
- **인라인 장소 드롭다운 제거**: `MapSearchBar`의 기존 인라인 place 드롭다운을 없애고, 오버레이 장소 탭이 대체(장소 탭 결과 탭 시 지도 해당 좌표 포커스, `onSelectPlace` 재사용).
- **탭**(`search-tab-bar`, 4탭):
  - **전체**: `모임`/`질문`/`장소` 섹션 헤더 + 타입별 상위 N개(상수, 예 3~5 — 상세 fetch 부담 제한).
  - **모임/질문/장소**: 해당 타입 평면 리스트.
- **데이터**: `useSearchResults(query)` = `usePinList()` 제목 필터(타입 분리) + `usePlaceSearch(query)`. 카드별 상세 fetch는 렌더된 카드에서 지연 수행. 제목 매칭 텍스트는 `HighlightedText` 파란 하이라이트.
- **탭 동작**: 모임/질문 카드→`selectedMeetingId`/`selectedQuestionId`→기존 상세 컨테이너. 장소 행→오버레이 닫고 지도 포커스.
- **상태**: 빈 쿼리→결과 없음. 로딩→스켈레톤. 무결과→탭별 빈 상태.

## 화면 B — 리스트 뷰 (디자인 4·5)

- **트리거**: 지도 우측 하단 리스트 `Circle`([map-controls.tsx:34]) `onListView` 배선 → `pin-list-overlay.tsx` 풀스크린.
- **헤더**: 가운데 "리스트" + 우측 `X` 닫기.
- **인리스트 검색**: 현재 리스트를 제목 기준 클라이언트 필터(`hangulIncludes`). 장소 탭 없음.
- **탭**: 전체/모임/질문 → 기존 `CategoryChipGroup` 재사용(오버레이 로컬 상태, 지도 카테고리와 독립).
- **데이터**: 바운즈 핀 = `useMapPins(bounds)`(전체 타입), 오버레이 탭+텍스트로 필터. 핀마다 `usePinDetail`로 카드 채움(핀 수는 `truncated` 상한).
- **카드→상세 시트**: `selectedMeetingId`/`selectedQuestionId`→기존 `MeetupDetailContainer`/`QuestionDetailContainer`(리스트 위 시트, `참여하기` CTA). 지도 핀 탭과 동일 경로.
- **FAB**: 기존 `MapFab` 재사용(모임/질문 생성).
- **상태**: 로딩→스켈레톤, 빈 목록→빈 상태, `X`→닫기.

## 공용 컴포넌트 계약

- `meetup-result-card` `{ pin: MapPin, query?: string, onClick(): void }` — `usePinDetail(targetId,'meeting')`로 `MeetupDetailView` → 썸네일 + `HighlightedText(title,query)` + 설명 + `dateLabel • 현재 N명`. 로딩=스켈레톤, 상세 실패=최소 필드 폴백.
- `question-result-card` `{ pin, query?, onClick }` — `usePinDetail(targetId,'question')` → 제목 + 본문. time-ago·국적 줄은 #73 전까지 숨김.
- `place-result-row` `{ place: Place, query?, onClick }` — 핀 아이콘 + `HighlightedText(name)` + 주소.
- `search-tab-bar` `{ value: 'all'|'meetup'|'question'|'place', onChange }`.

## 데이터 훅 계약

- `fetchPinList({ type?, cursor?, size })` → `{ items: PinItem[], nextCursor }`; `PinItem→MapPin` 어댑트(기존 pin-api 규칙).
- `usePinList()` → `{ pins: MapPin[], isLoading }`. 페이지 순회로 전체 로드, **상한 도달 시 잘린 개수 `log`(무음 절단 금지)**.
- `usePinDetail(targetId, pinType)` → 뷰모델 + 로딩. meeting=`getMeeting`+`adaptMeetingDetail`, question=`getQuestion`. **id 키 캐시(지도 핀 탭과 공유)**. 실패 폴백.
- `useSearchResults(query)` → `{ meetups: MapPin[], questions: MapPin[], places: Place[], isLoading }`. 제목 필터 + place 검색만(카드 상세는 카드에서).

## HomeMapScreen 배선

`isSearchOpen`/`isListOpen` 상태 추가. `MapSearchBar onFocus`→검색 오버레이(+인라인 드롭다운 제거). `MapControls onListView`→리스트 오버레이. 두 오버레이 조건부 렌더. 상세 컨테이너는 기존대로 `selectedMeetingId/QuestionId`로 오버레이 위에 렌더.

## i18n

`home`(필요 시 신규 `search`) 섹션에 키 추가 후 **7개 카탈로그(ko/en/ja/zh/vi/th/ru) 전부 반영**. 탭 라벨은 기존 `categoryMeetup/categoryQuestion` 재사용 + `categoryAll/categoryPlace` 추가. 섹션 헤더·placeholder·빈/로딩 상태·"리스트" 제목 등. **하드코딩 한국어 없음.**

## 엣지 케이스

- 검색 입력에 **IME(isComposing) 가드 없음** — 매 키스트로크 필터.
- `pins/list` 페이지 상한 → 잘린 개수 로깅.
- 카드 상세 fetch 실패 → 최소 필드 렌더, 크래시 없음.
- 이미지 크기 가드 재사용(#72 관행).
- 검색 오버레이/리스트 오버레이 위에 상세 시트가 z-order로 정상 노출.

## 검증

- 순수 로직 유닛 테스트(테스트 인프라 있으면): 제목 필터·타입 분리(`use-search-results`), `pin-list` 어댑터.
- `pnpm build` 클린(푸시 전 필수).
- Figma 5개 시안 대조 수동 확인.

## 범위 밖 / 후속

- 모임·질문 **서버측 키워드 검색 엔드포인트**(현재는 클라이언트 매칭으로 대체).
- 질문 작성자 국기·작성시각(**BE 이슈 #73**).
- 검색 최근기록·추천어(백엔드 없음).
