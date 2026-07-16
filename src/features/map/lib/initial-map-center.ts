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

function resolvePlaceSelectionTarget({
  clicked,
  position,
  isFallbackLocked,
}: {
  clicked: InitialMapCoordinates | null
  position: InitialMapCoordinates | null
  isFallbackLocked: boolean
}): InitialMapCoordinates | null {
  if (clicked) return clicked
  return isFallbackLocked ? null : position
}

export { resolveInitialMapCenter, resolvePlaceSelectionTarget }
export type { InitialMapCoordinates, InitialMapStatus }
