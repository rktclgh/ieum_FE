import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const componentSource = readFileSync(
  new URL("./chat-bubble-segment.tsx", import.meta.url),
  "utf8"
)

/** `rounded-3xl` = 24px, `rounded-[4px]` = 4px, 클래스가 없으면 0px. */
const CORNERS = ["tl", "tr", "bl", "br"] as const
type Corner = (typeof CORNERS)[number]
type CornerRadii = Record<Corner, number>

function radiusObject(name: string): Record<string, string> {
  const match = componentSource.match(
    new RegExp(`const ${name} = \\{([\\s\\S]*?)\\n\\} as const`)
  )
  assert.ok(match, `${name} 객체 리터럴을 찾지 못했다`)

  const entries: Record<string, string> = {}
  for (const line of match[1].split("\n")) {
    const entry = line.match(/^\s*(\w+):\s*"([^"]*)",?\s*$/)
    if (entry) entries[entry[1]] = entry[2]
  }
  return entries
}

function corners(classNames: string): CornerRadii {
  const radii: CornerRadii = { tl: 0, tr: 0, bl: 0, br: 0 }
  for (const corner of CORNERS) {
    if (classNames.includes(`rounded-${corner}-3xl`)) radii[corner] = 24
    const arbitrary = classNames.match(
      new RegExp(`rounded-${corner}-\\[(\\d+)px\\]`)
    )
    if (arbitrary) radii[corner] = Number(arbitrary[1])
  }
  return radii
}

/** Figma 1414:6700 (Me/Multiple) + Me/Single 의 실측값. */
const FIGMA_ME: Record<string, CornerRadii> = {
  solo: { tl: 24, tr: 24, bl: 24, br: 0 },
  first: { tl: 24, tr: 24, bl: 24, br: 0 },
  middle: { tl: 24, tr: 4, bl: 24, br: 4 },
  last: { tl: 24, tr: 0, bl: 24, br: 24 },
}

test("ME_RADIUS는 Figma Me/Multiple 라운드와 일치한다", () => {
  const me = radiusObject("ME_RADIUS")
  for (const [position, expected] of Object.entries(FIGMA_ME)) {
    assert.deepEqual(corners(me[position]), expected, `ME_RADIUS.${position}`)
  }
})

test("OTHERS_RADIUS는 ME_RADIUS를 좌우 반전한 값이다", () => {
  const me = radiusObject("ME_RADIUS")
  const others = radiusObject("OTHERS_RADIUS")

  for (const position of Object.keys(FIGMA_ME)) {
    const mirrored = corners(me[position])
    assert.deepEqual(
      corners(others[position]),
      { tl: mirrored.tr, tr: mirrored.tl, bl: mirrored.br, br: mirrored.bl },
      `OTHERS_RADIUS.${position}`
    )
  }
})

test("그룹 안쪽 모서리만 각지고 바깥 모서리는 24px을 유지한다", () => {
  const me = radiusObject("ME_RADIUS")

  // 말풍선 꼬리가 붙는 오른쪽 변만 위치에 따라 달라지고, 왼쪽 변은 항상 24px이다.
  for (const position of Object.keys(FIGMA_ME)) {
    const radii = corners(me[position])
    assert.equal(radii.tl, 24, `ME_RADIUS.${position} tl`)
    assert.equal(radii.bl, 24, `ME_RADIUS.${position} bl`)
  }

  // middle은 위아래 모두 이웃이 있으므로 오른쪽 두 모서리가 4px로 좁혀진다.
  assert.deepEqual(corners(me.middle), { tl: 24, tr: 4, bl: 24, br: 4 })
})
