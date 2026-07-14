import { apiClient } from "@/lib/api/client"

interface ReverseGeocodeResult {
  fullAddress: string | null
  shortLabel: string | null
}

async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  const { data } = await apiClient.get<ReverseGeocodeResult>("/api/places/reverse-geocode", {
    params: { lat, lng },
  })
  return data
}

export { reverseGeocode }
export type { ReverseGeocodeResult }
