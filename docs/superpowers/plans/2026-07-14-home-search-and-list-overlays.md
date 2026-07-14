# 홈 검색 오버레이 & 지도 핀 리스트 뷰 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈 지도에 (A) 검색바 focus 시 열리는 풀스크린 검색 오버레이(전체/모임/질문/장소 4탭)와 (B) 리스트 버튼으로 열리는 바운즈 핀 리스트 뷰(전체/모임/질문 3탭, 탭 시 상세 시트)를 추가한다.

**Architecture:** map 피처 내부의 상태 기반 풀스크린 오버레이(create-meetup-screen 패턴). `HomeMapScreen`이 `isSearchOpen`/`isListOpen`을 소유. 모임/질문 검색은 `/api/v1/pins/list`로 전체 핀을 받아 제목 기준 `hangulIncludes` 클라이언트 매칭, 카드의 참여인원·설명은 기존 `useMeeting`/`useQuestionSummary` 훅으로 핀별 상세 fetch(React Query 캐시 공유), 장소는 `usePlaceSearch`. 카드/상세 컨테이너/FAB는 기존 컴포넌트 재사용.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, TanStack Query v5, Tailwind v4, es-hangul, base-ui.

## Global Constraints

- 이슈: `rktclgh/ieum_FE#75`, 브랜치: `feat/#75`.
- 모든 파일/폴더 이름은 **lowercase kebab-case**.
- **하드코딩 한국어 금지** — 모든 UI 문자열은 `src/lib/i18n/messages/{ko,en,ja,zh,vi,th,ru}.ts` 7개 카탈로그에 추가. `type Messages`(ko.ts)가 소스 오브 트루스라 키를 추가하면 7개 로케일 모두 채워야 `pnpm build`가 통과한다.
- **검색 입력에 IME(isComposing) 가드 금지** — 매 키스트로크 필터.
- 조회 API는 `apiClient`(`/api/v1/*`)를 쓰고, 좌표 없는 핀은 매핑에서 제외한다.
- **테스트 러너 없음**: 이 저장소엔 vitest/jest가 없다(스크립트는 `dev`/`build`/`start`/`lint`뿐). 각 태스크의 검증은 **`pnpm build`(타입체크+컴파일)** 와 **`pnpm lint`** 로 하고, 마지막 태스크에서 Figma 5개 시안과 런타임 수동 대조한다. 새 테스트 프레임워크를 도입하지 않는다(YAGNI).
- 커밋 메시지에 `Co-Authored-By` 트레일러 금지. 커밋 접두사는 저장소 관례(`feat:`/`fix:`)를 따르고 이슈 번호를 붙인다(예: `feat: #75 ...`).
- 푸시 전 `pnpm build` 클린 필수.

## 파일 구조

```
src/features/map/
├─ api/
│  ├─ pin-api.ts               # adaptPin export 추가 [수정]
│  └─ pin-list-api.ts          # GET /api/v1/pins/list [신규]
├─ hooks/
│  ├─ use-pin-list.ts          # 전체 핀 페이지 순회 로드(상한+로깅) [신규]
│  └─ use-search-results.ts    # query→{meetups,questions,places} [신규]
├─ components/
│  ├─ meetup-result-card.tsx   # 공용 모임 카드 [신규]
│  ├─ question-result-card.tsx # 공용 질문 카드 [신규]
│  ├─ place-result-row.tsx     # 장소 행(검색 전용) [신규]
│  ├─ search-tab-bar.tsx       # 전체/모임/질문/장소 4탭 [신규]
│  ├─ search-overlay.tsx       # 화면 A [신규]
│  ├─ pin-list-overlay.tsx     # 화면 B [신규]
│  ├─ map-search-bar.tsx       # onFocus 트리거 + 인라인 드롭다운 제거 [수정]
│  ├─ map-controls.tsx         # 리스트 Circle에 onListView [수정]
│  └─ home-map-screen.tsx      # 오버레이 2개 배선 [수정]
src/lib/i18n/messages/
├─ ko.ts                       # Messages.home 인터페이스 + ko 값 [수정]
└─ {en,ja,zh,vi,th,ru}.ts      # home 값 [수정]
```

재사용(수정 없음): `useMeeting`+`adaptMeetingDetail`, `useQuestionSummary`, `usePlaceSearch`, `useMapPins`, `MeetupDetailContainer`, `QuestionDetailContainer`, `MapFab`, `CategoryChipGroup`, `SearchBox`, `Chip`, `AppBar`, `HighlightedText`, `hangulIncludes`, `resolveFileUrl`.

---

## Task 1: i18n 키 추가 (home 섹션)

**Files:**
- Modify: `src/lib/i18n/messages/ko.ts` (interface `Messages.home` + `ko` 값)
- Modify: `src/lib/i18n/messages/en.ts`, `ja.ts`, `zh.ts`, `vi.ts`, `th.ts`, `ru.ts` (각 `home` 값)

**Interfaces:**
- Produces: `messages.home.categoryPlace: string`, `messages.home.listTitle: string`, `messages.home.listParticipantCount: (count: number) => string`, `messages.home.searchEmpty: string`, `messages.home.listEmpty: string`.

- [ ] **Step 1: 인터페이스에 키 5개 추가**

`src/lib/i18n/messages/ko.ts`의 `type Messages`(또는 `interface Messages`) 안 `home: { ... }` 블록에서 `pinsTruncatedNotice: string` 다음 줄에 추가:

```ts
    pinsTruncatedNotice: string
    categoryPlace: string
    listTitle: string
    listParticipantCount: (count: number) => string
    searchEmpty: string
    listEmpty: string
```

- [ ] **Step 2: ko 값 추가**

`ko.ts`의 `home:` 값 객체에서 `pinsTruncatedNotice: "..."` 다음에 추가:

```ts
    pinsTruncatedNotice: "이 지역에 핀이 많아요. 확대해서 보세요",
    categoryPlace: "장소",
    listTitle: "리스트",
    listParticipantCount: (count) => `현재 ${count}명`,
    searchEmpty: "검색 결과가 없습니다",
    listEmpty: "이 지역에 표시할 항목이 없습니다",
```

- [ ] **Step 3: 나머지 6개 로케일 값 추가**

각 파일의 `home:` 객체 끝(마지막 키 뒤)에 아래 5줄을 추가한다. `listParticipantCount`는 함수다.

`en.ts`:
```ts
    categoryPlace: "Place",
    listTitle: "List",
    listParticipantCount: (count) => `${count} joined`,
    searchEmpty: "No results found",
    listEmpty: "Nothing to show in this area",
```
`ja.ts`:
```ts
    categoryPlace: "場所",
    listTitle: "リスト",
    listParticipantCount: (count) => `現在${count}人`,
    searchEmpty: "検索結果がありません",
    listEmpty: "このエリアに表示する項目がありません",
```
`zh.ts`:
```ts
    categoryPlace: "地点",
    listTitle: "列表",
    listParticipantCount: (count) => `当前${count}人`,
    searchEmpty: "没有搜索结果",
    listEmpty: "该区域没有可显示的内容",
```
`vi.ts`:
```ts
    categoryPlace: "Địa điểm",
    listTitle: "Danh sách",
    listParticipantCount: (count) => `${count} người`,
    searchEmpty: "Không tìm thấy kết quả",
    listEmpty: "Không có mục nào trong khu vực này",
```
`th.ts`:
```ts
    categoryPlace: "สถานที่",
    listTitle: "รายการ",
    listParticipantCount: (count) => `${count} คน`,
    searchEmpty: "ไม่พบผลลัพธ์",
    listEmpty: "ไม่มีรายการในพื้นที่นี้",
```
`ru.ts`:
```ts
    categoryPlace: "Место",
    listTitle: "Список",
    listParticipantCount: (count) => `${count} чел.`,
    searchEmpty: "Ничего не найдено",
    listEmpty: "Здесь пока ничего нет",
```

- [ ] **Step 4: 빌드로 7개 로케일 완전성 검증**

Run: `pnpm build`
Expected: 성공. (한 로케일이라도 키가 빠지면 `Type ... is missing the following properties` 에러로 실패 → 누락 로케일 보완.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n/messages
git commit -m "feat: #75 검색/리스트 오버레이 i18n 키 추가 (7개 로케일)"
```

---

## Task 2: 핀 리스트 API (`/api/v1/pins/list`)

**Files:**
- Modify: `src/features/map/api/pin-api.ts` (`adaptPin` export)
- Create: `src/features/map/api/pin-list-api.ts`

**Interfaces:**
- Consumes: `adaptPin(raw: RawMapPin): MapPin`, `MapPin`, `PinType`, `RawMapPin` (`pin-types.ts`).
- Produces: `getPinList(params: PinListParams): Promise<PinListPage>`; `PinListParams = { type?: PinType; cursor?: string | null; size?: number }`; `PinListPage = { pins: MapPin[]; nextCursor: string | null }`.

- [ ] **Step 1: `adaptPin`을 export 한다**

`src/features/map/api/pin-api.ts` 마지막 export 줄을 수정:

```ts
export { getMapPins, adaptPin }
export type { GetMapPinsParams }
```

- [ ] **Step 2: `pin-list-api.ts` 작성**

`src/features/map/api/pin-list-api.ts`:

```ts
import { apiClient } from "@/lib/api/client"

import { adaptPin } from "@/features/map/api/pin-api"
import type { MapPin, PinType, RawMapPin } from "@/features/map/api/pin-types"

interface PinListParams {
  type?: PinType
  cursor?: string | null
  size?: number
}

// BE §7 원본 페이지: items(RawMapPin·latitude/longitude) + nextCursor.
interface RawPinListPage {
  items: RawMapPin[]
  nextCursor: string | null
}

interface PinListPage {
  pins: MapPin[]
  nextCursor: string | null
}

// 전체 핀 목록(커서 페이지). 지도 바운즈와 무관 — 검색 오버레이의 제목 매칭 대상.
// 조회 전용이라 CSRF 불필요. 좌표 없는 핀은 (0,0) 유령 핀 방지 위해 제외한다.
async function getPinList({ type, cursor, size = 50 }: PinListParams): Promise<PinListPage> {
  const { data } = await apiClient.get<RawPinListPage>("/api/v1/pins/list", {
    params: {
      ...(type ? { type } : {}),
      ...(cursor ? { cursor } : {}),
      size,
    },
  })
  return {
    pins: (data?.items ?? []).filter((item) => item.location).map(adaptPin),
    nextCursor: data?.nextCursor ?? null,
  }
}

export { getPinList }
export type { PinListParams, PinListPage }
```

- [ ] **Step 3: 빌드 검증**

Run: `pnpm build`
Expected: 성공.

- [ ] **Step 4: Commit**

```bash
git add src/features/map/api/pin-api.ts src/features/map/api/pin-list-api.ts
git commit -m "feat: #75 GET /api/v1/pins/list 클라이언트 추가"
```

---

## Task 3: `usePinList` 훅 (전체 핀 로드)

**Files:**
- Create: `src/features/map/hooks/use-pin-list.ts`

**Interfaces:**
- Consumes: `getPinList` (Task 2), `MapPin`.
- Produces: `usePinList(enabled?: boolean): UseQueryResult<MapPin[]>` — `data: MapPin[]` 전체 핀(상한까지).

- [ ] **Step 1: 훅 작성**

`src/features/map/hooks/use-pin-list.ts`:

```ts
"use client"

import { useQuery } from "@tanstack/react-query"

import { getPinList } from "@/features/map/api/pin-list-api"
import type { MapPin } from "@/features/map/api/pin-types"

const PAGE_SIZE = 50
// 최대 20페이지(1000핀)까지만 로드한다. 초과분은 검색 대상에서 빠지므로,
// 무음 절단을 막기 위해 상한 도달 시 콘솔 경고를 남긴다.
const MAX_PAGES = 20

async function loadAllPins(): Promise<MapPin[]> {
  const all: MapPin[] = []
  let cursor: string | null = null
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { pins, nextCursor } = await getPinList({ cursor, size: PAGE_SIZE })
    all.push(...pins)
    if (!nextCursor) return all
    cursor = nextCursor
  }
  console.warn(
    `[use-pin-list] 핀이 상한(${MAX_PAGES * PAGE_SIZE}개)에 도달해 이후 핀은 검색에서 제외됩니다.`
  )
  return all
}

// 검색 오버레이 전용. enabled=false(쿼리 없음)면 불필요한 전체 로드를 피한다.
function usePinList(enabled = true) {
  return useQuery({
    queryKey: ["pins", "list", "all"],
    queryFn: loadAllPins,
    enabled,
    staleTime: 60_000,
  })
}

export { usePinList }
```

- [ ] **Step 2: 빌드 검증**

Run: `pnpm build`
Expected: 성공.

- [ ] **Step 3: Commit**

```bash
git add src/features/map/hooks/use-pin-list.ts
git commit -m "feat: #75 usePinList 전체 핀 로드 훅"
```

---

## Task 4: 공용 카드/행 컴포넌트 3종

**Files:**
- Create: `src/features/map/components/meetup-result-card.tsx`
- Create: `src/features/map/components/question-result-card.tsx`
- Create: `src/features/map/components/place-result-row.tsx`

**Interfaces:**
- Consumes: `MapPin` (`pin-types.ts`), `Place` (`place-search-api.ts`), `useMeeting`+`adaptMeetingDetail`, `useQuestionSummary`, `HighlightedText`, `resolveFileUrl`, `messages.home.listParticipantCount`.
- Produces:
  - `MeetupResultCard({ pin: MapPin; query?: string; onClick: () => void })`
  - `QuestionResultCard({ pin: MapPin; query?: string; onClick: () => void })`
  - `PlaceResultRow({ place: Place; query?: string; onClick: () => void })`

- [ ] **Step 1: `meetup-result-card.tsx` 작성**

```tsx
"use client"

import Image from "next/image"

import { HighlightedText } from "@/components/ui/highlighted-text"
import type { MapPin } from "@/features/map/api/pin-types"
import { useMeeting } from "@/features/meetup/hooks/use-meetup-queries"
import { adaptMeetingDetail } from "@/features/meetup/lib/meetup-adapter"
import { resolveFileUrl } from "@/lib/api/file-url"
import { useTranslation } from "@/lib/i18n/use-translation"

interface MeetupResultCardProps {
  pin: MapPin
  query?: string
  onClick: () => void
}

// 핀(title/thumbnail)만으로 즉시 렌더하고, 참여인원·설명·일시는 상세 fetch로 채운다.
// useMeeting 은 지도 핀 탭과 queryKey 를 공유하므로 캐시 히트가 잦다. 실패해도 제목·썸네일은 유지된다.
function MeetupResultCard({ pin, query, onClick }: MeetupResultCardProps) {
  const { messages, language } = useTranslation()
  const { data } = useMeeting(pin.targetId)
  const detail = data ? adaptMeetingDetail(data, language) : null
  const thumbnail = resolveFileUrl(pin.thumbnailUrl)

  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 py-2 text-left">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
        {thumbnail ? <Image src={thumbnail} alt="" fill sizes="64px" className="object-cover" /> : null}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-body-semibold-15 text-gray-900">
          <HighlightedText text={pin.title} query={query} />
        </p>
        {detail?.description ? (
          <p className="truncate text-body-regular-13 text-gray-500">{detail.description}</p>
        ) : null}
        {detail ? (
          <p className="truncate text-body-regular-12 text-gray-400">
            {detail.dateLabel ? `${detail.dateLabel} · ` : ""}
            {messages.home.listParticipantCount(detail.participantCount)}
          </p>
        ) : null}
      </div>
    </button>
  )
}

export { MeetupResultCard }
```

- [ ] **Step 2: `question-result-card.tsx` 작성**

```tsx
"use client"

import Image from "next/image"

import { HighlightedText } from "@/components/ui/highlighted-text"
import type { MapPin } from "@/features/map/api/pin-types"
import { useQuestionSummary } from "@/features/question/hooks/use-question-queries"
import { resolveFileUrl } from "@/lib/api/file-url"

interface QuestionResultCardProps {
  pin: MapPin
  query?: string
  onClick: () => void
}

// 제목 + 본문(body)만 노출한다. "N분 전 · 국적" 메타 줄은 BE(#73)에 nationality/createdAt 이
// 생기기 전까지 데이터가 없어 생략한다. useQuestionSummary 는 상세 시트와 queryKey 를 공유한다.
function QuestionResultCard({ pin, query, onClick }: QuestionResultCardProps) {
  const { data: summary } = useQuestionSummary(pin.targetId)
  const thumbnail = resolveFileUrl(pin.thumbnailUrl)

  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 py-2 text-left">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
        {thumbnail ? <Image src={thumbnail} alt="" fill sizes="64px" className="object-cover" /> : null}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-body-semibold-15 text-gray-900">
          <HighlightedText text={pin.title} query={query} />
        </p>
        {summary?.body ? (
          <p className="truncate text-body-regular-13 text-gray-500">{summary.body}</p>
        ) : null}
      </div>
    </button>
  )
}

export { QuestionResultCard }
```

- [ ] **Step 3: `place-result-row.tsx` 작성**

```tsx
"use client"

import Image from "next/image"

import { HighlightedText } from "@/components/ui/highlighted-text"
import type { Place } from "@/features/map/api/place-search-api"

interface PlaceResultRowProps {
  place: Place
  query?: string
  onClick: () => void
}

function PlaceResultRow({ place, query, onClick }: PlaceResultRowProps) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 py-2.5 text-left">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-100">
        <Image src="/icons/schedule/map-pin.svg" alt="" width={18} height={18} className="size-[18px]" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-body-semibold-15 text-gray-900">
          <HighlightedText text={place.name} query={query} />
        </p>
        <p className="truncate text-body-regular-13 text-gray-500">{place.address}</p>
      </div>
    </button>
  )
}

export { PlaceResultRow }
```

- [ ] **Step 4: 빌드 검증**

Run: `pnpm build`
Expected: 성공.

- [ ] **Step 5: Commit**

```bash
git add src/features/map/components/meetup-result-card.tsx src/features/map/components/question-result-card.tsx src/features/map/components/place-result-row.tsx
git commit -m "feat: #75 검색/리스트 공용 카드 3종(모임·질문·장소)"
```

---

## Task 5: 검색 탭바 (4탭)

**Files:**
- Create: `src/features/map/components/search-tab-bar.tsx`

**Interfaces:**
- Consumes: `Chip`, `messages.home.{categoryAll,categoryMeetup,categoryQuestion,categoryPlace}`.
- Produces: `SearchTabBar({ value: SearchTab; onChange: (tab: SearchTab) => void })`; `type SearchTab = "all" | "meetup" | "question" | "place"`.

- [ ] **Step 1: 작성**

```tsx
"use client"

import { Chip } from "@/components/ui/chip"
import { useTranslation } from "@/lib/i18n/use-translation"

const SEARCH_TABS = ["all", "meetup", "question", "place"] as const
type SearchTab = (typeof SEARCH_TABS)[number]

interface SearchTabBarProps {
  value: SearchTab
  onChange: (tab: SearchTab) => void
}

function SearchTabBar({ value, onChange }: SearchTabBarProps) {
  const { messages } = useTranslation()

  const labels: Record<SearchTab, string> = {
    all: messages.home.categoryAll,
    meetup: messages.home.categoryMeetup,
    question: messages.home.categoryQuestion,
    place: messages.home.categoryPlace,
  }

  return (
    <div className="flex items-center gap-2">
      {SEARCH_TABS.map((tab) => (
        <Chip key={tab} selected={value === tab} onClick={() => onChange(tab)}>
          {labels[tab]}
        </Chip>
      ))}
    </div>
  )
}

export { SearchTabBar }
export type { SearchTab }
```

- [ ] **Step 2: 빌드 검증**

Run: `pnpm build`
Expected: 성공.

- [ ] **Step 3: Commit**

```bash
git add src/features/map/components/search-tab-bar.tsx
git commit -m "feat: #75 검색 탭바(전체/모임/질문/장소)"
```

---

## Task 6: `useSearchResults` 훅

**Files:**
- Create: `src/features/map/hooks/use-search-results.ts`

**Interfaces:**
- Consumes: `usePinList` (Task 3), `usePlaceSearch`, `hangulIncludes`, `MapPin`, `Place`, `Coordinates`.
- Produces: `useSearchResults(query: string, near: Coordinates | null): SearchResults`; `SearchResults = { meetups: MapPin[]; questions: MapPin[]; places: Place[]; isLoading: boolean }`.

- [ ] **Step 1: 작성**

```ts
"use client"

import * as React from "react"

import type { MapPin } from "@/features/map/api/pin-types"
import type { Place } from "@/features/map/api/place-search-api"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import { usePinList } from "@/features/map/hooks/use-pin-list"
import { usePlaceSearch } from "@/features/map/hooks/use-place-search"
import { hangulIncludes } from "@/lib/hangul-includes"

interface SearchResults {
  meetups: MapPin[]
  questions: MapPin[]
  places: Place[]
  isLoading: boolean
}

// 전체 핀을 제목으로 필터해 모임/질문으로 나누고, 장소는 place 검색 API로 받는다.
// 카드별 상세 fetch(참여인원·설명)는 카드 컴포넌트에서 지연 수행한다.
function useSearchResults(query: string, near: Coordinates | null): SearchResults {
  const trimmed = query.trim()
  const hasQuery = trimmed.length > 0

  const { data: pins, isLoading: pinsLoading } = usePinList(hasQuery)
  const { data: places, isLoading: placesLoading } = usePlaceSearch(trimmed, near)

  const { meetups, questions } = React.useMemo(() => {
    if (!hasQuery || !pins) return { meetups: [] as MapPin[], questions: [] as MapPin[] }
    const matched = pins.filter((pin) => hangulIncludes(pin.title, trimmed))
    return {
      meetups: matched.filter((pin) => pin.pinType === "meeting"),
      questions: matched.filter((pin) => pin.pinType === "question"),
    }
  }, [pins, trimmed, hasQuery])

  return {
    meetups,
    questions,
    places: hasQuery ? (places ?? []) : [],
    isLoading: hasQuery && (pinsLoading || placesLoading),
  }
}

export { useSearchResults }
export type { SearchResults }
```

- [ ] **Step 2: 빌드 검증**

Run: `pnpm build`
Expected: 성공.

- [ ] **Step 3: Commit**

```bash
git add src/features/map/hooks/use-search-results.ts
git commit -m "feat: #75 useSearchResults(제목 매칭+장소 검색 조합)"
```

---

## Task 7: 검색 오버레이 (화면 A)

**Files:**
- Create: `src/features/map/components/search-overlay.tsx`

**Interfaces:**
- Consumes: `SearchBox`, `SearchTabBar`+`SearchTab`, `MeetupResultCard`, `QuestionResultCard`, `PlaceResultRow`, `useSearchResults`, `Place`, `Coordinates`, `messages.common.back`, `messages.home.{searchPlaceholder,categoryMeetup,categoryQuestion,categoryPlace,searchEmpty}`.
- Produces: `SearchOverlay({ near: Coordinates | null; initialQuery?: string; onClose: () => void; onSelectPlace: (place: Place) => void; onOpenMeetup: (meetingId: number) => void; onOpenQuestion: (questionId: number) => void })`.

- [ ] **Step 1: 작성**

```tsx
"use client"

import * as React from "react"
import Image from "next/image"

import { SearchBox } from "@/components/ui/search-box"
import type { Place } from "@/features/map/api/place-search-api"
import { MeetupResultCard } from "@/features/map/components/meetup-result-card"
import { PlaceResultRow } from "@/features/map/components/place-result-row"
import { QuestionResultCard } from "@/features/map/components/question-result-card"
import { SearchTabBar, type SearchTab } from "@/features/map/components/search-tab-bar"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import { useSearchResults } from "@/features/map/hooks/use-search-results"
import { useTranslation } from "@/lib/i18n/use-translation"

// "전체" 탭에서 타입별로 미리보기할 최대 개수(상세 fetch 부담 제한).
const PREVIEW_LIMIT = 3

interface SearchOverlayProps {
  near: Coordinates | null
  initialQuery?: string
  onClose: () => void
  onSelectPlace: (place: Place) => void
  onOpenMeetup: (meetingId: number) => void
  onOpenQuestion: (questionId: number) => void
}

function SearchOverlay({
  near,
  initialQuery = "",
  onClose,
  onSelectPlace,
  onOpenMeetup,
  onOpenQuestion,
}: SearchOverlayProps) {
  const { messages } = useTranslation()
  const [query, setQuery] = React.useState(initialQuery)
  const [debounced, setDebounced] = React.useState(initialQuery)
  const [tab, setTab] = React.useState<SearchTab>("all")

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const { meetups, questions, places } = useSearchResults(debounced, near)
  const q = debounced.trim()

  const showMeetups = tab === "all" || tab === "meetup"
  const showQuestions = tab === "all" || tab === "question"
  const showPlaces = tab === "all" || tab === "place"
  const cap = (length: number) => (tab === "all" ? Math.min(length, PREVIEW_LIMIT) : length)

  const isEmpty =
    q.length > 0 && meetups.length === 0 && questions.length === 0 && places.length === 0

  return (
    <div className="fixed inset-0 z-40 mx-auto flex w-full max-w-sm flex-col bg-white">
      <div className="flex items-center gap-2 p-4">
        <button
          type="button"
          aria-label={messages.common.back}
          onClick={onClose}
          className="flex size-6 shrink-0 items-center justify-center"
        >
          <Image src="/icons/arrow/left.svg" alt="" width={24} height={24} className="size-6" />
        </button>
        <SearchBox
          autoFocus
          tone="flat"
          placeholder={messages.home.searchPlaceholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="px-4 pb-2">
        <SearchTabBar value={tab} onChange={setTab} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {isEmpty ? (
          <p className="mt-16 text-center text-body-regular-14 text-gray-400">
            {messages.home.searchEmpty}
          </p>
        ) : null}

        {showMeetups && meetups.length > 0 ? (
          <section className="mt-2">
            {tab === "all" ? (
              <h2 className="mb-1 mt-3 text-body-semibold-14 text-gray-900">
                {messages.home.categoryMeetup}
              </h2>
            ) : null}
            {meetups.slice(0, cap(meetups.length)).map((pin) => (
              <MeetupResultCard
                key={pin.pinId}
                pin={pin}
                query={q}
                onClick={() => onOpenMeetup(pin.targetId)}
              />
            ))}
          </section>
        ) : null}

        {showQuestions && questions.length > 0 ? (
          <section className="mt-2">
            {tab === "all" ? (
              <h2 className="mb-1 mt-3 text-body-semibold-14 text-gray-900">
                {messages.home.categoryQuestion}
              </h2>
            ) : null}
            {questions.slice(0, cap(questions.length)).map((pin) => (
              <QuestionResultCard
                key={pin.pinId}
                pin={pin}
                query={q}
                onClick={() => onOpenQuestion(pin.targetId)}
              />
            ))}
          </section>
        ) : null}

        {showPlaces && places.length > 0 ? (
          <section className="mt-2">
            {tab === "all" ? (
              <h2 className="mb-1 mt-3 text-body-semibold-14 text-gray-900">
                {messages.home.categoryPlace}
              </h2>
            ) : null}
            {places.slice(0, cap(places.length)).map((place) => (
              <PlaceResultRow
                key={place.id}
                place={place}
                query={q}
                onClick={() => onSelectPlace(place)}
              />
            ))}
          </section>
        ) : null}
      </div>
    </div>
  )
}

export { SearchOverlay }
```

- [ ] **Step 2: 빌드 검증**

Run: `pnpm build`
Expected: 성공.

- [ ] **Step 3: Commit**

```bash
git add src/features/map/components/search-overlay.tsx
git commit -m "feat: #75 검색 오버레이(전체/모임/질문/장소) 구현"
```

---

## Task 8: 리스트 오버레이 (화면 B)

**Files:**
- Create: `src/features/map/components/pin-list-overlay.tsx`

**Interfaces:**
- Consumes: `AppBar`, `SearchBox`, `CategoryChipGroup`+`Category`, `MapFab`, `MeetupResultCard`, `QuestionResultCard`, `useMapPins`, `hangulIncludes`, `MapBounds`, `messages.home.{listTitle,searchPlaceholder,listEmpty}`.
- Produces: `PinListOverlay({ bounds: MapBounds | null; onClose: () => void; onOpenMeetup: (id: number) => void; onOpenQuestion: (id: number) => void; onCreateMeetup: () => void; onCreateQuestion: () => void })`.

- [ ] **Step 1: 작성**

```tsx
"use client"

import * as React from "react"

import { AppBar } from "@/components/ui/app-bar"
import { SearchBox } from "@/components/ui/search-box"
import type { MapBounds } from "@/features/map/api/pin-types"
import { CategoryChipGroup, type Category } from "@/features/map/components/category-chip-group"
import { MapFab } from "@/features/map/components/map-fab"
import { MeetupResultCard } from "@/features/map/components/meetup-result-card"
import { QuestionResultCard } from "@/features/map/components/question-result-card"
import { useMapPins } from "@/features/map/hooks/use-map-pins"
import { hangulIncludes } from "@/lib/hangul-includes"
import { useTranslation } from "@/lib/i18n/use-translation"

interface PinListOverlayProps {
  bounds: MapBounds | null
  onClose: () => void
  onOpenMeetup: (meetingId: number) => void
  onOpenQuestion: (questionId: number) => void
  onCreateMeetup: () => void
  onCreateQuestion: () => void
}

// 지금 지도에 보이는(바운즈) 핀을 리스트로 보여준다. 탭/인리스트 검색은 클라이언트 필터.
function PinListOverlay({
  bounds,
  onClose,
  onOpenMeetup,
  onOpenQuestion,
  onCreateMeetup,
  onCreateQuestion,
}: PinListOverlayProps) {
  const { messages } = useTranslation()
  const [category, setCategory] = React.useState<Category>("all")
  const [query, setQuery] = React.useState("")

  const { data: pinData } = useMapPins(bounds)
  const pins = pinData?.pins ?? []

  const trimmed = query.trim()
  const filtered = pins.filter((pin) => {
    const typeOk =
      category === "all" ||
      (category === "meetup" ? pin.pinType === "meeting" : pin.pinType === "question")
    return typeOk && hangulIncludes(pin.title, trimmed)
  })

  return (
    <div className="fixed inset-0 z-40 mx-auto flex w-full max-w-sm flex-col bg-white">
      <AppBar
        title={messages.home.listTitle}
        leadingIcon={null}
        trailingVariant="close"
        onTrailingClick={onClose}
      />

      <div className="px-4 pb-2">
        <SearchBox
          tone="flat"
          placeholder={messages.home.searchPlaceholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="px-4 pb-2">
        <CategoryChipGroup value={category} onChange={setCategory} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {filtered.length === 0 ? (
          <p className="mt-16 text-center text-body-regular-14 text-gray-400">
            {messages.home.listEmpty}
          </p>
        ) : (
          filtered.map((pin) =>
            pin.pinType === "meeting" ? (
              <MeetupResultCard
                key={pin.pinId}
                pin={pin}
                onClick={() => onOpenMeetup(pin.targetId)}
              />
            ) : (
              <QuestionResultCard
                key={pin.pinId}
                pin={pin}
                onClick={() => onOpenQuestion(pin.targetId)}
              />
            )
          )
        )}
      </div>

      <MapFab
        onCreateMeetup={onCreateMeetup}
        onCreateQuestion={onCreateQuestion}
        className="absolute right-4 bottom-6 z-10"
      />
    </div>
  )
}

export { PinListOverlay }
```

- [ ] **Step 2: 빌드 검증**

Run: `pnpm build`
Expected: 성공.

- [ ] **Step 3: Commit**

```bash
git add src/features/map/components/pin-list-overlay.tsx
git commit -m "feat: #75 지도 핀 리스트 뷰 오버레이 구현"
```

---

## Task 9: HomeMapScreen 배선 (검색바 focus · 리스트 버튼)

**Files:**
- Modify: `src/features/map/components/map-search-bar.tsx` (onFocus 트리거 + 인라인 드롭다운/place 검색 제거)
- Modify: `src/features/map/components/map-controls.tsx` (`onListView` prop → 리스트 Circle)
- Modify: `src/features/map/components/home-map-screen.tsx` (오버레이 2개 배선)

**Interfaces:**
- Consumes: `SearchOverlay` (Task 7), `PinListOverlay` (Task 8).
- Produces: (없음 — 최종 통합)

- [ ] **Step 1: `map-search-bar.tsx`를 트리거 전용으로 교체**

`src/features/map/components/map-search-bar.tsx` 전체를 아래로 교체한다. `near`/`onSelectPlace`/인라인 드롭다운/`usePlaceSearch`를 제거하고 `onFocus` 트리거만 남긴다. 클릭 위치 라벨 표시 분기는 유지한다.

```tsx
"use client"

import Image from "next/image"

import { SearchBox } from "@/components/ui/search-box"
import { useTranslation } from "@/lib/i18n/use-translation"

interface MapSearchBarProps {
  /** 검색바 포커스 시 검색 오버레이를 연다. 실제 검색 입력은 오버레이가 담당한다. */
  onFocus: () => void
  selectedLocationLabel?: string | null
  onClearSelectedLocation?: () => void
  className?: string
}

function MapSearchBar({
  onFocus,
  selectedLocationLabel,
  onClearSelectedLocation,
  className,
}: MapSearchBarProps) {
  const { messages } = useTranslation()

  if (selectedLocationLabel) {
    return (
      <div className={className ?? "relative flex-1"}>
        <div className="flex h-[45px] w-full items-center justify-between gap-3 rounded-full bg-gray-50 px-4 py-3 shadow-[0px_2px_2px_0px_rgba(0,0,0,0.10)] outline outline-1 -outline-offset-1 outline-gray-50">
          <span className="truncate text-body-medium-15 text-gray-900">
            {messages.home.selectedLocationPrefix}: {selectedLocationLabel}
          </span>
          {onClearSelectedLocation ? (
            <button
              type="button"
              aria-label={messages.home.clearSelectedLocationLabel}
              onClick={onClearSelectedLocation}
              className="flex size-4 shrink-0 items-center justify-center rounded-full bg-gray-200"
            >
              <Image src="/icons/common/clear.svg" alt="" width={8} height={8} className="size-2" />
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className={className ?? "relative flex-1"}>
      {/* readOnly: 포커스만으로 오버레이를 열고, 타이핑은 오버레이 입력에서 한다. */}
      <SearchBox readOnly placeholder={messages.home.searchPlaceholder} onFocus={onFocus} />
    </div>
  )
}

export { MapSearchBar }
```

- [ ] **Step 2: `map-controls.tsx`에 `onListView` 배선**

`MapControlsProps`에 `onListView?: () => void`를 추가하고, 리스트 `Circle`에 `onClick`을 연결한다.

```tsx
interface MapControlsProps {
  onToggleFollow: () => void
  isFollowing?: boolean
  onCreateMeetup?: () => void
  onCreateQuestion?: () => void
  onListView?: () => void
  className?: string
}

function MapControls({
  onToggleFollow,
  isFollowing = false,
  onCreateMeetup,
  onCreateQuestion,
  onListView,
  className,
}: MapControlsProps) {
```

그리고 리스트 Circle 줄을 교체:

```tsx
      <Circle
        iconSrc="/icons/circle/list.svg"
        aria-label={messages.home.listViewLabel}
        onClick={onListView}
      />
```

- [ ] **Step 3: `home-map-screen.tsx` — import 추가**

`import { MapSearchBar } from ...` 아래 근처에 추가:

```tsx
import { SearchOverlay } from "@/features/map/components/search-overlay"
import { PinListOverlay } from "@/features/map/components/pin-list-overlay"
```

- [ ] **Step 4: `home-map-screen.tsx` — 상태 추가**

`const [bounds, setBounds] = React.useState<MapBounds | null>(null)` 아래에 추가:

```tsx
  const [isSearchOpen, setSearchOpen] = React.useState(false)
  const [isListOpen, setListOpen] = React.useState(false)
```

- [ ] **Step 5: `home-map-screen.tsx` — MapSearchBar 교체**

기존 `<MapSearchBar ... />` 블록(near/onSelectPlace 사용)을 아래로 교체한다:

```tsx
          <MapSearchBar
            onFocus={() => setSearchOpen(true)}
            selectedLocationLabel={selectedLocationLabel}
            onClearSelectedLocation={() => setClickedPosition(null)}
          />
```

- [ ] **Step 6: `home-map-screen.tsx` — MapControls에 onListView 추가**

기존 `<MapControls ... />`에 prop 한 줄 추가:

```tsx
      <MapControls
        onToggleFollow={handleToggleFollow}
        isFollowing={isFollowing}
        onCreateMeetup={() => setCreateMeetupOpen(true)}
        onCreateQuestion={() => setCreateQuestionOpen(true)}
        onListView={() => setListOpen(true)}
        className="absolute right-4 bottom-28 z-10 flex flex-col gap-2"
      />
```

- [ ] **Step 7: `home-map-screen.tsx` — 오버레이 렌더 추가**

`{createMeetupOpen ? (` 블록 바로 위에 두 오버레이를 추가한다:

```tsx
      {isSearchOpen ? (
        <SearchOverlay
          near={position}
          onClose={() => setSearchOpen(false)}
          onSelectPlace={(place) => {
            setClickedPosition(null)
            setFocusedPlace(place)
            setSearchOpen(false)
          }}
          onOpenMeetup={(id) => setSelectedMeetingId(id)}
          onOpenQuestion={(id) => setSelectedQuestionId(id)}
        />
      ) : null}

      {isListOpen ? (
        <PinListOverlay
          bounds={bounds}
          onClose={() => setListOpen(false)}
          onOpenMeetup={(id) => setSelectedMeetingId(id)}
          onOpenQuestion={(id) => setSelectedQuestionId(id)}
          onCreateMeetup={() => setCreateMeetupOpen(true)}
          onCreateQuestion={() => setCreateQuestionOpen(true)}
        />
      ) : null}
```

- [ ] **Step 8: 빌드 + 린트 검증**

Run: `pnpm build && pnpm lint`
Expected: 둘 다 성공. `MapSearchBar`에서 제거한 `near`/`onSelectPlace`를 참조하는 곳이 없어야 한다(에러 시 해당 참조 정리).

- [ ] **Step 9: 런타임 수동 검증 (Figma 5개 시안 대조)**

Run: `pnpm dev` 후 브라우저에서 홈(`/`)을 연다. 확인:
1. 검색바 탭 → 검색 오버레이가 뜨고 입력에 자동 포커스(디자인 1). 텍스트 입력 시 전체 탭에서 모임/질문/장소 섹션에 결과 + 제목 하이라이트.
2. 모임/질문/장소 탭 전환 시 해당 타입만 평면 리스트(디자인 2·3).
3. 모임 카드 탭 → 모임 상세 시트, 질문 카드 탭 → 질문 상세 시트, 장소 행 탭 → 오버레이 닫히고 지도 이동.
4. 뒤로가기(←) → 오버레이 닫힘.
5. 지도 우하단 리스트 버튼 → 리스트 뷰(헤더 "리스트" + X, 검색창, 전체/모임/질문 탭, 카드 리스트, FAB) (디자인 4).
6. 리스트 카드 탭 → 상세 시트(디자인 5). X → 닫힘. FAB → 모임/질문 만들기 메뉴.

- [ ] **Step 10: Commit**

```bash
git add src/features/map/components/map-search-bar.tsx src/features/map/components/map-controls.tsx src/features/map/components/home-map-screen.tsx
git commit -m "feat: #75 홈에 검색 오버레이·리스트 뷰 배선(검색바 focus·리스트 버튼)"
```

---

## Self-Review 결과

**1. Spec coverage:**
- 검색 오버레이(디자인 1·2·3): Task 4·5·6·7 ✅ / 리스트 뷰(디자인 4·5): Task 4·8·9 ✅
- 장소 실연동(`usePlaceSearch`): Task 6 ✅ / 모임·질문 제목 매칭(`pins/list`): Task 2·3·6 ✅
- 카드 참여인원·설명 상세 fetch(`useMeeting`/`useQuestionSummary`): Task 4 ✅
- 인라인 드롭다운 제거·검색바 focus 트리거: Task 9 ✅ / 리스트 버튼 배선: Task 9 ✅
- 상세 시트 재사용: Task 9(기존 컨테이너) ✅ / FAB 재사용: Task 8 ✅
- i18n 7개 로케일: Task 1 ✅ / 질문 국적·시각 #73 보류: Task 4(주석·줄 생략) ✅
- 무음 절단 로깅: Task 3 ✅ / IME 가드 없음: Task 7·8(SearchBox 그대로) ✅

**2. Placeholder scan:** 모든 스텝에 실제 코드/명령 포함, TBD 없음. ✅

**3. Type consistency:** `MapPin`/`Place`/`SearchTab`/`Category`/`PinListPage`/`SearchResults` 시그니처가 Task 간 일치. `onOpenMeetup(id)`/`onOpenQuestion(id)`/`onSelectPlace(place)` 콜백 시그니처가 카드→오버레이→HomeMapScreen 전 구간 일관. `adaptPin` export(Task 2)를 `pin-list-api`가 소비(Task 2). ✅

## 실행 밖 후속
- 모임·질문 서버측 키워드 검색 엔드포인트(현재 클라이언트 매칭 대체).
- 질문 카드 국기·작성시각 → BE 이슈 **#73** 도착 시 `question-result-card`에 메타 줄 추가.
