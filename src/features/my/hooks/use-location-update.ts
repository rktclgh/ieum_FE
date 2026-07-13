"use client"

import * as React from "react"

import { useUpdateLocation } from "@/features/my/hooks/use-my-mutations"

type LocationUpdateStatus = "idle" | "loading" | "success" | "denied" | "unavailable"

// 브라우저 Geolocation 권한을 요청해 좌표를 얻고 PUT /users/me/location 으로 보낸다.
// 지도 follow-me(#31) 연동은 아직 없으므로, 여기서는 "위치 권한 허용 → 서버 갱신"만 담당한다.
function useLocationUpdate() {
  const [status, setStatus] = React.useState<LocationUpdateStatus>("idle")
  const updateLocation = useUpdateLocation()

  const requestLocationUpdate = React.useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable")
      return
    }

    setStatus("loading")
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateLocation.mutate(
          {
            longitude: position.coords.longitude,
            latitude: position.coords.latitude,
          },
          {
            onSuccess: () => setStatus("success"),
            onError: () => setStatus("unavailable"),
          }
        )
      },
      (error) => {
        setStatus(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable")
      }
    )
  }, [updateLocation])

  return { status, requestLocationUpdate, isPending: updateLocation.isPending }
}

export { useLocationUpdate }
export type { LocationUpdateStatus }
