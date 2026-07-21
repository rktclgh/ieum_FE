// 국기 스프라이트(public/icons/flag/flags.svg)가 countries.ts와 어긋나지 않는지 지킨다.
//
// 스프라이트는 pnpm gen:flag-sprite로 굽는 커밋된 산출물이라, 국가를 추가·삭제하고 다시 굽는 걸
// 잊으면 그 국가만 국기가 빈칸으로 뜬다. 화면을 열어보기 전에는 티가 안 나므로 여기서 잡는다.

import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")

const countriesSource = fs.readFileSync(
  path.join(repoRoot, "src/lib/constants/countries.ts"),
  "utf8"
)
const spriteSource = fs.readFileSync(path.join(repoRoot, "public/icons/flag/flags.svg"), "utf8")
const flagIconSource = fs.readFileSync(
  path.join(repoRoot, "src/components/ui/flag-icon.tsx"),
  "utf8"
)

const countryCodes = [...countriesSource.matchAll(/\{\s*code:\s*"([^"]+)",\s*flag:\s*"/g)].map(
  ([, code]) => code
)
const symbolIds = [...spriteSource.matchAll(/<symbol id="([^"]+)"/g)].map(([, id]) => id)

test("countries.ts의 모든 국가가 스프라이트에 심볼로 들어있다", () => {
  assert.ok(countryCodes.length > 0, "countries.ts에서 국가를 읽지 못했습니다")

  const symbols = new Set(symbolIds)
  const missing = countryCodes.filter((code) => !symbols.has(`flag-${code}`))

  assert.deepEqual(missing, [], `스프라이트에 없는 국가입니다. pnpm gen:flag-sprite를 다시 도세요`)
})

test("스프라이트에 countries.ts에 없는 심볼이 남아있지 않다", () => {
  const codes = new Set(countryCodes.map((code) => `flag-${code}`))
  const orphans = symbolIds.filter((id) => !codes.has(id))

  assert.deepEqual(orphans, [], "제거된 국가의 심볼이 남아있습니다. pnpm gen:flag-sprite를 다시 도세요")
})

test("스프라이트 안에서 id가 겹치지 않는다", () => {
  // 국기 원본들의 내부 id(clipPath/mask)가 하나라도 겹치면 다른 국기의 클립을 참조해
  // 조용히 깨진다. 합쳐진 결과물에서 직접 확인한다.
  const ids = [...spriteSource.matchAll(/\sid="([^"]+)"/g)].map(([, id]) => id)
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)

  assert.deepEqual([...new Set(duplicates)], [], "스프라이트 안에 중복된 id가 있습니다")
})

test("모든 심볼이 같은 viewBox를 쓴다", () => {
  const viewBoxes = new Set(
    [...spriteSource.matchAll(/<symbol id="[^"]+" viewBox="([^"]+)"/g)].map(([, viewBox]) => viewBox)
  )

  assert.deepEqual([...viewBoxes], ["0 0 21 15"], "심볼마다 좌표계가 달라 크기가 틀어집니다")
})

test("flag-icon.tsx가 스프라이트 경로와 심볼 접두사를 그대로 쓴다", () => {
  assert.match(
    flagIconSource,
    /FLAG_SPRITE_URL = "\/icons\/flag\/flags\.svg"/,
    "flag-icon.tsx의 스프라이트 경로가 산출물 경로와 다릅니다"
  )
  assert.match(
    flagIconSource,
    /FLAG_SYMBOL_PREFIX = "flag-"/,
    "flag-icon.tsx의 심볼 접두사가 build-flag-sprite.mjs와 다릅니다"
  )
})
