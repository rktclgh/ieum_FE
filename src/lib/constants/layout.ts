/**
 * 화면 상·하단 고정 요소의 위치 규칙.
 *
 * safe-area 값 자체의 단일 출처는 `app/globals.css`의 `--safe-area-*` 변수다.
 * 여기 있는 상수들은 "여러 파일이 똑같이 반복하게 되는 조합"만 이름 붙여 모아둔 것이라,
 * 한 곳만 고치고 다른 곳을 빠뜨리는 사고를 막는다(특히 AppBar 복제본 3종).
 *
 * Tailwind JIT가 정적 문자열로 인식해야 하므로 완성된 클래스 문자열로 둔다
 * (문자열을 쪼개거나 템플릿으로 조립하면 클래스가 생성되지 않는다).
 */

/**
 * 상단바(AppBar 계열)의 상단 패딩 — 기본 16px + 상태바/노치.
 *
 * 공용 `components/ui/app-bar.tsx`와 그 복제본인 friends·notification 상단바,
 * 그리고 AppBar를 쓰지 않고 자체 헤더를 그리는 화면(지도 검색 오버레이, 홈 지도 툴바)이
 * 전부 이 상수를 쓴다. 복제본을 통합하는 리팩터링은 파급이 커서 issue #279 범위 밖으로 두고,
 * 대신 "상단 여백 규칙"만 단일 출처로 묶었다.
 *
 * 좌우 패딩은 각 컴포넌트가 그대로 갖고 있으므로 `p-4` 대신 `px-4 pb-4`와 함께 쓴다.
 * (`p-4`와 같이 쓰면 tailwind-merge 병합 순서에 의존하게 되어 조합을 분리했다.)
 */
export const APP_BAR_SAFE_TOP = "pt-[calc(1rem+var(--safe-area-top))]"

/**
 * 우측 하단 고정 원형 버튼(FAB)의 하단 위치 규칙.
 *
 * 규칙: FAB 하단 gap은 항상 12px. 기준선만 화면에 따라 다르다.
 * - 하단 탭바가 있는 화면(홈·모임·질문·마이): 탭바(가시 pill) 상단 기준 12px 위.
 * - 탭바가 없는 화면(지도 오버레이·장소 선택 등): 화면 바닥 기준 12px 위.
 *
 * 탭바(`features/navigation/components/tab-bar.tsx`) 가시 높이 계산:
 *   링크 h-[52px] + pill p-1(4px×2) = 60px, 래퍼 pt-2/pb-2(8px) 만큼 바닥에서 띄움.
 *   → 가시 pill 상단은 뷰포트 바닥에서 약 68px.
 *   → 탭바 기준 FAB 하단 = 68 + 12 = 80px.
 *
 * issue #279: 탭바 래퍼 하단 패딩이 `8px + safe-area-inset-bottom`으로 바뀌었으므로
 * 두 기준선 모두 같은 양만큼 따라 올라가야 겹치지 않는다.
 */

/** 탭바가 있는 화면: 탭바 위 12px (뷰포트 바닥 기준 80px + 홈 인디케이터). */
export const FAB_BOTTOM_WITH_TABBAR = "bottom-[calc(5rem+var(--safe-area-bottom))]"

/** 탭바가 없는 화면: 화면 바닥 위 12px + 홈 인디케이터. */
export const FAB_BOTTOM_FLOOR = "bottom-[calc(0.75rem+var(--safe-area-bottom))]"
