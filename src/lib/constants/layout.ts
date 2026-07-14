/**
 * 우측 하단 고정 원형 버튼(FAB)의 하단 위치 규칙.
 *
 * 규칙: FAB 하단 gap은 항상 12px. 기준선만 화면에 따라 다르다.
 * - 하단 탭바가 있는 화면(홈·모임·질문·마이): 탭바(가시 pill) 상단 기준 12px 위.
 * - 탭바가 없는 화면(지도 오버레이·장소 선택 등): 화면 바닥 기준 12px 위.
 *
 * 탭바(`features/navigation/components/tab-bar.tsx`) 가시 높이 계산:
 *   링크 h-[52px] + pill p-1(4px×2) = 60px, 래퍼 py-2(8px) 만큼 바닥에서 띄움.
 *   → 가시 pill 상단은 뷰포트 바닥에서 약 68px.
 *   → 탭바 기준 FAB 하단 = 68 + 12 = 80px (bottom-20).
 *
 * Tailwind JIT가 정적 문자열로 인식하도록 완성된 클래스 문자열로 둔다.
 */

/** 탭바가 있는 화면: 탭바 위 12px (뷰포트 바닥 기준 80px). */
export const FAB_BOTTOM_WITH_TABBAR = "bottom-20"

/** 탭바가 없는 화면: 화면 바닥 위 12px. */
export const FAB_BOTTOM_FLOOR = "bottom-3"
