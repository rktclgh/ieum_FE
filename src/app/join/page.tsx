"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { AppBar } from "@/components/ui/app-bar"
import { CredentialsForm } from "@/features/join/components/credentials-form"
import { ProfileForm } from "@/features/join/components/profile-form"
import { useTranslation } from "@/lib/i18n/use-translation"

type JoinStep = "idpw" | "info"

export default function JoinPage() {
  const router = useRouter()
  const { messages } = useTranslation()
  const [step, setStep] = React.useState<JoinStep>("idpw")

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center">
      <AppBar
        title={step === "idpw" ? messages.join.appBarTitle : messages.join.infoAppBarTitle}
        trailingVariant="close"
        leadingIcon={step === "idpw" ? null : undefined}
        onLeadingClick={() => setStep("idpw")}
        onTrailingClick={() => router.push("/login")}
        className="w-full"
      />
      {/* Both steps stay mounted so switching back and forth never resets what's already typed. */}
      <CredentialsForm
        className={step === "idpw" ? undefined : "hidden"}
        onSubmit={() => setStep("info")}
      />
      <ProfileForm className={step === "info" ? undefined : "hidden"} />
    </main>
  )
}
