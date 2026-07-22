// 아이콘 스프라이트(public/icons/icons.svg)가 public/icons/**(flag/, pwa/ 제외) 원본과
// 어긋나지 않는지 지킨다.
//
// 스프라이트는 pnpm gen:icon-sprite로 굽는 커밋된 산출물이라, 아이콘을 추가·삭제하고
// 다시 굽는 걸 잊으면 그 아이콘만 화면에서 빈칸으로 뜬다. 화면을 열어보기 전에는 티가
// 안 나므로 여기서 잡는다.

import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")

const ICONS_DIR = path.join(repoRoot, "public/icons")
const EXCLUDED_DIRS = new Set(["flag", "pwa"])

function collectExpectedSymbolIds() {
  const dirs = fs
    .readdirSync(ICONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !EXCLUDED_DIRS.has(entry.name))

  const ids = []
  for (const dir of dirs) {
    for (const name of fs.readdirSync(path.join(ICONS_DIR, dir.name))) {
      if (name.endsWith(".svg")) ids.push(`${dir.name}-${name.replace(/\.svg$/, "")}`)
    }
  }
  return ids
}

const spriteSource = fs.readFileSync(path.join(ICONS_DIR, "icons.svg"), "utf8")
const iconSource = fs.readFileSync(path.join(repoRoot, "src/components/ui/icon.tsx"), "utf8")

const expectedIds = collectExpectedSymbolIds()
const symbolIds = [...spriteSource.matchAll(/<symbol id="([^"]+)"/g)].map(([, id]) => id)

test("public/icons/**(flag/, pwa/ 제외)의 모든 아이콘이 스프라이트에 심볼로 들어있다", () => {
  assert.ok(expectedIds.length > 0, "public/icons에서 아이콘을 하나도 읽지 못했습니다")

  const symbols = new Set(symbolIds)
  const missing = expectedIds.filter((id) => !symbols.has(id))

  assert.deepEqual(missing, [], "스프라이트에 없는 아이콘입니다. pnpm gen:icon-sprite를 다시 도세요")
})

test("스프라이트에 원본이 없는 심볼이 남아있지 않다", () => {
  const expected = new Set(expectedIds)
  const orphans = symbolIds.filter((id) => !expected.has(id))

  assert.deepEqual(orphans, [], "제거된 아이콘의 심볼이 남아있습니다. pnpm gen:icon-sprite를 다시 도세요")
})

test("스프라이트 안에서 id가 겹치지 않는다", () => {
  // 원본 아이콘들의 내부 id(clipPath/mask/그룹명)가 하나라도 겹치면 다른 아이콘의 클립을
  // 참조해 조용히 깨진다. 합쳐진 결과물에서 직접 확인한다.
  const ids = [...spriteSource.matchAll(/\sid="([^"]+)"/g)].map(([, id]) => id)
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)

  assert.deepEqual([...new Set(duplicates)], [], "스프라이트 안에 중복된 id가 있습니다")
})

test("icon.tsx가 스프라이트 경로를 그대로 쓴다", () => {
  assert.match(
    iconSource,
    /ICON_SPRITE_URL = "\/icons\/icons\.svg"/,
    "icon.tsx의 스프라이트 경로가 산출물 경로와 다릅니다"
  )
})
