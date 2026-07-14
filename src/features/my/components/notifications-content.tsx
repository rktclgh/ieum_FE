"use client"

import { useRouter } from "next/navigation"

import { AppBar } from "@/components/ui/app-bar"
import { Switch } from "@/components/ui/switch"
import { SelectInput } from "@/components/ui/text-field/select-input"
import { Title } from "@/components/ui/text-field/title"
import type { NotifyRadiusKm } from "@/features/my/api/my-types"
import { useSettingsForm } from "@/features/my/hooks/use-settings-form"
import type { UserSettings } from "@/features/session/api/session-api"
import { useMe } from "@/features/session/hooks/use-me"
import { useTranslation } from "@/lib/i18n/use-translation"

const RADIUS_OPTIONS: NotifyRadiusKm[] = [3, 5, 10]

function NotificationsContent() {
  const { data: user } = useMe()
  if (!user) return null
  return <NotificationsForm settings={user.settings} />
}

function NotificationsForm({ settings: serverSettings }: { settings: UserSettings }) {
  const router = useRouter()
  const { messages } = useTranslation()
  const { settings, patch, error } = useSettingsForm(serverSettings)

  const radiusOptions = RADIUS_OPTIONS.map((km) => ({
    value: String(km),
    label: messages.my.notifications.radiusOption(km),
  }))

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col">
      <AppBar
        title={messages.my.notifications.title}
        trailingIcon={null}
        onLeadingClick={() => router.back()}
      />

      <div className="flex w-full flex-col px-4 pb-16">
        <div className="flex w-full items-center justify-between py-3.5">
          <span className="text-body-medium-16 text-gray-900">
            {messages.my.notifications.notifyAllLabel}
          </span>
          <Switch
            checked={settings.notifyAll}
            onCheckedChange={(checked) => patch({ notifyAll: checked })}
          />
        </div>

        <div className="flex w-full flex-col items-start pt-4">
          <Title text={messages.my.notifications.notifyRadiusLabel} />
          <SelectInput
            options={radiusOptions}
            value={String(settings.notifyRadiusKm)}
            onValueChange={(value) =>
              patch({ notifyRadiusKm: Number(value) as NotifyRadiusKm })
            }
            confirmLabel={messages.languagePicker.confirm}
          />
        </div>
      </div>

      {error && (
        <div className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-full max-w-sm justify-center px-4">
          <div className="rounded-xl bg-gray-900/90 px-4 py-2.5 text-body-regular-14 text-white">
            {messages.my.notifications.saveError}
          </div>
        </div>
      )}
    </main>
  )
}

export { NotificationsContent }
