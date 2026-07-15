"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/text-field/input"
import { PasswordInput } from "@/components/ui/text-field/password-input"
import { useLogin } from "@/features/login/hooks/use-login-mutations"
import { useTranslation } from "@/lib/i18n/use-translation"

function AdminLoginPage() {
  const { messages } = useTranslation()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const loginMutation = useLogin()

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email || !password || loginMutation.isPending) return

    loginMutation.mutate({ email, password })
  }

  const resetError = () => {
    if (loginMutation.isError) loginMutation.reset()
  }

  return (
    <main className="flex min-h-dvh w-full items-center justify-center bg-gray-50 px-6 py-12">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-8 space-y-2">
          <h1 className="text-title-bold-28 text-gray-900">{messages.admin.auth.title}</h1>
          <p className="text-body-regular-15 text-gray-600">
            {messages.admin.auth.description}
          </p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-body-medium-14 text-gray-700">
            {messages.admin.auth.email}
            <Input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              disabled={loginMutation.isPending}
              onChange={(event) => {
                setEmail(event.target.value)
                resetError()
              }}
            />
          </label>
          <label className="flex flex-col gap-2 text-body-medium-14 text-gray-700">
            {messages.admin.auth.password}
            <PasswordInput
              name="password"
              autoComplete="current-password"
              required
              value={password}
              disabled={loginMutation.isPending}
              onChange={(event) => {
                setPassword(event.target.value)
                resetError()
              }}
            />
          </label>

          {loginMutation.isError && (
            <p role="alert" className="text-body-regular-14 text-red">
              {messages.admin.auth.loginError}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="block"
            disabled={loginMutation.isPending}
          >
            {messages.admin.auth.submit}
          </Button>
        </form>
      </section>
    </main>
  )
}

export { AdminLoginPage }
