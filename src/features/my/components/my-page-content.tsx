"use client"

import Image from "next/image"
import Link from "next/link"

import { LogoutButton } from "@/features/session/components/logout-button"
import { useMe } from "@/features/session/hooks/use-me"
import { TabBar } from "@/features/navigation/components/tab-bar"
import { useTranslation } from "@/lib/i18n/use-translation"
import { routes } from "@/lib/navigation/routes"

function MyPageContent() {
  const { messages } = useTranslation()
  const { data: user } = useMe()

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

        <nav className="flex flex-col">
          <Link
            href={routes.myEdit()}
            className="flex w-full items-center justify-between py-3.5 text-body-medium-16 text-gray-900 transition-colors active:bg-gray-50"
          >
            {messages.my.editInfoLabel}
            <Image src="/icons/arrow/left.svg" alt="" width={20} height={20} className="size-5 -rotate-180" />
          </Link>
          <Link
            href={routes.mySettings()}
            className="flex w-full items-center justify-between py-3.5 text-body-medium-16 text-gray-900 transition-colors active:bg-gray-50"
          >
            {messages.my.settingsLabel}
            <Image src="/icons/arrow/left.svg" alt="" width={20} height={20} className="size-5 -rotate-180" />
          </Link>
        </nav>

        <LogoutButton />
      </main>

      <div className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-sm">
        <TabBar />
      </div>
    </>
  )
}

export { MyPageContent }
