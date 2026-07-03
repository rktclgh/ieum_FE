"use client"

import { useLanguageStore } from "@/lib/i18n/store"
import { MESSAGES } from "@/lib/i18n/messages"

function useTranslation() {
  const language = useLanguageStore((state) => state.language)
  const setLanguage = useLanguageStore((state) => state.setLanguage)

  return { language, setLanguage, messages: MESSAGES[language] }
}

export { useTranslation }
