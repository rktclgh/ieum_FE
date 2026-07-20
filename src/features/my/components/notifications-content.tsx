"use client"

import { useRouter } from "next/navigation"

import { AppBar } from "@/components/ui/app-bar"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { SelectInput } from "@/components/ui/text-field/select-input"
import { Title } from "@/components/ui/text-field/title"
import type { NotifyRadiusKm } from "@/features/my/api/my-types"
import { useSettingsForm } from "@/features/my/hooks/use-settings-form"
import {
  useWebPushSubscription,
  type WebPushConnectionError,
} from "@/features/notification/hooks/use-web-push-subscription"
import type { WebPushStatus } from "@/features/notification/lib/web-push"
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
  const { settings, patch, error, isPending } = useSettingsForm(serverSettings)
  const {
    status: webPushStatus,
    error: webPushError,
    isLoading: isWebPushLoading,
    isConnecting,
    connectCurrentDevice,
  } = useWebPushSubscription()

  const radiusOptions = RADIUS_OPTIONS.map((km) => ({
    value: String(km),
    label: messages.my.notifications.radiusOption(km),
  }))

  const handleNotifyAllChange = (checked: boolean) => {
    if (checked) {
      // The permission prompt must start in the switch's direct click path.
      void connectCurrentDevice()
    }
    // A failed connection must not turn off another already-connected device.
    patch({ notifyAll: checked })
  }

  const pushDeviceMessage = getPushDeviceMessage({
    status: webPushStatus,
    error: webPushError,
    messages: messages.my.notifications,
  })

  const showConnectDeviceAction =
    settings.notifyAll && webPushStatus === "unsubscribed" && !isWebPushLoading
  const showPushDeviceStatus = settings.notifyAll && !isWebPushLoading

  const visibleError = error
    ? messages.my.notifications.saveError
    : webPushError === "connection-failed"
      ? messages.my.notifications.pushDeviceError
      : null

  return (
    <main className="app-column flex min-h-dvh flex-col">
      <AppBar
        title={messages.my.notifications.title}
        trailingIcon={null}
        onLeadingClick={() => router.back()}
      />

      <div className="flex w-full flex-col px-4 pb-[calc(4rem+var(--safe-area-bottom))]">
        <div className="flex w-full items-center justify-between py-3.5">
          <span className="text-body-medium-16 text-gray-900">
            {messages.my.notifications.notifyAllLabel}
          </span>
          <Switch
            checked={settings.notifyAll}
            disabled={isPending || isConnecting}
            onCheckedChange={handleNotifyAllChange}
          />
        </div>

        {showPushDeviceStatus && (
          <div className="flex w-full items-center justify-between gap-3 pb-3 text-body-regular-14 text-gray-500">
            <span>{pushDeviceMessage}</span>
            {showConnectDeviceAction && (
              <Button
                variant="outline"
                size="sm"
                disabled={isPending || isConnecting}
                onClick={() => void connectCurrentDevice()}
              >
                {messages.my.notifications.pushDeviceConnect}
              </Button>
            )}
          </div>
        )}

        <div className="flex w-full flex-col items-start pt-4">
          <Title text={messages.my.notifications.notifyRadiusLabel} />
          <SelectInput
            options={radiusOptions}
            value={String(settings.notifyRadiusKm)}
            disabled={isPending || isConnecting}
            onValueChange={(value) =>
              patch({ notifyRadiusKm: Number(value) as NotifyRadiusKm })
            }
            confirmLabel={messages.languagePicker.confirm}
          />
        </div>
      </div>

      {visibleError && (
        <div className="fixed inset-x-0 bottom-[calc(1.5rem+var(--safe-area-bottom))] z-50 app-column flex justify-center px-4">
          <div className="rounded-xl bg-gray-900/90 px-4 py-2.5 text-body-regular-14 text-white">
            {visibleError}
          </div>
        </div>
      )}
    </main>
  )
}

function getPushDeviceMessage({
  status,
  error,
  messages,
}: {
  status: WebPushStatus
  error: WebPushConnectionError | null
  messages: ReturnType<typeof useTranslation>["messages"]["my"]["notifications"]
}) {
  if (error === "connection-failed") return messages.pushDeviceError
  if (status === "subscribed") return messages.pushDeviceConnected
  if (status === "ios-install-required") return messages.pushDeviceIosInstall
  if (status === "unsupported") return messages.pushDeviceUnsupported
  if (status === "permission-denied") return messages.pushDevicePermissionDenied
  return messages.pushDeviceUnavailable
}

export { NotificationsContent }
