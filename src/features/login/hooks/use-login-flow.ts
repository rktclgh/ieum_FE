"use client"

import { useRouter } from "next/navigation"
import * as React from "react"

import { useLogin } from "@/features/login/hooks/use-login-mutations"

function useLoginFlow() {
  const router = useRouter()

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")

  const loginMutation = useLogin()

  const handleEmailChange = (value: string) => {
    setEmail(value)
    if (loginMutation.isError) loginMutation.reset()
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    if (loginMutation.isError) loginMutation.reset()
  }

  const handleSubmit = () => {
    if (!email || !password || loginMutation.isPending) return
    loginMutation.mutate(
      { email, password },
      { onSuccess: () => router.push("/") }
    )
  }

  return {
    email,
    onEmailChange: handleEmailChange,
    password,
    onPasswordChange: handlePasswordChange,
    onSubmit: handleSubmit,
    loginMutation,
  }
}

export { useLoginFlow }
