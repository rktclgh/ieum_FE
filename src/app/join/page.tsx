"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { AppBar } from "@/components/ui/app-bar"
import { CredentialsForm } from "@/features/join/components/credentials-form"
import { ProfileForm, type ProfileFormValues } from "@/features/join/components/profile-form"
import { useTranslation } from "@/lib/i18n/use-translation"

type JoinStep = "idpw" | "info"

interface JoinCredentials {
  email: string
  password: string
}

export default function JoinPage() {
  const router = useRouter()
  const { messages } = useTranslation()
  const [step, setStep] = React.useState<JoinStep>("idpw")
  const [credentials, setCredentials] = React.useState<JoinCredentials | null>(null)

  const handleCredentialsSubmit = (values: JoinCredentials) => {
    setCredentials(values)
    setStep("info")
  }

  const handleProfileSubmit = (profile: ProfileFormValues) => {
    if (!credentials) return
    // TODO: 회원가입 API 연결 시 credentials + profile을 함께 전송
    console.log("join payload", { ...credentials, ...profile })
    router.push("/login")
  }

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
        onSubmit={handleCredentialsSubmit}
      />
      <ProfileForm className={step === "info" ? undefined : "hidden"} onSubmit={handleProfileSubmit} />
    </main>
  )
}
