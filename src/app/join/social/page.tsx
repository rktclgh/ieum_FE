"use client"

import { useRouter } from "next/navigation"
import * as React from "react"

import { AppBar } from "@/components/ui/app-bar"
import { ProfileForm } from "@/features/join/components/profile-form"
import { useSocialSignupFlow } from "@/features/social-login/hooks/use-social-signup-flow"
import { saveSocialLoginError } from "@/features/social-login/lib/oauth-state-storage"
import {
  load,
  type SocialSignupStoragePayload,
} from "@/features/social-login/lib/social-signup-storage"
import { useTranslation } from "@/lib/i18n/use-translation"
import { routes } from "@/lib/navigation/routes"

export default function SocialJoinPage() {
  const router = useRouter()
  const { messages } = useTranslation()
  const [payload, setPayload] = React.useState<SocialSignupStoragePayload | null>(null)
  const [hasCheckedStorage, setHasCheckedStorage] = React.useState(false)
  const flow = useSocialSignupFlow(payload?.token ?? "")

  React.useEffect(() => {
    const storedPayload = load()
    if (!storedPayload) {
      saveSocialLoginError("tokenExpired")
      router.replace(routes.login())
      return
    }

    // Storage check must update the client-only page state before rendering the form.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPayload(storedPayload)
    setHasCheckedStorage(true)
  }, [router])

  if (!hasCheckedStorage || !payload) {
    return (
      <main className="app-column flex min-h-dvh items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="size-8 animate-spin rounded-full border-2 border-gray-200 border-t-primary" />
          <p className="text-body-medium-16 text-gray-900">{messages.social.loading}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="app-column flex min-h-dvh flex-col items-center">
      <AppBar
        title={messages.join.infoAppBarTitle}
        trailingVariant="close"
        leadingIcon={null}
        onTrailingClick={() => router.push(routes.login())}
        className="w-full"
      />
      <ProfileForm flow={flow.profile} />
    </main>
  )
}
