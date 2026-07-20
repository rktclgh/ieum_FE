"use client"

import { Screen } from "@/components/layout/screen"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n/use-translation"

function SessionLoading({ refreshing = false }: { refreshing?: boolean }) {
  const { messages } = useTranslation()

  return (
    <Screen
      kind="scroll"
      as="main"
      centered
      aria-busy="true"
      data-refreshing={refreshing || undefined}
      className="px-4"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span
          aria-hidden="true"
          className="size-8 animate-spin rounded-full border-2 border-gray-200 border-t-primary"
        />
        <p className="text-body-medium-16 text-gray-900">{messages.session.checking}</p>
      </div>
    </Screen>
  )
}

function SessionUnavailable({ onRetry }: { onRetry: () => void }) {
  const { messages } = useTranslation()

  return (
    <Screen kind="scroll" as="main" centered className="px-4">
      <div className="flex w-full flex-col items-center gap-4 text-center">
        <p role="alert" className="text-body-medium-16 text-gray-900">
          {messages.session.backendUnavailable}
        </p>
        <Button type="button" variant="primary" onClick={onRetry}>
          {messages.common.retry}
        </Button>
      </div>
    </Screen>
  )
}

export { SessionLoading, SessionUnavailable }
