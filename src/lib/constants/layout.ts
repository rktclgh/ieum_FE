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
 * 화면 하단에 떠 있는 요소의 바닥 여백 — **화면 물리 바닥에서 28px**(safe-area 포함).
 *
 * 탭바와 바텀시트가 같은 기준선에서 뜨도록 한 곳에서 관리한다. 둘은 z축으로 겹치므로
 * (시트가 탭바 위를 덮는다) 값이 어긋나면 시트 아래로 탭바 모서리가 삐져나온다.
 *
 * `--safe-area-bottom`을 **더하지 않는다**(issue #436). 28px은 safe-area를 포함한 총합이라
 * 기기와 무관하게 일정하다 — Figma 프레임 바닥 기준 28px과 같은 의미다.
 *
 * issue #419에서 한 번 `+ var(--safe-area-bottom)`을 붙였는데("탭바가 홈 인디케이터를
 * 덮는다"), 그 판단이 과했다. 아이폰의 34px은 보수적 여백이고 홈 인디케이터 **막대 자체**는
 * 바닥에서 약 8~13px 구간이다. 28px 기준선이면 pill 하단이 28px, 탭 영역 시작은 32px이라
 * 막대와 겹치지 않는다. 반대로 더했을 때는 바닥에서 62px이라 눈에 띄게 높이 떠 있었다.
 *
 * 기준선(어디가 "바닥"인가)은 `globals.css`의 `.bottom-anchor`가 `100lvh`로 잡는다.
 * 이 상수는 그 바닥에서의 **거리**만 정한다.
 *
 * 이 값은 `globals.css`의 `--tab-bar-height` 내역(96px = 8 + 60 + 28)과 짝이다.
 * 한쪽만 바꾸면 탭바 높이와 페이지 클리어런스가 어긋난다.
 */
export const SCREEN_BOTTOM_GAP = "pb-7"

/**
 * 바텀시트 Viewport의 바닥 여백 — `SCREEN_BOTTOM_GAP`과 **같은 28px 기준선** + 키보드 회피분.
 *
 * `1.75rem`은 `pb-7`을 푼 값이다. 둘이 어긋나면 시트 아래로 탭바 모서리가 삐져나오므로,
 * 한쪽을 바꾸면 다른 쪽도 함께 바꿔야 한다(Tailwind 클래스라 계산으로 파생시킬 수 없다).
 *
 * `--sheet-keyboard-inset`은 `use-sheet-keyboard-inset.ts`가 시트가 열려 있는 동안만 채운다.
 * 키보드가 없으면 0px이고, 훅이 붙지 않은 경로에서는 fallback 0px이라 종전과 동일하다(#458).
 */
export const SHEET_BOTTOM_GAP = "pb-[calc(1.75rem+var(--sheet-keyboard-inset,0px))]"

/**
 * 우측 하단 고정 원형 버튼(FAB)의 하단 위치 규칙.
 *
 * 규칙: FAB 하단 gap은 항상 12px. 기준선만 화면에 따라 다르다.
 * - 하단 탭바가 있는 화면(홈·모임·질문·마이): 탭바(가시 pill) 상단 기준 12px 위.
 * - 탭바가 없는 화면(지도 오버레이·장소 선택 등): 화면 바닥 기준 12px 위.
 *
 * 탭바와 달리 `FAB_BOTTOM_FLOOR`는 `--safe-area-bottom`을 그대로 더한다(issue #436에서
 * 의도적으로 제외). 12px 총합으로 내리면 홈 인디케이터 막대(바닥 8~13px)와 실제로 겹친다.
 *
 * issue #419 이전에는 pill 상단 88px을 주석 안에서 손으로 계산해 `bottom-[6.25rem]`(100px)
 * 리터럴로 박아뒀다. 탭바 높이가 바뀌면 이 숫자를 손으로 따라 고쳐야 했고, 실제로
 * 어긋나 있었다. 이제 `--tab-bar-pill-top`(globals.css)에서 파생시킨다.
 */

/** 탭바가 있는 화면: pill 상단에서 12px 위. */
export const FAB_BOTTOM_WITH_TABBAR = "bottom-[calc(0.75rem+var(--tab-bar-pill-top))]"

/** 탭바가 없는 화면: 화면 바닥 위 12px + 홈 인디케이터. */
export const FAB_BOTTOM_FLOOR = "bottom-[calc(0.75rem+var(--safe-area-bottom))]"
