// 번역 API 요청/응답 타입. 이슈 #163 계약 기준(백엔드 미구현 — 계약우선).
// BE: POST /api/v1/translate { contentId, targetLang } → 캐시(contentId,lang) 확인 후
// hit이면 즉시 반환, miss면 DeepL Free(api-free.deepl.com/v2/translate) 호출 → 저장 → 반환.
//
// targetLang은 DeepL 언어 코드(대문자). 영어/포르투갈어는 지역 변형 필수(EN-US/EN-GB, PT-BR/PT-PT).
// sourceLang을 함께 보내면 자동감지를 생략해 더 정확·빠르다(원문 언어가 저장돼 있을 때만 채움).

interface TranslateRequest {
  contentId: number
  targetLang: string
  sourceLang?: string
}

interface TranslateResponse {
  translatedText: string
}

export type { TranslateRequest, TranslateResponse }
