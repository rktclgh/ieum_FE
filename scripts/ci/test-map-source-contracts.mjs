import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8")

test("홈 지도 현재 위치는 정확도 반경 없이 마커 halo만 표시한다", () => {
  const canvas = read("src/features/map/components/map-canvas.tsx")
  const home = read("src/features/map/components/home-map-screen.tsx")
  // #233: 해제 중인 map에 Marker가 마운트되면 터지므로 실시간 위치도 ActiveMarker 래퍼로만 그린다.
  const liveMarkerPattern = new RegExp(
    String.raw`<ActiveMarker\b(?=[^>]*\bposition\s*=\s*\{\s*\[\s*livePosition\.lat\s*,\s*livePosition\.lng\s*\]\s*\})(?=[^>]*\bicon\s*=\s*\{\s*userLocationIcon\s*\})[^>]*\/?>`
  )

  assert.doesNotMatch(canvas, /liveAccuracy/)
  assert.doesNotMatch(canvas, /<Circle/)
  assert.match(canvas, liveMarkerPattern)
  assert.doesNotMatch(home, /liveAccuracy=\{accuracy\}/)
})

test("geolocation은 권한 거부만 최초 fallback으로 확정하고 일시 오류는 계속 대기한다", () => {
  const source = read("src/features/map/hooks/use-geolocation.ts")

  assert.match(
    source,
    /const \[initialStatus, setInitialStatus\] = React\.useState<GeolocationStatus>\("loading"\)/
  )
  assert.match(source, /resolveInitialGeolocationStatus/)
  assert.match(source, /if \(!isSupported \|\| !enabled\) return/)
  assert.match(
    source,
    /setInitialStatus\(\(currentStatus\) =>\s*resolveInitialGeolocationStatus\(currentStatus, \{ type: "success" \}\)\s*\)/
  )
  assert.match(
    source,
    /setInitialStatus\(\(currentStatus\) =>\s*resolveInitialGeolocationStatus\(currentStatus, \{\s*type: "error",\s*errorCode: error\.code,\s*\}\)\s*\)/
  )
  assert.match(source, /initialStatus: isSupported \? initialStatus : "error"/)
})

test("장소 선택 picker가 geolocation initialStatus를 map step에 전달한다", () => {
  const source = read("src/features/meetup/components/meetup-location-picker.tsx")

  assert.match(
    source,
    /const \{ position: watchedPosition, initialStatus: watchedInitialStatus \} = useGeolocation\(\{\s*enabled: !currentPosition,\s*\}\)/
  )
  assert.match(source, /const position = currentPosition \?\? watchedPosition/)
  assert.match(source, /const initialStatus: GeolocationStatus = position \? "success" : watchedInitialStatus/)
  assert.match(source, /<MeetupLocationMap[\s\S]*initialStatus=\{initialStatus\}/)
})

test("홈 GPS 위치를 모임·질문 생성 picker까지 전달한다", () => {
  const home = read("src/features/map/components/home-map-screen.tsx")
  const meetup = read("src/features/meetup/components/create-meetup-screen.tsx")
  const question = read("src/features/question/components/create-question-screen.tsx")

  assert.match(home, /<CreateMeetupScreen[\s\S]*currentPosition=\{position\}/)
  assert.match(home, /<CreateQuestionScreen[\s\S]*currentPosition=\{position\}/)
  assert.match(meetup, /currentPosition\?: Coordinates \| null/)
  assert.match(meetup, /<MeetupLocationPicker[\s\S]*currentPosition=\{currentPosition\}/)
  assert.match(question, /currentPosition\?: Coordinates \| null/)
  assert.match(question, /<CreateQuestionForm[\s\S]*currentPosition=\{currentPosition\}/)
  assert.match(question, /<MeetupLocationPicker[\s\S]*currentPosition=\{currentPosition\}/)
})

test("장소 선택 map은 최초 fallback을 고정하고 명시적 GPS 재중심으로만 해제한다", () => {
  const source = read("src/features/meetup/components/meetup-location-map.tsx")
  const handleGpsStart = source.indexOf("const handleGps = () =>")
  const handleGpsEnd = source.indexOf("\n\n  const { data: reverseGeocoded", handleGpsStart)
  const handleGps = source.slice(handleGpsStart, handleGpsEnd)

  assert.match(source, /const initialMapCenter = resolveInitialMapCenter\(\{/)
  assert.match(source, /position: isFallbackLocked \? null : position/)
  assert.match(source, /\{initialMapCenter \? \(/)
  assert.match(source, /center=\{recenterTarget \?\? initialMapCenter\}/)
  assert.doesNotMatch(source, /hasCenteredRef/)
  assert.doesNotMatch(source, /fallbackLockedRef/)
  assert.match(
    source,
    /const \[hasExplicitRecenter, setHasExplicitRecenter\] = React\.useState\(false\)/
  )
  assert.match(source, /const isFallbackLocked = initialStatus === "error" && !hasExplicitRecenter/)
  assert.match(source, /status: initialStatus/)
  assert.match(source, /const target = centerTarget/)
  assert.match(source, /disabled=\{!position\}/)
  assert.equal((source.match(/recenterTo\(position\)/g) ?? []).length, 1)
  assert.match(handleGps, /setHasExplicitRecenter\(true\)[\s\S]*recenterTo\(position\)/)
  assert.match(handleGps, /if \(!position\) return/)
})

test("장소 선택 map은 화면 고정 핀에서 좌표를 읽고 탭-투-핀으로 되돌아가지 않는다", () => {
  const source = read("src/features/meetup/components/meetup-location-map.tsx")

  // 핀은 지도 좌표에 붙은 마커가 아니라 스페이서 정중앙의 화면 고정 오버레이다. (#313)
  assert.match(source, /<MapCenterPin isLifted=\{isMoving\} \/>/)
  assert.match(source, /alignCenterToVisibleArea/)
  assert.match(source, /onCenterSettle=\{handleCenterSettle\}/)
  assert.match(source, /onCenterMoveStart=\{handleCenterMoveStart\}/)

  // 선택/해제 개념이 없어야 한다 — 이게 남아 있으면 핀 재선택 UX 문제가 되살아난다.
  assert.doesNotMatch(source, /onMapClick=/)
  assert.doesNotMatch(source, /selectedPosition=/)
  assert.doesNotMatch(source, /onSelectedPositionClick=/)

  // 인셋 보정으로 되돌아온 중심이 재조회를 유발하지 않도록 격자 단위로 dedupe한다.
  assert.match(source, /isSameCoordinate\(prev, next\) \? prev : next/)
})

test("중심 정렬은 지도 크기가 늦게 잡혀도 재시도된다", () => {
  const source = read("src/features/map/components/map-canvas.tsx")
  const start = source.indexOf("function VisibleCenterAligner")
  const aligner = source.slice(start, source.indexOf("\nfunction ", start + 1))

  // 크기가 0이면 정렬을 건너뛰는데, 인셋은 지도 마운트 전에 확정되는 경우가 많아
  // effect가 다시 돌 계기가 없다. whenReady/resize가 유일한 재시도 경로다.
  assert.match(aligner, /map\.whenReady\(align\)/)
  assert.match(aligner, /map\.on\("resize", align\)/)
  assert.match(aligner, /map\.off\("resize", align\)/)
  // 큐에 들어간 whenReady 콜백이 언마운트 뒤 실행될 수 있어 생존 확인은 align 안에 있어야 한다.
  assert.match(aligner, /const align = \(\) => \{\s*\/\/[^\n]*\n\s*if \(!isLeafletMapActive\(map\)\) return/)
})

test("보이는 영역 중심 수식은 visible-center 한 곳에서만 나온다", () => {
  const canvas = read("src/features/map/components/map-canvas.tsx")
  const screen = read("src/features/meetup/components/meetup-location-map.tsx")

  assert.match(canvas, /from "@\/features\/map\/lib\/visible-center"/)
  // 핀 위치와 조회 좌표가 어긋나지 않도록, 중심 계산을 화면 쪽에서 손으로 다시 하지 않는다.
  assert.doesNotMatch(screen, /containerPointToLatLng/)
  assert.doesNotMatch(screen, /topInset \+ \(/)
})

test("모임 마커 썸네일은 파일 URL을 정규화한다", () => {
  const source = read("src/features/map/components/pin-marker.tsx")

  assert.match(source, /import\s+\{\s*resolveFileUrl\s*\}\s+from\s+['"]@\/lib\/api\/file-url['"]/)
  assert.match(source, /const\s+thumbnailUrl\s*=\s*resolveFileUrl\(\s*pin\.thumbnailUrl\s*\)/)
  // prettier가 인자를 멀티라인 + trailing comma로 재포맷할 수 있어 둘 다 허용한다.
  assert.match(source, /escapeAttr\(\s*thumbnailUrl\s*,?\s*\)/)
  assert.doesNotMatch(source, /escapeAttr\(\s*pin\.thumbnailUrl\s*\)/)
})

test("벡터 타일 레이어는 해제된 Leaflet map에 다시 붙지 않는다", () => {
  const source = read("src/features/map/components/vector-tile-layer.tsx")
  // 정확한 코드 모양(변수명·포맷)이 아니라 "guard → 생성 → 부착" 순서가 이 계약의 불변식이다.
  const indexOfPattern = (pattern) => source.search(pattern)

  // effect 진입 시점 guard: 해제 중인 map이면 아예 시작하지 않는다.
  const mountGuardIndex = indexOfPattern(/if \(!isLeafletMapActive\(map\)\)\s*return/)
  // #209: 스타일 로드가 비동기라 그 사이 언마운트될 수 있어, 붙이기 직전에 다시 확인해야 한다.
  const asyncGuardIndex = indexOfPattern(/if \(cancelled \|\| !isLeafletMapActive\(map\)\)\s*return/)
  const layerCreationIndex = indexOfPattern(/const glLayer = L\.maplibreGL\(\{\s*style\s*,?\s*\}\)/)
  // 생성된 레이어를 cleanup이 볼 수 있도록 effect 스코프 변수에 붙잡아 둔다.
  const layerTrackIndex = indexOfPattern(/\blayer = glLayer\b/)
  const layerAddIndex = indexOfPattern(/\bglLayer\.addTo\(map\)/)

  assert.ok(mountGuardIndex >= 0, "Leaflet map 생명주기 guard가 있어야 한다")
  assert.ok(
    asyncGuardIndex > mountGuardIndex,
    "비동기 스타일 로드 뒤에도 map 생명주기를 다시 확인해야 한다"
  )
  assert.ok(layerCreationIndex > asyncGuardIndex, "생명주기 guard 뒤에만 레이어를 생성해야 한다")
  assert.ok(layerTrackIndex > layerCreationIndex, "생성된 레이어를 cleanup 대상으로 붙잡아야 한다")
  assert.ok(layerAddIndex > layerCreationIndex, "생성된 레이어만 map에 추가해야 한다")
  assert.match(
    source,
    /if \(layer && isLeafletMapActive\(map\) && map\.hasLayer\(layer\)\) \{\s*map\.removeLayer\(layer\)\s*\}/
  )
})
