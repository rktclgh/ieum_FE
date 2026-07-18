"use client"

import { useTranslation } from "@/lib/i18n/use-translation"

interface RoutePageStateProps {
  kind: "loading" | "invalid-link"
}

function RoutePageState({ kind }: RoutePageStateProps) {
  const { messages } = useTranslation()

  return (
    <main
      aria-busy={kind === "loading"}
      className="app-column flex min-h-dvh items-center justify-center px-4"
    >
      {kind === "loading" ? (
        <span
          aria-hidden="true"
          className="size-8 animate-spin rounded-full border-2 border-gray-200 border-t-primary"
        />
      ) : (
        <p role="alert" className="text-center text-body-medium-16 text-gray-900">
          {messages.route.invalidLink}
        </p>
      )}
    </main>
  )
}

export { RoutePageState }
