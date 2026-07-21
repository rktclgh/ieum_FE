import { strict as assert } from "node:assert"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { resolveSheetKeyboardInset } from "./sheet-keyboard-inset.ts"

/**
 * **#431에서 실기기로 잰 값** (iPhone 16 Pro 402x874, iOS 18.7, 홈 화면 추가 PWA).
 * `docs/viewport-behavior.md`의 원칙대로 추측이 아니라 측정값이다.
 *
 *   ICB(documentElement.clientHeight) = 812   ← 키보드가 떠도 줄지 않는다
 *   visualViewport.height             = 436
 *   visualViewport.offsetTop          = 376   ← iOS가 문서를 이만큼 강제 스크롤했다
 *   window.scrollY                    = 376
 *
 * 여기서 가시 밴드 바닥 = 376 + 436 = 812 = ICB 바닥이다.
 */
const MEASURED = {
  layoutHeight: 812,
  visualHeight: 436,
  visualOffsetTop: 376,
  scale: 1,
}

/** standalone에서 시트 Viewport는 `height:100lvh`(=874) — globals.css `.bottom-sheet-viewport`. */
const SHEET_BOTTOM_STANDALONE = 874

/** 사파리 탭·비-standalone에서는 `fixed inset-0`이라 ICB 바닥(=812)에 정렬된다. */
const SHEET_BOTTOM_DEFAULT = 812

test("standalone 회귀 재현 — 시트가 가시 영역보다 62px 아래에 있어 그만큼 올려야 한다", () => {
  // #419가 `.bottom-sheet-viewport`에 `height:100lvh`를 넣으며 정렬 기준이 ICB 바닥(812)에서
  // 물리 바닥(874)으로 내려간 값이 그대로 나온다. 이 62px이 이번 버그의 정체다.
  assert.equal(
    resolveSheetKeyboardInset({ ...MEASURED, sheetBottom: SHEET_BOTTOM_STANDALONE }),
    62
  )
})

test("#419 이전 기하에서는 보정이 0 — 시트가 우연히 키보드 상단선과 맞아 있었다", () => {
  // 회피 코드 없이도 동작하는 것처럼 보였던 이유. 이 케이스에서 0이 나와야 과보정이 없다.
  assert.equal(resolveSheetKeyboardInset({ ...MEASURED, sheetBottom: SHEET_BOTTOM_DEFAULT }), 0)
})

test("iOS가 문서를 스크롤하지 못했으면 키보드 높이에 가까운 값을 올린다", () => {
  // 입력창이 이미 보여 iOS가 스크롤할 이유가 없었거나, 스크롤 핀이 0으로 되돌린 경우
  // (use-keyboard-inset.ts의 SCROLL_LOCK 경로). 가시 밴드 바닥 = 0 + 436.
  assert.equal(
    resolveSheetKeyboardInset({
      ...MEASURED,
      visualOffsetTop: 0,
      sheetBottom: SHEET_BOTTOM_STANDALONE,
    }),
    438
  )
})

test("키보드가 없으면 0 — 확장된 standalone 뷰포트(874)", () => {
  // StandaloneViewportExpander가 812→874로 확장을 강제한 평상 상태(#419).
  assert.equal(
    resolveSheetKeyboardInset({
      layoutHeight: 874,
      visualHeight: 874,
      visualOffsetTop: 0,
      scale: 1,
      sheetBottom: SHEET_BOTTOM_STANDALONE,
    }),
    0
  )
})

test("확장 전 stuck 상태(ICB 812 / 가시 812)도 0 — 62px을 키보드로 오인하지 않는다", () => {
  // 로드 직후 iOS standalone이 갇히는 작은 뷰포트. 차이가 문턱값(60) 아래여야 오작동이 없다.
  assert.equal(
    resolveSheetKeyboardInset({
      layoutHeight: 812,
      visualHeight: 812,
      visualOffsetTop: 0,
      scale: 1,
      sheetBottom: SHEET_BOTTOM_STANDALONE,
    }),
    0
  )
})

test("브라우저 크롬 움직임(문턱값 이하)은 키보드로 보지 않는다", () => {
  assert.equal(
    resolveSheetKeyboardInset({
      layoutHeight: 812,
      visualHeight: 812 - 60,
      visualOffsetTop: 0,
      scale: 1,
      sheetBottom: SHEET_BOTTOM_STANDALONE,
    }),
    0
  )
})

test("핀치 줌 중에는 계산을 포기한다 — 줌 배율이 키보드로 오인된다", () => {
  assert.equal(
    resolveSheetKeyboardInset({
      ...MEASURED,
      scale: 2,
      sheetBottom: SHEET_BOTTOM_STANDALONE,
    }),
    0
  )
})

test("음수는 0으로 막는다 — 시트가 이미 가시 영역 안이면 내리지 않는다", () => {
  assert.equal(resolveSheetKeyboardInset({ ...MEASURED, sheetBottom: 700 }), 0)
})
