"use client"

import * as React from "react"

import { LANGUAGE_STORAGE_KEY, resolveGuestLanguageBootstrap } from "@/lib/i18n/language-sync"
import { getDeviceLanguage } from "@/lib/i18n/languages"
import { useLanguageStore } from "@/lib/i18n/store"

function I18nProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    const bootstrap = resolveGuestLanguageBootstrap(
      window.localStorage.getItem(LANGUAGE_STORAGE_KEY),
      getDeviceLanguage()
    )

    if (bootstrap.kind === "persisted") {
      useLanguageStore.persist.rehydrate()
    } else {
      useLanguageStore.getState().setLanguage(bootstrap.language)
    }
  }, [])

  return <>{children}</>
}

export { I18nProvider }
