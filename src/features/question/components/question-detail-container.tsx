"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { uploadImage } from "@/features/question/api/question-file-api"
import { QuestionDetailCard } from "@/features/question/components/question-detail-card"
import { QuestionDetailSheet } from "@/features/question/components/question-detail-sheet"
import { usePostAnswer } from "@/features/question/hooks/use-question-mutations"
import { useQuestionSummary } from "@/features/question/hooks/use-question-queries"
import { getQuestionErrorMessage } from "@/features/question/lib/question-error"
import { useMe } from "@/features/session/hooks/use-me"
import { useTranslation } from "@/lib/i18n/use-translation"
import { routes } from "@/lib/navigation/routes"

interface QuestionDetailContainerProps {
  questionId: number
  /** 시트를 닫을 때 호출. 없으면 라우트 뒤로가기(router.back). 지도 핀 오버레이에선 콜백으로 닫는다. */
  onClose?: () => void
  /**
   * 렌더 형태.
   * - "sheet": 자체 BottomSheet 로 연다(기본).
   * - "card": 본문만 렌더한다. 겹친 핀 캐러셀처럼 바깥에 이미 BottomSheet 이 있을 때 쓴다.
   */
  variant?: "sheet" | "card"
  /** card 모드에서 이 카드가 노출 중인지(캐러셀의 활성 슬라이드 여부). 카드로 그대로 전달한다. */
  active?: boolean
}

/**
 * 질문 상세 바텀시트 컨테이너. 요약 조회 + 답변 작성 mutation 을 시트에 연결한다.
 * 지도 질문 핀 클릭 시 오버레이로 열린다(모임 상세 컨테이너와 동일한 패턴).
 */
function QuestionDetailContainer({
  questionId,
  onClose,
  variant = "sheet",
  active,
}: QuestionDetailContainerProps) {
  const router = useRouter()
  const { messages } = useTranslation()

  const summaryQuery = useQuestionSummary(questionId)
  const postAnswer = usePostAnswer(questionId)
  const meQuery = useMe()

  // 하단 영역 결정: 내가 쓴 질문 → "답변 보기", 내가 이미 답변 → "답변 완료", 그 외 → 답변 입력.
  // 내 정보(useMe)가 아직 로딩 중이면 판별을 보류("pending")해, 내 질문/이미 답변한 질문에
  // 답변 입력창이 잠깐 잘못 노출되고 자기 질문·중복 답변이 제출되는 것을 막는다.
  const summary = summaryQuery.data ?? null
  const myUserId = meQuery.data?.userId ?? null
  const bottomVariant: "answer" | "view-answers" | "answered" | "pending" =
    meQuery.isPending
      ? "pending"
      : myUserId != null && summary != null && myUserId === summary.authorUserId
        ? "view-answers"
        : myUserId != null && summary != null && summary.answeredUserIds.includes(myUserId)
          ? "answered"
          : "answer"

  const [actionError, setActionError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!actionError) return
    const timeoutId = window.setTimeout(() => setActionError(null), 2500)
    return () => window.clearTimeout(timeoutId)
  }, [actionError])

  const close = () => (onClose ? onClose() : router.back())

  const handleSend = async (value: string, imageFile?: File | null) => {
    if (postAnswer.isPending) return
    // 사진 첨부 실패와 답변 등록 실패를 구분해 원인에 맞는 메시지를 노출한다.
    let imageFileIds: string[] | undefined
    if (imageFile) {
      try {
        imageFileIds = [await uploadImage(imageFile)]
      } catch {
        setActionError(messages.question.imageUploadFailed)
        return
      }
    }
    postAnswer.mutate(
      { content: value || undefined, imageFileIds },
      { onError: (error) => setActionError(getQuestionErrorMessage(error, messages)) }
    )
  }

  const cardProps = {
    bottomVariant,
    onSend: handleSend,
    onViewAnswers: () => router.push(routes.questionDetail(questionId)),
    onImageTooLarge: () => setActionError(messages.question.imageTooLarge),
  }

  return (
    <>
      {variant === "card" ? (
        // 로딩 중에도 슬라이드 높이를 유지해, 캐러셀 스크롤이 도착 후 튀지 않게 한다.
        summary ? (
          <QuestionDetailCard question={summary} active={active} {...cardProps} />
        ) : (
          <div className="h-56 w-full animate-pulse rounded-2xl bg-gray-100" />
        )
      ) : (
        <QuestionDetailSheet
          open
          onOpenChange={(next) => {
            if (!next) close()
          }}
          question={summary}
          {...cardProps}
        />
      )}

      {actionError && (
        <div className="fixed inset-x-0 bottom-[calc(6rem+max(var(--safe-area-bottom),var(--keyboard-inset,0px)))] z-[60] app-column flex justify-center px-4">
          <div className="rounded-xl bg-gray-900/90 px-4 py-2.5 text-body-regular-14 text-white">
            {actionError}
          </div>
        </div>
      )}
    </>
  )
}

export { QuestionDetailContainer }
