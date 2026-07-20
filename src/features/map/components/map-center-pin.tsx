"use client"

import * as React from "react"

/**
 * Figma Location/XL (node 1716:12220) 핀. 좌표를 가리키는 팁이 iconAnchor에 온다.
 *
 * 지오메트리를 그림자와 몸통으로 나눠 둔 이유: 화면 고정 핀은 지도가 움직일 때
 * 몸통만 떠오르고 그림자는 바닥에 남아 축소돼야 한다. 홈 지도의 Leaflet divIcon은
 * 둘을 합친 정적 마크업을 쓴다 — 두 경로가 같은 path 데이터를 공유한다.
 */

const PIN_ACCENT = "#FC7045"

const PIN_VIEW_BOX = "0 0 24 28"
const PIN_WIDTH = 40
const PIN_HEIGHT = 47
const PIN_ANCHOR_X = 20
const PIN_ANCHOR_Y = 41

const PIN_SHADOW_MARKUP = `<ellipse cx="12" cy="24.3" rx="4.5" ry="1.5" fill="#9AA5A8" fill-opacity="0.5"/>`

const PIN_BODY_MARKUP =
  `<path d="M12 1.5C7.03 1.5 3 5.53 3 10.5c0 6.02 6.44 12.02 8.28 13.62.41.36 1.03.36 1.44 0C14.56 22.52 21 16.52 21 10.5 21 5.53 16.97 1.5 12 1.5Z" fill="${PIN_ACCENT}"/>` +
  `<circle cx="12" cy="10.5" r="3.25" fill="#ffffff"/>`

/** Leaflet divIcon용 — 그림자와 몸통을 합친 정적 마크업. */
const PIN_COMBINED_SVG = `<svg width="${PIN_WIDTH}" height="${PIN_HEIGHT}" viewBox="${PIN_VIEW_BOX}" fill="none" xmlns="http://www.w3.org/2000/svg">${PIN_SHADOW_MARKUP}${PIN_BODY_MARKUP}</svg>`

interface MapCenterPinProps {
  /** 지도가 움직이는 중이면 몸통이 떠오르고 그림자가 줄어든다 */
  isLifted?: boolean
  className?: string
}

/**
 * 지도 위에 화면 고정으로 얹는 핀. 부모의 정중앙에 팁이 오도록 anchor만큼 끌어올린다.
 * 좌표를 표현하는 마커가 아니라 조준선이므로 클릭을 받지 않는다.
 */
function MapCenterPin({ isLifted = false, className }: MapCenterPinProps) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute left-1/2 top-1/2 ${className ?? ""}`}
      style={{
        width: PIN_WIDTH,
        height: PIN_HEIGHT,
        // 팁(anchor)이 부모 정중앙에 오도록 이동. translate(-50%,-50%)가 아니라
        // anchor 기준이어야 핀이 가리키는 지점과 조회 좌표가 일치한다.
        transform: `translate(${-PIN_ANCHOR_X}px, ${-PIN_ANCHOR_Y}px)`,
      }}
    >
      <svg
        width={PIN_WIDTH}
        height={PIN_HEIGHT}
        viewBox={PIN_VIEW_BOX}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 transition-transform duration-base ease-base"
        style={{
          // 그림자 타원 자체의 중심(= 핀 anchor)에서 축소해야 바닥에 붙어 있는 것처럼 보인다.
          transformOrigin: `${PIN_ANCHOR_X}px ${PIN_ANCHOR_Y}px`,
          transform: isLifted ? "scale(0.6)" : "scale(1)",
        }}
        dangerouslySetInnerHTML={{ __html: PIN_SHADOW_MARKUP }}
      />
      <svg
        width={PIN_WIDTH}
        height={PIN_HEIGHT}
        viewBox={PIN_VIEW_BOX}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 transition-transform duration-base ease-base"
        style={{ transform: isLifted ? "translateY(-4px)" : "translateY(0)" }}
        dangerouslySetInnerHTML={{ __html: PIN_BODY_MARKUP }}
      />
    </div>
  )
}

export { MapCenterPin, PIN_COMBINED_SVG, PIN_ACCENT, PIN_WIDTH, PIN_HEIGHT, PIN_ANCHOR_X, PIN_ANCHOR_Y }
