"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { AppBar } from "@/components/ui/app-bar"
import { Toast } from "@/components/ui/toast"
import { useSubmitInquiry } from "@/features/my/hooks/use-my-mutations"
import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

const SUCCESS_DISMISS_MS = 1200

function InquiryContent() {
  const router = useRouter()
  const { messages } = useTranslation()
  const submitInquiry = useSubmitInquiry()

  const [content, setContent] = React.useState("")
  const [submitted, setSubmitted] = React.useState(false)
  const backTimerRef = React.useRef<number | null>(null)

  // 성공 피드백 타이머는 언마운트 시 정리한다(사용자가 먼저 뒤로가면 중복 back 방지).
  React.useEffect(() => {
    return () => {
      if (backTimerRef.current !== null) window.clearTimeout(backTimerRef.current)
    }
  }, [])

  const trimmed = content.trim()
  const canSubmit = trimmed.length > 0 && !submitInquiry.isPending && !submitted

  const handleSubmit = () => {
    if (!canSubmit) return
    submitInquiry.mutate(
      { content: trimmed },
      {
        onSuccess: () => {
          setSubmitted(true)
          // 성공 피드백을 잠깐 보여준 뒤 이전 화면으로 돌아간다.
          backTimerRef.current = window.setTimeout(() => router.back(), SUCCESS_DISMISS_MS)
        },
      }
    )
  }

  return (
    <main className="app-column flex min-h-dvh flex-col">
      <AppBar
        title={messages.my.inquiry.title}
        trailingIcon={null}
        onLeadingClick={() => router.back()}
      />

      <div className="flex w-full flex-col gap-6 px-4 pt-3 pb-[calc(8rem+var(--safe-area-bottom))]">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={messages.my.inquiry.placeholder}
          className="h-40 w-full resize-none rounded-lg border border-gray-100 p-4 text-body-regular-14 text-gray-900 caret-primary outline-none transition-colors placeholder:text-gray-400 focus-within:border-primary"
        />

        <ul className="flex w-full flex-col gap-2">
          {[messages.my.inquiry.guide1, messages.my.inquiry.guide2].map((guide) => (
            <li key={guide} className="flex items-start gap-2 text-body-regular-12 text-gray-400">
              <span className="mt-[6.5px] size-1 shrink-0 rounded-full bg-gray-400" />
              <span>{guide}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 app-column flex flex-col items-center gap-2 bg-white px-4 pt-2 pb-[calc(0.5rem+max(var(--safe-area-bottom),var(--keyboard-inset,0px)))]">
        <div className="flex w-full items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex flex-1 items-center justify-center rounded-full border border-primary px-4 py-3 text-body-medium-14 text-primary"
          >
            {messages.my.inquiry.cancel}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              "flex flex-1 items-center justify-center rounded-full px-4 py-3 text-body-medium-14 text-white transition-colors",
              canSubmit ? "bg-primary" : "bg-gray-200"
            )}
          >
            {messages.my.inquiry.submit}
          </button>
        </div>
        <span className="h-1 w-[135px] rounded-full bg-gray-900" />
      </div>

      <Toast open={submitted} message={messages.my.inquiry.success} />
      <Toast open={submitInquiry.isError} message={messages.my.inquiry.error} />
    </main>
  )
}

export { InquiryContent }
