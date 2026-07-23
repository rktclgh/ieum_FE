import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8")
}

test("모임 상세는 번역 롱프레스 메뉴를 명시적 dismiss 전까지 유지한다", () => {
  const translateLongPress = read("src/features/translate/components/translate-long-press.tsx")
  const meetupDetailCard = read("src/features/meetup/components/meetup-detail-card.tsx")
  const meetupDetailContainer = read("src/features/meetup/components/meetup-detail-container.tsx")

  assert.match(
    translateLongPress,
    /persistMenu\?:\s*boolean/,
    "공통 래퍼는 기존 화면에 영향 없이 지속 모드를 opt-in으로 제공해야 한다"
  )
  assert.match(
    translateLongPress,
    /persistMenu\s*=\s*false/,
    "기존 번역 화면의 액션 후 dismiss 동작은 기본값으로 유지해야 한다"
  )
  assert.match(
    translateLongPress,
    /retainMenuOnInactive\?:\s*boolean/,
    "캐러셀의 일시적인 inactive 전환 유지와 번역 액션 뒤 메뉴 유지는 별도 계약이어야 한다"
  )
  assert.match(
    translateLongPress,
    /retainMenuOnInactive\s*=\s*false/,
    "일반 상세 시트가 닫힐 때의 기존 teardown은 기본값으로 유지해야 한다"
  )
  assert.match(
    translateLongPress,
    /if\s*\(\s*!visible\s*&&\s*menuOpen\s*&&\s*!retainMenuOnInactive\s*\)\s*setMenuOpen\(false\)/,
    "지속 모드에서는 캐러셀의 일시적인 inactive 전환이 열린 메뉴를 닫으면 안 된다"
  )
  assert.match(
    translateLongPress,
    /React\.useEffect\(\(\)\s*=>\s*\{\s*if\s*\(\s*!visible\s*&&\s*!retainMenuOnInactive\s*\)\s*setSurfaceLifted\(false\)\s*\},\s*\[visible,\s*retainMenuOnInactive,\s*setSurfaceLifted\]\)/,
    "지속 모드에서는 캐러셀의 일시적인 inactive 전환이 리프트를 해제하면 안 된다"
  )
  assert.match(
    translateLongPress,
    /titleTranslate\.toggle\(\)\s*bodyTranslate\.toggle\(\)\s*if\s*\(\s*!persistMenu\s*\)\s*openMenu\(false\)/,
    "지속 모드에서는 번역 액션이 메뉴와 리프트를 즉시 해제하면 안 된다"
  )
  assert.match(
    translateLongPress,
    /onDismiss=\{\(\)\s*=>\s*openMenu\(false\)\}/,
    "바깥 탭·Escape는 지속 모드에서도 메뉴와 리프트를 함께 닫아야 한다"
  )
  assert.match(
    meetupDetailCard,
    /<TranslateLongPress[\s\S]*?anchor="surface"[\s\S]*?persistMenu[\s\S]*?retainMenuOnInactive=\{retainTranslationMenuOnInactive\}/,
    "모임 상세는 번역 지속과 캐러셀 inactive 유지를 별도로 전달해야 한다"
  )
  assert.match(
    meetupDetailContainer,
    /variant === "card"[\s\S]*?<MeetupDetailCard[\s\S]*?retainTranslationMenuOnInactive/,
    "캐러셀 카드만 inactive 전환 동안 열린 번역 메뉴를 보존해야 한다"
  )
})
