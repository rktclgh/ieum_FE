"use client"

import * as React from "react"
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet"
import "leaflet/dist/leaflet.css"

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
}

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

function MapCanvas({ center, className, onMapClick }: MapCanvasProps) {
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
    </MapContainer>
  )
}

export { MapCanvas }
