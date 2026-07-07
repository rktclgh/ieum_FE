"use client"

import * as React from "react"

interface Coordinates {
  lat: number
  lng: number
}

type GeolocationStatus = "loading" | "success" | "error"

function useGeolocation() {
  const [position, setPosition] = React.useState<Coordinates | null>(null)
  const [status, setStatus] = React.useState<GeolocationStatus>("loading")
  const [requestId, setRequestId] = React.useState(0)

  const isSupported = typeof navigator !== "undefined" && Boolean(navigator.geolocation)

  React.useEffect(() => {
    if (!isSupported) return

    navigator.geolocation.getCurrentPosition(
      (result) => {
        setPosition({ lat: result.coords.latitude, lng: result.coords.longitude })
        setStatus("success")
      },
      () => setStatus("error"),
      { enableHighAccuracy: true, timeout: 10_000 }
    )
  }, [isSupported, requestId])

  const requestLocation = React.useCallback(() => setRequestId((id) => id + 1), [])

  return { position, status, isSupported, requestLocation }
}

export { useGeolocation }
export type { Coordinates, GeolocationStatus }
