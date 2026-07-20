interface InitialMapCoordinates {
  lat: number
  lng: number
}

type InitialMapStatus = "loading" | "success" | "error"

interface InitialMapCenterInput {
  position: InitialMapCoordinates | null
  status: InitialMapStatus
  fallbackCenter: InitialMapCoordinates
}

function resolveInitialMapCenter({
  position,
  status,
  fallbackCenter,
}: InitialMapCenterInput): InitialMapCoordinates | null {
  if (position) return position
  return status === "error" ? fallbackCenter : null
}

export { resolveInitialMapCenter }
export type { InitialMapCoordinates, InitialMapStatus }
