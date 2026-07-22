"use client"

import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { useFadeScrollbar, FADE_SCROLLBAR_CLASSNAME } from "@/lib/hooks/use-fade-scrollbar"
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
import { Icon } from "@/components/ui/icon"

interface SelectOption {
  value: string
  label: string
  // 아이콘은 URL이 아니라 엘리먼트로 받는다. 국적처럼 목록 전체가 아이콘을 다는 경우
  // 소비자 쪽에서 스프라이트 같은 방식으로 한 번에 그릴 수 있어야 하기 때문이다.
  icon?: React.ReactNode
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
  // 기본 필드형 트리거 대신 임의의 엘리먼트(예: 메뉴 행)를 트리거로 쓰고 싶을 때 전달한다.
  // 전달 시 선택된 값/placeholder/error 스타일은 무시되고 이 엘리먼트가 그대로 트리거가 된다.
  renderTrigger?: React.ReactElement
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
  renderTrigger,
}: SelectInputProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? "")
  const selectedValue = value ?? uncontrolledValue
  const [pendingValue, setPendingValue] = React.useState(selectedValue)
  const selectedOption = options.find((option) => option.value === selectedValue)

  const [searchQuery, setSearchQuery] = React.useState("")
  const isSearching = searchQuery.trim().length > 0
  const filteredOptions = isSearching
    ? options.filter((option) =>
        option.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : options

  const { isScrolling, onScroll: handleOptionsScroll } = useFadeScrollbar()

  const searchInputRef = React.useRef<HTMLInputElement>(null)

  // 확정은 항상 확인 버튼에서만 일어난다. 탭은 선택 표시(pending)까지다.
  //
  // 다만 검색 중이라면 탭한 뒤 키보드를 내려준다. 검색으로 항목을 찾아낸 시점에 키보드는
  // 할 일이 끝났고, 남아 있으면 확인 버튼을 가려 한 번 더 스크롤하거나 키보드를 손으로
  // 닫아야 하기 때문이다. 여기서 명시적으로 내리는 게 중요한 이유는 아래 onMouseDown
  // 주석 참고 — 브라우저가 알아서 내리게 두면 그 타이밍이 탭 자체를 잡아먹는다.
  const handleOptionClick = (nextValue: string) => {
    setPendingValue(nextValue)
    if (isSearching) searchInputRef.current?.blur()
  }

  return (
    <Drawer
      onOpenChange={(open) => {
        if (open) {
          setPendingValue(selectedValue)
          setSearchQuery("")
        }
      }}
    >
      {renderTrigger ? (
        <DrawerTrigger disabled={disabled} render={renderTrigger} />
      ) : (
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
            {selectedOption?.icon}
            <span
              className={cn(
                "truncate text-body-regular-16",
                selectedOption ? "text-body-medium-16 text-gray-900" : "text-gray-400"
              )}
            >
              {selectedOption?.label ?? placeholder}
            </span>
          </span>
          <Icon name="arrow/left" width={24} height={24} className="size-6 shrink-0 -rotate-90" />
        </DrawerTrigger>
      )}
      <DrawerPortal>
        <DrawerBackdrop />
        <DrawerViewport>
          <DrawerPopup>
            <DrawerContent className="min-h-0">
              {searchPlaceholder && (
                <div className="flex h-[46px] w-full shrink-0 items-center gap-3 rounded-full bg-gray-50 px-4 py-3">
                  <Icon name="search-bar/search" width={20} height={20} className="size-5 shrink-0" />
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full bg-transparent text-body-regular-15 text-gray-900 caret-primary outline-none placeholder:text-gray-400"
                  />
                </div>
              )}
              <div
                onScroll={handleOptionsScroll}
                data-scrolling={isScrolling}
                className={cn(
                  "flex w-full flex-col items-start overflow-y-auto",
                  // 검색형(예: 국적)만 리스트 높이를 고정한다 — 검색 결과 개수가 keystroke마다
                  // 바뀌어도 시트 전체 높이가 확확 바뀌지 않도록. 검색 없는 짧은 목록(반경 등)은
                  // 항목 수가 고정이라 기존처럼 콘텐츠에 맞춰 자연스럽게 크기를 잡는다.
                  searchPlaceholder ? "h-[280px] shrink-0" : "min-h-0 flex-1",
                  FADE_SCROLLBAR_CLASSNAME
                )}
              >
                {filteredOptions.map((option) => {
                  const selected = option.value === pendingValue
                  return (
                    <button
                      key={option.value}
                      type="button"
                      // 탭이 검색창의 포커스를 뺏지 않게 막는다. 포커스가 빠지면 키보드가
                      // 닫히고 시트 높이가 재계산되는데, 그 리플로우가 mousedown과 click
                      // 사이에 끼어들어 탭이 유실되거나 다른 항목에 떨어진다. 키보드는
                      // click이 등록된 뒤 handleOptionClick에서 직접 내린다.
                      // (pointerdown이 아니라 mousedown인 이유: pointerdown을 막으면
                      // click까지 함께 억제되어 탭 자체가 죽는다.)
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleOptionClick(option.value)}
                      className={cn(
                        "flex w-full items-center justify-between px-4 py-4 text-body-medium-16 text-gray-900",
                        selected ? "rounded-2xl bg-gray-50" : "rounded-xl"
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {option.icon}
                        <span className="truncate">{option.label}</span>
                      </span>
                      {selected && <Check className="size-6 shrink-0 text-gray-400" strokeWidth={1.5} />}
                    </button>
                  )
                })}
              </div>

              <DrawerClose
                render={<Button variant="accent" size="block" />}
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
