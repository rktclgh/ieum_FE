"use client"

import L from "leaflet"
import * as React from "react"
import { Marker } from "react-leaflet"

import type { MapPin } from "@/features/map/api/pin-types"
import { resolveFileUrl } from "@/lib/api/file-url"

const TEARDROP_SRC = "/icons/map/pin-teardrop.svg"
const PRIMARY = "#fc7045" // --color-primary

// lucide "check" 글리프(stroke 아이콘)를 leaflet divIcon(plain HTML)에 그대로 심기 위한 raw SVG.
// 해결된 질문 핀의 원형 배경이 PRIMARY로 채워지므로 stroke는 흰색으로 대비를 준다.
const RESOLVED_CHECK_SVG =
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" ' +
  'stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'

// divIcon HTML 문자열에 URL을 넣기 전, 속성값 이스케이프만 한다.
// (백엔드가 이미 인코딩한 URL에 encodeURI를 다시 걸면 %가 이중 인코딩되어 이미지가 깨진다.)
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

// 티어드롭(44x54, left:6px) 위에 모임=원형 썸네일 / 질문=파란 물음표를 얹는다.
// Leaflet divIcon은 React 트리 밖이라 map-pin.tsx(next/image)를 재사용하지 못해
// 여기서 동일 비주얼을 plain HTML로 조립한다. className:""로 leaflet 기본 테두리를 제거.
function buildPinIcon(pin: MapPin): L.DivIcon {
  const teardrop = `<img src="${TEARDROP_SRC}" alt="" style="position:absolute;top:0;left:6px;width:44px;height:54px" />`
  const thumbnailUrl = resolveFileUrl(pin.thumbnailUrl)

  // 질문 핀: 해결됨(pin.resolved)이면 primary로 채운 원 + 흰 체크, 미해결이면 기존 물음표 원.
  // resolved는 현재 BE GET /pins가 내려주지 않는 선제적 필드(pin-types.ts 참고) —
  // undefined면 자연히 이 분기를 타지 않아 기존 미해결 비주얼과 동일하게 렌더된다.
  const inner =
    pin.pinType === "meeting"
      ? `<div style="position:absolute;top:2px;left:50%;transform:translateX(-50%);width:40px;height:40px;border-radius:9999px;overflow:hidden;background:#f3f4f6">${
          thumbnailUrl
            ? `<img src="${escapeAttr(thumbnailUrl)}" alt="" style="width:100%;height:100%;object-fit:cover" />`
            : ""
        }</div>`
      : pin.resolved
        ? `<div style="position:absolute;top:2px;left:50%;transform:translateX(-50%);display:flex;width:40px;height:40px;align-items:center;justify-content:center;border-radius:9999px;background:${PRIMARY}">${RESOLVED_CHECK_SVG}</div>`
        : `<div style="position:absolute;top:2px;left:50%;transform:translateX(-50%);display:flex;width:40px;height:40px;align-items:center;justify-content:center;border-radius:9999px;background:#f9fafb"><span style="font-size:28px;line-height:1;font-weight:700;color:${PRIMARY}">?</span></div>`

  return L.divIcon({
    html: `<div style="position:relative;width:56px;height:56px">${teardrop}${inner}</div>`,
    className: "",
    iconSize: [56, 56],
    iconAnchor: [28, 54], // 티어드롭 꼬리 끝(하단 중앙)을 좌표에 고정
    popupAnchor: [0, -54],
  })
}

interface PinMarkerProps {
  pin: MapPin
  onClick?: (pin: MapPin) => void
}

function PinMarker({ pin, onClick }: PinMarkerProps) {
  const icon = React.useMemo(() => buildPinIcon(pin), [pin])

  // onClick이 매 렌더 새 함수여도 eventHandlers 객체 정체성을 고정해, react-leaflet이
  // 매 렌더 리스너를 off/on 재바인딩하지 않도록 한다. 최신 콜백은 ref로 동기화한다.
  const onClickRef = React.useRef(onClick)
  React.useEffect(() => {
    onClickRef.current = onClick
  })
  const eventHandlers = React.useMemo(() => ({ click: () => onClickRef.current?.(pin) }), [pin])

  return <Marker position={[pin.location.lat, pin.location.lng]} icon={icon} eventHandlers={eventHandlers} />
}

export { PinMarker, escapeAttr }
