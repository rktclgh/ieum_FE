"use client"

import { useRouter } from "next/navigation"
import * as React from "react"

import { AppBar } from "@/components/ui/app-bar"
import { ProfileForm } from "@/features/join/components/profile-form"
import { useSocialSignupFlow } from "@/features/social-login/hooks/use-social-signup-flow"
import {
  load,
  type SocialSignupStoragePayload,
} from "@/features/social-login/lib/social-signup-storage"
import { useTranslation } from "@/lib/i18n/use-translation"

export default function SocialJoinPage() {
  const router = useRouter()
  const { messages } = useTranslation()
  const [payload, setPayload] = React.useState<SocialSignupStoragePayload | null>(null)
  const [hasCheckedStorage, setHasCheckedStorage] = React.useState(false)
  const flow = useSocialSignupFlow(payload?.token ?? "")

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedPayload = load()
      if (!storedPayload) {
        router.replace("/login")
        return
      }

      setPayload(storedPayload)
      setHasCheckedStorage(true)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [router])

  if (!hasCheckedStorage || !payload) return null

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center">
      <AppBar
        title={messages.join.infoAppBarTitle}
        trailingVariant="close"
        leadingIcon={null}
        onTrailingClick={() => router.push("/login")}
        className="w-full"
      />
      {payload.email && (
        <p className="w-full px-4 pb-3 text-body-regular-12 text-gray-500">{payload.email}</p>
      )}
      <ProfileForm flow={flow.profile} />
    </main>
  )
}
