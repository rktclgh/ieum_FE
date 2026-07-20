"use client"

import { Screen } from "@/components/layout/screen"
import { useTranslation } from "@/lib/i18n/use-translation"

interface RoutePageStateProps {
  kind: "loading" | "invalid-link"
}

function RoutePageState({ kind }: RoutePageStateProps) {
  const { messages } = useTranslation()

  return (
    <Screen kind="scroll" as="main" centered aria-busy={kind === "loading"} className="px-4">
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
    </Screen>
  )
}

export { RoutePageState }
