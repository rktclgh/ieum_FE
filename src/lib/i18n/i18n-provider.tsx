"use client"

import * as React from "react"

import { getDeviceLanguage } from "@/lib/i18n/languages"
import { useLanguageStore } from "@/lib/i18n/store"

const STORAGE_KEY = "ieum-language"

function I18nProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    const hasStoredLanguage = window.localStorage.getItem(STORAGE_KEY) !== null

    if (hasStoredLanguage) {
      useLanguageStore.persist.rehydrate()
    } else {
      useLanguageStore.getState().setLanguage(getDeviceLanguage())
    }
  }, [])

  return <>{children}</>
}

export { I18nProvider }
