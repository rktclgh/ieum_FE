"use client"

import L from "leaflet"
import * as React from "react"
import { Marker } from "react-leaflet"

import type { MapPin } from "@/features/map/api/pin-types"
import { resolveFileUrl } from "@/lib/api/file-url"

const NO_IMAGE_SRC = "/icons/map/pin-no-image.svg"
const GRAY_900 = "#1f2324" // --color-gray-900
const GRAY_100 = "#eceeee" // --color-gray-100 (모임 썸네일 자리 배경)

// #111 디자인: 티어드롭 꼬리 삭제 → 모든 핀이 44px 원 + 드롭섀도.
// 흰 원(44) 안에 40px 콘텐츠 원을 얹는 공통 컨테이너.
const OUTER =
  "position:relative;display:flex;width:44px;height:44px;align-items:center;justify-content:center;border-radius:9999px;background:#ffffff;box-shadow:0 2px 4px 0 rgba(0,0,0,0.25)"
const INNER =
  "display:flex;width:40px;height:40px;align-items:center;justify-content:center;border-radius:9999px;overflow:hidden"

// 질문 핀 물음표(#111: 기존 primary → gray900). Figma node 1128:3058의 물음표 글리프.
const QUESTION_SVG =
  `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">` +
  `<path d="M18.185 29.2395V29.0424C18.1853 28.0705 18.998 27.2821 20 27.2818C21.0022 27.2818 21.8147 28.0703 21.815 29.0424V29.2395C21.815 30.2118 21.0024 31 20 31C18.9979 30.9997 18.185 30.2116 18.185 29.2395ZM23.37 16.9022C23.3695 14.9978 21.8235 13.521 20 13.521C18.1768 13.5213 16.6305 14.9979 16.63 16.9022C16.63 17.8745 15.8174 18.6627 14.815 18.6627C13.8126 18.6627 13 17.8745 13 16.9022C13.0005 13.1273 16.0966 10.0003 20 10C23.9037 10 26.9995 13.1271 27 16.9022C27 20.6777 23.904 23.8067 20 23.8067C18.998 23.8064 18.1852 23.0181 18.185 22.0462C18.185 21.0741 18.9979 20.286 20 20.2857C21.8238 20.2857 23.37 18.8071 23.37 16.9022Z" fill="${GRAY_900}"/></svg>`

// divIcon HTML 문자열에 URL을 넣기 전, 속성값 이스케이프만 한다.
// (백엔드가 이미 인코딩한 URL에 encodeURI를 다시 걸면 %가 이중 인코딩되어 이미지가 깨진다.)
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

// 44px 원 핀을 plain HTML로 조립한다. Leaflet divIcon은 React 트리 밖이라
// map-pin.tsx(next/image)를 재사용하지 못해 동일 비주얼을 여기서 만든다.
// className:""로 leaflet 기본 테두리를 제거한다.
function buildPinIcon(pin: MapPin): L.DivIcon {
  const thumbnailUrl = resolveFileUrl(pin.thumbnailUrl)

  let inner: string
  if (pin.pinType === "meeting") {
    // 모임 핀: 40px 원 안에 썸네일, 없으면 회색 배경 + no-image 아이콘.
    inner = thumbnailUrl
      ? `<div style="${INNER};background:${GRAY_100}"><img src="${escapeAttr(
          thumbnailUrl,
        )}" alt="" style="width:100%;height:100%;object-fit:cover" /></div>`
      : `<div style="${INNER};background:${GRAY_100}"><img src="${NO_IMAGE_SRC}" alt="" style="width:24px;height:24px" /></div>`
  } else {
    inner = `<div style="${INNER};background:#ffffff">${QUESTION_SVG}</div>`
  }

  return L.divIcon({
    html: `<div style="${OUTER}">${inner}</div>`,
    className: "",
    iconSize: [44, 44],
    iconAnchor: [22, 22], // 꼬리가 없으므로 원의 중심을 좌표에 고정
    popupAnchor: [0, -22],
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
