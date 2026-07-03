import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { LanguageCode } from "@/lib/i18n/languages"

interface LanguageState {
  language: LanguageCode
  setLanguage: (language: LanguageCode) => void
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: "ko",
      setLanguage: (language) => set({ language }),
    }),
    {
      name: "ieum-language",
      skipHydration: true,
    }
  )
)
