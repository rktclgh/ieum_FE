import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  CONTEXT_MENU_LABEL_BASE_SIZE,
  CONTEXT_MENU_LABEL_CLASS,
  CONTEXT_MENU_LABEL_SIZES,
  fitContextMenuLabelSize,
  fitContextMenuPanelLabelSize,
} from "@/features/chat/lib/context-menu-label-fit"

/** 항목 폭 193 - 아이콘 24 - gap 8. 실제 패널에서 라벨이 쓰는 폭이다. */
const AVAILABLE = 161

test("여유가 있으면 기준 크기를 그대로 쓴다", () => {
  assert.equal(
    fitContextMenuLabelSize({ availableWidth: AVAILABLE, naturalWidth: 60 }),
    CONTEXT_MENU_LABEL_BASE_SIZE
  )
})

test("가용폭에 딱 맞으면 줄이지 않는다", () => {
  assert.equal(
    fitContextMenuLabelSize({ availableWidth: AVAILABLE, naturalWidth: AVAILABLE }),
    CONTEXT_MENU_LABEL_BASE_SIZE
  )
})

test("넘치면 한 줄에 들어가는 가장 큰 토큰으로 내려간다", () => {
  // 170 * 14/15 = 158.7 ≤ 161 → 14 에서 멈춘다(13 까지 내려가면 과하게 작아진다).
  assert.equal(fitContextMenuLabelSize({ availableWidth: AVAILABLE, naturalWidth: 170 }), 14)
  // 185 * 13/15 = 160.3 ≤ 161
  assert.equal(fitContextMenuLabelSize({ availableWidth: AVAILABLE, naturalWidth: 185 }), 13)
  // 200 * 12/15 = 160 ≤ 161
  assert.equal(fitContextMenuLabelSize({ availableWidth: AVAILABLE, naturalWidth: 200 }), 12)
})

test("하한 아래로는 내려가지 않는다 — 그 다음은 말줄임의 몫이다", () => {
  const floor = CONTEXT_MENU_LABEL_SIZES[CONTEXT_MENU_LABEL_SIZES.length - 1]
  assert.equal(fitContextMenuLabelSize({ availableWidth: AVAILABLE, naturalWidth: 400 }), floor)
})

test("측정 전(폭 0)에는 기준 크기를 유지해 첫 페인트가 깜빡이지 않는다", () => {
  assert.equal(
    fitContextMenuLabelSize({ availableWidth: 0, naturalWidth: 300 }),
    CONTEXT_MENU_LABEL_BASE_SIZE
  )
  assert.equal(
    fitContextMenuLabelSize({ availableWidth: AVAILABLE, naturalWidth: 0 }),
    CONTEXT_MENU_LABEL_BASE_SIZE
  )
})

test("패널은 가장 긴 항목에 맞춰 하나의 크기로 통일한다", () => {
  const size = fitContextMenuPanelLabelSize([
    { availableWidth: AVAILABLE, naturalWidth: 40 }, // 15
    { availableWidth: AVAILABLE, naturalWidth: 200 }, // 12
    { availableWidth: AVAILABLE, naturalWidth: 170 }, // 14
  ])
  assert.equal(size, 12)
})

test("항목이 없으면 기준 크기", () => {
  assert.equal(fitContextMenuPanelLabelSize([]), CONTEXT_MENU_LABEL_BASE_SIZE)
})

/**
 * 드리프트 방지: 사다리가 임의 px 로 새면 타이포 체계가 무너진다.
 * 모든 단계가 실제 정의된 body-medium 토큰이어야 한다.
 */
test("사다리의 모든 단계가 globals.css 의 타이포 토큰이다", () => {
  const globalsCss = readFileSync("src/app/globals.css", "utf8")
  for (const size of CONTEXT_MENU_LABEL_SIZES) {
    const className = CONTEXT_MENU_LABEL_CLASS[size]
    assert.equal(className, `text-body-medium-${size}`)
    assert.match(
      globalsCss,
      new RegExp(`--text-body-medium-${size}:\\s*${size}px`),
      `${className} 토큰이 globals.css 에 없다`
    )
  }
})

test("사다리는 큰 것부터 정렬돼 있어야 첫 일치가 최댓값이 된다", () => {
  const sorted = [...CONTEXT_MENU_LABEL_SIZES].sort((a, b) => b - a)
  assert.deepEqual([...CONTEXT_MENU_LABEL_SIZES], sorted)
  assert.equal(CONTEXT_MENU_LABEL_SIZES[0], CONTEXT_MENU_LABEL_BASE_SIZE)
})

/** 줄바꿈이 살아 있으면 40px 항목 높이 계약(contextMenuHeight)이 깨진다. */
test("메뉴 라벨은 nowrap 이라 항목 높이 계약이 유지된다", () => {
  const menu = readFileSync("src/features/chat/components/chat-context-menu.tsx", "utf8")
  assert.match(menu, /whitespace-nowrap/)
  assert.match(menu, /fitContextMenuPanelLabelSize/)
})

/**
 * 줄어든 크기에서 재고 기준 크기로 역산하면 서브픽셀 반올림이 섞여, 13px 에 맞는 라벨이
 * 12px 로 한 단계 더 줄어든다. 측정은 반드시 기준 크기에서만 한다.
 */
test("라벨 측정은 기준 크기에서만 하고, 그 외에는 조기 반환한다", () => {
  const menu = readFileSync("src/features/chat/components/chat-context-menu.tsx", "utf8")
  assert.match(menu, /if \(labelSize !== CONTEXT_MENU_LABEL_BASE_SIZE\) return/)
  assert.doesNotMatch(
    menu,
    /scrollWidth\s*\*/,
    "역산(scrollWidth * 배율)이 남아 있으면 반올림 오차가 다시 들어온다"
  )
})
