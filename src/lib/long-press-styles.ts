/**
 * 롱프레스로 눌린 아이템의 시각 피드백 — 앱 전역 단일 출처.
 *
 * 기준은 채팅 목록(chat-list-item)에 적용된 리프트다. 화면마다 값을 다시 적어두면
 * 시간이 지나며 duration/그림자/스케일이 어긋나므로, 새 롱프레스 대상은 반드시
 * 여기 상수를 조합해 쓴다.
 *
 * 사용법:
 *   cn(LONG_PRESS_TRANSITION, active ? LONG_PRESS_SURFACE_ACTIVE : LONG_PRESS_INACTIVE)
 */

/** 눌림/해제 양방향에 모두 필요 — active 쪽에만 붙이면 해제가 순간이동한다. */
const LONG_PRESS_TRANSITION = "transition-all duration-200 ease-out"

/**
 * 리프트 + 그림자만. 배경색·라운드가 고유해서 흰 카드로 덮으면 안 되는 대상
 * (채팅 말풍선 등)에 쓴다.
 */
const LONG_PRESS_LIFT_ACTIVE =
  "relative z-50 -translate-y-1 scale-[1.02] shadow-[0px_2px_20px_0px_rgba(0,0,0,0.1)]"

/** 리프트 + 기준 카드 표면. 배경 없는 리스트 행이 딤 위로 떠오를 때 쓴다. */
const LONG_PRESS_SURFACE_ACTIVE = `${LONG_PRESS_LIFT_ACTIVE} rounded-2xl bg-white`

/** 평상시 상태. 트랜지션이 되돌아갈 목적지를 명시해야 해제 모션이 생긴다. */
const LONG_PRESS_INACTIVE = "translate-y-0 scale-100"

export {
  LONG_PRESS_TRANSITION,
  LONG_PRESS_LIFT_ACTIVE,
  LONG_PRESS_SURFACE_ACTIVE,
  LONG_PRESS_INACTIVE,
}
