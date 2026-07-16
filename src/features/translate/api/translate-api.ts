import { apiClient } from "@/lib/api/client"

import type { TranslateRequest, TranslateResponse } from "@/features/translate/api/translate-types"

// 상태 변경은 아니지만 서버측 부수효과(캐시 miss 시 DeepL 호출 → 저장)가 있어 POST.
// BE 엔드포인트 미구현 상태(이슈 #163, 계약우선) — 계약대로 연결해두고 배포 전 실제 응답과 대조 필요.
async function translateContent(body: TranslateRequest) {
  const { data } = await apiClient.post<TranslateResponse>("/api/v1/translate", body)
  return data
}

export { translateContent }
