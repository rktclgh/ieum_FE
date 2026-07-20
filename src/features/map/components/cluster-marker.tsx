"use client"

import L from "leaflet"
import * as React from "react"
import { Marker } from "react-leaflet"

import { escapeAttr } from "@/features/map/components/pin-marker"

const GRAY_900 = "#1f2324" // --color-gray-900 (ClusterPin bg)

// map-pin.tsx의 ClusterPin(다크 원 44px + text-body-semibold-15 흰 개수)과 동일 비주얼을
// leaflet divIcon용 plain HTML로 조립한다(divIcon은 React 트리 밖이라 컴포넌트 재사용 불가).
// #111 디자인: 질문/모임 핀과 통일해 44px + 드롭섀도.
// aria-label은 i18n clusterMarkerLabel(count)을 그대로 받아 넣는다(하드코딩 금지).
function buildClusterIcon(count: number, label: string): L.DivIcon {
  // 개수가 매우 커도 원 안에 담기도록 4자리부터는 축약 표기.
  const text = count > 999 ? "999+" : String(count)

  return L.divIcon({
    html: `<div role="img" aria-label="${escapeAttr(label)}" style="display:flex;width:44px;height:44px;align-items:center;justify-content:center;border-radius:9999px;background:${GRAY_900};box-shadow:0 2px 4px 0 rgba(0,0,0,0.25)"><span style="font-size:15px;line-height:1.4;font-weight:600;color:#ffffff">${escapeAttr(text)}</span></div>`,
    className: "",
    iconSize: [44, 44],
    iconAnchor: [22, 22], // 원 중심을 클러스터 좌표에 고정
  })
}

interface ClusterMarkerProps {
  count: number
  lat: number
  lng: number
  /** i18n clusterMarkerLabel(count) 결과 — 마커 aria-label */
  label: string
  onClick: () => void
}

function ClusterMarker({ count, lat, lng, label, onClick }: ClusterMarkerProps) {
  const icon = React.useMemo(() => buildClusterIcon(count, label), [count, label])

  // onClick이 매 렌더 새 함수여도 eventHandlers 객체 정체성을 고정해, react-leaflet이
  // 매 렌더 리스너를 off/on 재바인딩하지 않도록 한다. 최신 콜백은 ref로 동기화한다.
  const onClickRef = React.useRef(onClick)
  React.useEffect(() => {
    onClickRef.current = onClick
  })
  const eventHandlers = React.useMemo(() => ({ click: () => onClickRef.current() }), [])

  return <Marker position={[lat, lng]} icon={icon} eventHandlers={eventHandlers} />
}

export { ClusterMarker }
