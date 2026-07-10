"use client"

import * as React from "react"
import { Circle, CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet"
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
  className?: string
  onMapClick?: (position: Coordinates) => void
  onBoundsChange?: (bounds: MapBounds) => void
  pins?: MapPin[]
  onPinClick?: (pin: MapPin) => void
  livePosition?: Coordinates | null
  liveAccuracy?: number | null
  onUserPan?: () => void
}

const LIVE_PRIMARY = "#0f40ab" // --color-primary-600

function MapCenterUpdater({ center }: { center: Coordinates }) {
  const map = useMap()

  React.useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom())
  }, [center, map])

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
  className,
  onMapClick,
  onBoundsChange,
  pins,
  onPinClick,
  livePosition,
  liveAccuracy,
  onUserPan,
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
      {center && <MapCenterUpdater center={center} />}
      {onMapClick && <MapClickListener onMapClick={onMapClick} />}
      {onBoundsChange && <MapBoundsWatcher onBoundsChange={onBoundsChange} />}
      {onUserPan && <MapDragListener onUserPan={onUserPan} />}
      {pins?.map((pin) => (
        <PinMarker key={pin.pinId} pin={pin} onClick={onPinClick} />
      ))}
      {livePosition && (
        <>
          {liveAccuracy ? (
            <Circle
              center={[livePosition.lat, livePosition.lng]}
              radius={liveAccuracy}
              pathOptions={{ color: LIVE_PRIMARY, weight: 1, fillColor: LIVE_PRIMARY, fillOpacity: 0.1 }}
            />
          ) : null}
          <CircleMarker
            center={[livePosition.lat, livePosition.lng]}
            radius={7}
            pathOptions={{ color: "#ffffff", weight: 2, fillColor: LIVE_PRIMARY, fillOpacity: 1 }}
          />
        </>
      )}
    </MapContainer>
  )
}

export { MapCanvas }
