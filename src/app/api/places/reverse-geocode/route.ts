import { NextResponse, type NextRequest } from "next/server"

const KAKAO_COORD_TO_ADDRESS_URL = "https://dapi.kakao.com/v2/local/geo/coord2address.json"

interface KakaoAddress {
  address_name: string
  region_2depth_name: string
  region_3depth_name: string
}

interface KakaoRoadAddress {
  address_name: string
}

interface KakaoCoord2AddressDocument {
  address: KakaoAddress | null
  road_address: KakaoRoadAddress | null
}

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat")
  const lng = request.nextUrl.searchParams.get("lng")
  if (!lat || !lng) {
    return NextResponse.json({ error: "lat/lng is required" }, { status: 400 })
  }

  const apiKey = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "NEXT_PUBLIC_KAKAO_REST_API_KEY is not configured" }, { status: 500 })
  }

  const kakaoUrl = new URL(KAKAO_COORD_TO_ADDRESS_URL)
  kakaoUrl.searchParams.set("x", lng)
  kakaoUrl.searchParams.set("y", lat)

  const kakaoResponse = await fetch(kakaoUrl, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  })

  if (!kakaoResponse.ok) {
    return NextResponse.json({ error: "Kakao reverse geocode failed" }, { status: kakaoResponse.status })
  }

  const data: { documents: KakaoCoord2AddressDocument[] } = await kakaoResponse.json()
  const document = data.documents[0]

  const fullAddress = document?.road_address?.address_name || document?.address?.address_name || null
  const shortLabel =
    document?.address?.region_3depth_name || document?.address?.region_2depth_name || null

  return NextResponse.json({ fullAddress, shortLabel })
}
