const GEOLOCATION_PERMISSION_DENIED = 1

type InitialGeolocationStatus = "loading" | "success" | "error"

type InitialGeolocationEvent =
  | { type: "success" }
  | { type: "error"; errorCode: number }

function isInitialGeolocationFailure(errorCode: number) {
  return errorCode === GEOLOCATION_PERMISSION_DENIED
}

function resolveInitialGeolocationStatus(
  currentStatus: InitialGeolocationStatus,
  event: InitialGeolocationEvent
): InitialGeolocationStatus {
  if (currentStatus !== "loading") return currentStatus
  if (event.type === "success") return "success"
  return isInitialGeolocationFailure(event.errorCode) ? "error" : "loading"
}

export { isInitialGeolocationFailure, resolveInitialGeolocationStatus }
