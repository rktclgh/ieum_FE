export const LANGUAGE_CODES = ["ko", "en", "ja", "zh", "vi", "th", "ru"] as const

export type LanguageCode = (typeof LANGUAGE_CODES)[number]

export const LANGUAGE_NATIVE_NAMES: Record<LanguageCode, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  zh: "中文",
  vi: "Tiếng Việt",
  th: "ภาษาไทย",
  ru: "Русский",
}

export const DEFAULT_LANGUAGE: LanguageCode = "en"

export function isLanguageCode(value: string): value is LanguageCode {
  return (LANGUAGE_CODES as readonly string[]).includes(value)
}

export function resolveDeviceLanguage(locales: readonly (string | null | undefined)[]): LanguageCode {
  for (const locale of locales) {
    const primarySubtag = locale?.split("-")[0]?.toLowerCase()
    if (primarySubtag && isLanguageCode(primarySubtag)) return primarySubtag
  }

  return DEFAULT_LANGUAGE
}

export function getDeviceLanguage(): LanguageCode {
  if (typeof navigator === "undefined") return DEFAULT_LANGUAGE

  const locales = navigator.languages?.length ? navigator.languages : [navigator.language]
  return resolveDeviceLanguage(locales)
}
