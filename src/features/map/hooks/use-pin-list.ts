"use client"

import { useQuery } from "@tanstack/react-query"

import { getPinList } from "@/features/map/api/pin-list-api"
import type { MapPin } from "@/features/map/api/pin-types"
import { PUBLIC_QUERY_META } from "@/features/session/lib/session-cache"

const PAGE_SIZE = 50
// 최대 20페이지(1000핀)까지만 로드한다. 초과분은 검색 대상에서 빠지므로,
// 무음 절단을 막기 위해 상한 도달 시 콘솔 경고를 남긴다.
const MAX_PAGES = 20

async function loadAllPins(): Promise<MapPin[]> {
  const all: MapPin[] = []
  let cursor: string | null = null
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { pins, nextCursor } = await getPinList({ cursor, size: PAGE_SIZE })
    all.push(...pins)
    if (!nextCursor) return all
    cursor = nextCursor
  }
  console.warn(
    `[use-pin-list] 핀이 상한(${MAX_PAGES * PAGE_SIZE}개)에 도달해 이후 핀은 검색에서 제외됩니다.`
  )
  return all
}

// 검색 오버레이 전용. enabled=false(쿼리 없음)면 불필요한 전체 로드를 피한다.
function usePinList(enabled = true) {
  return useQuery({
    queryKey: ["pins", "list", "all"],
    queryFn: loadAllPins,
    enabled,
    meta: PUBLIC_QUERY_META,
    staleTime: 60_000,
  })
}

export { usePinList }
