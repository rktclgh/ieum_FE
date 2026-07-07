interface ReverseGeocodeResult {
  fullAddress: string | null
  shortLabel: string | null
}

async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) })

  const response = await fetch(`/api/places/reverse-geocode?${params.toString()}`)
  if (!response.ok) throw new Error("Failed to reverse geocode")

  return response.json()
}

export { reverseGeocode }
export type { ReverseGeocodeResult }
