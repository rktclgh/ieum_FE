"use client"

import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"

interface SelectFieldProps extends Omit<React.ComponentProps<"button">, "value"> {
  /** 값 선택 전 아이콘 */
  iconSrc: string
  /** 값 선택 후 아이콘 (없으면 iconSrc 유지) */
  selectedIconSrc?: string
  placeholder: string
  value?: string | null
  /** 연결된 피커가 열려 있는 동안 포커스와 같은 강조를 유지한다 */
  active?: boolean
  error?: boolean
}

/**
 * 탭하면 바텀시트·풀스크린 피커를 여는 선택 필드(날짜·시간·장소 등).
 * 값은 피커에서 채우지만 생김새는 Input과 같은 껍데기를 쓴다.
 *
 * 자체 드로어까지 들고 있는 목록형 선택은 SelectInput을 쓴다.
 */
function SelectField({
  className,
  iconSrc,
  selectedIconSrc,
  placeholder,
  value,
  active,
  error,
  disabled,
  ...props
}: SelectFieldProps) {
  const icon = value && selectedIconSrc ? selectedIconSrc : iconSrc

  return (
    <button
      type="button"
      data-slot="select-field"
      disabled={disabled}
      className={cn(
        "flex h-[3.375rem] w-full items-center gap-2 rounded-2xl border border-gray-100 p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50",
        active && !disabled && "border-gray-900 ring-1 ring-gray-900",
        error && "border-red ring-red",
        className
      )}
      {...props}
    >
      <Image src={icon} alt="" width={20} height={20} className="size-5 shrink-0" />
      <span
        className={cn(
          "truncate",
          value ? "text-body-medium-16 text-gray-900" : "text-body-regular-16 text-gray-400"
        )}
      >
        {value || placeholder}
      </span>
    </button>
  )
}

export { SelectField }
