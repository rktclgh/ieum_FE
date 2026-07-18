"use client"

import * as React from "react"

import { useUpdateSettings } from "@/features/my/hooks/use-my-mutations"
import type { UpdateSettingsRequest } from "@/features/my/api/my-types"
import {
  applySettingsPatchError,
  applySettingsPatchStart,
  applySettingsPatchSuccess,
} from "@/features/my/lib/settings-form-language"
import type { UserSettings } from "@/features/session/api/session-api"
import { useLanguageStore } from "@/lib/i18n/store"

// 설정 화면 상태 관리:
// - 서버 settings로 초기화한 낙관적 로컬 상태를 토글/셀렉트가 즉시 반영한다.
// - 각 변경은 PATCH /users/me/settings(부분수정)로 전송, 실패 시 직전 값으로 되돌린다.
// - language 변경은 i18n zustand 스토어에도 즉시 반영하고, 성공 시 서버 응답값을 최종값으로 삼는다.
function useSettingsForm(serverSettings: UserSettings) {
  const [settings, setSettings] = React.useState<UserSettings>(serverSettings)
  const [syncedServerSettings, setSyncedServerSettings] = React.useState(serverSettings)
  const [error, setError] = React.useState(false)
  const setLanguage = useLanguageStore((state) => state.setLanguage)
  const updateSettings = useUpdateSettings()

  // 캐시가 외부에서 갱신되면(다른 탭·재조회) 로컬 상태를 서버 값과 맞춘다.
  // 이펙트 대신 렌더 중 파생 상태를 조정하는 React 권장 패턴을 쓴다.
  if (serverSettings !== syncedServerSettings) {
    setSyncedServerSettings(serverSettings)
    setSettings(serverSettings)
  }

  const patch = React.useCallback(
    (partial: UpdateSettingsRequest) => {
      setError(false)
      const previous = settings
      const optimistic = applySettingsPatchStart(settings, partial)
      setSettings(optimistic.settings)
      if (optimistic.language) setLanguage(optimistic.language)

      updateSettings.mutate(partial, {
        onSuccess: (nextSettings) => {
          const success = applySettingsPatchSuccess(nextSettings)
          setSyncedServerSettings(success.syncedServerSettings)
          setSettings(success.settings)
          setLanguage(success.language)
        },
        onError: () => {
          const failure = applySettingsPatchError(previous, partial)
          setSettings(failure.settings)
          if (failure.language) setLanguage(failure.language)
          setError(true)
        },
      })
    },
    [settings, setLanguage, updateSettings]
  )

  return { settings, patch, error, isPending: updateSettings.isPending }
}

export { useSettingsForm }
