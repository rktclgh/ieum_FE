"use client"

import L from "leaflet"
import * as React from "react"
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet"
import "leaflet/dist/leaflet.css"

import type { MapBounds, MapPin } from "@/features/map/api/pin-types"
import { PinMarker } from "@/features/map/components/pin-marker"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAP_TILE_MAX_ZOOM,
  MAP_TILE_SUBDOMAINS,
  MAP_TILE_URL,
} from "@/features/map/constants/map"

interface MapCanvasProps {
  center: Coordinates | null
  /** center 변경 시 맞출 확대 단계. 없으면 현재 zoom 유지 */
  centerZoom?: number
  /** center 변경 시 flyTo로 부드럽게 이동할지 여부 */
  animateCenter?: boolean
  className?: string
  onMapClick?: (position: Coordinates) => void
  onBoundsChange?: (bounds: MapBounds) => void
  pins?: MapPin[]
  onPinClick?: (pin: MapPin) => void
  livePosition?: Coordinates | null
  liveAccuracy?: number | null
  onUserPan?: () => void
  /** 사용자가 지도에서 고른 지점 — Figma Location/XL 핀으로 표시 */
  selectedPosition?: Coordinates | null
}

const LIVE_ACCENT = "#316CED"

// Figma Location/XL (node 1716:12220): 파란 물방울 핀 + 흰 구멍 + 회색 그림자 타원. 팁이 좌표를 가리킨다.
const selectedLocationIcon = L.divIcon({
  html: `<svg width="40" height="47" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="12" cy="24.3" rx="4.5" ry="1.5" fill="#9AA5A8" fill-opacity="0.5"/>
    <path d="M12 1.5C7.03 1.5 3 5.53 3 10.5c0 6.02 6.44 12.02 8.28 13.62.41.36 1.03.36 1.44 0C14.56 22.52 21 16.52 21 10.5 21 5.53 16.97 1.5 12 1.5Z" fill="${LIVE_ACCENT}"/>
    <circle cx="12" cy="10.5" r="3.25" fill="#ffffff"/>
  </svg>`,
  className: "",
  iconSize: [40, 47],
  iconAnchor: [20, 41],
})

const userLocationIcon = L.divIcon({
  html: `<div style="position:relative;width:48px;height:48px">
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none" style="position:absolute;inset:0">
      <g filter="url(#user_loc_halo_blur)"><circle cx="24" cy="24" r="22" fill="${LIVE_ACCENT}" fill-opacity="0.2"/></g>
      <defs><filter id="user_loc_halo_blur" x="0" y="0" width="48" height="48" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur stdDeviation="1" result="effect1_foregroundBlur"/></filter></defs>
    </svg>
    <div style="position:absolute;left:18px;top:18px;width:12px;height:12px;border-radius:9999px;background:${LIVE_ACCENT};outline:3px solid #ffffff;box-shadow:0 0 8px 0 rgba(49,108,237,0.6),0 0 4px 0 rgba(0,0,0,0.25)"></div>
  </div>`,
  className: "",
  iconSize: [48, 48],
  iconAnchor: [24, 24], 
})

function MapCenterUpdater({
  center,
  zoom,
  animate,
}: {
  center: Coordinates
  zoom?: number
  animate?: boolean
}) {
  const map = useMap()

  React.useEffect(() => {
    const targetZoom = zoom ?? map.getZoom()
    // animate=true면 flyTo로 부드럽게 이동(+확대 단계 복귀), 아니면 즉시 이동.
    if (animate) {
      map.flyTo([center.lat, center.lng], targetZoom)
    } else {
      map.setView([center.lat, center.lng], targetZoom)
    }
  }, [center, zoom, animate, map])

  return null
}

function MapClickListener({ onMapClick }: { onMapClick: (position: Coordinates) => void }) {
  useMapEvents({
    click(event) {
      onMapClick({ lat: event.latlng.lat, lng: event.latlng.lng })
    },
  })

  return null
}

// 지도 영역(bbox)을 부모에 알린다. moveend/zoomend를 debounce로 합쳐 과도한 재조회를 막고,
// 최초 mount 시 1회 즉시 방출한다. onBoundsChange를 ref에 담아 effect 재실행/무한 루프를 피한다.
function MapBoundsWatcher({ onBoundsChange }: { onBoundsChange: (bounds: MapBounds) => void }) {
  const map = useMap()
  const onBoundsChangeRef = React.useRef(onBoundsChange)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange
  })

  const emit = React.useCallback(() => {
    const bounds = map.getBounds()
    const sw = bounds.getSouthWest()
    const ne = bounds.getNorthEast()
    onBoundsChangeRef.current({ swLat: sw.lat, swLng: sw.lng, neLat: ne.lat, neLng: ne.lng })
  }, [map])

  const scheduleEmit = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(emit, 250)
  }, [emit])

  React.useEffect(() => {
    emit() // 최초 1회 즉시 방출
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [emit])

  useMapEvents({ moveend: scheduleEmit, zoomend: scheduleEmit })

  return null
}

// 사용자가 지도를 드래그하면 follow-me를 해제한다. dragstart는 사용자 조작에만 발생하고
// 프로그램적 setView(recenter)에는 발생하지 않아 follow 중 재중심과 충돌하지 않는다.
function MapDragListener({ onUserPan }: { onUserPan: () => void }) {
  useMapEvents({ dragstart: onUserPan })
  return null
}

function MapCanvas({
  center,
  centerZoom,
  animateCenter,
  className,
  onMapClick,
  onBoundsChange,
  pins,
  onPinClick,
  livePosition,
  liveAccuracy,
  onUserPan,
  selectedPosition,
}: MapCanvasProps) {
  const initialCenter = center ?? DEFAULT_MAP_CENTER

  return (
    <MapContainer
      center={[initialCenter.lat, initialCenter.lng]}
      zoom={DEFAULT_MAP_ZOOM}
      zoomControl={false}
      attributionControl={false}
      className={className}
    >
      <TileLayer
        url={MAP_TILE_URL}
        subdomains={MAP_TILE_SUBDOMAINS}
        maxZoom={MAP_TILE_MAX_ZOOM}
      />
      {center && <MapCenterUpdater center={center} zoom={centerZoom} animate={animateCenter} />}
      {onMapClick && <MapClickListener onMapClick={onMapClick} />}
      {onBoundsChange && <MapBoundsWatcher onBoundsChange={onBoundsChange} />}
      {onUserPan && <MapDragListener onUserPan={onUserPan} />}
      {pins?.map((pin) => (
        <PinMarker key={pin.pinId} pin={pin} onClick={onPinClick} />
      ))}
      {selectedPosition && (
        <Marker position={[selectedPosition.lat, selectedPosition.lng]} icon={selectedLocationIcon} />
      )}
      {livePosition && (
        <>
          {liveAccuracy ? (
            <Circle
              center={[livePosition.lat, livePosition.lng]}
              radius={liveAccuracy}
              pathOptions={{ stroke: false, fillColor: LIVE_ACCENT, fillOpacity: 0.1 }}
            />
          ) : null}
          <Marker position={[livePosition.lat, livePosition.lng]} icon={userLocationIcon} />
        </>
      )}
    </MapContainer>
  )
}

export { MapCanvas }
