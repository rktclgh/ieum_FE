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
    /if\s*\(\s*!visible\s*&&\s*menuOpen\s*&&\s*!persistMenu\s*\)\s*setMenuOpen\(false\)/,
    "지속 모드에서는 캐러셀의 일시적인 inactive 전환이 열린 메뉴를 닫으면 안 된다"
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
    /<TranslateLongPress[\s\S]*?anchor="surface"[\s\S]*?persistMenu/,
    "모임 상세만 지속 모드를 opt-in해야 한다"
  )
})
