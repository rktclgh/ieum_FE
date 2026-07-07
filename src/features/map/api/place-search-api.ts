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
  const params = new URLSearchParams({ query })
  if (near) {
    params.set("lat", String(near.lat))
    params.set("lng", String(near.lng))
  }

  const response = await fetch(`/api/places/search?${params.toString()}`)
  if (!response.ok) throw new Error("Failed to search places")

  const data: { places: Place[] } = await response.json()
  return data.places
}

export { searchPlaces }
export type { Place, SearchPlacesParams }
