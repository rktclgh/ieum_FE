"use client"

import * as React from "react"

import { resolveInitialGeolocationStatus } from "@/features/map/lib/geolocation-initial-status"

interface Coordinates {
  lat: number
  lng: number
}

type GeolocationStatus = "loading" | "success" | "error"

interface UseGeolocationOptions {
  enabled?: boolean
}

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 1_000,
}

// 마운트 시 watchPosition으로 내 위치를 실시간 추적한다. 언마운트 시 clearWatch(배터리 소모 방지).
// TIMEOUT·POSITION_UNAVAILABLE은 watcher의 후속 success를 기다리고, 권한 거부만 최초 fallback으로 확정한다.
// position은 갱신마다 새 객체가 되므로 지도 뷰 재중심에 직접 쓰면 안 된다 — MapCanvas recenterKey로만 이동한다.
function useGeolocation({ enabled = true }: UseGeolocationOptions = {}) {
  const [position, setPosition] = React.useState<Coordinates | null>(null)
  const [accuracy, setAccuracy] = React.useState<number | null>(null)
  const [status, setStatus] = React.useState<GeolocationStatus>("loading")
  const [initialStatus, setInitialStatus] = React.useState<GeolocationStatus>("loading")

  const isSupported = typeof navigator !== "undefined" && Boolean(navigator.geolocation)

  React.useEffect(() => {
    if (!isSupported || !enabled) return

    const watchId = navigator.geolocation.watchPosition(
      (result) => {
        setPosition({ lat: result.coords.latitude, lng: result.coords.longitude })
        setAccuracy(result.coords.accuracy)
        setStatus("success")
        setInitialStatus((currentStatus) =>
          resolveInitialGeolocationStatus(currentStatus, { type: "success" })
        )
      },
      (error) => {
        setStatus("error")
        setInitialStatus((currentStatus) =>
          resolveInitialGeolocationStatus(currentStatus, {
            type: "error",
            errorCode: error.code,
          })
        )
      },
      GEOLOCATION_OPTIONS
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [enabled, isSupported])

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
