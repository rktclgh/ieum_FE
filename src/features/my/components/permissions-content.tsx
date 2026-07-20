"use client"

import { useRouter } from "next/navigation"

import { AppBar } from "@/components/ui/app-bar"
import { Screen } from "@/components/layout/screen"
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
    <Screen kind="scroll" as="main">
      <AppBar
        title={messages.my.permissions.title}
        trailingIcon={null}
        onLeadingClick={() => router.back()}
      />

      <div className="flex w-full flex-col px-4 pb-[calc(4rem+var(--safe-area-bottom))]">
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
        <div className="fixed inset-x-0 bottom-[calc(1.5rem+var(--safe-area-bottom))] z-50 app-column flex justify-center px-4">
          <div className="rounded-xl bg-gray-900/90 px-4 py-2.5 text-body-regular-14 text-white">
            {messages.my.permissions.saveError}
          </div>
        </div>
      )}
    </Screen>
  )
}

export { PermissionsContent }
