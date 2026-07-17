import type { LanguageCode } from "@/lib/i18n/languages"

export const LANGUAGE_STORAGE_KEY = "ieum-language"

type GuestLanguageBootstrap =
  | { kind: "persisted" }
  | { kind: "device"; language: LanguageCode }

function resolveGuestLanguageBootstrap(
  storedLanguageSnapshot: string | null,
  deviceLanguage: LanguageCode
): GuestLanguageBootstrap {
  if (storedLanguageSnapshot !== null) return { kind: "persisted" }

  return { kind: "device", language: deviceLanguage }
}

function getLanguagePersistenceUpdate(
  currentLanguage: LanguageCode,
  nextLanguage: LanguageCode
): { language: LanguageCode } | undefined {
  if (currentLanguage === nextLanguage) return undefined

  return { language: nextLanguage }
}

function shouldSyncServerLanguage(
  currentLanguage: LanguageCode,
  serverLanguage: LanguageCode | undefined
): serverLanguage is LanguageCode {
  return serverLanguage !== undefined && serverLanguage !== currentLanguage
}

export {
  getLanguagePersistenceUpdate,
  resolveGuestLanguageBootstrap,
  shouldSyncServerLanguage,
}
