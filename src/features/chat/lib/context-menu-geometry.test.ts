import { strict as assert } from "node:assert"
import test from "node:test"

import { contextMenuHeight } from "@/features/chat/lib/context-menu-geometry"

/**
 * Figma 실측값 (신한해커톤 FPRPYHC1ukJph6hjRiyU0Z, "디자인" 섹션의 Context menu 인스턴스들).
 * 이 값이 어긋나면 메뉴가 화면 밖으로 잘리거나 불필요하게 위로 뒤집힌다.
 */
const FIGMA_MEASURED: Array<[items: number, height: number, source: string]> = [
  [1, 64, "1951:27338 홈 검색 (번역)"],
  [2, 108, "1951:27490 채팅방 공지 (번역·삭제)"],
  [3, 152, "1216:4875 채팅 목록 (고정·알림해제·삭제)"],
  [4, 196, "1406:6357 채팅 말풍선 (답글·공지등록·번역·신고)"],
]

for (const [items, height, source] of FIGMA_MEASURED) {
  test(`${items}개 항목 메뉴 높이는 ${height}px — Figma ${source}`, () => {
    assert.equal(contextMenuHeight(items), height)
  })
}

test("항목이 없으면 0 — 메뉴를 아예 렌더하지 않는 호출부가 있다", () => {
  assert.equal(contextMenuHeight(0), 0)
  assert.equal(contextMenuHeight(-1), 0)
})

test("항목이 늘 때마다 항목 높이 + gap 만큼만 증가한다", () => {
  for (let n = 1; n < 8; n += 1) {
    assert.equal(contextMenuHeight(n + 1) - contextMenuHeight(n), 44)
  }
})
