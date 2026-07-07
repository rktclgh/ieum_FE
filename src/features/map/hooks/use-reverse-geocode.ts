"use client"

import { useQuery } from "@tanstack/react-query"

import { reverseGeocode } from "@/features/map/api/reverse-geocode-api"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"

function useReverseGeocode(position: Coordinates | null) {
  return useQuery({
    queryKey: ["places", "reverse-geocode", position],
    queryFn: () => reverseGeocode(position!.lat, position!.lng),
    enabled: position !== null,
    staleTime: 60_000,
  })
}

export { useReverseGeocode }
