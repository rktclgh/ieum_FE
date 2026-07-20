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
 * 화면 하단에 떠 있는 요소의 바닥 여백 — **홈 인디케이터 위로 28px**.
 *
 * 탭바와 바텀시트가 같은 기준선에서 뜨도록 한 곳에서 관리한다. 둘은 z축으로 겹치므로
 * (시트가 탭바 위를 덮는다) 값이 어긋나면 시트 아래로 탭바 모서리가 삐져나온다.
 *
 * issue #419에서 `pb-7`(28px 고정)에 `--safe-area-bottom`을 더했다. 이전에는 Figma가
 * 프레임 바닥 기준 28px이라는 이유로 일부러 빼고 있었는데, 실측 결과 아이폰의
 * `--safe-area-bottom`이 34px이라 **탭바가 홈 인디케이터를 덮고 있었다.**
 *
 * 이 값은 `globals.css`의 `--tab-bar-height` 내역(96px = 8 + 60 + 28)과 짝이다.
 * 한쪽만 바꾸면 탭바 높이와 페이지 클리어런스가 어긋난다.
 */
export const SCREEN_BOTTOM_GAP = "pb-[calc(1.75rem+var(--safe-area-bottom))]"

/**
 * 우측 하단 고정 원형 버튼(FAB)의 하단 위치 규칙.
 *
 * 규칙: FAB 하단 gap은 항상 12px. 기준선만 화면에 따라 다르다.
 * - 하단 탭바가 있는 화면(홈·모임·질문·마이): 탭바(가시 pill) 상단 기준 12px 위.
 * - 탭바가 없는 화면(지도 오버레이·장소 선택 등): 화면 바닥 기준 12px 위.
 *
 * issue #419 이전에는 pill 상단 88px을 주석 안에서 손으로 계산해 `bottom-[6.25rem]`(100px)
 * 리터럴로 박아뒀다. 탭바 높이가 바뀌면 이 숫자를 손으로 따라 고쳐야 했고, 실제로
 * 어긋나 있었다. 이제 `--tab-bar-pill-top`(globals.css)에서 파생시킨다.
 */

/** 탭바가 있는 화면: pill 상단에서 12px 위. */
export const FAB_BOTTOM_WITH_TABBAR = "bottom-[calc(0.75rem+var(--tab-bar-pill-top))]"

/** 탭바가 없는 화면: 화면 바닥 위 12px + 홈 인디케이터. */
export const FAB_BOTTOM_FLOOR = "bottom-[calc(0.75rem+var(--safe-area-bottom))]"
