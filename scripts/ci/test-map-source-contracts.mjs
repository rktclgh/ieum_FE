import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8")

test("geolocation은 첫 terminal 결과를 initialStatus로 고정한다", () => {
  const source = read("src/features/map/hooks/use-geolocation.ts")

  assert.match(
    source,
    /const \[initialStatus, setInitialStatus\] = React\.useState<GeolocationStatus>\("loading"\)/
  )
  assert.match(
    source,
    /setInitialStatus\(\(currentStatus\) =>\s*currentStatus === "loading" \? "success" : currentStatus\s*\)/
  )
  assert.match(
    source,
    /setInitialStatus\(\(currentStatus\) =>\s*currentStatus === "loading" \? "error" : currentStatus\s*\)/
  )
  assert.match(source, /initialStatus: isSupported \? initialStatus : "error"/)
})

test("장소 선택 picker가 geolocation initialStatus를 map step에 전달한다", () => {
  const source = read("src/features/meetup/components/meetup-location-picker.tsx")

  assert.match(source, /const \{ position, initialStatus \} = useGeolocation\(\)/)
  assert.match(source, /<MeetupLocationMap[\s\S]*initialStatus=\{initialStatus\}/)
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
