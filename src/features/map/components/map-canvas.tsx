"use client"

import L from "leaflet"
import * as React from "react"
import { MapContainer, Marker, useMap, useMapEvents } from "react-leaflet"
import "leaflet/dist/leaflet.css"

import type { MapBounds, MapPin } from "@/features/map/api/pin-types"
import { ClusteredPins } from "@/features/map/components/clustered-pins"
import { VectorTileLayer } from "@/features/map/components/vector-tile-layer"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/features/map/constants/map"
import { isLeafletMapActive } from "@/features/map/lib/leaflet-map-lifecycle"

interface MapCanvasProps {
  /** 재중심 시 이동할 좌표. 실시간 위치 갱신은 여기에 반영되어도 뷰를 움직이지 않는다(recenterKey로만 이동). */
  center: Coordinates | null
  /** 증가할 때마다 그 시점의 center로 지도를 이동시키는 nonce. 미지정이면 재중심 안 함 */
  recenterKey?: number
  /** 재중심 시 맞출 확대 단계. 없으면 현재 zoom 유지 */
  centerZoom?: number
  /** 재중심 시 flyTo로 부드럽게 이동할지 여부 */
  animateCenter?: boolean
  /** 상단 오버레이(헤더 등)에 가려지는 높이(px). 보이는 영역 정중앙 계산에 사용 */
  topInset?: number
  /** 하단 오버레이(시트 등)에 가려지는 높이(px). 보이는 영역 정중앙 계산에 사용 */
  bottomInset?: number
  className?: string
  onMapClick?: (position: Coordinates) => void
  onBoundsChange?: (bounds: MapBounds) => void
  pins?: MapPin[]
  onPinClick?: (pin: MapPin) => void
  livePosition?: Coordinates | null
  /** 사용자가 지도에서 고른 지점 — Figma Location/XL 핀으로 표시 */
  selectedPosition?: Coordinates | null
  /** 선택 핀 마커를 클릭했을 때 (핀 토글 제거용). 미지정이면 마커 클릭 무반응 */
  onSelectedPositionClick?: () => void
}

const LIVE_ACCENT = "#FC7045"

// Figma Location/XL (node 1716:12220): primary 색 물방울 핀 + 흰 구멍 + 회색 그림자 타원. 팁이 좌표를 가리킨다.
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
    <div style="position:absolute;left:18px;top:18px;width:12px;height:12px;border-radius:9999px;background:${LIVE_ACCENT};outline:3px solid #ffffff;box-shadow:0 0 8px 0 rgba(252,112,69,0.6),0 0 4px 0 rgba(0,0,0,0.25)"></div>
  </div>`,
  className: "",
  iconSize: [48, 48],
  iconAnchor: [24, 24], 
})

// react-leaflet Marker는 map이 해제되는 중(StrictMode 재마운트·HMR)에 마운트되면 mapPane이 없어
// leaflet Marker._initIcon의 getPane().appendChild에서 터진다. map이 살아 있을 때만 렌더한다.
function ActiveMarker(props: React.ComponentProps<typeof Marker>) {
  const map = useMap()
  if (!isLeafletMapActive(map)) return null
  return <Marker {...props} />
}

function MapCenterUpdater({
  center,
  recenterKey,
  zoom,
  animate,
  topInset = 0,
  bottomInset = 0,
}: {
  center: Coordinates | null
  recenterKey: number
  zoom?: number
  animate?: boolean
  topInset?: number
  bottomInset?: number
}) {
  const map = useMap()
  // 최초 마운트 시점의 key를 "이미 적용됨"으로 두어, 마운트만으로는 재중심하지 않는다.
  const appliedKeyRef = React.useRef(recenterKey)

  React.useEffect(() => {
    // recenterKey가 실제로 바뀌었을 때만 이동. center 실시간 갱신/인셋 변화에는 반응하지 않는다.
    if (appliedKeyRef.current === recenterKey) return
    // center가 아직 없으면 key를 소비하지 않는다. center는 deps에 있어 값이 채워지면 이 effect가
    // 다시 실행되고, 그때 비로소 재중심 후 key를 소비한다(요청 유실 방지).
    if (!center || !isLeafletMapActive(map)) return

    const targetZoom = zoom ?? map.getZoom()
    appliedKeyRef.current = recenterKey

    // 헤더·하단 시트가 지도를 가리면 그만큼 패딩을 줘, 보이는 영역의 정중앙에 오도록 flyToBounds로 이동.
    if (topInset > 0 || bottomInset > 0) {
      map.flyToBounds(L.latLngBounds([center.lat, center.lng], [center.lat, center.lng]), {
        paddingTopLeft: [0, topInset],
        paddingBottomRight: [0, bottomInset],
        maxZoom: targetZoom,
      })
    } else if (animate) {
      map.flyTo([center.lat, center.lng], targetZoom)
    } else {
      map.setView([center.lat, center.lng], targetZoom)
    }
  }, [center, recenterKey, zoom, animate, topInset, bottomInset, map])

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

  React.useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange
  }, [onBoundsChange])

  React.useEffect(() => {
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const emit = () => {
      if (disposed || !isLeafletMapActive(map)) return

      const bounds = map.getBounds()
      const sw = bounds.getSouthWest()
      const ne = bounds.getNorthEast()
      onBoundsChangeRef.current({ swLat: sw.lat, swLng: sw.lng, neLat: ne.lat, neLng: ne.lng })
    }

    const scheduleEmit = () => {
      if (disposed) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        emit()
      }, 250)
    }

    // Leaflet이 준비된 뒤에만 최초 bounds를 읽고, 해제 시 listener와 지연 작업을 함께 제거한다.
    map.whenReady(emit)
    map.on("moveend", scheduleEmit)
    map.on("zoomend", scheduleEmit)

    return () => {
      disposed = true
      if (timer) clearTimeout(timer)
      map.off("moveend", scheduleEmit)
      map.off("zoomend", scheduleEmit)
    }
  }, [map])

  return null
}

function MapCanvas({
  center,
  recenterKey,
  centerZoom,
  animateCenter,
  topInset,
  bottomInset,
  className,
  onMapClick,
  onBoundsChange,
  pins,
  onPinClick,
  livePosition,
  selectedPosition,
  onSelectedPositionClick,
}: MapCanvasProps) {
  const initialCenter = center ?? DEFAULT_MAP_CENTER
  // React refresh/조건부 재마운트에서 이전 Leaflet map의 remove가 늦더라도 새 map은 다른 DOM 컨테이너를 쓴다.
  const [mapContainerKey] = React.useState(() => crypto.randomUUID())

  return (
    <MapContainer
      key={mapContainerKey}
      center={[initialCenter.lat, initialCenter.lng]}
      zoom={DEFAULT_MAP_ZOOM}
      zoomControl={false}
      attributionControl={false}
      className={className}
    >
      <VectorTileLayer />
      <MapCenterUpdater
        center={center}
        recenterKey={recenterKey ?? 0}
        zoom={centerZoom}
        animate={animateCenter}
        topInset={topInset}
        bottomInset={bottomInset}
      />
      {onMapClick && <MapClickListener onMapClick={onMapClick} />}
      {onBoundsChange && <MapBoundsWatcher onBoundsChange={onBoundsChange} />}
      {pins && pins.length > 0 && (
        <ClusteredPins
          pins={pins}
          onPinClick={onPinClick}
          topInset={topInset}
          bottomInset={bottomInset}
        />
      )}
      {selectedPosition && (
        <ActiveMarker
          position={[selectedPosition.lat, selectedPosition.lng]}
          icon={selectedLocationIcon}
          eventHandlers={onSelectedPositionClick ? { click: onSelectedPositionClick } : undefined}
        />
      )}
      {livePosition && (
        <ActiveMarker position={[livePosition.lat, livePosition.lng]} icon={userLocationIcon} />
      )}
    </MapContainer>
  )
}

export { MapCanvas }
