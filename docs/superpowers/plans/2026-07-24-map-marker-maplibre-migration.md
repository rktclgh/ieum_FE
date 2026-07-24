# 홈 지도 마커 MapLibre 네이티브 레이어 이전 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈 지도의 핀/클러스터/내 위치/선택 위치 마커를 Leaflet DOM 마커에서 MapLibre GL 네이티브 레이어(GeoJSON source + circle/symbol layer)로 옮겨, 빠른 패닝 시 마커가 베이스맵 이동 속도를 못 따라가는 문제를 구조적으로 없앤다.

**Architecture:** 모든 마커를 하나의 `ieum-markers` GeoJSON source(핀/클러스터/스택)와 `ieum-user-location`/`ieum-selected-location` source 두 개로 나눠 관리한다. 그림자는 모든 원형 마커가 공유하는 `marker-shadow` circle layer 하나로 그리고, 이 레이어가 원 지오메트리 기반 네이티브 히트테스트를 그대로 클릭 판정에도 쓴다. 정적 아이콘(질문 핀, no-image, 선택 위치 티어드롭)은 SVG를 캔버스에 1회 래스터화해 `addImage`하고, 모임 핀 썸네일은 URL별로 캐싱하며 동적으로 합성·등록한다. 비주얼(색상·크기·겹침 순서)은 전부 그대로 유지한다.

**Tech Stack:** Next.js(App Router), React 19, `maplibre-gl`(이미 설치됨, 신규 의존성 없음), `leaflet`/`react-leaflet`(지도 컨테이너 자체는 유지, 마커만 제거), `supercluster`(클러스터링 로직 그대로), Node 22의 `node --test`(순수 로직 유닛 테스트), pnpm.

## Global Constraints

- pnpm만 사용한다(`npm install` 금지) — 이번 작업은 신규 의존성이 없으므로 설치 자체가 필요 없다.
- 폴더/파일명은 전부 lowercase kebab-case.
- 하드코딩된 한글 UI 문자열 금지 — 이번 마이그레이션은 렌더링 엔진 교체라 신규 UI 문자열이 없다(신규 문자열이 필요해지면 `src/lib/i18n` 카탈로그에 추가).
- `node --test`로 직접 실행되는 `.ts` 파일은 **TypeScript 생성자 파라미터 프로퍼티 축약 문법을 쓸 수 없다** (`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` — Node의 strip-only 모드가 지원하지 않음). 클래스 필드는 명시적으로 선언하고 생성자 본문에서 대입한다.
- 유닛 테스트 실행 전 `nvm use 22`로 Node 22(설치된 `v22.23.1`)를 PATH에 잡아야 한다 — 기본 `node`는 v20이라 `.ts` 테스트 파일의 type-stripping이 동작하지 않는다.
- push 전 `pnpm build`가 클린하게 통과해야 한다(표준 규칙). `pnpm verify`의 `test:contracts` 단계는 Node 22+ 플래그가 필요해 로컬 Node 20에서 항상 깨지는 기존 이슈이니, push 전에는 `lint`/`typecheck`/`build`/`verify:out`만 개별 확인한다.
- 이 브랜치는 `refactor/#493`, base는 `develop`(이 계획을 만들 때 최신 `origin/develop`으로 새로 워크트리를 팠다). 완료 후 PR은 `develop`로 연다.
- 스펙 문서: `docs/superpowers/specs/2026-07-24-map-marker-maplibre-migration-design.md` (이미 커밋됨). 모든 태스크는 이 문서의 결정 사항을 따른다.

---

### Task 1: 마커 → GeoJSON FeatureCollection 순수 변환 함수

**Files:**
- Create: `src/features/map/lib/marker-geojson.ts`
- Test: `src/features/map/lib/marker-geojson.test.ts`

**Interfaces:**
- Consumes: `PinClusterItem`(`src/features/map/lib/cluster-index.ts`, 이미 존재), `MapPin`(`src/features/map/api/pin-types.ts`, 이미 존재).
- Produces: `buildMarkerFeatureCollection(items: PinClusterItem[], resolveIconId: (pin: MapPin) => string): MarkerFeatureCollection`, `formatCount(count: number): string`, 타입 `MarkerFeature`/`MarkerFeatureCollection`/`MarkerFeatureProperties` — Task 5(`use-marker-layers.ts`)가 그대로 가져다 쓴다. `MarkerFeatureProperties`는 `{ kind: "pin" | "cluster" | "stack"; pinId?: number; iconId?: string; clusterId?: number; count?: number; countLabel?: string; stackPinIds?: number[] }`.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/features/map/lib/marker-geojson.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { buildMarkerFeatureCollection, formatCount } from "./marker-geojson.ts"

function makePin(pinId: number, lat: number, lng: number) {
  return {
    pinId,
    pinType: "meeting" as const,
    targetId: pinId,
    title: `pin-${pinId}`,
    thumbnailUrl: null,
    location: { lat, lng },
    mine: false,
    createdAt: "2026-07-20T00:00:00Z",
  }
}

test("pin 항목은 iconId를 resolveIconId 결과로 채운 Point feature가 된다", () => {
  const pin = makePin(1, 37.5, 127.0)
  const collection = buildMarkerFeatureCollection(
    [{ kind: "pin", pin, lat: 37.5, lng: 127.0 }],
    () => "pin-question"
  )

  assert.equal(collection.features.length, 1)
  const [feature] = collection.features
  assert.deepEqual(feature.geometry.coordinates, [127.0, 37.5])
  assert.equal(feature.properties.kind, "pin")
  assert.equal(feature.properties.pinId, 1)
  assert.equal(feature.properties.iconId, "pin-question")
})

test("cluster 항목은 countLabel을 포함한다", () => {
  const collection = buildMarkerFeatureCollection(
    [{ kind: "cluster", clusterId: 5, count: 12, lat: 37.5, lng: 127.0 }],
    () => "unused"
  )

  assert.equal(collection.features[0].properties.kind, "cluster")
  assert.equal(collection.features[0].properties.clusterId, 5)
  assert.equal(collection.features[0].properties.countLabel, "12")
})

test("count가 999를 넘으면 999+로 축약한다", () => {
  assert.equal(formatCount(999), "999")
  assert.equal(formatCount(1000), "999+")
  assert.equal(formatCount(50000), "999+")
})

test("stack 항목은 stackPinIds와 count를 pins.length로부터 채운다", () => {
  const pins = [makePin(1, 37.5, 127.0), makePin(2, 37.5, 127.0), makePin(3, 37.5, 127.0)]
  const collection = buildMarkerFeatureCollection(
    [{ kind: "stack", pins, lat: 37.5, lng: 127.0 }],
    () => "unused"
  )

  const props = collection.features[0].properties
  assert.equal(props.kind, "stack")
  assert.deepEqual(props.stackPinIds, [1, 2, 3])
  assert.equal(props.countLabel, "3")
})
```

- [ ] **Step 2: 테스트 실행해 실패 확인**

```bash
source ~/.nvm/nvm.sh && nvm use 22
node --test src/features/map/lib/marker-geojson.test.ts
```

Expected: FAIL — `marker-geojson.ts`가 아직 없어 모듈을 찾을 수 없다는 에러(`ERR_MODULE_NOT_FOUND`).

- [ ] **Step 3: 최소 구현 작성**

`src/features/map/lib/marker-geojson.ts`:

```ts
// PinClusterItem[](use-pin-clusters.ts의 결과)을 MapLibre GeoJSON source에 바로 넣을 수 있는
// FeatureCollection으로 바꾼다. 썸네일 로딩 상태를 아는 쪽은 이미지 캐시(훅)이므로, 이 함수는
// iconId 결정을 resolveIconId로 주입받아 순수 함수로 남는다.

import type { MapPin } from "@/features/map/api/pin-types"
import type { PinClusterItem } from "@/features/map/lib/cluster-index"

interface MarkerFeatureProperties {
  kind: "pin" | "cluster" | "stack"
  pinId?: number
  iconId?: string
  clusterId?: number
  count?: number
  countLabel?: string
  stackPinIds?: number[]
}

interface MarkerFeature {
  type: "Feature"
  geometry: { type: "Point"; coordinates: [number, number] }
  properties: MarkerFeatureProperties
}

interface MarkerFeatureCollection {
  type: "FeatureCollection"
  features: MarkerFeature[]
}

// 클러스터/스택 원 안의 숫자 표기. 4자리부터는 축약(999+) — 기존 cluster-marker.tsx와 동일 규칙.
function formatCount(count: number): string {
  return count > 999 ? "999+" : String(count)
}

function buildMarkerFeatureCollection(
  items: PinClusterItem[],
  resolveIconId: (pin: MapPin) => string
): MarkerFeatureCollection {
  const features: MarkerFeature[] = items.map((item) => {
    if (item.kind === "cluster") {
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [item.lng, item.lat] },
        properties: {
          kind: "cluster",
          clusterId: item.clusterId,
          count: item.count,
          countLabel: formatCount(item.count),
        },
      }
    }

    if (item.kind === "stack") {
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [item.lng, item.lat] },
        properties: {
          kind: "stack",
          count: item.pins.length,
          countLabel: formatCount(item.pins.length),
          stackPinIds: item.pins.map((pin) => pin.pinId),
        },
      }
    }

    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [item.lng, item.lat] },
      properties: {
        kind: "pin",
        pinId: item.pin.pinId,
        iconId: resolveIconId(item.pin),
      },
    }
  })

  return { type: "FeatureCollection", features }
}

export { buildMarkerFeatureCollection, formatCount }
export type { MarkerFeature, MarkerFeatureCollection, MarkerFeatureProperties }
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
node --test src/features/map/lib/marker-geojson.test.ts
```

Expected: `# pass 4`, `# fail 0`.

- [ ] **Step 5: 커밋**

```bash
git add src/features/map/lib/marker-geojson.ts src/features/map/lib/marker-geojson.test.ts
git commit -m "feat: #493 마커 GeoJSON 변환 순수 함수 추가"
```

---

### Task 2: 모임 핀 썸네일 이미지 캐시

**Files:**
- Create: `src/features/map/lib/marker-image-cache.ts`
- Test: `src/features/map/lib/marker-image-cache.test.ts`

**Interfaces:**
- Consumes: 없음(외부 프로젝트 코드 의존 없음 — `MaplibreMapLike`는 이 파일이 직접 정의).
- Produces: `class MarkerImageCache` — 생성자 `(map: MaplibreMapLike, loader: ThumbnailLoader = defaultLoader)`, 메서드 `getOrLoad(url: string, onReady: (imageId: string) => void): string | null`. `MaplibreMapLike`(구조적으로 `maplibre-gl`의 `Map`과 호환 — `hasImage`/`addImage`만 요구), `ThumbnailLoader` 타입. Task 5(`use-marker-layers.ts`)가 실제 MapLibre `Map` 인스턴스를 그대로 넘겨 생성한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/features/map/lib/marker-image-cache.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { MarkerImageCache } from "./marker-image-cache.ts"

function makeFakeCtx() {
  return {
    clearRect: () => {},
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    save: () => {},
    restore: () => {},
    clip: () => {},
    drawImage: () => {},
    getImageData: () => ({ width: 44, height: 44, data: new Uint8ClampedArray(44 * 44 * 4) }),
    fillStyle: "",
  }
}

function makeFakeMap() {
  const images = new Set<string>()
  return {
    hasImage: (id: string) => images.has(id),
    addImage: (id: string) => {
      images.add(id)
    },
  }
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

test("같은 URL을 다시 요청하면 캐시된 imageId를 돌려주고 다시 fetch하지 않는다", async () => {
  let fetchCount = 0
  const map = makeFakeMap()
  const cache = new MarkerImageCache(map, {
    fetchBitmap: async () => {
      fetchCount++
      return { width: 40, height: 40 } as ImageBitmap
    },
    createCanvas: () => ({ getContext: () => makeFakeCtx() }) as unknown as OffscreenCanvas,
  })

  const firstId = await new Promise<string>((resolve) => {
    const cached = cache.getOrLoad("https://example.com/a.jpg", resolve)
    assert.equal(cached, null)
  })

  const secondId = cache.getOrLoad("https://example.com/a.jpg", () => {
    throw new Error("캐시 히트에서는 onReady가 다시 불리면 안 된다")
  })

  assert.equal(secondId, firstId)
  assert.equal(fetchCount, 1)
  assert.ok(map.hasImage(firstId))
})

test("같은 URL을 동시에 두 번 요청하면 fetch는 한 번만 나가고 둘 다 같은 id를 받는다", async () => {
  let fetchCount = 0
  const map = makeFakeMap()
  const cache = new MarkerImageCache(map, {
    fetchBitmap: async () => {
      fetchCount++
      return { width: 40, height: 40 } as ImageBitmap
    },
    createCanvas: () => ({ getContext: () => makeFakeCtx() }) as unknown as OffscreenCanvas,
  })

  const readyIds: string[] = []
  cache.getOrLoad("https://example.com/c.jpg", (id) => readyIds.push(id))
  cache.getOrLoad("https://example.com/c.jpg", (id) => readyIds.push(id))

  await flushMicrotasks()

  assert.equal(fetchCount, 1)
  assert.equal(readyIds.length, 2)
  assert.equal(readyIds[0], readyIds[1])
})

test("로드 실패 후에는 캐시에 남지 않아 다음 호출에서 다시 시도한다", async () => {
  let attempts = 0
  const map = makeFakeMap()
  const cache = new MarkerImageCache(map, {
    fetchBitmap: async () => {
      attempts++
      if (attempts === 1) throw new Error("네트워크 오류")
      return { width: 40, height: 40 } as ImageBitmap
    },
    createCanvas: () => ({ getContext: () => makeFakeCtx() }) as unknown as OffscreenCanvas,
  })

  const firstCallReady: string[] = []
  cache.getOrLoad("https://example.com/b.jpg", (id) => firstCallReady.push(id))
  await flushMicrotasks()
  assert.deepEqual(firstCallReady, [])

  const retried = await new Promise<string>((resolve) => {
    cache.getOrLoad("https://example.com/b.jpg", resolve)
  })

  assert.equal(attempts, 2)
  assert.ok(retried.startsWith("pin-thumb-"))
})
```

- [ ] **Step 2: 테스트 실행해 실패 확인**

```bash
node --test src/features/map/lib/marker-image-cache.test.ts
```

Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현 작성**

`src/features/map/lib/marker-image-cache.ts`:

```ts
// 모임 핀 썸네일(원격 이미지)을 44px 흰 원 + 40px 원형 크롭으로 합성해 MapLibre addImage로
// 등록하고, URL별로 캐싱한다. 같은 URL이 동시에 여러 번 요청돼도 fetch는 한 번만 나간다.
//
// 그림자는 여기서 굽지 않는다 — marker-shadow 공유 레이어가 대신 그린다(설계 문서 참고).
// 생성자 파라미터 프로퍼티 축약 문법은 쓰지 않는다: node --test의 strip-only 모드가
// 지원하지 않아 ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX로 죽는다.

const THUMB_SIZE = 44
const THUMB_INNER_SIZE = 40

interface ThumbnailLoader {
  fetchBitmap: (url: string) => Promise<ImageBitmap>
  createCanvas: (size: number) => OffscreenCanvas
}

const defaultLoader: ThumbnailLoader = {
  fetchBitmap: async (url) => {
    // 표시용 이미지는 same-origin이라 CORS가 걸리지 않고, 쿠키 세션 인증이라 credentials가
    // 필요하다(src/lib/files/save-image.ts와 동일 관례).
    const response = await fetch(url, { credentials: "include" })
    if (!response.ok) throw new Error(`썸네일 요청 실패: ${response.status}`)
    const blob = await response.blob()
    return createImageBitmap(blob)
  },
  createCanvas: (size) => new OffscreenCanvas(size, size),
}

// object-fit: cover와 동일한 비율로 40px 원 안에 그린다.
function compositeThumbnail(bitmap: ImageBitmap, loader: ThumbnailLoader): ImageData {
  const canvas = loader.createCanvas(THUMB_SIZE)
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("2d context를 만들 수 없습니다")

  ctx.clearRect(0, 0, THUMB_SIZE, THUMB_SIZE)
  ctx.fillStyle = "#ffffff"
  ctx.beginPath()
  ctx.arc(THUMB_SIZE / 2, THUMB_SIZE / 2, THUMB_SIZE / 2, 0, Math.PI * 2)
  ctx.fill()

  const inset = (THUMB_SIZE - THUMB_INNER_SIZE) / 2
  ctx.save()
  ctx.beginPath()
  ctx.arc(THUMB_SIZE / 2, THUMB_SIZE / 2, THUMB_INNER_SIZE / 2, 0, Math.PI * 2)
  ctx.clip()

  const scale = Math.max(THUMB_INNER_SIZE / bitmap.width, THUMB_INNER_SIZE / bitmap.height)
  const drawWidth = bitmap.width * scale
  const drawHeight = bitmap.height * scale
  const dx = inset + (THUMB_INNER_SIZE - drawWidth) / 2
  const dy = inset + (THUMB_INNER_SIZE - drawHeight) / 2
  ctx.drawImage(bitmap, dx, dy, drawWidth, drawHeight)
  ctx.restore()

  return ctx.getImageData(0, 0, THUMB_SIZE, THUMB_SIZE)
}

// maplibre-gl의 Map과 구조적으로 호환되는 최소 인터페이스 — 테스트에서 전체 Map을 흉내내지
// 않고 이 두 메서드만 가진 가짜 객체를 넘길 수 있게 한다.
interface MaplibreMapLike {
  hasImage(id: string): boolean
  addImage(id: string, image: ImageData): unknown
}

class MarkerImageCache {
  private readonly map: MaplibreMapLike
  private readonly loader: ThumbnailLoader
  private idsByUrl = new Map<string, string>()
  private pending = new Map<string, Promise<string>>()
  private nextId = 0

  constructor(map: MaplibreMapLike, loader: ThumbnailLoader = defaultLoader) {
    this.map = map
    this.loader = loader
  }

  /** 캐시에 있으면 즉시 imageId, 없으면 null을 주고 로딩을 시작한다 — 끝나면 onReady(imageId). */
  getOrLoad(url: string, onReady: (imageId: string) => void): string | null {
    const cached = this.idsByUrl.get(url)
    if (cached) return cached

    let promise = this.pending.get(url)
    if (!promise) {
      promise = this.load(url)
      this.pending.set(url, promise)
      const started = promise
      void started.catch(() => {}).finally(() => {
        if (this.pending.get(url) === started) this.pending.delete(url)
      })
    }

    promise.then(onReady).catch(() => {})
    return null
  }

  private async load(url: string): Promise<string> {
    const bitmap = await this.loader.fetchBitmap(url)
    const imageData = compositeThumbnail(bitmap, this.loader)
    const imageId = `pin-thumb-${this.nextId++}`
    if (!this.map.hasImage(imageId)) {
      this.map.addImage(imageId, imageData)
    }
    this.idsByUrl.set(url, imageId)
    return imageId
  }
}

export { MarkerImageCache, compositeThumbnail, THUMB_SIZE, THUMB_INNER_SIZE }
export type { ThumbnailLoader, MaplibreMapLike }
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
node --test src/features/map/lib/marker-image-cache.test.ts
```

Expected: `# pass 3`, `# fail 0`.

- [ ] **Step 5: 커밋**

```bash
git add src/features/map/lib/marker-image-cache.ts src/features/map/lib/marker-image-cache.test.ts
git commit -m "feat: #493 모임 핀 썸네일 이미지 캐시 추가"
```

---

### Task 3: 정적 마커 아이콘 래스터화 (질문 핀 / no-image / 선택 위치)

이 파일은 `OffscreenCanvas`/`Image.decode()` 같은 브라우저 전용 API만 쓴다 — Node에서 유닛 테스트할 수 없다(이 저장소의 기존 관례: `map-canvas.tsx`/`vector-tile-layer.tsx`도 DOM 의존 코드라 테스트가 없고 실기기 확인으로 대신한다). Task 9에서 실기기로 육안 검증한다.

**Files:**
- Create: `src/features/map/lib/marker-static-icons.ts`

**Interfaces:**
- Consumes: 없음(SVG 마크업은 이 파일에 직접 옮겨 적는다 — 원본은 `pin-marker.tsx`의 `QUESTION_SVG`, `public/icons/map/pin-no-image.svg`, `map-center-pin.tsx`의 `PIN_COMBINED_SVG`).
- Produces: `registerStaticIcons(map: MaplibreMap): Promise<void>`, 아이콘 id 상수 `PIN_QUESTION_ICON_ID`, `PIN_MEETING_NO_IMAGE_ICON_ID`, `SELECTED_LOCATION_ICON_ID` — Task 5가 `iconId` 매핑과 `selected-location` 레이어의 `icon-image`에 그대로 쓴다.

- [ ] **Step 1: 구현 작성**

`src/features/map/lib/marker-static-icons.ts`:

```ts
"use client"

// 앱 전체에서 고정인 정적 마커 아이콘 3종을 SVG → 캔버스 래스터화해 MapLibre에 1회 등록한다.
// 그림자는 여기서 굽지 않는다(질문/모임 핀은 marker-shadow 공유 레이어가 대신 그린다) —
// 단, 선택 위치 티어드롭은 도형이 원이 아니라 공유 shadow 레이어를 못 쓰므로 그림자(ellipse)를
// 그대로 굽는다(설계 문서 참고).
//
// pixelRatio(기본 2)로 CSS 픽셀보다 크게 그려 등록해, addImage의 pixelRatio 옵션으로
// 레티나에서도 흐릿하지 않게 한다.

import type { Map as MaplibreMap } from "maplibre-gl"

const GRAY_900 = "#1f2324" // --color-gray-900
const GRAY_100 = "#eceeee" // --color-gray-100 (모임 썸네일 없을 때 배경)

// pin-marker.tsx QUESTION_SVG의 물음표 path(Figma node 1128:3058)와 동일.
const QUESTION_GLYPH_PATH =
  `<path d="M18.185 29.2395V29.0424C18.1853 28.0705 18.998 27.2821 20 27.2818C21.0022 27.2818 21.8147 28.0703 21.815 29.0424V29.2395C21.815 30.2118 21.0024 31 20 31C18.9979 30.9997 18.185 30.2116 18.185 29.2395ZM23.37 16.9022C23.3695 14.9978 21.8235 13.521 20 13.521C18.1768 13.5213 16.6305 14.9979 16.63 16.9022C16.63 17.8745 15.8174 18.6627 14.815 18.6627C13.8126 18.6627 13 17.8745 13 16.9022C13.0005 13.1273 16.0966 10.0003 20 10C23.9037 10 26.9995 13.1271 27 16.9022C27 20.6777 23.904 23.8067 20 23.8067C18.998 23.8064 18.1852 23.0181 18.185 22.0462C18.185 21.0741 18.9979 20.286 20 20.2857C21.8238 20.2857 23.37 18.8071 23.37 16.9022Z" fill="${GRAY_900}"/>`

// #111 디자인: 44px 흰 원 + 40px 콘텐츠 원. 물음표는 40x40 기준 좌표라 (44-40)/2=2px 오프셋.
const QUESTION_PIN_SVG = `<svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
  <circle cx="22" cy="22" r="22" fill="#ffffff"/>
  <g transform="translate(2,2)">${QUESTION_GLYPH_PATH}</g>
</svg>`

// public/icons/map/pin-no-image.svg 내용 그대로(28x28). 40px 콘텐츠 원 중앙에 오도록
// (40-28)/2=6px, 여기에 바깥 원 오프셋 2px를 더해 8px.
const NO_IMAGE_GLYPH_SVG = `<svg x="8" y="8" width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M2.9165 6.91674C2.9165 4.70761 4.70736 2.91675 6.9165 2.91675H21.0832C23.2923 2.91675 25.0832 4.70761 25.0832 6.91675V21.0834C25.0832 23.2926 23.2923 25.0834 21.0832 25.0834H6.9165C4.70736 25.0834 2.9165 23.2926 2.9165 21.0834V6.91674Z" stroke="#B5BDBF" stroke-width="1.5"/>
<path d="M2.9165 16.9164L7.05534 12.7777C7.93767 11.8954 9.40363 12.0276 10.1139 13.0535L12.7663 16.8846C13.431 17.8446 14.7733 18.0335 15.6771 17.294L19.0157 14.5626C19.8109 13.9119 20.9698 13.9697 21.6963 14.6963L25.0832 18.0831" stroke="#B5BDBF" stroke-width="1.5"/>
<circle cx="19.25" cy="8.75" r="1.75" fill="#B5BDBF"/>
</svg>`

const MEETING_NO_IMAGE_PIN_SVG = `<svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
  <circle cx="22" cy="22" r="22" fill="#ffffff"/>
  <circle cx="22" cy="22" r="20" fill="${GRAY_100}"/>
  ${NO_IMAGE_GLYPH_SVG}
</svg>`

// Figma Location/XL(map-center-pin.tsx의 PIN_SHADOW_MARKUP + PIN_BODY_MARKUP과 동일 path).
// 티어드롭은 원이 아니라 공유 shadow 레이어를 못 쓰므로 그림자(ellipse)를 그대로 굽는다.
const SELECTED_LOCATION_PIN_SVG =
  `<svg width="40" height="47" viewBox="0 0 24 28" xmlns="http://www.w3.org/2000/svg">` +
  `<ellipse cx="12" cy="24.3" rx="4.5" ry="1.5" fill="#9AA5A8" fill-opacity="0.5"/>` +
  `<path d="M12 1.5C7.03 1.5 3 5.53 3 10.5c0 6.02 6.44 12.02 8.28 13.62.41.36 1.03.36 1.44 0C14.56 22.52 21 16.52 21 10.5 21 5.53 16.97 1.5 12 1.5Z" fill="#FC7045"/>` +
  `<circle cx="12" cy="10.5" r="3.25" fill="#ffffff"/></svg>`

const PIN_QUESTION_ICON_ID = "pin-question"
const PIN_MEETING_NO_IMAGE_ICON_ID = "pin-meeting-no-image"
const SELECTED_LOCATION_ICON_ID = "selected-location-pin"

async function rasterizeSvg(
  svg: string,
  cssWidth: number,
  cssHeight: number,
  pixelRatio = 2
): Promise<{ imageData: ImageData; pixelRatio: number }> {
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  const image = new Image()
  image.src = url
  await image.decode()

  const width = cssWidth * pixelRatio
  const height = cssHeight * pixelRatio
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("2d context를 만들 수 없습니다")
  ctx.drawImage(image, 0, 0, width, height)

  return { imageData: ctx.getImageData(0, 0, width, height), pixelRatio }
}

async function registerIcon(
  map: MaplibreMap,
  id: string,
  svg: string,
  width: number,
  height: number
): Promise<void> {
  if (map.hasImage(id)) return
  const { imageData, pixelRatio } = await rasterizeSvg(svg, width, height)
  map.addImage(id, imageData, { pixelRatio })
}

async function registerStaticIcons(map: MaplibreMap): Promise<void> {
  await Promise.all([
    registerIcon(map, PIN_QUESTION_ICON_ID, QUESTION_PIN_SVG, 44, 44),
    registerIcon(map, PIN_MEETING_NO_IMAGE_ICON_ID, MEETING_NO_IMAGE_PIN_SVG, 44, 44),
    registerIcon(map, SELECTED_LOCATION_ICON_ID, SELECTED_LOCATION_PIN_SVG, 40, 47),
  ])
}

export {
  registerStaticIcons,
  rasterizeSvg,
  PIN_QUESTION_ICON_ID,
  PIN_MEETING_NO_IMAGE_ICON_ID,
  SELECTED_LOCATION_ICON_ID,
}
```

- [ ] **Step 2: 타입체크로 문법·타입 오류만 확인(유닛 테스트 없음)**

```bash
pnpm typecheck
```

Expected: 에러 없음(Task 9에서 다시 한번 실행해 전체 프로젝트 기준으로 최종 확인한다).

- [ ] **Step 3: 커밋**

```bash
git add src/features/map/lib/marker-static-icons.ts
git commit -m "feat: #493 정적 마커 아이콘 래스터화 추가"
```

---

### Task 4: MapLibre 레이어/소스 스펙

**Files:**
- Create: `src/features/map/lib/marker-layers.ts`
- Test: `src/features/map/lib/marker-layers.test.ts`

**Interfaces:**
- Consumes: `maplibre-gl`의 `LayerSpecification` 타입만(값 의존 없음).
- Produces: 소스 id 상수(`MARKERS_SOURCE_ID`, `USER_LOCATION_SOURCE_ID`, `SELECTED_LOCATION_SOURCE_ID`), 레이어 id 상수(`MARKER_SHADOW_LAYER_ID`, `MARKER_ICON_LAYER_ID`, `CLUSTER_FILL_LAYER_ID`, `CLUSTER_COUNT_LAYER_ID`, `USER_LOCATION_HALO_LAYER_ID`, `USER_LOCATION_RING_LAYER_ID`, `USER_LOCATION_CORE_LAYER_ID`, `SELECTED_LOCATION_LAYER_ID`), `MARKER_LAYER_SPECS: readonly LayerSpecification[]`(그려지는 순서 그대로) — Task 5가 `addSource`/`addLayer`에 그대로 쓴다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/features/map/lib/marker-layers.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import {
  MARKER_LAYER_SPECS,
  MARKER_SHADOW_LAYER_ID,
  SELECTED_LOCATION_LAYER_ID,
  MARKER_ICON_LAYER_ID,
} from "./marker-layers.ts"

test("shadow 레이어가 목록의 맨 아래(첫 항목)에 온다 — 모든 마커 아래 깔려야 한다", () => {
  assert.equal(MARKER_LAYER_SPECS[0].id, MARKER_SHADOW_LAYER_ID)
})

test("선택 위치 레이어가 목록의 맨 위(마지막 항목)에 온다 — 항상 최상단에 그려져야 한다(#412)", () => {
  assert.equal(MARKER_LAYER_SPECS[MARKER_LAYER_SPECS.length - 1].id, SELECTED_LOCATION_LAYER_ID)
})

test("marker-icon 레이어는 pin 종류에만 적용되는 filter를 가진다", () => {
  const iconSpec = MARKER_LAYER_SPECS.find((spec: { id: string }) => spec.id === MARKER_ICON_LAYER_ID)
  assert.deepEqual(iconSpec?.filter, ["==", ["get", "kind"], "pin"])
})

test("레이어 id는 전부 유일하다", () => {
  const ids = MARKER_LAYER_SPECS.map((spec: { id: string }) => spec.id)
  assert.equal(new Set(ids).size, ids.length)
})
```

- [ ] **Step 2: 테스트 실행해 실패 확인**

```bash
node --test src/features/map/lib/marker-layers.test.ts
```

Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현 작성**

`src/features/map/lib/marker-layers.ts`:

```ts
// MapLibre 소스/레이어 id와 페인트/레이아웃 스펙을 한곳에 모은다. 실제 addSource/addLayer
// 호출은 use-marker-layers.ts가 한다 — 여기는 순수 데이터.

import type { LayerSpecification } from "maplibre-gl"

const MARKERS_SOURCE_ID = "ieum-markers"
const USER_LOCATION_SOURCE_ID = "ieum-user-location"
const SELECTED_LOCATION_SOURCE_ID = "ieum-selected-location"

const MARKER_SHADOW_LAYER_ID = "marker-shadow"
const MARKER_ICON_LAYER_ID = "marker-icon"
const CLUSTER_FILL_LAYER_ID = "cluster-fill"
const CLUSTER_COUNT_LAYER_ID = "cluster-count"
const USER_LOCATION_HALO_LAYER_ID = "user-location-halo"
const USER_LOCATION_RING_LAYER_ID = "user-location-ring"
const USER_LOCATION_CORE_LAYER_ID = "user-location-core"
const SELECTED_LOCATION_LAYER_ID = "selected-location"

const GRAY_900 = "#1f2324" // --color-gray-900 (ClusterPin 배경)
const LIVE_ACCENT = "#FC7045" // map-center-pin.tsx PIN_ACCENT와 동일 값

// 44px 원 마커의 반지름(px). 핀/클러스터/스택 공통.
const MARKER_RADIUS = 22

// box-shadow: 0 2px 4px rgba(0,0,0,.25) 근사치. circle-blur는 CSS 가우시안 블러와 커널이
// 달라 완전히 동일하진 않다 — 실기기 확인 후 조정 대상(설계 문서 참고). 이 레이어가
// 핀/클러스터/스택 클릭의 히트테스트 대상도 겸한다(원 지오메트리라 네이티브 원형 히트테스트).
const MARKER_SHADOW_SPEC: LayerSpecification = {
  id: MARKER_SHADOW_LAYER_ID,
  type: "circle",
  source: MARKERS_SOURCE_ID,
  paint: {
    "circle-radius": MARKER_RADIUS,
    "circle-color": "#000000",
    "circle-opacity": 0.25,
    "circle-blur": 0.6,
    "circle-translate": [0, 2],
  },
}

// pin은 symbol(marker-icon)이 그리고, cluster/stack은 이 원(비주얼 전용, 클릭은 shadow가 담당).
const CLUSTER_FILL_SPEC: LayerSpecification = {
  id: CLUSTER_FILL_LAYER_ID,
  type: "circle",
  source: MARKERS_SOURCE_ID,
  filter: ["in", ["get", "kind"], ["literal", ["cluster", "stack"]]],
  paint: {
    "circle-radius": MARKER_RADIUS,
    "circle-color": GRAY_900,
  },
}

const CLUSTER_COUNT_SPEC: LayerSpecification = {
  id: CLUSTER_COUNT_LAYER_ID,
  type: "symbol",
  source: MARKERS_SOURCE_ID,
  filter: ["in", ["get", "kind"], ["literal", ["cluster", "stack"]]],
  layout: {
    "text-field": ["get", "countLabel"],
    "text-size": 15,
    "text-allow-overlap": true,
    "text-ignore-placement": true,
  },
  paint: {
    "text-color": "#ffffff",
  },
}

// 비주얼 전용(클릭은 marker-shadow가 담당 — symbol layer 히트테스트는 alpha가 아니라
// 사각 bbox 기준이라 원형 판정을 못 준다).
const MARKER_ICON_SPEC: LayerSpecification = {
  id: MARKER_ICON_LAYER_ID,
  type: "symbol",
  source: MARKERS_SOURCE_ID,
  filter: ["==", ["get", "kind"], "pin"],
  layout: {
    "icon-image": ["get", "iconId"],
    "icon-size": 1,
    "icon-allow-overlap": true,
    "icon-ignore-placement": true,
  },
}

function userLocationCircleSpec(id: string, radius: number, opacity: number): LayerSpecification {
  return {
    id,
    type: "circle",
    source: USER_LOCATION_SOURCE_ID,
    paint: {
      "circle-radius": radius,
      "circle-color": LIVE_ACCENT,
      "circle-opacity": opacity,
    },
  }
}

// map-canvas.tsx의 USER_LOCATION_HALO_SIZE(44→반지름22)/RING_SIZE(24→12)/CORE_SIZE(14→7)와
// 오파시티(0.15/0.3/코어는 불투명) 그대로.
const USER_LOCATION_HALO_SPEC = userLocationCircleSpec(USER_LOCATION_HALO_LAYER_ID, 22, 0.15)
const USER_LOCATION_RING_SPEC = userLocationCircleSpec(USER_LOCATION_RING_LAYER_ID, 12, 0.3)
const USER_LOCATION_CORE_SPEC = userLocationCircleSpec(USER_LOCATION_CORE_LAYER_ID, 7, 1)

const SELECTED_LOCATION_SPEC: LayerSpecification = {
  id: SELECTED_LOCATION_LAYER_ID,
  type: "symbol",
  source: SELECTED_LOCATION_SOURCE_ID,
  layout: {
    "icon-image": "selected-location-pin",
    "icon-size": 1,
    "icon-anchor": "bottom",
    "icon-offset": [0, 6],
    "icon-allow-overlap": true,
    "icon-ignore-placement": true,
  },
}

// 그려지는 순서 그대로: 아래(핀) → 위(선택 위치). 원본 zIndexOffset 순서(#302, #412)와 동치.
const MARKER_LAYER_SPECS: readonly LayerSpecification[] = [
  MARKER_SHADOW_SPEC,
  MARKER_ICON_SPEC,
  CLUSTER_FILL_SPEC,
  CLUSTER_COUNT_SPEC,
  USER_LOCATION_HALO_SPEC,
  USER_LOCATION_RING_SPEC,
  USER_LOCATION_CORE_SPEC,
  SELECTED_LOCATION_SPEC,
]

export {
  MARKERS_SOURCE_ID,
  USER_LOCATION_SOURCE_ID,
  SELECTED_LOCATION_SOURCE_ID,
  MARKER_SHADOW_LAYER_ID,
  MARKER_ICON_LAYER_ID,
  CLUSTER_FILL_LAYER_ID,
  CLUSTER_COUNT_LAYER_ID,
  USER_LOCATION_HALO_LAYER_ID,
  USER_LOCATION_RING_LAYER_ID,
  USER_LOCATION_CORE_LAYER_ID,
  SELECTED_LOCATION_LAYER_ID,
  MARKER_RADIUS,
  MARKER_LAYER_SPECS,
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
node --test src/features/map/lib/marker-layers.test.ts
```

Expected: `# pass 4`, `# fail 0`.

- [ ] **Step 5: 커밋**

```bash
git add src/features/map/lib/marker-layers.ts src/features/map/lib/marker-layers.test.ts
git commit -m "feat: #493 MapLibre 마커 레이어/소스 스펙 추가"
```

---

### Task 5: `useMarkerLayers` 훅 — 소스/레이어/이미지/클릭 이벤트 배선

Task 1~4의 순수 모듈을 실제 MapLibre map 인스턴스에 연결하는 글루 코드다. DOM/WebGL API에 의존해 Node 유닛 테스트가 불가능하다(기존 `map-canvas.tsx`/`vector-tile-layer.tsx`와 동일 — 실기기 확인은 Task 9).

**Files:**
- Create: `src/features/map/hooks/use-marker-layers.ts`

**Interfaces:**
- Consumes: `MarkerImageCache`(Task 2), `buildMarkerFeatureCollection`(Task 1), `MARKER_LAYER_SPECS`/각종 id 상수(Task 4), `registerStaticIcons`/`PIN_QUESTION_ICON_ID`/`PIN_MEETING_NO_IMAGE_ICON_ID`(Task 3), `getClusterExpansionZoom`/`getClusterLeaves`/`getCoincidentClusterPins`(`cluster-index.ts`, 기존), `resolveFileUrl`(`src/lib/api/file-url.ts`, 기존).
- Produces: `useMarkerLayers(options: UseMarkerLayersOptions): void` — Task 7(`map-canvas.tsx`)이 `usePinClusters`의 `items`/`index`와 함께 호출한다.

- [ ] **Step 1: 구현 작성**

`src/features/map/hooks/use-marker-layers.ts`:

```ts
"use client"

import type { GeoJSONSource, LngLatBoundsLike, Map as MaplibreMap, MapLayerMouseEvent } from "maplibre-gl"
import { LngLatBounds } from "maplibre-gl"
import * as React from "react"

import type { MapPin } from "@/features/map/api/pin-types"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import {
  getClusterExpansionZoom,
  getClusterLeaves,
  getCoincidentClusterPins,
  type PinClusterIndex,
  type PinClusterItem,
} from "@/features/map/lib/cluster-index"
import { buildMarkerFeatureCollection } from "@/features/map/lib/marker-geojson"
import { MarkerImageCache } from "@/features/map/lib/marker-image-cache"
import {
  MARKER_LAYER_SPECS,
  MARKER_SHADOW_LAYER_ID,
  MARKERS_SOURCE_ID,
  SELECTED_LOCATION_LAYER_ID,
  SELECTED_LOCATION_SOURCE_ID,
  USER_LOCATION_SOURCE_ID,
} from "@/features/map/lib/marker-layers"
import {
  PIN_MEETING_NO_IMAGE_ICON_ID,
  PIN_QUESTION_ICON_ID,
  registerStaticIcons,
} from "@/features/map/lib/marker-static-icons"
import { resolveFileUrl } from "@/lib/api/file-url"

// clustered-pins.tsx의 EXPAND_EDGE_PADDING과 동일 값.
const EXPAND_EDGE_PADDING = 24

interface UseMarkerLayersOptions {
  glMap: MaplibreMap | null
  items: PinClusterItem[]
  index: PinClusterIndex
  pins: MapPin[]
  livePosition?: Coordinates | null
  selectedPosition?: Coordinates | null
  topInset?: number
  bottomInset?: number
  onPinClick?: (pin: MapPin) => void
  onPinStackClick?: (pins: MapPin[]) => void
  onSelectedPositionClick?: () => void
}

const EMPTY_FEATURE_COLLECTION = { type: "FeatureCollection" as const, features: [] }

interface MarkerClickProperties {
  kind: "pin" | "cluster" | "stack"
  pinId?: number
  clusterId?: number
  stackPinIds?: number[]
}

function pointFeatureCollection(position: Coordinates | null | undefined) {
  if (!position) return EMPTY_FEATURE_COLLECTION
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [position.lng, position.lat] },
        properties: {},
      },
    ],
  }
}

// 핀/클러스터/내 위치/선택 위치를 MapLibre 네이티브 레이어(GeoJSON source + circle/symbol
// layer)로 그린다. Leaflet DOM 마커(예전 pin-marker.tsx/cluster-marker.tsx/clustered-pins.tsx +
// map-canvas.tsx의 selectedLocationIcon/userLocationIcon)를 전부 대체한다.
function useMarkerLayers(options: UseMarkerLayersOptions): void {
  const {
    glMap,
    items,
    index,
    pins,
    livePosition,
    selectedPosition,
    topInset = 0,
    bottomInset = 0,
    onPinClick,
    onPinStackClick,
    onSelectedPositionClick,
  } = options

  const imageCacheRef = React.useRef<MarkerImageCache | null>(null)
  // 썸네일 로딩이 끝나면 이 값을 올려 markers 소스를 다시 그린다(아래 effect 2).
  const [imageVersion, setImageVersion] = React.useState(0)

  // 최신 값/콜백을 ref로 받아 아래 effect들이 매 렌더 재구독하지 않게 한다
  // (map-canvas.tsx의 기존 관례: onClickRef 패턴).
  const pinsRef = React.useRef(pins)
  const indexRef = React.useRef(index)
  const insetsRef = React.useRef({ topInset, bottomInset })
  const onPinClickRef = React.useRef(onPinClick)
  const onPinStackClickRef = React.useRef(onPinStackClick)
  const onSelectedPositionClickRef = React.useRef(onSelectedPositionClick)

  React.useEffect(() => {
    pinsRef.current = pins
    indexRef.current = index
    insetsRef.current = { topInset, bottomInset }
    onPinClickRef.current = onPinClick
    onPinStackClickRef.current = onPinStackClick
    onSelectedPositionClickRef.current = onSelectedPositionClick
  })

  // 1) glMap 인스턴스가 생길 때(스타일 최초 로드) 소스·레이어·정적 아이콘·클릭 리스너를 만든다.
  //    이 코드베이스는 setStyle()을 호출하지 않으므로(vector-tile-layer.tsx 참고 — 스타일은
  //    L.maplibreGL({style}) 생성 시 한 번만 정해진다) glMap identity당 1회로 충분하다.
  React.useEffect(() => {
    if (!glMap) return

    let disposed = false
    imageCacheRef.current = new MarkerImageCache(glMap)

    if (!glMap.getSource(MARKERS_SOURCE_ID)) {
      glMap.addSource(MARKERS_SOURCE_ID, { type: "geojson", data: EMPTY_FEATURE_COLLECTION })
    }
    if (!glMap.getSource(USER_LOCATION_SOURCE_ID)) {
      glMap.addSource(USER_LOCATION_SOURCE_ID, { type: "geojson", data: EMPTY_FEATURE_COLLECTION })
    }
    if (!glMap.getSource(SELECTED_LOCATION_SOURCE_ID)) {
      glMap.addSource(SELECTED_LOCATION_SOURCE_ID, { type: "geojson", data: EMPTY_FEATURE_COLLECTION })
    }

    for (const spec of MARKER_LAYER_SPECS) {
      if (!glMap.getLayer(spec.id)) glMap.addLayer(spec)
    }

    // 정적 아이콘이 등록되기 전에는 pin feature의 iconId가 아직 없는 이미지를 가리킨다 —
    // 등록이 끝나면 imageVersion을 올려 markers 소스를 다시 그리게 한다.
    void registerStaticIcons(glMap).then(() => {
      if (!disposed) setImageVersion((version) => version + 1)
    })

    const handleClusterExpand = (clusterId: number) => {
      const coincidentPins = getCoincidentClusterPins(indexRef.current, clusterId)
      if (coincidentPins) {
        onPinStackClickRef.current?.(coincidentPins)
        return
      }

      const leaves = getClusterLeaves(indexRef.current, clusterId)
      if (leaves.length === 0) return

      const expansionZoom = getClusterExpansionZoom(indexRef.current, clusterId)
      const bounds = leaves.reduce(
        (acc, pin) => acc.extend([pin.location.lng, pin.location.lat]),
        new LngLatBounds(
          [leaves[0].location.lng, leaves[0].location.lat],
          [leaves[0].location.lng, leaves[0].location.lat]
        )
      )

      const { topInset: top, bottomInset: bottom } = insetsRef.current
      glMap.fitBounds(bounds as LngLatBoundsLike, {
        padding: {
          top: top + EXPAND_EDGE_PADDING,
          bottom: bottom + EXPAND_EDGE_PADDING,
          left: EXPAND_EDGE_PADDING,
          right: EXPAND_EDGE_PADDING,
        },
        maxZoom: expansionZoom,
      })
    }

    const handleMarkerClick = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0]
      const properties = feature?.properties as MarkerClickProperties | undefined
      if (!properties) return

      if (properties.kind === "pin" && properties.pinId !== undefined) {
        const pin = pinsRef.current.find((candidate) => candidate.pinId === properties.pinId)
        if (pin) onPinClickRef.current?.(pin)
        return
      }

      if (properties.kind === "cluster" && properties.clusterId !== undefined) {
        handleClusterExpand(properties.clusterId)
        return
      }

      if (properties.kind === "stack" && properties.stackPinIds) {
        const stackPins = properties.stackPinIds
          .map((pinId) => pinsRef.current.find((candidate) => candidate.pinId === pinId))
          .filter((pin): pin is MapPin => pin !== undefined)
        if (stackPins.length > 0) onPinStackClickRef.current?.(stackPins)
      }
    }

    const handleSelectedClick = () => onSelectedPositionClickRef.current?.()
    const setPointerCursor = () => {
      glMap.getCanvas().style.cursor = "pointer"
    }
    const resetCursor = () => {
      glMap.getCanvas().style.cursor = ""
    }

    glMap.on("click", MARKER_SHADOW_LAYER_ID, handleMarkerClick)
    glMap.on("click", SELECTED_LOCATION_LAYER_ID, handleSelectedClick)
    glMap.on("mouseenter", MARKER_SHADOW_LAYER_ID, setPointerCursor)
    glMap.on("mouseleave", MARKER_SHADOW_LAYER_ID, resetCursor)
    glMap.on("mouseenter", SELECTED_LOCATION_LAYER_ID, setPointerCursor)
    glMap.on("mouseleave", SELECTED_LOCATION_LAYER_ID, resetCursor)

    return () => {
      disposed = true
      glMap.off("click", MARKER_SHADOW_LAYER_ID, handleMarkerClick)
      glMap.off("click", SELECTED_LOCATION_LAYER_ID, handleSelectedClick)
      glMap.off("mouseenter", MARKER_SHADOW_LAYER_ID, setPointerCursor)
      glMap.off("mouseleave", MARKER_SHADOW_LAYER_ID, resetCursor)
      glMap.off("mouseenter", SELECTED_LOCATION_LAYER_ID, setPointerCursor)
      glMap.off("mouseleave", SELECTED_LOCATION_LAYER_ID, resetCursor)
    }
  }, [glMap])

  // 2) 핀/클러스터 데이터가 바뀔 때마다 markers 소스를 갱신한다. imageVersion이 오르면
  //    (정적 아이콘 등록 완료 또는 썸네일 로드 완료) iconId가 갱신된 데이터로 다시 흘려보낸다.
  React.useEffect(() => {
    if (!glMap) return
    const source = glMap.getSource<GeoJSONSource>(MARKERS_SOURCE_ID)
    if (!source) return

    const cache = imageCacheRef.current
    const resolveIconId = (pin: MapPin): string => {
      if (pin.pinType === "question") return PIN_QUESTION_ICON_ID

      const thumbnailUrl = resolveFileUrl(pin.thumbnailUrl)
      if (!thumbnailUrl || !cache) return PIN_MEETING_NO_IMAGE_ICON_ID

      const cachedId = cache.getOrLoad(thumbnailUrl, () => setImageVersion((version) => version + 1))
      return cachedId ?? PIN_MEETING_NO_IMAGE_ICON_ID
    }

    source.setData(buildMarkerFeatureCollection(items, resolveIconId))
    // imageVersion은 값 자체를 안 쓰지만, 오를 때 위 setData를 다시 실행시키는 트리거다.
  }, [glMap, items, imageVersion])

  // 3) 내 위치 소스.
  React.useEffect(() => {
    if (!glMap) return
    const source = glMap.getSource<GeoJSONSource>(USER_LOCATION_SOURCE_ID)
    if (!source) return
    source.setData(pointFeatureCollection(livePosition))
  }, [glMap, livePosition])

  // 4) 선택 위치 소스.
  React.useEffect(() => {
    if (!glMap) return
    const source = glMap.getSource<GeoJSONSource>(SELECTED_LOCATION_SOURCE_ID)
    if (!source) return
    source.setData(pointFeatureCollection(selectedPosition))
  }, [glMap, selectedPosition])
}

export { useMarkerLayers }
```

- [ ] **Step 2: 타입체크**

```bash
pnpm typecheck
```

Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/features/map/hooks/use-marker-layers.ts
git commit -m "feat: #493 useMarkerLayers 훅 추가 — 마커 레이어/클릭 배선"
```

---

### Task 6: `VectorTileLayer`가 내부 MapLibre map 인스턴스를 노출

**Files:**
- Modify: `src/features/map/components/vector-tile-layer.tsx`

**Interfaces:**
- Consumes: 없음(기존 파일에 콜백 prop만 추가).
- Produces: `onMapReady?: (map: MaplibreMap | null) => void` prop — Task 7이 `map-canvas.tsx`에서 이 콜백으로 `glMap` 상태를 받아 `useMarkerLayers`에 넘긴다.

- [ ] **Step 1: `onMapReady` prop 추가**

`vector-tile-layer.tsx`의 함수 시그니처와 glMap 상태 effect를 수정한다:

```ts
function VectorTileLayer({
  onReady,
  onMapReady,
}: {
  onReady?: () => void
  onMapReady?: (map: MaplibreMap | null) => void
}) {
  const map = useMap()
  const language = useLanguageStore((state) => state.language)

  const [glMap, setGlMap] = React.useState<MaplibreMap | null>(null)

  const onReadyRef = React.useRef(onReady)
  React.useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])

  const onMapReadyRef = React.useRef(onMapReady)
  React.useEffect(() => {
    onMapReadyRef.current = onMapReady
  }, [onMapReady])
```

기존 `React.useEffect(() => { ... }, [map])` 블록 안에서 `setGlMap(instance)`를 호출하는 지점(`instance.on("error", handleMapError); setGlMap(instance)`) 바로 아래에 다음 줄을 추가한다:

```ts
        instance.on("error", handleMapError)
        setGlMap(instance)
        onMapReadyRef.current?.(instance)
```

같은 effect의 cleanup(`setGlMap(null)` 호출부) 바로 아래에도 추가한다:

```ts
      cancelled = true
      instance?.off("error", handleMapError)
      setGlMap(null)
      onMapReadyRef.current?.(null)
```

- [ ] **Step 2: 타입체크 + 빌드**

```bash
pnpm typecheck
pnpm build
```

Expected: 에러 없음. (이 시점에는 아직 `onMapReady`를 호출하는 부모가 없어 동작 변화는 없다 — 순수 추가.)

- [ ] **Step 3: 커밋**

```bash
git add src/features/map/components/vector-tile-layer.tsx
git commit -m "feat: #493 VectorTileLayer에 onMapReady 콜백 추가"
```

---

### Task 7: `map-canvas.tsx` 재배선 — Leaflet 마커 제거, `useMarkerLayers` 연결

**Files:**
- Modify: `src/features/map/components/map-canvas.tsx`

**Interfaces:**
- Consumes: `useMarkerLayers`(Task 5), `onMapReady` prop(Task 6), `usePinClusters`(기존, `src/features/map/hooks/use-pin-clusters.ts` — 지금까지는 `clustered-pins.tsx` 안에서만 호출됐는데 이제 `MapCanvas`가 직접 호출한다. `usePinClusters`는 `useMap()`을 쓰므로 `MapContainer` 하위 컴포넌트에서 호출해야 한다 — 아래처럼 별도 자식 컴포넌트로 감싼다).
- Produces: 기존 `MapCanvas` prop 인터페이스(`onPinClick`, `onPinStackClick`, `selectedPosition`, `onSelectedPositionClick`, `livePosition` 등) 그대로 유지 — `home-map-screen.tsx`는 변경 없음.

**배경**: `usePinClusters`는 `useMap()`(react-leaflet)을 쓰는 훅이라 `MapContainer` 하위에서만 호출 가능하다. `useMarkerLayers`는 `glMap`(MapLibre 인스턴스, React state)이 필요하다. 이 둘을 한 컴포넌트(`MarkerLayerBridge`)로 묶어 `MapContainer` 자식으로 렌더한다.

- [ ] **Step 1: import 정리 — 더는 안 쓰는 것 제거, 새로 쓰는 것 추가**

제거: `import { MapContainer, Marker, useMap } from "react-leaflet"` → `Marker` 제거(`MapContainer`, `useMap`은 유지, 파일 안에 `MapCenterUpdater` 등 다른 곳에서 여전히 씀). `import { ClusteredPins } from "@/features/map/components/clustered-pins"` 제거. `import { PIN_ACCENT, PIN_COMBINED_SVG } from "@/features/map/components/map-center-pin"` 제거(더는 이 파일에서 안 씀 — 아이콘은 `marker-static-icons.ts`로 이전됨).

추가:

```ts
import type { Map as MaplibreMap } from "maplibre-gl"

import { usePinClusters } from "@/features/map/hooks/use-pin-clusters"
import { useMarkerLayers } from "@/features/map/hooks/use-marker-layers"
```

- [ ] **Step 2: 정적 아이콘/오프셋 상수와 `ActiveMarker`, `selectedLocationIcon`, `userLocationIcon` 제거**

다음 블록을 통째로 삭제한다(각각 Task 3/4/5로 대체됨):
- `const LIVE_ACCENT = PIN_ACCENT`
- `const selectedLocationIcon = L.divIcon({...})`
- `const USER_LOCATION_Z_OFFSET`, `const SELECTED_LOCATION_Z_OFFSET`
- `const USER_LOCATION_SIZE` ~ `const userLocationIcon = L.divIcon({...})` 전체
- `function ActiveMarker(...)` 전체(react-leaflet `Marker`를 안전하게 마운트하던 헬퍼 — 이제 Leaflet `Marker`를 아예 안 쓰므로 불필요)

- [ ] **Step 3: `MarkerLayerBridge` 자식 컴포넌트 추가**

`MapBoundsWatcher` 함수 정의 바로 아래(같은 파일 안, `MapSizeObserver` 앞)에 추가:

```ts
// usePinClusters(react-leaflet useMap 필요)와 useMarkerLayers(MapLibre glMap 필요)를 한곳에서
// 호출해 MapContainer 자식으로 렌더한다. 렌더 출력은 없다(return null).
function MarkerLayerBridge({
  glMap,
  pins,
  onPinClick,
  onPinStackClick,
  livePosition,
  selectedPosition,
  onSelectedPositionClick,
  topInset,
  bottomInset,
}: {
  glMap: MaplibreMap | null
  pins: MapPin[]
  onPinClick?: (pin: MapPin) => void
  onPinStackClick?: (pins: MapPin[]) => void
  livePosition?: Coordinates | null
  selectedPosition?: Coordinates | null
  onSelectedPositionClick?: () => void
  topInset?: number
  bottomInset?: number
}) {
  // 해결된 질문은 지도와 클러스터 모두에서 제외한다 — clustered-pins.tsx의 기존 필터 그대로.
  const visiblePins = React.useMemo(() => pins.filter((pin) => !pin.resolved), [pins])
  const { items, index } = usePinClusters(visiblePins)

  useMarkerLayers({
    glMap,
    items,
    index,
    pins: visiblePins,
    livePosition,
    selectedPosition,
    topInset,
    bottomInset,
    onPinClick,
    onPinStackClick,
    onSelectedPositionClick,
  })

  return null
}
```

- [ ] **Step 4: `MapCanvas` 본체에서 `glMap` state 추가, JSX 교체**

`MapCanvas` 함수 안, `mapContainerKey`/`moveGate` state 선언 바로 아래에 추가:

```ts
  const [glMap, setGlMap] = React.useState<import("maplibre-gl").Map | null>(null)
```

JSX에서 `<VectorTileLayer onReady={onReady} />`를 다음으로 교체:

```tsx
      <VectorTileLayer onReady={onReady} onMapReady={setGlMap} />
```

다음 JSX 블록 전체:

```tsx
      {pins && pins.length > 0 && (
        <ClusteredPins
          pins={pins}
          onPinClick={onPinClick}
          onPinStackClick={onPinStackClick}
          topInset={topInset}
          bottomInset={bottomInset}
        />
      )}
      {selectedPosition && (
        <ActiveMarker
          position={[selectedPosition.lat, selectedPosition.lng]}
          icon={selectedLocationIcon}
          zIndexOffset={SELECTED_LOCATION_Z_OFFSET}
          eventHandlers={onSelectedPositionClick ? { click: onSelectedPositionClick } : undefined}
        />
      )}
      {livePosition && (
        <ActiveMarker
          position={[livePosition.lat, livePosition.lng]}
          icon={userLocationIcon}
          zIndexOffset={USER_LOCATION_Z_OFFSET}
          interactive={false}
        />
      )}
```

을 다음으로 교체:

```tsx
      <MarkerLayerBridge
        glMap={glMap}
        pins={pins ?? []}
        onPinClick={onPinClick}
        onPinStackClick={onPinStackClick}
        livePosition={livePosition}
        selectedPosition={selectedPosition}
        onSelectedPositionClick={onSelectedPositionClick}
        topInset={topInset}
        bottomInset={bottomInset}
      />
```

`import type { MapBounds, MapPin } from "@/features/map/api/pin-types"`는 이미 파일 상단에 있으니 그대로 둔다(`MarkerLayerBridge`가 `MapPin` 타입을 씀).

- [ ] **Step 5: 타입체크 + 빌드**

```bash
pnpm typecheck
pnpm build
```

Expected: 에러 없음. (`ClusteredPins`/`pin-marker.tsx`/`cluster-marker.tsx`는 Task 8에서 지우기 전까지는 아직 파일이 남아 있어 미사용 import 경고 정도만 있을 수 있다 — `pnpm lint`로 확인.)

```bash
pnpm lint
```

Expected: `map-canvas.tsx`에 미사용 import 관련 에러 없음(Step 1에서 이미 제거했으므로).

- [ ] **Step 6: 커밋**

```bash
git add src/features/map/components/map-canvas.tsx
git commit -m "feat: #493 map-canvas에서 Leaflet 마커를 MapLibre 레이어로 교체"
```

---

### Task 8: 옛 Leaflet 마커 컴포넌트 삭제

**Files:**
- Delete: `src/features/map/components/pin-marker.tsx`
- Delete: `src/features/map/components/cluster-marker.tsx`
- Delete: `src/features/map/components/clustered-pins.tsx`

**Interfaces:**
- Consumes: 없음.
- Produces: 없음(삭제만).

- [ ] **Step 1: 참조하는 곳이 없는지 확인**

```bash
grep -rn "pin-marker\|cluster-marker\|clustered-pins" src/ --include="*.ts" --include="*.tsx"
```

Expected: 결과 없음(Task 7에서 `map-canvas.tsx`의 참조를 이미 제거했으므로).

- [ ] **Step 2: 파일 삭제**

```bash
git rm src/features/map/components/pin-marker.tsx src/features/map/components/cluster-marker.tsx src/features/map/components/clustered-pins.tsx
```

- [ ] **Step 3: 타입체크 + 빌드 + lint**

```bash
pnpm typecheck
pnpm lint
pnpm build
```

Expected: 전부 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git commit -m "refactor: #493 옛 Leaflet 마커 컴포넌트 제거(pin-marker/cluster-marker/clustered-pins)"
```

---

### Task 9: 전체 검증 · 실기기 확인 · 이슈 체크리스트 반영 · PR

**Files:** 없음(검증/문서/PR 작업).

- [ ] **Step 1: 남은 유닛 테스트 전부 통과 확인(회귀 없음)**

```bash
source ~/.nvm/nvm.sh && nvm use 22
node --test src/features/map/lib/cluster-index.test.ts
node --test src/features/map/lib/marker-geojson.test.ts
node --test src/features/map/lib/marker-image-cache.test.ts
node --test src/features/map/lib/marker-layers.test.ts
```

Expected: 전부 `# fail 0`.

- [ ] **Step 2: 정적 검사 전체**

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm verify:out
```

Expected: 전부 클린. (`pnpm verify`의 `test:contracts` 단계는 로컬 Node 20 환경 특유의 기존 이슈라 건너뛴다 — Global Constraints 참고.)

- [ ] **Step 3: 로컬 개발 서버로 실기기(또는 모바일 뷰포트 크롬 DevTools) 확인**

```bash
pnpm dev
```

체크리스트(전부 통과해야 완료):
- 홈 지도를 빠르게 드래그해도 핀/클러스터/내 위치/선택 위치가 베이스맵과 같은 속도로 움직인다(원래 문제였던 지연이 사라졌는지).
- 질문 핀(흰 원 + 물음표), 모임 핀(썸네일 원형 크롭 또는 no-image 회색 원), 클러스터(다크 원 + 흰 숫자)가 기존과 같은 모양·그림자로 보인다.
- 내 위치 마커(헤일로/링/코어 3중 원)가 기존과 같은 크기·투명도로 보인다.
- 검색으로 장소를 선택하면 선택 위치 티어드롭 핀이 뜨고, 탭하면 사라진다(`onSelectedPositionClick`).
- 핀을 탭하면 모임/질문 상세 시트가 열린다(`onPinClick`).
- 클러스터를 탭하면 확대되며 풀린다. 좌표가 완전히 같은 핀 더미를 탭하면(확대해도 안 풀리는 경우) 캐러셀(`PinStackSheet`)이 뜬다.
- 지도를 빠르게 줌인/줌아웃해도 마커가 깜빡이거나 사라지지 않는다.
- 모임 핀 썸네일이 늦게 로드되는 경우, 로드 전엔 no-image 회색 원이 보이다가 로드 완료 후 사진으로 자연스럽게 바뀐다(깜빡임 없이).

블러 값(`marker-layers.ts`의 `circle-blur: 0.6`)이 원래 CSS 그림자보다 진하거나 흐리면 이 상수를 조정하고 Step 2를 다시 돈다.

- [ ] **Step 4: 이슈 #493 체크리스트 반영**

```bash
gh issue view 493 --repo rktclgh/ieum_FE --json body -q .body
```

완료된 항목 앞의 `- [ ]`를 `- [x]`로 바꿔 `gh issue edit 493 --repo rktclgh/ieum_FE --body-file <파일>`로 갱신한다(이슈 체크리스트 동기화 규칙).

- [ ] **Step 5: 브랜치 푸시 + PR 생성**

```bash
git push -u origin refactor/#493
gh pr create --repo rktclgh/ieum_FE --base develop --title "refactor: 홈 지도 마커를 MapLibre 네이티브 레이어로 이전 (#493)" --body "$(cat <<'EOF'
## 요약
- 홈 지도 패닝 시 마커가 베이스맵 이동 속도를 못 따라가던 문제를 구조적으로 해결
- 핀/클러스터/내 위치/선택 위치를 Leaflet DOM 마커 → MapLibre GL 네이티브 레이어(GeoJSON source + circle/symbol layer)로 전환
- 비주얼(색상·크기·겹침 순서)은 그대로 유지, 렌더링 엔진만 교체
- 설계: docs/superpowers/specs/2026-07-24-map-marker-maplibre-migration-design.md

## 테스트
- [x] node --test (marker-geojson, marker-image-cache, marker-layers, cluster-index 회귀)
- [x] pnpm lint / typecheck / build / verify:out
- [x] 실기기 패닝·클릭·클러스터 확대·썸네일 로딩 확인

Closes #493

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**Spec coverage**: 설계 문서의 결정 사항 8가지(마이그레이션 범위=전체 마커/Task 1,5,7; supercluster 유지/Task 5,7; 그림자 공유 레이어/Task 4; 정적·동적 아이콘 분리/Task 2,3; 내 위치 완전 벡터/Task 4; 클릭 히트테스트 정정(shadow layer)/Task 4,5; 옛 파일 대체/Task 7,8) 전부 태스크로 커버됨. `styledata` 재등록 가드는 실제 코드에 `setStyle()` 호출이 없어(Task 5 주석에 근거 명시) 단순화했다 — 향후 `setStyle()`을 도입하면 재검토 필요.

**Placeholder scan**: "TBD"/"나중에"/"적절히 처리" 패턴 없음. 모든 스텝에 실행 가능한 코드 또는 정확한 명령어 포함.

**Type consistency**: `MarkerFeatureProperties`(Task 1) ↔ `MarkerClickProperties`(Task 5)는 클릭 핸들러가 쓰는 부분집합이라 이름이 다르지만 필드(`kind`/`pinId`/`clusterId`/`stackPinIds`)는 일치. `MarkerImageCache` 생성자 시그니처(Task 2: `(map: MaplibreMapLike, loader?)`)와 Task 5의 `new MarkerImageCache(glMap)` 호출(실제 `maplibre-gl` `Map`을 넘김 — `Map`이 `hasImage`/`addImage`를 가져 구조적으로 `MaplibreMapLike`를 만족)이 일치함을 스크래치 컴파일로 실제 확인했다. 레이어/소스 id 상수(Task 4에서 export)를 Task 5가 그대로 import해서 쓰고, 오타 없음을 스크래치 검증으로 확인했다.
