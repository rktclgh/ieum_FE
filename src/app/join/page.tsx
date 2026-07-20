"use client"

import { useRouter } from "next/navigation"

import { AppBar } from "@/components/ui/app-bar"
import { CredentialsForm } from "@/features/join/components/credentials-form"
import { ProfileForm } from "@/features/join/components/profile-form"
import { useJoinFlow } from "@/features/join/hooks/use-join-flow"
import { useTranslation } from "@/lib/i18n/use-translation"
import { routes } from "@/lib/navigation/routes"

function JoinContent() {
  const router = useRouter()
  const { messages } = useTranslation()
  const flow = useJoinFlow({
    onSignupSuccess: () => router.push(routes.home()),
    onAutoLoginFailed: () => router.push(routes.login()),
  })

  return (
    <main className="app-column flex min-h-dvh flex-col items-center">
      <AppBar
        title={flow.step === "credentials" ? messages.join.appBarTitle : messages.join.infoAppBarTitle}
        trailingVariant="close"
        leadingIcon={flow.step === "credentials" ? null : undefined}
        onLeadingClick={() => flow.setStep("credentials")}
        onTrailingClick={() => router.push(routes.login())}
        className="w-full"
      />
      {/* Both steps stay mounted so switching back and forth never resets what's already typed. */}
      <CredentialsForm
        className={flow.step === "credentials" ? undefined : "hidden"}
        flow={flow.credentials}
      />
      <ProfileForm
        className={flow.step === "profile" ? undefined : "hidden"}
        flow={flow.profile}
      />
    </main>
  )
}

export default function JoinPage() {
  return <JoinContent />
}
