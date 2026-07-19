"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { TAB_ITEMS } from "@/features/navigation/constants/tab-items"
import { useMe } from "@/features/session/hooks/use-me"
import { useTranslation } from "@/lib/i18n/use-translation"

/** 활성일 때 보여줄 아이콘은 fill, 비활성일 때는 line */
const ICON_VARIANTS = [
  { variant: "line", activeVariant: false },
  { variant: "fill", activeVariant: true },
] as const

/**
 * 하단 고정 탭바. 루트 layout에서 한 번만 렌더하며(issue #280), 라우트 전환 중에도
 * 인스턴스가 유지되어야 활성 pill 슬라이딩 애니메이션이 성립한다.
 *
 * 노출 조건은 `TAB_ITEMS`의 href와 pathname이 **완전 일치**할 때뿐이다.
 * prefix 매칭을 넣으면 원래 탭바가 없던 하위 경로(`/my/edit` 등)에 탭바가 새로 생긴다.
 *
 * 경로 판정을 먼저 하고 세션 조회를 안쪽 컴포넌트로 미루는 이유: 탭 경로가 아닌
 * 화면(`/login` 등)에서 `useMe` 요청이 새로 발생하지 않게 하기 위해서다.
 */
function TabBar(props: React.ComponentProps<"div">) {
  const pathname = usePathname()

  const activeIndex = TAB_ITEMS.findIndex((item) => item.href === pathname)
  if (activeIndex === -1) return null

  return <TabBarNav activeIndex={activeIndex} {...props} />
}

/**
 * 페이지 콘텐츠가 아직 AuthGate의 로딩·오류 화면일 때 탭바가 그 위에 떠 보이지 않도록,
 * 세션이 확정된 뒤에만 렌더한다. 탭 경로에서는 AuthGate가 이미 같은 쿼리를 쓰고 있어
 * 추가 요청 없이 캐시를 공유한다.
 */
function TabBarNav({
  activeIndex,
  className,
  ...props
}: React.ComponentProps<"div"> & { activeIndex: number }) {
  const { messages } = useTranslation()
  const { data: me } = useMe()

  if (!me) return null

  return (
    <div
      data-slot="tab-bar"
      className={cn(
        "fixed inset-x-0 bottom-0 z-10 mx-auto flex w-full max-w-sm min-w-80 flex-col items-center justify-end gap-2 px-4 py-2",
        className
      )}
      {...props}
    >
      <div className="relative flex w-full items-center justify-between overflow-hidden rounded-full p-1 shadow-[0px_2px_16px_0px_rgba(0,0,0,0.12)] backdrop-blur-[3px]">
        {/*
         * 활성 pill. 탭 4개가 flex-1 균등폭이므로 컨테이너 p-1(0.25rem×2)을 뺀
         * 안쪽 폭의 1/4이 pill 폭이고, translateX(100%)가 정확히 한 칸이다.
         * Link들보다 먼저 렌더해 DOM 순서상 뒤에 깔린다.
         */}
        <div
          aria-hidden
          className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/4)] rounded-full bg-gray-100 transition-transform duration-base ease-base"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        />

        {TAB_ITEMS.map((item, index) => {
          const active = index === activeIndex
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-full p-2"
            >
              <div className="px-[1.99px] py-0.5">
                {/* line/fill 두 장을 겹쳐 두고 opacity를 교차시켜 pill과 같은 타이밍으로 크로스페이드 */}
                <div className="relative size-5">
                  {ICON_VARIANTS.map(({ variant, activeVariant }) => (
                    <Image
                      key={variant}
                      src={`/icons/tab-bar/${item.icon}-${variant}.svg`}
                      alt=""
                      width={20}
                      height={20}
                      className={cn(
                        "absolute inset-0 size-5 transition-opacity duration-base ease-base",
                        active === activeVariant ? "opacity-100" : "opacity-0"
                      )}
                    />
                  ))}
                </div>
              </div>
              <span className="text-body-regular-12 text-gray-900">
                {messages.tabBar[item.labelKey]}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export { TabBar }
