"use client"

import { useRouter } from "next/navigation"
import * as React from "react"

import { LogoutButton } from "@/features/session/components/logout-button"
import { useMe } from "@/features/session/hooks/use-me"
import { TabBar } from "@/features/navigation/components/tab-bar"
import { useTranslation } from "@/lib/i18n/use-translation"

function MyPageContent() {
  const router = useRouter()
  const { messages } = useTranslation()
  const { data: user, isPending } = useMe()

  // 서버 컴포넌트의 redirect는 최초 진입 시점에만 평가되므로, 이 페이지에
  // 머무는 중에 로그아웃해 user가 null이 되면 여기서 직접 보내준다.
  React.useEffect(() => {
    if (!isPending && !user) router.replace("/login")
  }, [isPending, user, router])

  if (!user) return null

  return (
    <>
      <main className="mx-auto flex w-full max-w-sm flex-col gap-4 p-4 pb-28">
        <div className="flex items-center gap-3">
          {user.profileImageUrl && (
            // 백엔드가 내려주는 프로필 이미지 호스트가 next.config의 remotePatterns에
            // 등록되어 있지 않으므로, next/image 대신 일반 img로 렌더링한다.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.profileImageUrl}
              alt=""
              width={56}
              height={56}
              className="size-14 rounded-full object-cover"
            />
          )}
          <div className="flex flex-col">
            <span className="text-title-semibold-18 text-gray-900">{user.nickname}</span>
            <span className="text-body-regular-12 text-gray-500">{user.email}</span>
          </div>
        </div>

        <dl className="flex flex-col gap-2 text-body-regular-14 text-gray-700">
          <div className="flex justify-between">
            <dt className="text-gray-500">{messages.my.gradeLabel}</dt>
            <dd>{user.grade}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">{messages.my.acceptedCountLabel}</dt>
            <dd>{user.acceptedCount}</dd>
          </div>
        </dl>

        <LogoutButton />
      </main>

      <div className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-sm">
        <TabBar />
      </div>
    </>
  )
}

export { MyPageContent }
