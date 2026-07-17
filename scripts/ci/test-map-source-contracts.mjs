import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8")

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
  assert.match(source, /const target = resolvePlaceSelectionTarget\(/)
  assert.match(source, /disabled=\{!position\}/)
  assert.equal((source.match(/recenterTo\(position\)/g) ?? []).length, 1)
  assert.match(handleGps, /setHasExplicitRecenter\(true\)[\s\S]*recenterTo\(position\)/)
  assert.match(handleGps, /if \(!position\) return/)
})

test("모임 마커 썸네일은 파일 URL을 정규화한다", () => {
  const source = read("src/features/map/components/pin-marker.tsx")

  assert.match(source, /import\s+\{\s*resolveFileUrl\s*\}\s+from\s+['"]@\/lib\/api\/file-url['"]/)
  assert.match(source, /const\s+thumbnailUrl\s*=\s*resolveFileUrl\(\s*pin\.thumbnailUrl\s*\)/)
  assert.match(source, /escapeAttr\(\s*thumbnailUrl\s*\)/)
  assert.doesNotMatch(source, /escapeAttr\(\s*pin\.thumbnailUrl\s*\)/)
})

test("벡터 타일 레이어는 해제된 Leaflet map에 다시 붙지 않는다", () => {
  const source = read("src/features/map/components/vector-tile-layer.tsx")

  assert.match(source, /if \(!map\.getPane\("tilePane"\)\) return/)
  assert.match(
    source,
    /if \(map\.hasLayer\(layer\)\) \{\s*map\.removeLayer\(layer\)\s*\}/
  )
})
