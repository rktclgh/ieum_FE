import { apiClient } from "@/lib/api/client"

import type { TranslateRequest, TranslateResponse } from "@/features/translate/api/translate-types"

async function translateText(body: TranslateRequest) {
  const { data } = await apiClient.post<TranslateResponse>("/api/v1/translate", body)
  return data
}

export { translateText }
