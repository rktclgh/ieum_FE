"use client"

import { useQuery } from "@tanstack/react-query"

import { geocodeAddress } from "@/features/map/api/geocode-api"

function useGeocode(query: string) {
  const trimmed = query.trim()

  return useQuery({
    queryKey: ["places", "geocode", trimmed],
    queryFn: () => geocodeAddress(trimmed),
    enabled: trimmed.length > 0,
    staleTime: 60_000,
  })
}

export { useGeocode }
