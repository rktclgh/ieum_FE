"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useMe } from "@/features/session/hooks/use-me"
import { decideRequireAuth, toRequireAuthStatus } from "@/features/session/lib/require-auth"
import { useTranslation } from "@/lib/i18n/use-translation"
import { routes } from "@/lib/navigation/routes"

type RequireAuth = (action: () => void) => void

const RequireAuthContext = React.createContext<RequireAuth | null>(null)

/**
 * 참여 액션 게이트. useMe 를 한 번만 구독해 requireAuth(action) 을 Context 로 노출한다.
 * - authenticated → 액션 즉시 실행
 * - guest → 로그인 유도 다이얼로그
 * - unresolved(세션 미확정) → 무시(콜드 부팅 직후 1초 미만 구간)
 * useAuthState 가 아니라 useMe 를 직접 쓴다: 앱 전역을 감싸므로 useAuthState 의
 * 에러 throw 가 앱 전체를 무너뜨릴 수 있고, 게이트엔 3-상태 판별이면 충분하다.
 */
function RequireAuthProvider({ children }: { children: React.ReactNode }) {
  const { data, isPending } = useMe()
  const router = useRouter()
  const { messages } = useTranslation()
  const [promptOpen, setPromptOpen] = React.useState(false)

  const requireAuth = React.useCallback<RequireAuth>(
    (action) => {
      const outcome = decideRequireAuth(toRequireAuthStatus({ data, isPending }))
      if (outcome === "run") action()
      else if (outcome === "prompt") setPromptOpen(true)
    },
    [data, isPending]
  )

  return (
    <RequireAuthContext.Provider value={requireAuth}>
      {children}
      <ConfirmDialog
        open={promptOpen}
        onOpenChange={setPromptOpen}
        title={messages.authGate.title}
        description={messages.authGate.description}
        cancelLabel={messages.authGate.cancel}
        confirmLabel={messages.authGate.confirm}
        onConfirm={() => {
          setPromptOpen(false)
          router.push(routes.login())
        }}
      />
    </RequireAuthContext.Provider>
  )
}

export { RequireAuthProvider, RequireAuthContext }
