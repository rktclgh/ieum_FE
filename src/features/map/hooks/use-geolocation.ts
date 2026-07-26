"use client"

import * as React from "react"

import { readUsablePosition, rememberPosition } from "@/features/map/lib/geolocation-cache"
import { resolveInitialGeolocationStatus } from "@/features/map/lib/geolocation-initial-status"
import { shouldAcceptLiveFix } from "@/features/map/lib/live-position-filter"

interface Coordinates {
  lat: number
  lng: number
}

type GeolocationStatus = "loading" | "success" | "error"

interface UseGeolocationOptions {
  enabled?: boolean
}

// maximumAge는 "브라우저가 이미 갖고 있는 측위 결과를 몇 ms까지 그대로 내줘도 되는가"이지
// 이후 갱신 주기가 아니다. watchPosition은 그 뒤로도 계속 새 좌표를 밀어주므로, 이 값을 늘려도
// 실시간 추적 정확도는 그대로면서 첫 콜백만 즉시 떨어진다(= 재진입 시 GPS 재측위 대기 제거).
const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 30_000,
}

// 마운트 시 watchPosition으로 내 위치를 실시간 추적한다. 언마운트 시 clearWatch(배터리 소모 방지).
// TIMEOUT·POSITION_UNAVAILABLE은 watcher의 후속 success를 기다리고, 권한 거부만 최초 fallback으로 확정한다.
// position은 갱신마다 새 객체가 되므로 지도 뷰 재중심에 직접 쓰면 안 된다 — MapCanvas recenterKey로만 이동한다.
function useGeolocation({ enabled = true }: UseGeolocationOptions = {}) {
  // 탭 이동으로 훅이 재마운트되면 "loading"부터 다시 시작해 지도가 GPS를 기다리게 된다.
  // 최근 좌표가 남아 있으면 그것으로 즉시 출발한다. watcher가 곧 실제 좌표로 덮어쓴다.
  // 서버 렌더에서는 캐시가 항상 비어 있어 "loading"이고, 클라 첫 렌더의 출력은 isMounted
  // 게이트에 가려 서버와 동일하므로 hydration은 어긋나지 않는다.
  const [seededPosition] = React.useState<Coordinates | null>(() => readUsablePosition(Date.now()))
  const [position, setPosition] = React.useState<Coordinates | null>(seededPosition)
  // shouldAcceptLiveFix가 "이전 좌표"로 비교할 마지막 수락 좌표. state는 effect 밖 콜백에서
  // stale하게 캡처되므로(watchPosition 구독은 마운트 시 1회) ref로 최신값을 유지한다.
  const positionRef = React.useRef(seededPosition)
  const [status, setStatus] = React.useState<GeolocationStatus>(
    seededPosition ? "success" : "loading"
  )
  const [initialStatus, setInitialStatus] = React.useState<GeolocationStatus>(
    seededPosition ? "success" : "loading"
  )

  const isSupported = typeof navigator !== "undefined" && Boolean(navigator.geolocation)

  React.useEffect(() => {
    if (!isSupported || !enabled) return

    const watchId = navigator.geolocation.watchPosition(
      (result) => {
        const next = { lat: result.coords.latitude, lng: result.coords.longitude }
        setStatus("success")
        setInitialStatus((currentStatus) =>
          resolveInitialGeolocationStatus(currentStatus, { type: "success" })
        )

        // 정확도가 나쁘거나 이전 좌표에서 거의 움직이지 않은 fix는 반영하지 않는다 — GPS
        // 자연 흔들림이 그대로 위치 점에 스냅되며 떨림처럼 보이는 문제(이슈 #507)를 막는다.
        if (!shouldAcceptLiveFix(positionRef.current, { ...next, accuracyMeters: result.coords.accuracy })) {
          return
        }

        // 다음 마운트가 곧바로 출발할 수 있도록 남긴다. timestamp는 측위 시각이라 나이 계산에 맞다.
        rememberPosition(next, result.timestamp)
        positionRef.current = next
        setPosition(next)
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
    status: isSupported ? status : "error",
    initialStatus: isSupported ? initialStatus : "error",
    isSupported,
  }
}

export { useGeolocation }
export type { Coordinates, GeolocationStatus }
