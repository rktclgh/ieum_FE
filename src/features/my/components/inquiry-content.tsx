"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { AppBar } from "@/components/ui/app-bar"
import { Button } from "@/components/ui/button"
import { Screen } from "@/components/layout/screen"
import { Textarea } from "@/components/ui/text-field/textarea"
import { Toast } from "@/components/ui/toast"
import { useSubmitInquiry } from "@/features/my/hooks/use-my-mutations"
import { useTranslation } from "@/lib/i18n/use-translation"

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
    <Screen kind="scroll" as="main">
      <AppBar
        title={messages.my.inquiry.title}
        trailingIcon={null}
        onLeadingClick={() => router.back()}
      />

      <div className="flex w-full flex-col gap-6 px-4 pt-3 pb-[calc(8rem+var(--safe-area-bottom))]">
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={messages.my.inquiry.placeholder}
          className="h-40"
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

      <div className="app-bottom-fixed bottom-anchor-auto z-10 app-column flex flex-col items-center gap-2 bg-white px-4 pt-2 pb-[calc(0.5rem+max(var(--safe-area-bottom),var(--keyboard-inset,0px)))]">
        <div className="flex w-full items-center gap-2">
          <Button
            type="button"
            variant="grayscale"
            size="md"
            onClick={() => router.back()}
            className="flex-1"
          >
            {messages.my.inquiry.cancel}
          </Button>
          <Button
            type="button"
            variant="accent"
            size="md"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1"
          >
            {messages.my.inquiry.submit}
          </Button>
        </div>
        <span className="h-1 w-[135px] rounded-full bg-gray-900" />
      </div>

      <Toast open={submitted} message={messages.my.inquiry.success} />
      <Toast open={submitInquiry.isError} message={messages.my.inquiry.error} />
    </Screen>
  )
}

export { InquiryContent }
