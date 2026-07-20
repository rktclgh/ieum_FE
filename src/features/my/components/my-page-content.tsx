"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Screen } from "@/components/layout/screen"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { NoImageProfile } from "@/components/ui/no-image"
import { CountryFlag } from "@/features/chat/components/country-flag"
import { LanguageSettingItem } from "@/features/my/components/language-setting-item"
import { MyMenuRow } from "@/features/my/components/my-menu-row"
import { MyPageSkeleton } from "@/features/my/components/my-page-skeleton"
import { useWithdrawMe } from "@/features/my/hooks/use-my-mutations"
import { fromIso2, flagFromIso2 } from "@/features/join/lib/nationality-map"
import { useLogoutMutation } from "@/features/session/hooks/use-logout-mutation"
import { useMe } from "@/features/session/hooks/use-me"
import { resolveFileUrl } from "@/lib/api/file-url"
import { useTranslation } from "@/lib/i18n/use-translation"
import { routes } from "@/lib/navigation/routes"

const APP_VERSION = "1.0"

function MyPageContent() {
  const router = useRouter()
  const { messages } = useTranslation()
  const { data: user } = useMe()

  const [logoutOpen, setLogoutOpen] = React.useState(false)
  const [withdrawOpen, setWithdrawOpen] = React.useState(false)
  const [withdrawError, setWithdrawError] = React.useState(false)

  const logout = useLogoutMutation()
  const withdraw = useWithdrawMe()

  // useMe가 resolve될 때까지 같은 골격의 스켈레톤을 세워 둔다 — 예전엔 화면이 통째로
  // 비어 있어 진입이 실패한 것처럼 보였다(issue #382).
  if (!user) return <MyPageSkeleton />

  const countryCode = fromIso2(user.nationality)
  const flagSrc = flagFromIso2(user.nationality)

  const handleLogout = () => {
    if (logout.isPending) return
    logout.mutate(undefined, {
      onSuccess: () => {
        setLogoutOpen(false)
        router.replace(routes.login())
      },
    })
  }

  const handleWithdraw = () => {
    // 파괴적 작업 — 진행 중 중복 요청 방지
    if (withdraw.isPending) return
    setWithdrawError(false)
    withdraw.mutate(undefined, {
      onSuccess: () => {
        setWithdrawOpen(false)
        router.replace(routes.login())
      },
      onError: () => {
        setWithdrawOpen(false)
        setWithdrawError(true)
      },
    })
  }

  return (
    <>
      <Screen kind="scroll" as="main" className="items-center px-4">
        {/* 프로필 */}
        <div className="flex flex-col items-center gap-3 pt-[calc(2rem+var(--safe-area-top))] pb-6">
          <div className="size-24 overflow-hidden rounded-full bg-gray-100">
            {user.profileImageUrl ? (
              // 백엔드 프로필 이미지 호스트가 next.config remotePatterns에 없어 일반 img로 렌더한다.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveFileUrl(user.profileImageUrl)}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <NoImageProfile />
            )}
          </div>

          <Link href={routes.myEdit()} className="flex items-center gap-2">
            <span className="text-title-semibold-20 text-gray-900">{user.nickname}</span>
            <Image
              src="/icons/my/pencil.svg"
              alt={messages.my.editInfoLabel}
              width={16}
              height={16}
              className="size-4 shrink-0"
            />
          </Link>

          {countryCode && flagSrc && (
            <CountryFlag flagSrc={flagSrc} country={messages.countries[countryCode]} />
          )}
        </div>

        {/* 메뉴 */}
        <div className="flex w-full flex-col gap-3">
          <div className="flex w-full flex-col gap-2 rounded-2xl bg-gray-50 py-3">
            <Link
              href={routes.myNotifications()}
              className="w-full transition-colors active:bg-gray-100"
            >
              <MyMenuRow icon="/icons/my/bell.svg" label={messages.my.menu.notifications} />
            </Link>
            <Link
              href={routes.myPermissions()}
              className="w-full transition-colors active:bg-gray-100"
            >
              <MyMenuRow icon="/icons/my/device.svg" label={messages.my.menu.permissions} />
            </Link>
            <LanguageSettingItem settings={user.settings} />
            <Link
              href={routes.myInquiry()}
              className="w-full transition-colors active:bg-gray-100"
            >
              <MyMenuRow icon="/icons/my/mail.svg" label={messages.my.menu.inquiry} />
            </Link>
            <MyMenuRow
              icon="/icons/my/information.svg"
              label={messages.my.menu.version}
              trailing={
                <span className="text-body-regular-14 text-gray-400">{APP_VERSION}</span>
              }
            />
          </div>

          {/* 계정 */}
          <div className="flex w-full flex-col gap-1 rounded-2xl bg-gray-50 py-3">
            <button
              type="button"
              onClick={() => setLogoutOpen(true)}
              className="flex w-full items-center px-4 py-2 text-left text-body-medium-16 text-gray-500 transition-colors active:bg-gray-100"
            >
              {messages.my.menu.logout}
            </button>
            <button
              type="button"
              onClick={() => setWithdrawOpen(true)}
              className="flex w-full items-center px-4 py-2 text-left text-body-medium-16 text-gray-500 transition-colors active:bg-gray-100"
            >
              {messages.my.menu.withdraw}
            </button>
          </div>
        </div>
      </Screen>

      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title={messages.my.logoutDialog.title}
        description={messages.my.logoutDialog.description}
        cancelLabel={messages.my.logoutDialog.cancel}
        confirmLabel={messages.my.logoutDialog.confirm}
        onConfirm={handleLogout}
      />

      <ConfirmDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        title={messages.my.withdrawDialog.title}
        description={messages.my.withdrawDialog.description}
        cancelLabel={messages.my.withdrawDialog.cancel}
        confirmLabel={messages.my.withdrawDialog.confirm}
        onConfirm={handleWithdraw}
      />

      {withdrawError && (
        <div className="bottom-anchor-auto fixed inset-x-0 bottom-[calc(6rem+var(--safe-area-bottom))] z-50 app-column flex justify-center px-4">
          <div className="rounded-xl bg-gray-900/90 px-4 py-2.5 text-body-regular-14 text-white">
            {messages.my.withdrawDialog.error}
          </div>
        </div>
      )}
    </>
  )
}

export { MyPageContent }
