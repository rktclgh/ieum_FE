"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Flag, Globe } from "lucide-react"

import { AppBar } from "@/components/ui/app-bar"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { AnswerCard } from "@/features/question/components/answer-card"
import { LongPressActionOverlay } from "@/features/question/components/long-press-action-overlay"
import { QuestionAiAnswerCard } from "@/features/question/components/question-ai-answer-card"
import {
  useAcceptAnswer,
  useCreateQuestionRoom,
  useReportAnswer,
} from "@/features/question/hooks/use-question-mutations"
import { useQuestionDetail } from "@/features/question/hooks/use-question-queries"
import { resolveAcceptButtonState } from "@/features/question/lib/answer-acceptance"
import { getQuestionErrorMessage } from "@/features/question/lib/question-error"
import type { QuestionAnswerView } from "@/features/question/lib/question-adapter"
import { useMe } from "@/features/session/hooks/use-me"
import { useTranslateToggle } from "@/features/translate/hooks/use-translate-toggle"
import { useTranslation } from "@/lib/i18n/use-translation"
import { routes } from "@/lib/navigation/routes"

interface AnswerViewScreenProps {
  questionId: number
}

/**
 * 답변 보기 — 질문 작성자 전용 (Figma 1744-10029).
 * 답변 작성은 홈 지도 질문 시트에서만 일어나므로 이 화면엔 입력창이 없다.
 * 비작성자가 딥링크로 들어오면 홈으로 돌려보낸다.
 */
function AnswerViewScreen({ questionId }: AnswerViewScreenProps) {
  const router = useRouter()
  const { messages } = useTranslation()

  const detailQuery = useQuestionDetail(questionId)
  const acceptAnswer = useAcceptAnswer(questionId)
  const createRoom = useCreateQuestionRoom()
  const reportAnswer = useReportAnswer()
  const me = useMe()

  const [actionError, setActionError] = React.useState<string | null>(null)
  const [removedIds, setRemovedIds] = React.useState<Set<number>>(new Set())
  const [pendingReportId, setPendingReportId] = React.useState<number | null>(null)
  const [acceptedAuthor, setAcceptedAuthor] = React.useState<{
    name: string
    userId: number | null
  } | null>(null)
  const [activeAnswer, setActiveAnswer] = React.useState<{
    id: number
    rect: DOMRect
    view: QuestionAnswerView
    canReport: boolean
  } | null>(null)

  React.useEffect(() => {
    if (!actionError) return
    const timeoutId = window.setTimeout(() => setActionError(null), 2500)
    return () => window.clearTimeout(timeoutId)
  }, [actionError])

  const question = detailQuery.data
  const viewerUserId = me.data?.userId ?? null
  const isAuthenticated = viewerUserId != null
  const isAuthor = question != null && viewerUserId === question.authorUserId
  const hasAcceptedAnswer = question?.answers.some((a) => a.isAccepted) ?? false

  // 비작성자는 이 화면을 볼 이유가 없다 — 답변은 홈 지도 질문 시트에서 한다.
  React.useEffect(() => {
    if (!question || !me.data) return
    if (!isAuthor) router.replace(routes.home())
  }, [question, me.data, isAuthor, router])

  const handleAccept = (answer: QuestionAnswerView) => {
    acceptAnswer.mutate(answer.answerId, {
      onSuccess: () =>
        setAcceptedAuthor({ name: answer.authorName, userId: answer.authorUserId }),
      onError: (error) => setActionError(getQuestionErrorMessage(error, messages)),
    })
  }

  const handleStartChat = () => {
    const targetUserId = acceptedAuthor?.userId
    setAcceptedAuthor(null)
    if (!question || targetUserId == null) return
    createRoom.mutate(
      { questionId: question.questionId, targetUserId },
      {
        onSuccess: (room) => router.push(routes.chatRoom(room.roomId)),
        onError: () => setActionError(messages.question.chatStartFailed),
      }
    )
  }

  const handleConfirmReport = () => {
    if (pendingReportId == null) return
    const answerId = pendingReportId
    setPendingReportId(null)
    reportAnswer.mutate(
      { answerId, reason: "etc" },
      {
        onSuccess: () => {
          setRemovedIds((prev) => new Set(prev).add(answerId))
          setActionError(messages.question.reportSubmitted)
        },
        onError: () => setActionError(messages.question.errors.REPORT_FAILED),
      }
    )
  }

  const visibleAnswers = (question?.answers ?? []).filter((a) => !removedIds.has(a.answerId))

  return (
    <>
      <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col bg-white">
        <AppBar
          title={question?.title ?? ""}
          trailingIcon={null}
          onLeadingClick={() => router.back()}
        />

        {detailQuery.isError ? (
          <p className="w-full px-4 pt-10 text-center text-body-regular-14 text-gray-400">
            {getQuestionErrorMessage(detailQuery.error, messages) || messages.question.loadError}
          </p>
        ) : question ? (
          <div className="flex flex-1 flex-col gap-4 px-4 py-3">
            {visibleAnswers.length === 0 ? (
              <p className="w-full pt-6 text-center text-body-regular-14 text-gray-400">
                {messages.question.emptyAnswers}
              </p>
            ) : (
              visibleAnswers.map((answer) =>
                answer.isAi ? (
                  <QuestionAiAnswerCard
                    key={answer.answerId}
                    answer={answer}
                    isAuthenticated={isAuthenticated}
                  />
                ) : (
                  <AnswerCard
                    key={answer.answerId}
                    answer={answer}
                    acceptState={resolveAcceptButtonState({
                      answer,
                      isAuthor,
                      isAuthenticated,
                      hasAcceptedAnswer,
                      viewerUserId,
                    })}
                    onAccept={() => handleAccept(answer)}
                    onLongPress={(rect) =>
                      setActiveAnswer({
                        id: answer.answerId,
                        rect,
                        view: answer,
                        canReport: answer.authorUserId !== viewerUserId,
                      })
                    }
                  />
                )
              )
            )}
          </div>
        ) : (
          <div className="flex-1" />
        )}
      </main>

      {actionError && (
        <div className="fixed inset-x-0 bottom-24 z-50 mx-auto flex w-full max-w-sm justify-center px-4">
          <div className="rounded-xl bg-gray-900/90 px-4 py-2.5 text-body-regular-14 text-white">
            {actionError}
          </div>
        </div>
      )}

      {activeAnswer && (
        <AnswerLongPressMenu
          active={activeAnswer}
          isAuthenticated={isAuthenticated}
          onDismiss={() => setActiveAnswer(null)}
          onReport={() => setPendingReportId(activeAnswer.id)}
        />
      )}

      <ConfirmDialog
        open={acceptedAuthor != null}
        onOpenChange={(open) => !open && setAcceptedAuthor(null)}
        title={messages.question.acceptedDialogTitle}
        description={messages.question.acceptedDialogDescription(acceptedAuthor?.name ?? "")}
        cancelLabel={messages.question.acceptedDialogClose}
        confirmLabel={messages.question.acceptedDialogStartChat}
        onConfirm={handleStartChat}
      />

      <ConfirmDialog
        open={pendingReportId != null}
        onOpenChange={(open) => !open && setPendingReportId(null)}
        title={messages.question.reportConfirmTitle}
        description={messages.question.reportConfirmDescription}
        cancelLabel={messages.question.reportConfirmCancel}
        confirmLabel={messages.question.reportAction}
        onConfirm={handleConfirmReport}
      />
    </>
  )
}

interface AnswerLongPressMenuProps {
  active: { id: number; rect: DOMRect; view: QuestionAnswerView; canReport: boolean }
  isAuthenticated: boolean
  onDismiss: () => void
  onReport: () => void
}

/**
 * 답변 롱프레스 메뉴 (Figma 1951-27518) — 번역 / 신고.
 * 훅은 조건부·반복 호출이 불가능해, 활성 답변 하나에 대해서만 마운트되는 컴포넌트로 분리했다.
 */
function AnswerLongPressMenu({
  active,
  isAuthenticated,
  onDismiss,
  onReport,
}: AnswerLongPressMenuProps) {
  const { messages } = useTranslation()
  const translate = useTranslateToggle({ text: active.view.content, isAuthenticated })

  return (
    <LongPressActionOverlay
      anchorRect={active.rect}
      onDismiss={onDismiss}
      actions={[
        ...(translate.canTranslate
          ? [
              {
                icon: <Globe className="size-5 text-gray-900" />,
                label: translate.isLoading
                  ? messages.translate.translatingLabel
                  : translate.isShowingTranslation
                    ? messages.translate.viewOriginalLabel
                    : messages.translate.menuLabel,
                disabled: translate.isLoading,
                onClick: translate.toggle,
              },
            ]
          : []),
        ...(active.canReport
          ? [
              {
                icon: <Flag className="size-5 text-red" />,
                label: messages.question.reportAction,
                tone: "destructive" as const,
                onClick: onReport,
              },
            ]
          : []),
      ]}
    >
      <AnswerCard
        answer={{ ...active.view, content: translate.displayText }}
        acceptState="hidden"
        onAccept={() => {}}
        onLongPress={() => {}}
      />
    </LongPressActionOverlay>
  )
}

export { AnswerViewScreen }
