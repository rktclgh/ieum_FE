interface LocationSyncCoordinates {
  lat: number
  lng: number
}

interface LastKnownLocationRequest {
  longitude: number
  latitude: number
}

interface LastKnownLocationPayloadInput {
  isAuthenticated: boolean
  position: LocationSyncCoordinates | null
  lastSyncedPosition: LocationSyncCoordinates | null
}

const LOCATION_SYNC_DISTANCE_THRESHOLD_METERS = 100
const EARTH_RADIUS_METERS = 6_371_000

function isSamePosition(
  left: LocationSyncCoordinates | null,
  right: LocationSyncCoordinates | null
) {
  return Boolean(left && right && left.lat === right.lat && left.lng === right.lng)
}

function toRadians(value: number) {
  return (value * Math.PI) / 180
}

function getDistanceMeters(left: LocationSyncCoordinates, right: LocationSyncCoordinates) {
  const deltaLat = toRadians(right.lat - left.lat)
  const deltaLng = toRadians(right.lng - left.lng)
  const leftLat = toRadians(left.lat)
  const rightLat = toRadians(right.lat)
  const halfChordLength =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(leftLat) * Math.cos(rightLat) * Math.sin(deltaLng / 2) ** 2

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(halfChordLength))
}

function isWithinLocationSyncThreshold(
  left: LocationSyncCoordinates | null,
  right: LocationSyncCoordinates | null
) {
  if (!left || !right) return false
  return getDistanceMeters(left, right) < LOCATION_SYNC_DISTANCE_THRESHOLD_METERS
}

function createLastKnownLocationPayload({
  isAuthenticated,
  position,
  lastSyncedPosition,
}: LastKnownLocationPayloadInput): LastKnownLocationRequest | null {
  if (
    !isAuthenticated ||
    !position ||
    isWithinLocationSyncThreshold(position, lastSyncedPosition)
  ) {
    return null
  }

  return {
    latitude: position.lat,
    longitude: position.lng,
  }
}

export {
  LOCATION_SYNC_DISTANCE_THRESHOLD_METERS,
  createLastKnownLocationPayload,
  isSamePosition,
  isWithinLocationSyncThreshold,
}
