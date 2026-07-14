"use client"

import { useRouter } from "next/navigation"

import { AppBar } from "@/components/ui/app-bar"
import { CredentialsForm } from "@/features/join/components/credentials-form"
import { ProfileForm } from "@/features/join/components/profile-form"
import { useJoinFlow } from "@/features/join/hooks/use-join-flow"
import { useTranslation } from "@/lib/i18n/use-translation"

export default function JoinPage() {
  const router = useRouter()
  const { messages } = useTranslation()
  const flow = useJoinFlow({ onSignupSuccess: () => router.push("/") })

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center">
      <AppBar
        title={flow.step === "credentials" ? messages.join.appBarTitle : messages.join.infoAppBarTitle}
        trailingVariant="close"
        leadingIcon={flow.step === "credentials" ? null : undefined}
        onLeadingClick={() => flow.setStep("credentials")}
        onTrailingClick={() => router.push("/login")}
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
