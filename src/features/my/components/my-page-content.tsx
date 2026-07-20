"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { NoImageProfile } from "@/components/ui/no-image"
import { CountryFlag } from "@/features/chat/components/country-flag"
import { LanguageSettingItem } from "@/features/my/components/language-setting-item"
import { MyMenuRow } from "@/features/my/components/my-menu-row"
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

  if (!user) return null

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
      <main className="app-column flex min-h-dvh flex-col items-center px-4 pb-28">
        {/* 프로필 */}
        <div className="flex flex-col items-center gap-3 pt-8 pb-6">
          <div className="size-24 overflow-hidden rounded-full border-4 border-gray-100 bg-gray-100">
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
      </main>

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
        <div className="fixed inset-x-0 bottom-24 z-50 app-column flex justify-center px-4">
          <div className="rounded-xl bg-gray-900/90 px-4 py-2.5 text-body-regular-14 text-white">
            {messages.my.withdrawDialog.error}
          </div>
        </div>
      )}
    </>
  )
}

export { MyPageContent }
