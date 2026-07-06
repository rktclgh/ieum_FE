"use client"

import { useRouter } from "next/navigation"

import { AppBar } from "@/components/ui/app-bar"
import { SignupIdpwForm } from "@/features/signup/components/signup-idpw-form"
import { useTranslation } from "@/lib/i18n/use-translation"

export default function SignUpPage() {
  const router = useRouter()
  const { messages } = useTranslation()

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center">
      <AppBar
        title={messages.signup.appBarTitle}
        trailingVariant="close"
        leadingIcon={null}
        onTrailingClick={() => router.push("/login")}
        className="w-full"
      />
      <SignupIdpwForm onSubmit={() => router.push("/sign-up/profile")} />
    </main>
  )
}
