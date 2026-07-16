"use client"

import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n/use-translation"

function SessionLoading({ refreshing = false }: { refreshing?: boolean }) {
  const { messages } = useTranslation()

  return (
    <main
      aria-busy="true"
      data-refreshing={refreshing || undefined}
      className="mx-auto flex min-h-dvh w-full max-w-sm items-center justify-center px-4"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span
          aria-hidden="true"
          className="size-8 animate-spin rounded-full border-2 border-gray-200 border-t-primary"
        />
        <p className="text-body-medium-16 text-gray-900">{messages.session.checking}</p>
      </div>
    </main>
  )
}

function SessionUnavailable({ onRetry }: { onRetry: () => void }) {
  const { messages } = useTranslation()

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm items-center justify-center px-4">
      <div className="flex w-full flex-col items-center gap-4 text-center">
        <p role="alert" className="text-body-medium-16 text-gray-900">
          {messages.session.backendUnavailable}
        </p>
        <Button type="button" variant="primary" onClick={onRetry}>
          {messages.common.retry}
        </Button>
      </div>
    </main>
  )
}

export { SessionLoading, SessionUnavailable }
