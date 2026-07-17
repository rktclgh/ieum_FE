import { create } from "zustand"
import { persist } from "zustand/middleware"

import { getLanguagePersistenceUpdate, LANGUAGE_STORAGE_KEY } from "@/lib/i18n/language-sync"
import type { LanguageCode } from "@/lib/i18n/languages"

interface LanguageState {
  language: LanguageCode
  setLanguage: (language: LanguageCode) => void
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: "ko",
      setLanguage: (language) => {
        const update = getLanguagePersistenceUpdate(get().language, language)
        if (!update) return

        set(update)
      },
    }),
    {
      name: LANGUAGE_STORAGE_KEY,
      skipHydration: true,
    }
  )
)
