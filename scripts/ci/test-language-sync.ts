import assert from "node:assert/strict"
import test from "node:test"

import {
  applySettingsPatchError,
  applySettingsPatchStart,
  applySettingsPatchSuccess,
  isLanguageSelectorDisabled,
} from "@/features/my/lib/settings-form-language"
import { DEFAULT_LANGUAGE, resolveDeviceLanguage } from "@/lib/i18n/languages"
import {
  getLanguagePersistenceUpdate,
  resolveGuestLanguageBootstrap,
  shouldSyncServerLanguage,
} from "@/lib/i18n/language-sync"

test("guest language bootstrap keeps existing localStorage state before device detection", () => {
  const bootstrap = resolveGuestLanguageBootstrap(
    '{"state":{"language":"ko"},"version":0}',
    "ja"
  )

  assert.deepEqual(bootstrap, { kind: "persisted" })
})

test("guest language bootstrap uses device language when localStorage is empty", () => {
  const bootstrap = resolveGuestLanguageBootstrap(null, "ru")

  assert.deepEqual(bootstrap, { kind: "device", language: "ru" })
})

test("device language resolution falls back to English when the browser has no supported locale", () => {
  assert.equal(resolveDeviceLanguage(["fr-FR", "de"]), DEFAULT_LANGUAGE)
})

test("language persistence update is skipped for the current language", () => {
  assert.equal(getLanguagePersistenceUpdate("en", "en"), undefined)
  assert.deepEqual(getLanguagePersistenceUpdate("ko", "en"), { language: "en" })
})

const baseSettings = {
  language: "ko",
  cameraPermission: false,
  pushPermission: false,
  notifyAll: true,
  notifyMeeting: true,
  notifyQuestion: true,
  notifyRadiusKm: 5,
} as const

test("settings language patch applies optimistic language before server response", () => {
  const result = applySettingsPatchStart(baseSettings, { language: "en" })

  assert.equal(result.settings.language, "en")
  assert.equal(result.language, "en")
})

test("settings language patch success finalizes the server language", () => {
  const serverSettings = { ...baseSettings, language: "ja" } as const
  const result = applySettingsPatchSuccess(serverSettings)

  assert.equal(result.settings.language, "ja")
  assert.equal(result.syncedServerSettings.language, "ja")
  assert.equal(result.language, "ja")
})

test("settings language patch error rolls back to the previous language", () => {
  const result = applySettingsPatchError(baseSettings, { language: "en" })

  assert.equal(result.settings.language, "ko")
  assert.equal(result.language, "ko")
  assert.equal(result.error, true)
})

test("language selector is disabled only while settings patch is pending", () => {
  assert.equal(isLanguageSelectorDisabled(true), true)
  assert.equal(isLanguageSelectorDisabled(false), false)
})

test("actual language store setter does not persist when language is unchanged", async (t) => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window")
  const cleanup: { resetLanguageStore?: () => void } = {}

  t.after(() => {
    cleanup.resetLanguageStore?.()
    if (previousWindow) {
      Object.defineProperty(globalThis, "window", previousWindow)
    } else {
      Reflect.deleteProperty(globalThis, "window")
    }
  })

  const setItemCalls: string[] = []
  const storage = {
    getItem: () => null,
    setItem: (key: string) => {
      setItemCalls.push(key)
    },
    removeItem: () => undefined,
  }

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: storage },
  })

  const { useLanguageStore } = await import("@/lib/i18n/store")
  cleanup.resetLanguageStore = () => useLanguageStore.setState({ language: "ko" })
  useLanguageStore.setState({ language: "ko" })
  setItemCalls.length = 0

  useLanguageStore.getState().setLanguage("ko")

  assert.deepEqual(setItemCalls, [])
})

test("authenticated server language sync only runs when the server language differs", () => {
  assert.equal(shouldSyncServerLanguage("en", undefined), false)
  assert.equal(shouldSyncServerLanguage("en", "en"), false)
  assert.equal(shouldSyncServerLanguage("ko", "en"), true)
})
