"use client"

import { SelectInput } from "@/components/ui/text-field/select-input"
import { MyMenuRow } from "@/features/my/components/my-menu-row"
import { useSettingsForm } from "@/features/my/hooks/use-settings-form"
import type { LanguageCode } from "@/features/my/api/my-types"
import { isLanguageSelectorDisabled } from "@/features/my/lib/settings-form-language"
import type { UserSettings } from "@/features/session/api/session-api"
import { LANGUAGE_CODES, LANGUAGE_NATIVE_NAMES } from "@/lib/i18n/languages"
import { useTranslation } from "@/lib/i18n/use-translation"

const languageOptions = LANGUAGE_CODES.map((code) => ({
  value: code,
  label: LANGUAGE_NATIVE_NAMES[code],
}))

// 언어 설정 메뉴 행: 새 페이지 없이 기존 language-picker 바텀시트(SelectInput)를 그대로 연다.
// 확정 시 PATCH /users/me/settings + i18n 스토어 반영(useSettingsForm.patch)까지 처리한다.
function LanguageSettingItem({ settings }: { settings: UserSettings }) {
  const { messages } = useTranslation()
  const form = useSettingsForm(settings)

  return (
    <SelectInput
      options={languageOptions}
      value={form.settings.language}
      disabled={isLanguageSelectorDisabled(form.isPending)}
      onValueChange={(value) => form.patch({ language: value as LanguageCode })}
      confirmLabel={messages.languagePicker.confirm}
      renderTrigger={
        <button type="button" className="w-full transition-colors active:bg-gray-100">
          <MyMenuRow icon="my/global" label={messages.my.menu.language} />
        </button>
      }
    />
  )
}

export { LanguageSettingItem }
