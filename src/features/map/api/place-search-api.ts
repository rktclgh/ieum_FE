import { apiClient } from "@/lib/api/client"

interface Place {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  categoryGroupName?: string
}

interface SearchPlacesParams {
  query: string
  near?: { lat: number; lng: number }
}

async function searchPlaces({ query, near }: SearchPlacesParams): Promise<Place[]> {
  const { data } = await apiClient.get<{ places: Place[] }>("/api/places/search", {
    params: {
      query,
      lat: near?.lat,
      lng: near?.lng,
    },
  })
  return data.places
}

export { searchPlaces }
export type { Place, SearchPlacesParams }
