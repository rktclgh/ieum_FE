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

interface LastKnownLocationSyncCallbacks {
  onSuccess: () => void
  onSettled: () => void
}

type LastKnownLocationSyncDispatch = (
  payload: LastKnownLocationRequest,
  callbacks: LastKnownLocationSyncCallbacks
) => void

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

function createLastKnownLocationSyncCoordinator(dispatch: LastKnownLocationSyncDispatch) {
  let lastSyncedPosition: LocationSyncCoordinates | null = null
  let inFlightPosition: LocationSyncCoordinates | null = null
  let queuedPosition: LocationSyncCoordinates | null = null
  let generation = 0

  function send(nextPosition: LocationSyncCoordinates, syncGeneration: number) {
    if (syncGeneration !== generation) return

    const payload = createLastKnownLocationPayload({
      isAuthenticated: true,
      position: nextPosition,
      lastSyncedPosition,
    })

    if (!payload) return

    inFlightPosition = nextPosition
    dispatch(payload, {
      onSuccess: () => {
        if (syncGeneration !== generation || !isSamePosition(nextPosition, inFlightPosition)) return
        lastSyncedPosition = nextPosition
      },
      onSettled: () => {
        if (syncGeneration !== generation) return
        if (isSamePosition(nextPosition, inFlightPosition)) {
          inFlightPosition = null
        }

        const nextQueuedPosition = queuedPosition
        queuedPosition = null
        if (nextQueuedPosition) {
          send(nextQueuedPosition, syncGeneration)
        }
      },
    })
  }

  return {
    reset() {
      lastSyncedPosition = null
      inFlightPosition = null
      queuedPosition = null
      generation += 1
    },
    sync(position: LocationSyncCoordinates | null, isAuthenticated: boolean) {
      if (!isAuthenticated || !position) return

      if (inFlightPosition) {
        queuedPosition = position
        return
      }

      send(position, generation)
    },
  }
}

export {
  LOCATION_SYNC_DISTANCE_THRESHOLD_METERS,
  createLastKnownLocationPayload,
  createLastKnownLocationSyncCoordinator,
  isSamePosition,
  isWithinLocationSyncThreshold,
}
