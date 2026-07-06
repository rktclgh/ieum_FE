"use client"

import * as React from "react"
import Image from "next/image"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerPopup,
  DrawerPortal,
  DrawerTrigger,
  DrawerViewport,
} from "@/components/ui/drawer"

interface SelectOption {
  value: string
  label: string
}

interface SelectInputProps {
  className?: string
  options: SelectOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  confirmLabel?: string
  error?: boolean
  disabled?: boolean
}

function SelectInput({
  className,
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = "선택",
  confirmLabel = "확인",
  error,
  disabled,
}: SelectInputProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? "")
  const selectedValue = value ?? uncontrolledValue
  const [pendingValue, setPendingValue] = React.useState(selectedValue)
  const selectedOption = options.find((option) => option.value === selectedValue)

  return (
    <Drawer
      onOpenChange={(open) => {
        if (open) setPendingValue(selectedValue)
      }}
    >
      <DrawerTrigger
        data-slot="select-input-wrapper"
        disabled={disabled}
        className={cn(
          "flex h-[3.375rem] w-full items-center gap-2 rounded-2xl border border-gray-100 p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red",
          className
        )}
      >
        <span
          className={cn(
            "w-full truncate text-body-regular-16",
            selectedOption ? "text-body-medium-16 text-gray-900" : "text-gray-400"
          )}
        >
          {selectedOption?.label ?? placeholder}
        </span>
        <Image
          src="/icons/arrow/left.svg"
          alt=""
          width={24}
          height={24}
          className="size-6 shrink-0 -rotate-90"
        />
      </DrawerTrigger>
      <DrawerPortal>
        <DrawerBackdrop />
        <DrawerViewport>
          <DrawerPopup>
            <DrawerContent>
              <div className="flex w-full flex-col items-start">
                {options.map((option) => {
                  const selected = option.value === pendingValue
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPendingValue(option.value)}
                      className={cn(
                        "flex w-full items-center justify-between px-4 py-4 text-body-medium-16 text-gray-900",
                        selected ? "rounded-2xl bg-gray-50" : "rounded-xl"
                      )}
                    >
                      {option.label}
                      {selected && <Check className="size-6 text-gray-400" strokeWidth={1.5} />}
                    </button>
                  )
                })}
              </div>

              <DrawerClose
                render={<Button variant="primary" size="block" />}
                onClick={() => {
                  setUncontrolledValue(pendingValue)
                  onValueChange?.(pendingValue)
                }}
              >
                {confirmLabel}
              </DrawerClose>
            </DrawerContent>
          </DrawerPopup>
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  )
}

export { SelectInput }
