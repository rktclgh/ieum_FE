"use client"

import Image from "next/image"
import Link from "next/link"
import type { FormEvent } from "react"

import { Screen } from "@/components/layout/screen"
import { Button } from "@/components/ui/button"
import { Explanation } from "@/components/ui/text-field/explanation"
import { Input } from "@/components/ui/text-field/input"
import { PasswordInput } from "@/components/ui/text-field/password-input"
import { LanguageToggle } from "@/features/language/components/language-toggle"
import { useLoginFlow } from "@/features/login/hooks/use-login-flow"
import { AuthGate } from "@/features/session/components/auth-gate"
import { useSocialLogin } from "@/features/social-login/hooks/use-social-login"
import { useTranslation } from "@/lib/i18n/use-translation"
import { routes } from "@/lib/navigation/routes"

function LoginContent() {
  const { messages } = useTranslation()
  const {
    email,
    onEmailChange,
    password,
    onPasswordChange,
    onSubmit,
    loginMutation,
  } = useLoginFlow()
  const socialLogin = useSocialLogin()

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    // issue #279: AppBar가 없는 화면이라 상태바·홈 인디케이터를 main이 직접 받는다.
    // 세로 중앙 정렬이지만 짧은 뷰포트에서는 내용이 화면 끝까지 차므로 위아래 모두 필요하다.
    <Screen
      kind="scroll"
      as="main"
      centered
      className="gap-4 px-4 pt-[calc(1.5rem+var(--safe-area-top))] pb-[calc(1.5rem+var(--safe-area-bottom))] sm:gap-5 [@media(max-height:620px)]:gap-3 [@media(max-height:620px)]:pt-[calc(0.75rem+var(--safe-area-top))] [@media(max-height:620px)]:pb-[calc(0.75rem+var(--safe-area-bottom))]"
    >
      <LanguageToggle />

      {/* Figma 1774:11266 — 로고 영역 120px(상하 패딩 32 + 로고 56).
          짧은 뷰포트에서는 한 화면 유지를 위해 영역만 줄고 로고 크기는 유지된다.
          dvh 대신 미디어 쿼리를 쓰는 이유: 주소창 노출/가상 키보드로 dvh가 실시간
          변하면 로고 영역이 따라 움직여 레이아웃이 흔들린다. main과 동일 기준(620px). */}
      <div className="flex h-[120px] w-full shrink-0 items-center justify-center [@media(max-height:620px)]:h-[90px]">
        <Image
          src="/icons/common/ieum-logo.png"
          alt={messages.login.logoText}
          width={108}
          height={56}
          className="h-14 w-auto"
          preload
        />
      </div>

      <form onSubmit={handleSubmit} className="flex w-full flex-col items-center gap-3">
        <Input
          type="email"
          name="email"
          autoComplete="email"
          placeholder={messages.login.emailPlaceholder}
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
        />
        <PasswordInput
          name="password"
          autoComplete="current-password"
          placeholder={messages.login.passwordPlaceholder}
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
        />
        {loginMutation.isError && (
          <Explanation variant="error" text={messages.login.loginErrorExplanation} />
        )}
        <Button type="submit" variant="accent" size="block">
          {messages.login.submit}
        </Button>
      </form>

      <div className="flex items-center justify-center gap-4">
        <span className="text-body-regular-12 text-gray-600">{messages.login.forgotPassword}</span>
        <span className="h-2 w-px bg-gray-200" />
        <Link href={routes.join()} className="text-body-regular-12 text-gray-600">
          {messages.login.signUp}
        </Link>
      </div>

      <div className="flex w-full items-center gap-2">
        <span className="h-px flex-1 bg-gray-200" />
        <span className="text-body-medium-16 text-gray-400">{messages.common.or}</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      <div className="flex w-full flex-col gap-3">
        {socialLogin.errorMessage && (
          <Explanation variant="error" text={socialLogin.errorMessage} />
        )}
        <Button
          type="button"
          variant="social"
          size="block"
          disabled={socialLogin.isPending}
          onClick={socialLogin.startGoogle}
        >
          <Image
            src="/icons/social-login/google.svg"
            alt=""
            width={20}
            height={20}
            className="size-5"
          />
          {messages.login.continueWithGoogle}
        </Button>
        <Button
          type="button"
          variant="social"
          size="block"
          disabled={socialLogin.isPending}
          onClick={socialLogin.startKakao}
        >
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
    </Screen>
  )
}

export default function LoginPage() {
  return (
    <AuthGate policy="guest-only">
      <LoginContent />
    </AuthGate>
  )
}
