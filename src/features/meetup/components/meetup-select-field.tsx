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
  /** 선택이 현재 상태에서 허용되지 않을 때 native button을 비활성화한다. */
  disabled?: boolean
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
  disabled,
  className,
}: MeetupSelectFieldProps) {
  const icon = value && selectedIconSrc ? selectedIconSrc : iconSrc
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-[3.375rem] w-full items-center gap-1 rounded-xl border border-gray-100 p-4 text-left transition-colors",
        active && !disabled && "border-primary-400",
        disabled && "cursor-not-allowed bg-gray-50 text-gray-300",
        className
      )}
    >
      <Image src={icon} alt="" width={20} height={20} className="size-5 shrink-0" />
      <span
        className={cn(
          "truncate text-body-regular-16",
          disabled ? "text-gray-300" : value ? "text-gray-900" : "text-gray-400"
        )}
      >
        {value || placeholder}
      </span>
    </button>
  )
}

export { MeetupSelectField }
