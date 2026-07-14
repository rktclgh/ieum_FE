"use client"

import { useQuery } from "@tanstack/react-query"

import { geocodeAddress } from "@/features/map/api/geocode-api"
import { PUBLIC_QUERY_META } from "@/features/session/lib/session-cache"

function useGeocode(query: string) {
  const trimmed = query.trim()

  return useQuery({
    queryKey: ["places", "geocode", trimmed],
    queryFn: () => geocodeAddress(trimmed),
    enabled: trimmed.length > 0,
    meta: PUBLIC_QUERY_META,
    staleTime: 60_000,
  })
}

export { useGeocode }
