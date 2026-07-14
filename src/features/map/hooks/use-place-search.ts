"use client"

import { useQuery } from "@tanstack/react-query"

import { searchPlaces } from "@/features/map/api/place-search-api"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import { PUBLIC_QUERY_META } from "@/features/session/lib/session-cache"

function usePlaceSearch(query: string, near: Coordinates | null) {
  const trimmed = query.trim()

  return useQuery({
    queryKey: ["places", "search", trimmed, near],
    queryFn: () => searchPlaces({ query: trimmed, near: near ?? undefined }),
    enabled: trimmed.length > 0,
    meta: PUBLIC_QUERY_META,
    staleTime: 60_000,
  })
}

export { usePlaceSearch }
