"use client"

import * as React from "react"

interface Coordinates {
  lat: number
  lng: number
}

type GeolocationStatus = "loading" | "success" | "error"

const GEOLOCATION_OPTIONS: PositionOptions = { enableHighAccuracy: true, timeout: 10_000 }

function useGeolocation() {
  const [position, setPosition] = React.useState<Coordinates | null>(null)
  const [accuracy, setAccuracy] = React.useState<number | null>(null)
  const [status, setStatus] = React.useState<GeolocationStatus>("loading")
  const [requestId, setRequestId] = React.useState(0)
  const [isFollowing, setIsFollowing] = React.useState(false)
  const watchIdRef = React.useRef<number | null>(null)

  const isSupported = typeof navigator !== "undefined" && Boolean(navigator.geolocation)

  // 일회성 조회: 최초 mount + requestLocation() 호출 시.
  React.useEffect(() => {
    if (!isSupported) {
      setStatus("error")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (result) => {
        setPosition({ lat: result.coords.latitude, lng: result.coords.longitude })
        setAccuracy(result.coords.accuracy)
        setStatus("success")
      },
      () => setStatus("error"),
      GEOLOCATION_OPTIONS
    )
  }, [isSupported, requestId])

  const requestLocation = React.useCallback(() => setRequestId((id) => id + 1), [])

  // follow-me: watchPosition으로 실시간 추적, 해제 시 반드시 clearWatch(배터리 소모 방지).
  const stopFollow = React.useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsFollowing(false)
  }, [])

  const startFollow = React.useCallback(() => {
    if (!isSupported) {
      setStatus("error")
      return
    }
    if (watchIdRef.current !== null) return

    setIsFollowing(true)
    watchIdRef.current = navigator.geolocation.watchPosition(
      (result) => {
        setPosition({ lat: result.coords.latitude, lng: result.coords.longitude })
        setAccuracy(result.coords.accuracy)
        setStatus("success")
      },
      () => {
        setStatus("error")
        stopFollow()
      },
      { ...GEOLOCATION_OPTIONS, maximumAge: 1_000 }
    )
  }, [isSupported, stopFollow])

  const toggleFollow = React.useCallback(() => {
    if (watchIdRef.current !== null) stopFollow()
    else startFollow()
  }, [startFollow, stopFollow])

  // 언마운트 시 남은 watch 정리.
  React.useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [])

  return {
    position,
    accuracy,
    status,
    isSupported,
    isFollowing,
    requestLocation,
    startFollow,
    stopFollow,
    toggleFollow,
  }
}

export { useGeolocation }
export type { Coordinates, GeolocationStatus }
