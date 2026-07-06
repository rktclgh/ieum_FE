"use client"

import { Button } from "@/components/ui/button"
import { useLogoutMutation } from "@/features/session/hooks/use-logout-mutation"
import { useSessionCheck } from "@/features/session/hooks/use-session-check"
import { useTranslation } from "@/lib/i18n/use-translation"

function LogoutButton() {
  const { messages } = useTranslation()
  const { data } = useSessionCheck()
  const logoutMutation = useLogoutMutation()

  if (!data) return null

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() => logoutMutation.mutate()}
      disabled={logoutMutation.isPending}
    >
      {messages.common.logout}
    </Button>
  )
}

export { LogoutButton }
