"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { AppBar } from "@/components/ui/app-bar"
import { Switch } from "@/components/ui/switch"
import { SelectInput } from "@/components/ui/text-field/select-input"
import { Title } from "@/components/ui/text-field/title"
import { useLocationUpdate } from "@/features/my/hooks/use-location-update"
import { useSettingsForm } from "@/features/my/hooks/use-settings-form"
import type { LanguageCode, NotifyRadiusKm } from "@/features/my/api/my-types"
import { useMe } from "@/features/session/hooks/use-me"
import { LANGUAGE_CODES, LANGUAGE_NATIVE_NAMES } from "@/lib/i18n/languages"
import { useTranslation } from "@/lib/i18n/use-translation"

const RADIUS_OPTIONS: NotifyRadiusKm[] = [3, 5, 10]

// user.settings 미도착 시 넘길 기본값. 렌더마다 새 객체가 생기면 useSettingsForm의 참조 비교가
// 매번 갱신을 유발(무한 렌더)하므로, 컴포넌트 밖 상수로 참조를 고정한다.
const DEFAULT_SETTINGS = {
  language: "ko" as LanguageCode,
  cameraPermission: false,
  pushPermission: false,
  notifyAll: false,
  notifyMeeting: false,
  notifyQuestion: false,
  notifyRadiusKm: 3 as NotifyRadiusKm,
}

interface ToggleRowProps {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

function ToggleRow({ label, checked, onCheckedChange }: ToggleRowProps) {
  return (
    <div className="flex w-full items-center justify-between py-3.5">
      <span className="text-body-medium-16 text-gray-900">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

function SettingsContent() {
  const router = useRouter()
  const { messages } = useTranslation()
  const { data: user } = useMe()
  const location = useLocationUpdate()

  // useMe 데이터는 상위 서버 컴포넌트에서 하이드레이트되므로 이 화면 진입 시 항상 존재한다.
  // (훅 규칙상 조건부 호출을 피하려 항상 호출하되, settings 미도착 시 안전한 기본값을 넘긴다.)
  const form = useSettingsForm(user?.settings ?? DEFAULT_SETTINGS)

  if (!user) return null

  const { settings, patch } = form

  const languageOptions = LANGUAGE_CODES.map((code) => ({
    value: code,
    label: LANGUAGE_NATIVE_NAMES[code],
  }))

  const radiusOptions = RADIUS_OPTIONS.map((km) => ({
    value: String(km),
    label: messages.my.settings.radiusOption(km),
  }))

  const locationStatusText =
    location.status === "loading"
      ? messages.my.settings.locationUpdating
      : location.status === "success"
        ? messages.my.settings.locationUpdated
        : location.status === "denied"
          ? messages.my.settings.locationDenied
          : location.status === "unavailable"
            ? messages.my.settings.locationUnavailable
            : messages.my.settings.locationSublabel

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col">
      <AppBar
        title={messages.my.settings.title}
        trailingIcon={null}
        onLeadingClick={() => router.back()}
      />

      <div className="flex w-full flex-col px-4 pb-16">
        <div className="flex w-full flex-col items-start pt-2">
          <Title text={messages.my.settings.languageLabel} />
          <SelectInput
            options={languageOptions}
            value={settings.language}
            onValueChange={(value) => patch({ language: value as LanguageCode })}
            confirmLabel={messages.languagePicker.confirm}
          />
        </div>

        <div className="flex w-full flex-col items-start pt-4">
          <Title text={messages.my.settings.permissionsSectionTitle} />
          <ToggleRow
            label={messages.my.settings.cameraPermissionLabel}
            checked={settings.cameraPermission}
            onCheckedChange={(checked) => patch({ cameraPermission: checked })}
          />
          <ToggleRow
            label={messages.my.settings.pushPermissionLabel}
            checked={settings.pushPermission}
            onCheckedChange={(checked) => patch({ pushPermission: checked })}
          />
        </div>

        <div className="flex w-full flex-col items-start pt-4">
          <Title text={messages.my.settings.notificationsSectionTitle} />
          <ToggleRow
            label={messages.my.settings.notifyAllLabel}
            checked={settings.notifyAll}
            onCheckedChange={(checked) => patch({ notifyAll: checked })}
          />
          <ToggleRow
            label={messages.my.settings.notifyMeetingLabel}
            checked={settings.notifyMeeting}
            onCheckedChange={(checked) => patch({ notifyMeeting: checked })}
          />
          <ToggleRow
            label={messages.my.settings.notifyQuestionLabel}
            checked={settings.notifyQuestion}
            onCheckedChange={(checked) => patch({ notifyQuestion: checked })}
          />
        </div>

        <div className="flex w-full flex-col items-start pt-4">
          <Title text={messages.my.settings.notifyRadiusLabel} />
          <SelectInput
            options={radiusOptions}
            value={String(settings.notifyRadiusKm)}
            onValueChange={(value) =>
              patch({ notifyRadiusKm: Number(value) as NotifyRadiusKm })
            }
            confirmLabel={messages.languagePicker.confirm}
          />
        </div>

        <div className="flex w-full flex-col items-start pt-4">
          <Title text={messages.my.settings.locationLabel} />
          <button
            type="button"
            onClick={location.requestLocationUpdate}
            disabled={location.isPending || location.status === "loading"}
            className="flex w-full flex-col items-start gap-1 rounded-2xl border border-gray-100 p-4 text-left transition-colors active:bg-gray-50 disabled:opacity-50"
          >
            <span className="text-body-medium-16 text-gray-900">
              {messages.my.settings.locationUpdateAction}
            </span>
            <span
              className={
                location.status === "denied" || location.status === "unavailable"
                  ? "text-body-regular-12 text-red"
                  : "text-body-regular-12 text-gray-400"
              }
            >
              {locationStatusText}
            </span>
          </button>
        </div>
      </div>

      {form.error && (
        <div className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-full max-w-sm justify-center px-4">
          <div className="rounded-xl bg-gray-900/90 px-4 py-2.5 text-body-regular-14 text-white">
            {messages.my.settings.saveError}
          </div>
        </div>
      )}
    </main>
  )
}

export { SettingsContent }
