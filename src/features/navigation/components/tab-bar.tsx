"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { TAB_ITEMS } from "@/features/navigation/constants/tab-items"
import { useTranslation } from "@/lib/i18n/use-translation"

interface TabBarProps extends React.ComponentProps<"div"> {
  /** 실제 경로 대신 특정 탭을 활성 상태로 강제 표시 (미리보기/데모용) */
  activeHref?: string
}

function TabBar({ className, activeHref, ...props }: TabBarProps) {
  const pathname = usePathname()
  const { messages } = useTranslation()

  return (
    <div
      data-slot="tab-bar"
      className={cn(
        "flex w-full min-w-80 flex-col items-center justify-end gap-2 px-4 py-2",
        className
      )}
      {...props}
    >
      <div className="flex w-full items-center justify-between rounded-full bg-white/20 p-1 shadow-[0px_2px_20px_0px_rgba(0,0,0,0.10)] backdrop-blur-[6px]">
        {TAB_ITEMS.map((item) => {
          const active = (activeHref ?? pathname) === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-full p-2",
                active && "bg-gray-100"
              )}
            >
              <div className="px-[1.99px] py-0.5">
                <Image
                  src={`/icons/tab-bar/${item.icon}-${active ? "fill" : "line"}.svg`}
                  alt=""
                  width={20}
                  height={20}
                  className="size-5"
                />
              </div>
              <span
                className={cn(
                  "text-body-regular-12",
                  active ? "text-primary-400" : "text-gray-900"
                )}
              >
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
