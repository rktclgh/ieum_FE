import type { LanguageCode } from "@/lib/i18n/languages"

interface TranslateRequest {
  text: string
  targetLang: LanguageCode
}

interface TranslateResponse {
  translatedText: string
}

export type { TranslateRequest, TranslateResponse }
