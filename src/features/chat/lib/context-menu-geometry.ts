/**
 * ChatContextMenu 패널의 기하 — 위/아래 배치를 고를 때 쓴다.
 *
 * 패널 스타일(px-6 py-3, gap-1, 항목 py-2 + size-6 아이콘)에서 직접 유도한 값이라
 * chat-context-menu.tsx 의 클래스를 바꾸면 여기도 같이 바꿔야 한다.
 */

/** 패널 세로 패딩 py-3 (12 * 2) */
const MENU_VERTICAL_PADDING = 24
/** 항목 하나: py-2 (8 * 2) + 아이콘 size-6 (24) */
const MENU_ITEM_HEIGHT = 40
/** 항목 사이 gap-1 */
const MENU_ITEM_GAP = 4

/**
 * 항목 수에 따른 메뉴 패널 실제 높이(px).
 *
 * Figma 실측과 정확히 일치한다 — 1항목 64 / 2항목 108 / 3항목 152 / 4항목 196.
 * 번역 항목처럼 조건부로 붙는 항목이 있어 높이가 고정이 아니므로,
 * 상수로 추정하지 말고 반드시 실제 items.length 로 계산할 것.
 */
function contextMenuHeight(itemCount: number): number {
  if (itemCount <= 0) return 0
  return MENU_VERTICAL_PADDING + itemCount * MENU_ITEM_HEIGHT + (itemCount - 1) * MENU_ITEM_GAP
}

export { contextMenuHeight }
