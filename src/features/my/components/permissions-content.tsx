"use client"

import { useRouter } from "next/navigation"

import { AppBar } from "@/components/ui/app-bar"
import { Switch } from "@/components/ui/switch"
import { useSettingsForm } from "@/features/my/hooks/use-settings-form"
import type { UserSettings } from "@/features/session/api/session-api"
import { useMe } from "@/features/session/hooks/use-me"
import { useTranslation } from "@/lib/i18n/use-translation"

function PermissionsContent() {
  const { data: user } = useMe()
  if (!user) return null
  return <PermissionsForm settings={user.settings} />
}

function PermissionsForm({ settings: serverSettings }: { settings: UserSettings }) {
  const router = useRouter()
  const { messages } = useTranslation()
  const { settings, patch, error } = useSettingsForm(serverSettings)

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col">
      <AppBar
        title={messages.my.permissions.title}
        trailingIcon={null}
        onLeadingClick={() => router.back()}
      />

      <div className="flex w-full flex-col px-4 pb-16">
        <div className="flex w-full items-center justify-between py-3.5">
          <span className="text-body-medium-16 text-gray-900">
            {messages.my.permissions.cameraPermissionLabel}
          </span>
          <Switch
            checked={settings.cameraPermission}
            onCheckedChange={(checked) => patch({ cameraPermission: checked })}
          />
        </div>
      </div>

      {error && (
        <div className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-full max-w-sm justify-center px-4">
          <div className="rounded-xl bg-gray-900/90 px-4 py-2.5 text-body-regular-14 text-white">
            {messages.my.permissions.saveError}
          </div>
        </div>
      )}
    </main>
  )
}

export { PermissionsContent }
