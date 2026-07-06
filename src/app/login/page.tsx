"use client"

import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/text-field/input"
import { LanguageToggle } from "@/features/language/components/language-toggle"
import { useTranslation } from "@/lib/i18n/use-translation"

export default function LoginPage() {
  const { messages } = useTranslation()

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center gap-6 px-4 py-4">
      <LanguageToggle />

      <div className="flex h-30 w-full items-center justify-center">
        <span className="text-title-bold-28 text-black">{messages.login.logoAlt}</span>
      </div>

      <form className="flex w-full flex-col items-center gap-3">
        <Input
          type="email"
          name="email"
          autoComplete="email"
          placeholder={messages.login.emailPlaceholder}
        />
        <Input
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder={messages.login.passwordPlaceholder}
        />
        <Button type="submit" variant="primary" size="block">
          {messages.login.submit}
        </Button>
      </form>

      <div className="flex items-center justify-center gap-4">
        <span className="text-body-regular-12 text-gray-600">{messages.login.forgotPassword}</span>
        <span className="h-2 w-px bg-gray-200" />
        <span className="text-body-regular-12 text-gray-600">{messages.login.signUp}</span>
      </div>

      <div className="flex w-full items-center gap-2">
        <span className="h-px flex-1 bg-gray-200" />
        <span className="text-body-medium-16 text-gray-400">{messages.common.or}</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      <div className="flex w-full flex-col gap-3">
        <Button type="button" variant="social" size="block">
          <Image
            src="/icons/social-login/google.svg"
            alt=""
            width={20}
            height={20}
            className="size-5"
          />
          {messages.login.continueWithGoogle}
        </Button>
        <Button type="button" variant="social" size="block">
          <Image
            src="/icons/social-login/apple.svg"
            alt=""
            width={20}
            height={20}
            className="size-5"
          />
          {messages.login.continueWithApple}
        </Button>
        <Button type="button" variant="social" size="block">
          <Image
            src="/icons/social-login/kakao.svg"
            alt=""
            width={20}
            height={20}
            className="size-5"
          />
          {messages.login.continueWithKakao}
        </Button>
      </div>
    </main>
  )
}
