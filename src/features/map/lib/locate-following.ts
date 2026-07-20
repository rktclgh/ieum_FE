/**
 * "내 위치 버튼을 눌러 지도가 내 위치에 맞춰진 상태"의 규칙.
 * 홈 지도와 모임 장소 선택 지도가 이 규칙을 공유한다.
 */

type LocateFollowingEvent =
  /** 좌표가 있는 상태에서 내 위치 버튼을 눌렀다 */
  | { type: "recenter-to-me" }
  /** 사용자가 드래그·핀치·휠로 지도를 움직였다 (프로그래매틱 이동은 제외) */
  | { type: "user-gesture" }
  /** 내 위치가 아닌 곳으로 재중심하거나 다른 지점을 골랐다 (검색 결과 선택, 지도 클릭) */
  | { type: "recenter-elsewhere" }

/**
 * 켜는 이벤트는 "recenter-to-me" 하나뿐이고 나머지는 모두 끈다.
 * 최초 1회 자동 센터링은 사용자가 누른 결과가 아니므로 아예 이벤트를 보내지 않는다.
 */
function reduceLocateFollowing(state: boolean, event: LocateFollowingEvent): boolean {
  switch (event.type) {
    case "recenter-to-me":
      return true
    case "user-gesture":
    case "recenter-elsewhere":
      return false
  }
}

/**
 * 실제로 아이콘을 켤지. 내 위치를 모르는 동안(권한 철회 등)은 켜둘 근거가 없으므로,
 * 별도 이벤트로 끄지 않고 좌표 유무에서 파생시킨다.
 */
function isLocateFollowingVisible(requested: boolean, position: unknown): boolean {
  return requested && position != null
}

/**
 * Leaflet의 flyTo/setView도 dragstart를 제외한 movestart·zoomstart를 발생시키므로,
 * 이동을 시작시킨 주체가 코드인지 사용자인지 구분해야 한다. 구분하지 않으면
 * 내 위치 버튼이 유발한 flyTo가 방금 켠 상태를 즉시 되돌린다.
 *
 * 프로그래매틱 이동 구간을 열고 닫으면서, 그 구간 안의 지도 이벤트를 사용자 제스처가 아니라고 판정한다.
 * 중첩 호출(연속 recenter)에서도 마지막 이동이 끝나야 닫히도록 깊이를 센다.
 */
function createProgrammaticMoveGate() {
  let depth = 0

  return {
    begin() {
      depth += 1
    },
    /** 이동이 끝났거나(moveend) 지도가 해제됐을 때. 열린 적 없으면 무시한다. */
    end() {
      if (depth > 0) depth -= 1
    },
    /** 열린 구간을 모두 닫는다. 중단된 애니메이션으로 moveend가 오지 않는 경우의 복구용. */
    reset() {
      depth = 0
    },
    isProgrammatic() {
      return depth > 0
    },
  }
}

type ProgrammaticMoveGate = ReturnType<typeof createProgrammaticMoveGate>

export { reduceLocateFollowing, isLocateFollowingVisible, createProgrammaticMoveGate }
export type { LocateFollowingEvent, ProgrammaticMoveGate }
