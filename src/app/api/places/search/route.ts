import { NextResponse, type NextRequest } from "next/server"

import type { Place } from "@/features/map/api/place-search-api"

const KAKAO_KEYWORD_SEARCH_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"

interface KakaoDocument {
  id: string
  place_name: string
  address_name: string
  road_address_name: string
  x: string
  y: string
  category_group_name: string
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim()
  if (!query) {
    return NextResponse.json({ places: [] })
  }

  const apiKey = process.env.KAKAO_REST_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "KAKAO_REST_API_KEY is not configured" }, { status: 500 })
  }

  const lat = request.nextUrl.searchParams.get("lat")
  const lng = request.nextUrl.searchParams.get("lng")

  const kakaoUrl = new URL(KAKAO_KEYWORD_SEARCH_URL)
  kakaoUrl.searchParams.set("query", query)
  if (lat && lng) {
    kakaoUrl.searchParams.set("y", lat)
    kakaoUrl.searchParams.set("x", lng)
    kakaoUrl.searchParams.set("sort", "distance")
  }

  const kakaoResponse = await fetch(kakaoUrl, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  })

  if (!kakaoResponse.ok) {
    return NextResponse.json({ error: "Kakao search failed" }, { status: kakaoResponse.status })
  }

  const data: { documents: KakaoDocument[] } = await kakaoResponse.json()

  const places: Place[] = data.documents.map((doc) => ({
    id: doc.id,
    name: doc.place_name,
    address: doc.road_address_name || doc.address_name,
    lat: Number(doc.y),
    lng: Number(doc.x),
    categoryGroupName: doc.category_group_name || undefined,
  }))

  return NextResponse.json({ places })
}
