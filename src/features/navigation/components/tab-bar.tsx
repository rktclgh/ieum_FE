"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { SCREEN_BOTTOM_GAP } from "@/lib/constants/layout"
import { TAB_ITEMS, findTabIndex } from "@/features/navigation/constants/tab-items"
import { useMe } from "@/features/session/hooks/use-me"
import { useTranslation } from "@/lib/i18n/use-translation"
import { useHasScreenOverlay } from "@/lib/overlay/screen-overlay"

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
 * 하단 고정 탭바. 루트 layout에서 한 번만 렌더하며(issue #280), 라우트 전환 중에도
 * 인스턴스가 유지되어야 활성 pill 슬라이딩 애니메이션이 성립한다.
 *
 * 노출 조건은 두 가지다.
 *
 * 1. `TAB_ITEMS`의 href와 pathname이 **완전 일치**할 것.
 *    prefix 매칭을 넣으면 원래 탭바가 없던 하위 경로(`/my/edit` 등)에 탭바가 새로 생긴다.
 * 2. 화면을 덮는 오버레이가 열려 있지 않을 것 (issue #317).
 *    홈의 검색·리스트·새 모임 작성·새 질문 작성·핀 상세 시트는 별도 라우트가 아니라 `/` 위의
 *    오버레이 상태라, 경로만 보면 전부 "홈"이라 탭바가 그대로 남는다. Figma에는 이 화면들에
 *    탭바가 없다. z-index로 덮는 것만으로는 진입·퇴장 모션 중과 키보드가 올라와 오버레이
 *    박스가 줄어들 때(`--keyboard-inset`), 그리고 반투명 backdrop 뒤로 그대로 비친다.
 *
 * 경로·오버레이 판정을 먼저 하고 세션 조회를 안쪽 컴포넌트로 미루는 이유: 탭 경로가 아닌
 * 화면(`/login` 등)에서 `useMe` 요청이 새로 발생하지 않게 하기 위해서다.
 */
function TabBar(props: React.ComponentProps<"div">) {
  const pathname = usePathname()
  const hasScreenOverlay = useHasScreenOverlay()

  // 경로 판정은 `Screen`의 하단 클리어런스와 같은 함수를 쓴다 (issue #419).
  // 여기서만 판정하면 탭바 높이와 페이지가 비우는 공간이 조용히 어긋난다.
  const activeIndex = findTabIndex(pathname)
  if (activeIndex === -1 || hasScreenOverlay) return null

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
        // 화면 물리 바닥에서 28px 위에 pill을 띄운다(issue #436 — safe-area 포함한 총합).
        // 바닥 여백은 바텀시트와 같은 기준선(SCREEN_BOTTOM_GAP)을 쓰고,
        // `FAB_BOTTOM_WITH_TABBAR`가 여기서 파생된다.
        "app-bottom-fixed z-10 app-column flex min-w-80 flex-col items-center justify-end gap-2 px-4 pt-2",
        // standalone(black-translucent)에서 흔들리는 bottom:0 대신 lvh 상단 앵커로 화면 바닥에
        // 고정한다(globals.css `.bottom-anchor`). 점유 높이는 --tab-bar-height 그대로다.
        // Safari·비-standalone에서는 이 규칙이 적용되지 않아 위 app-bottom-fixed(bottom:0)가 산다.
        "bottom-anchor [--anchor-h:var(--tab-bar-height)]",
        SCREEN_BOTTOM_GAP,
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
