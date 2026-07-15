"use client"

import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n/use-translation"

type AdminAsyncStateProps =
  | { kind: "loading"; message?: string }
  | { kind: "empty"; message?: string }
  | { kind: "error"; message?: string; onRetry: () => void }

function AdminAsyncState(props: AdminAsyncStateProps) {
  const { messages } = useTranslation()
  const message =
    props.message ??
    (props.kind === "loading"
      ? messages.admin.common.loading
      : props.kind === "empty"
        ? messages.admin.common.empty
        : messages.admin.common.loadError)

  return (
    <section
      aria-busy={props.kind === "loading" || undefined}
      className="flex min-h-64 w-full flex-col items-center justify-center gap-4 px-6 text-center"
    >
      {props.kind === "loading" && (
        <span
          aria-hidden="true"
          className="size-8 animate-spin rounded-full border-2 border-gray-200 border-t-primary-400"
        />
      )}
      <p
        role={props.kind === "error" ? "alert" : undefined}
        className="text-body-medium-16 text-gray-900"
      >
        {message}
      </p>
      {props.kind === "error" && (
        <Button type="button" variant="primary" onClick={props.onRetry}>
          {messages.admin.common.retry}
        </Button>
      )}
    </section>
  )
}

export { AdminAsyncState }
export type { AdminAsyncStateProps }
