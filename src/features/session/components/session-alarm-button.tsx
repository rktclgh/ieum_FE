"use client"

import { useRouter } from "next/navigation"

import { Circle } from "@/components/ui/circle"
import { useLogoutMutation } from "@/features/session/hooks/use-logout-mutation"
import { useMe } from "@/features/session/hooks/use-me"
import { useTranslation } from "@/lib/i18n/use-translation"

// 알림센터(/notifications) 구현 전까지, 로그인 상태를 확인하고 전환하는 임시 버튼으로 사용
function SessionAlarmButton() {
  const router = useRouter()
  const { messages } = useTranslation()
  const { data } = useMe()
  const logoutMutation = useLogoutMutation()
  const isLoggedIn = Boolean(data)

  return (
    <Circle
      iconSrc={isLoggedIn ? "/icons/circle/alarm-on.svg" : "/icons/circle/alarm.svg"}
      aria-label={isLoggedIn ? messages.common.logout : messages.home.loginLabel}
      disabled={logoutMutation.isPending}
      onClick={() => {
        if (isLoggedIn) {
          logoutMutation.mutate()
        } else {
          router.push("/login")
        }
      }}
    />
  )
}

export { SessionAlarmButton }
