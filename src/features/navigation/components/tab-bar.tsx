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
 * 탭바 컨테이너의 안쪽 여백. pill의 폭·위치가 이 값에서 파생되므로 상수 하나로 묶어
 * 여백만 바꿨을 때 pill이 조용히 어긋나는 일을 막는다.
 */
const CONTAINER_PADDING = "0.25rem"

/**
 * trailing slash 유무로 일치가 깨지면 하이라이트만 빠지는 게 아니라 탭바가 통째로
 * 사라지므로 양쪽을 정규화해 비교한다. 여전히 완전 일치라 `/my/edit`은 `/my`와
 * 매칭되지 않는다 — 하위 경로에 탭바가 새로 생기면 안 된다.
 */
const normalizePath = (path: string) => path.replace(/\/$/, "") || "/"

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

  const activeIndex = TAB_ITEMS.findIndex(
    (item) => normalizePath(item.href) === normalizePath(pathname)
  )
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
      <div
        className="relative flex w-full items-center justify-between overflow-hidden rounded-full shadow-[0px_2px_16px_0px_rgba(0,0,0,0.12)] backdrop-blur-[3px]"
        style={{ padding: CONTAINER_PADDING }}
      >
        {/*
         * 활성 pill. 탭들이 flex-1 균등폭이므로 컨테이너 좌우 여백을 뺀 안쪽 폭을
         * 탭 개수로 나눈 값이 pill 폭이다. translateX(100%)는 자기 폭 기준이라
         * 폭만 탭 개수에서 파생되면 탭이 늘어도 한 칸 이동이 그대로 성립한다.
         * Link들보다 먼저 렌더해 DOM 순서상 뒤에 깔린다.
         */}
        <div
          aria-hidden
          className="absolute rounded-full bg-gray-100 transition-transform duration-base ease-base"
          style={{
            top: CONTAINER_PADDING,
            bottom: CONTAINER_PADDING,
            left: CONTAINER_PADDING,
            width: `calc((100% - ${CONTAINER_PADDING} * 2) / ${TAB_ITEMS.length})`,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
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
