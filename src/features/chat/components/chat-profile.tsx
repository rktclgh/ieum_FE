import * as React from "react"

import { NoImageProfile } from "@/components/ui/no-image"
import { cn } from "@/lib/utils"

// Figma "Friend" 배지(node 1200:4212) 위치/크기 — 44px 아바타 기준 실측.
// 20.3px 정사각 캔버스가 아바타 우하단 모서리를 살짝 벗어나도록 겹쳐 배치된다.
const BADGE_CANVAS_RATIO = 20.3 / 44
const BADGE_CANVAS_TOP_RATIO = 0.5962
const BADGE_CANVAS_LEFT_RATIO = 0.6538
// 그 캔버스(viewBox 21) 안에서 원은 중심 10.154, 반지름 6.577, 흰 테두리 3px 이다.
// 테두리는 경로 중심 기준이라 바깥 지름은 (6.577 + 3/2) * 2.
const BADGE_VIEWBOX = 21
const BADGE_CENTER = 10.1541
const BADGE_RING_WIDTH = 3
const BADGE_OUTER_DIAMETER = (6.57692 + BADGE_RING_WIDTH / 2) * 2
// Figma "ChatProfile/L"(96px) 앞 프로필의 흰 테두리 3px — size에 비례하되 목록 크기에서 너무 얇아지지 않게 최소 2px.
const GROUP_BORDER_RATIO = 3 / 96

interface ChatProfileProps extends React.ComponentProps<"div"> {
  src?: string
  alt?: string
  size?: number
  /**
   * 접속중이면 우하단에 초록 배지를 표시한다. 오프라인/미상은 배지를 그리지 않는다(회색 점 없음).
   * 겹친 아바타(grouped)에도 표시 가능하므로, "표시할 관계인지"는 호출부가 판단한다.
   */
  online?: boolean
  /** group: 채팅방/그룹 아바타처럼 두 프로필이 겹쳐 보이는 형태 */
  secondarySrc?: string
  /**
   * 두 프로필을 겹쳐 표시할지 명시적으로 지정한다(3명 이상 방).
   * 2번째 멤버가 프로필 사진이 없어(secondarySrc undefined) 겹침 모드가 꺼지는 것을 막는다.
   * 미지정 시 secondarySrc 유무로 판단한다.
   */
  grouped?: boolean
}

function ChatProfile({
  className,
  src,
  alt = "",
  size = 44,
  online,
  secondarySrc,
  grouped,
  style,
  ...props
}: ChatProfileProps) {
  const isGroup = grouped ?? Boolean(secondarySrc)
  const groupBorderWidth = Math.max(2, Math.round(size * GROUP_BORDER_RATIO))
  // svg 좌표 1칸이 실제 몇 px 인지 — 배지 지름/테두리/중심을 size 에 비례시킨다.
  const badgeUnit = (size * BADGE_CANVAS_RATIO) / BADGE_VIEWBOX
  const badgeDiameter = BADGE_OUTER_DIAMETER * badgeUnit

  return (
    <div
      data-slot="chat-profile"
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size, ...style }}
      {...props}
    >
      {isGroup && (
        <div
          className="absolute top-0 right-0 overflow-hidden rounded-full bg-gray-100"
          style={{ width: size * 0.63, height: size * 0.63 }}
        >
          {secondarySrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={secondarySrc} alt="" className="size-full object-cover" />
          ) : (
            <NoImageProfile />
          )}
        </div>
      )}
      <div
        className={cn(
          "absolute overflow-hidden rounded-full bg-gray-100",
          isGroup && "border-solid border-white"
        )}
        style={
          isGroup
            ? { width: size * 0.63, height: size * 0.63, left: 0, bottom: 0, borderWidth: groupBorderWidth }
            : { inset: 0 }
        }
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className="size-full object-cover" />
        ) : (
          <NoImageProfile />
        )}
      </div>
      {online && (
        <div
          className="absolute box-border rounded-full border-solid border-white bg-green"
          style={{
            width: badgeDiameter,
            height: badgeDiameter,
            top: size * BADGE_CANVAS_TOP_RATIO + BADGE_CENTER * badgeUnit - badgeDiameter / 2,
            left: size * BADGE_CANVAS_LEFT_RATIO + BADGE_CENTER * badgeUnit - badgeDiameter / 2,
            borderWidth: BADGE_RING_WIDTH * badgeUnit,
          }}
        />
      )}
    </div>
  )
}

export { ChatProfile }
