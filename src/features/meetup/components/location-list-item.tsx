import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"

interface LocationListItemProps {
  /** 좌측 원형 아이콘 경로 (24×24) */
  iconSrc: string
  /** 장소명 — 검색 강조를 위해 ReactNode 허용 */
  title: React.ReactNode
  /** 도로명 주소 등 부가 설명 */
  subtitle: string
  /** 우측 버튼 라벨 (선택 / 입력 등) */
  actionLabel: string
  /** outlined: 테두리(선택), filled: 파란 채움(입력) */
  actionVariant?: "filled" | "outlined"
  /** 주소 등 액션에 필요한 정보가 아직 없을 때 비활성화 */
  disabled?: boolean
  onAction: () => void
}

/**
 * 장소 선택 리스트의 한 줄 (아이콘 · 이름/주소 · 액션 버튼).
 * 지도 화면·검색 결과·직접입력 진입 행에서 공통으로 쓰인다.
 */
function LocationListItem({
  iconSrc,
  title,
  subtitle,
  actionLabel,
  actionVariant = "outlined",
  disabled = false,
  onAction,
}: LocationListItemProps) {
  return (
    <div className="flex w-full items-center gap-4">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-50">
        <Image src={iconSrc} alt="" width={24} height={24} className="size-6" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col items-start">
        <p className="line-clamp-2 text-title-semibold-16 text-gray-900">{title}</p>
        <p className="line-clamp-2 text-body-regular-14 text-gray-600">{subtitle}</p>
      </div>

      <button
        type="button"
        onClick={onAction}
        disabled={disabled}
        aria-disabled={disabled || undefined}
        className={cn(
          "flex h-8 shrink-0 items-center justify-center rounded-lg px-3 py-2 text-body-regular-13 transition-colors disabled:cursor-not-allowed disabled:opacity-40",
          actionVariant === "filled"
            ? "bg-primary-400 text-white"
            : "border border-primary-400 text-primary-400"
        )}
      >
        {actionLabel}
      </button>
    </div>
  )
}

export { LocationListItem }
