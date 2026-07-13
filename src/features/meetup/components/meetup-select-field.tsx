"use client"

import Image from "next/image"

import { cn } from "@/lib/utils"

interface MeetupSelectFieldProps {
  /** 값 선택 전 아이콘 */
  iconSrc: string
  /** 값 선택 후 아이콘 (없으면 iconSrc 유지) */
  selectedIconSrc?: string
  placeholder: string
  value?: string | null
  onClick?: () => void
  /** 연결된 바텀시트가 열려 있는 동안 파란 테두리로 강조 */
  active?: boolean
  className?: string
}

/** 탭하면 바텀시트를 여는 선택 필드 (날짜·시간·주소). 인풋처럼 보이지만 값은 피커에서 채운다. */
function MeetupSelectField({
  iconSrc,
  selectedIconSrc,
  placeholder,
  value,
  onClick,
  active,
  className,
}: MeetupSelectFieldProps) {
  const icon = value && selectedIconSrc ? selectedIconSrc : iconSrc
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-[3.375rem] w-full items-center gap-1 rounded-xl border border-gray-100 p-4 text-left transition-colors",
        active && "border-primary-600",
        className
      )}
    >
      <Image src={icon} alt="" width={20} height={20} className="size-5 shrink-0" />
      <span className={cn("truncate text-body-regular-16", value ? "text-gray-900" : "text-gray-400")}>
        {value || placeholder}
      </span>
    </button>
  )
}

export { MeetupSelectField }
