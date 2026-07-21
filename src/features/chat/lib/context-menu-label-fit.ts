/**
 * ChatContextMenu 라벨 크기 자동 맞춤.
 *
 * 메뉴 항목은 w-[193px] 고정 폭이고 아이콘(24) + gap(8)을 빼면 텍스트 가용폭이 161px 다.
 * 라벨은 i18n 이라 언어마다 길이가 크게 다르고(러시아어 "Показать оригинал" 등),
 * 줄바꿈이 일어나면 항목 높이가 40px 를 넘어 배치 근거인 contextMenuHeight() 가 어긋난다
 * — 메뉴가 눌린 대상을 파고든다.
 *
 * 그래서 라벨은 nowrap 으로 고정하고, 대신 폰트 크기를 타이포 토큰 사다리에서 한 단계씩
 * 낮춰 한 줄에 맞춘다. 임의 px 는 쓰지 않는다.
 */

/** 기준 크기. 측정값을 이 크기 기준으로 환산해 비교한다. */
const CONTEXT_MENU_LABEL_BASE_SIZE = 15

/** 큰 것부터. 한 줄에 들어가는 첫 값을 고른다. 마지막 값이 하한이다. */
const CONTEXT_MENU_LABEL_SIZES = [15, 14, 13, 12] as const

type ContextMenuLabelSize = (typeof CONTEXT_MENU_LABEL_SIZES)[number]

/**
 * 타이포 토큰 클래스. Tailwind 는 소스에 적힌 문자열만 스캔하므로
 * `text-body-medium-${size}` 로 조립하면 안 되고 반드시 리터럴이어야 한다.
 */
const CONTEXT_MENU_LABEL_CLASS: Record<ContextMenuLabelSize, string> = {
  15: "text-body-medium-15",
  14: "text-body-medium-14",
  13: "text-body-medium-13",
  12: "text-body-medium-12",
}

/** 소수점 반올림 탓에 한 단계 더 줄어드는 것을 막는 여유(px). */
const FIT_TOLERANCE = 0.5

interface LabelMeasurement {
  /** 라벨이 쓸 수 있는 폭(px). */
  availableWidth: number
  /** 기준 크기(15px)에서 잰 라벨의 자연 폭(px). */
  naturalWidth: number
}

/**
 * 한 라벨이 한 줄에 들어가는 가장 큰 토큰 크기.
 *
 * 아직 측정 전(폭 0)이면 기준 크기를 유지한다 — 0을 "넘친다"로 읽으면 첫 페인트가
 * 12px 로 나갔다가 커지며 깜빡인다.
 */
function fitContextMenuLabelSize({
  availableWidth,
  naturalWidth,
}: LabelMeasurement): ContextMenuLabelSize {
  if (!(availableWidth > 0) || !(naturalWidth > 0)) return CONTEXT_MENU_LABEL_BASE_SIZE

  const fitted = CONTEXT_MENU_LABEL_SIZES.find(
    (size) =>
      naturalWidth * (size / CONTEXT_MENU_LABEL_BASE_SIZE) <= availableWidth + FIT_TOLERANCE
  )
  // 하한에서도 넘치면 말줄임(…)으로 넘긴다.
  return fitted ?? CONTEXT_MENU_LABEL_SIZES[CONTEXT_MENU_LABEL_SIZES.length - 1]
}

/**
 * 패널 전체에 적용할 크기 = 항목별 결과 중 가장 작은 값.
 *
 * 항목마다 크기가 다르면 메뉴가 깨져 보이므로 가장 긴 항목에 맞춰 통일한다.
 */
function fitContextMenuPanelLabelSize(
  measurements: readonly LabelMeasurement[]
): ContextMenuLabelSize {
  return measurements.reduce<ContextMenuLabelSize>(
    (smallest, measurement) => {
      const size = fitContextMenuLabelSize(measurement)
      return size < smallest ? size : smallest
    },
    CONTEXT_MENU_LABEL_BASE_SIZE
  )
}

export {
  CONTEXT_MENU_LABEL_BASE_SIZE,
  CONTEXT_MENU_LABEL_CLASS,
  CONTEXT_MENU_LABEL_SIZES,
  fitContextMenuLabelSize,
  fitContextMenuPanelLabelSize,
}
export type { ContextMenuLabelSize, LabelMeasurement }
