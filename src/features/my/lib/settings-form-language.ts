import type { UpdateSettingsRequest } from "@/features/my/api/my-types"
import type { UserSettings } from "@/features/session/api/session-api"
import type { LanguageCode } from "@/lib/i18n/languages"

interface SettingsLanguagePatchResult {
  settings: UserSettings
  language?: LanguageCode
}

function applySettingsPatchStart(
  currentSettings: UserSettings,
  partial: UpdateSettingsRequest
): SettingsLanguagePatchResult {
  return {
    settings: { ...currentSettings, ...partial },
    language: partial.language,
  }
}

function applySettingsPatchSuccess(nextSettings: UserSettings) {
  return {
    settings: nextSettings,
    syncedServerSettings: nextSettings,
    language: nextSettings.language,
  }
}

function applySettingsPatchError(
  previousSettings: UserSettings,
  partial: UpdateSettingsRequest
): SettingsLanguagePatchResult & { error: true } {
  return {
    settings: previousSettings,
    language: partial.language ? previousSettings.language : undefined,
    error: true,
  }
}

function isLanguageSelectorDisabled(isPending: boolean) {
  return isPending
}

export {
  applySettingsPatchError,
  applySettingsPatchStart,
  applySettingsPatchSuccess,
  isLanguageSelectorDisabled,
}
