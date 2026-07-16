"use client"

import * as React from "react"

interface Coordinates {
  lat: number
  lng: number
}

type GeolocationStatus = "loading" | "success" | "error"

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 1_000,
}

// 마운트 시 watchPosition으로 내 위치를 실시간 추적한다. 언마운트 시 clearWatch(배터리 소모 방지).
// position은 갱신마다 새 객체가 되므로 지도 뷰 재중심에 직접 쓰면 안 된다 — MapCanvas recenterKey로만 이동한다.
function useGeolocation() {
  const [position, setPosition] = React.useState<Coordinates | null>(null)
  const [accuracy, setAccuracy] = React.useState<number | null>(null)
  const [status, setStatus] = React.useState<GeolocationStatus>("loading")
  const [initialStatus, setInitialStatus] = React.useState<GeolocationStatus>("loading")

  const isSupported = typeof navigator !== "undefined" && Boolean(navigator.geolocation)

  React.useEffect(() => {
    if (!isSupported) return

    const watchId = navigator.geolocation.watchPosition(
      (result) => {
        setPosition({ lat: result.coords.latitude, lng: result.coords.longitude })
        setAccuracy(result.coords.accuracy)
        setStatus("success")
        setInitialStatus((currentStatus) =>
          currentStatus === "loading" ? "success" : currentStatus
        )
      },
      () => {
        setStatus("error")
        setInitialStatus((currentStatus) =>
          currentStatus === "loading" ? "error" : currentStatus
        )
      },
      GEOLOCATION_OPTIONS
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [isSupported])

  return {
    position,
    accuracy,
    status: isSupported ? status : "error",
    initialStatus: isSupported ? initialStatus : "error",
    isSupported,
  }
}

export { useGeolocation }
export type { Coordinates, GeolocationStatus }
