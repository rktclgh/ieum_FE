import { apiClient } from "@/lib/api/client"

interface GeocodedAddress {
  roadAddress: string
  jibunAddress: string
  lat: number
  lng: number
}

// 주소(도로명/지번)를 정확한 좌표로 변환한다. 키워드 검색(place-search-api)과 달리
// 주소 매칭 기반이라 정확도가 높고, 사용자가 후보를 골라 좌표를 등록하는 플로우에 쓴다.
// BE는 NCP 지오코딩을 프록시하며 x/y는 이미 실수(°)라 place-search와 달리 /1e7 변환이 없다.
async function geocodeAddress(query: string): Promise<GeocodedAddress[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const { data } = await apiClient.get<{ addresses: GeocodedAddress[] }>(
    "/api/places/geocode",
    { params: { query: trimmed } },
  )
  return data.addresses
}

export { geocodeAddress }
export type { GeocodedAddress }
