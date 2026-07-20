"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface TextareaProps extends React.ComponentProps<"textarea"> {
  error?: boolean
  /**
   * 입력 영역 좌하단에 겹쳐 놓는 부가 컨트롤(사진 첨부 등).
   * 있으면 본문이 그 아래로 흘러들지 않도록 아래 여백을 넉넉히 잡는다.
   */
  bottomSlot?: React.ReactNode
  /** 래퍼가 아닌 textarea 자체에 붙일 클래스 (높이는 래퍼 className으로 준다) */
  textareaClassName?: string
}

/**
 * 테두리를 가진 여러 줄 입력 필드. 한 줄짜리 Input과 테두리·라운드·포커스·에러 표현을 공유한다.
 * 높이는 화면마다 달라(고정/가변) 래퍼 className으로 받는다.
 *
 * 자동으로 높이가 늘어나는 채팅 컴포저용 입력은 MessageTextarea를 쓴다.
 */
function Textarea({ className, textareaClassName, error, bottomSlot, ...props }: TextareaProps) {
  return (
    <div
      data-slot="textarea-wrapper"
      className={cn(
        "relative flex w-full rounded-2xl border border-gray-100 transition focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-900 has-disabled:cursor-not-allowed has-disabled:opacity-50",
        error && "border-red focus-within:border-red focus-within:ring-red",
        className
      )}
    >
      <textarea
        data-slot="textarea"
        className={cn(
          "size-full resize-none bg-transparent px-4 pt-3 text-body-medium-16 text-gray-900 caret-primary outline-none placeholder:text-body-regular-16 placeholder:text-gray-400",
          bottomSlot ? "pb-24" : "pb-3",
          textareaClassName
        )}
        {...props}
      />
      {bottomSlot ? <div className="absolute bottom-4 left-4">{bottomSlot}</div> : null}
    </div>
  )
}

export { Textarea }
