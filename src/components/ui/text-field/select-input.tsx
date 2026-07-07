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
  icon?: string
}

interface SelectInputProps {
  className?: string
  options: SelectOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  confirmLabel?: string
  searchPlaceholder?: string
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
  searchPlaceholder,
  error,
  disabled,
}: SelectInputProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? "")
  const selectedValue = value ?? uncontrolledValue
  const [pendingValue, setPendingValue] = React.useState(selectedValue)
  const selectedOption = options.find((option) => option.value === selectedValue)

  const [searchQuery, setSearchQuery] = React.useState("")
  const filteredOptions = searchQuery.trim()
    ? options.filter((option) =>
        option.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : options

  const [isScrolling, setIsScrolling] = React.useState(false)
  const scrollHideTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleOptionsScroll = () => {
    setIsScrolling(true)
    if (scrollHideTimeoutRef.current) clearTimeout(scrollHideTimeoutRef.current)
    scrollHideTimeoutRef.current = setTimeout(() => setIsScrolling(false), 800)
  }

  React.useEffect(
    () => () => {
      if (scrollHideTimeoutRef.current) clearTimeout(scrollHideTimeoutRef.current)
    },
    []
  )

  return (
    <Drawer
      onOpenChange={(open) => {
        if (open) {
          setPendingValue(selectedValue)
          setSearchQuery("")
        }
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
        <span className="flex w-full min-w-0 items-center gap-2">
          {selectedOption?.icon && (
            <Image
              src={selectedOption.icon}
              alt=""
              width={24}
              height={17}
              className="h-[17px] w-6 shrink-0 rounded-[3px] border border-gray-100 object-cover"
            />
          )}
          <span
            className={cn(
              "truncate text-body-regular-16",
              selectedOption ? "text-body-medium-16 text-gray-900" : "text-gray-400"
            )}
          >
            {selectedOption?.label ?? placeholder}
          </span>
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
            <DrawerContent className="min-h-0">
              {searchPlaceholder && (
                <div className="flex h-[46px] w-full shrink-0 items-center gap-3 rounded-full bg-gray-50 px-4 py-3">
                  <Image
                    src="/icons/search-bar/search.svg"
                    alt=""
                    width={20}
                    height={20}
                    className="size-5 shrink-0"
                  />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full bg-transparent text-body-regular-15 text-gray-900 caret-primary-600 outline-none placeholder:text-gray-400"
                  />
                </div>
              )}
              <div
                onScroll={handleOptionsScroll}
                data-scrolling={isScrolling}
                className={cn(
                  "flex w-full min-h-0 flex-1 flex-col items-start overflow-y-auto",
                  "[scrollbar-width:thin] [scrollbar-color:transparent_transparent] data-[scrolling=true]:[scrollbar-color:var(--color-gray-200)_transparent]",
                  "[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-transparent [&::-webkit-scrollbar-thumb]:transition-colors",
                  "data-[scrolling=true]:[&::-webkit-scrollbar-thumb]:bg-gray-200"
                )}
              >
                {filteredOptions.map((option) => {
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
                      <span className="flex min-w-0 items-center gap-2">
                        {option.icon && (
                          <Image
                            src={option.icon}
                            alt=""
                            width={24}
                            height={17}
                            className="h-[17px] w-6 shrink-0 rounded-[3px] border border-gray-100 object-cover"
                          />
                        )}
                        <span className="truncate">{option.label}</span>
                      </span>
                      {selected && <Check className="size-6 shrink-0 text-gray-400" strokeWidth={1.5} />}
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
