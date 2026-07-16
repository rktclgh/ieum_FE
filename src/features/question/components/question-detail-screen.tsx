"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Flag } from "lucide-react"

import { AppBar } from "@/components/ui/app-bar"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { LongPressActionOverlay } from "@/features/question/components/long-press-action-overlay"
import { QuestionAiAnswerCard } from "@/features/question/components/question-ai-answer-card"
import { QuestionAnswerAuthorItem } from "@/features/question/components/question-answer-author-item"
import { QuestionAnswerItem } from "@/features/question/components/question-answer-item"
import {
  useAcceptAnswer,
  useCreateQuestionRoom,
  usePostAnswer,
  useReportAnswer,
} from "@/features/question/hooks/use-question-mutations"
import { useQuestionDetail } from "@/features/question/hooks/use-question-queries"
import { getQuestionErrorMessage } from "@/features/question/lib/question-error"
import type { QuestionAnswerView } from "@/features/question/lib/question-adapter"
import { useMe } from "@/features/session/hooks/use-me"
import { useTranslation } from "@/lib/i18n/use-translation"
import { routes } from "@/lib/navigation/routes"

interface QuestionDetailScreenProps {
  questionId: number
}

function QuestionDetailScreen({ questionId }: QuestionDetailScreenProps) {
  const router = useRouter()
  const { messages } = useTranslation()

  const detailQuery = useQuestionDetail(questionId)
  const postAnswer = usePostAnswer(questionId)
  const acceptAnswer = useAcceptAnswer(questionId)
  const me = useMe()
  const createRoom = useCreateQuestionRoom()
  const reportAnswer = useReportAnswer()

  const [reply, setReply] = React.useState("")
  const [actionError, setActionError] = React.useState<string | null>(null)
  const [pendingAcceptId, setPendingAcceptId] = React.useState<number | null>(null)
  const [removedIds, setRemovedIds] = React.useState<Set<number>>(new Set())
  const [pendingReportId, setPendingReportId] = React.useState<number | null>(null)
  const [activeAnswer, setActiveAnswer] = React.useState<{
    id: number
    rect: DOMRect
    view: QuestionAnswerView
  } | null>(null)

  React.useEffect(() => {
    if (!actionError) return
    const timeoutId = window.setTimeout(() => setActionError(null), 2500)
    return () => window.clearTimeout(timeoutId)
  }, [actionError])

  const showError = (error: unknown) =>
    setActionError(getQuestionErrorMessage(error, messages))

  const question = detailQuery.data
  const isAuthor = question != null && me.data?.userId === question.authorUserId
  // 질문에 이미 채택된 답변이 있는지(question.isResolved 대신 답변 목록의 isAccepted를
  // 직접 근거로 삼는다). 이미 채택된 답변이 있으면 그 답변 외에는 채택 버튼을 숨긴다.
  const hasAcceptedAnswer = question != null && question.answers.some((a) => a.isAccepted)

  const handleSend = () => {
    const value = reply.trim()
    if (!value || postAnswer.isPending) return
    postAnswer.mutate(
      { content: value },
      {
        onSuccess: () => setReply(""),
        onError: showError,
      }
    )
  }

  const handleConfirmAccept = () => {
    if (pendingAcceptId == null) return
    acceptAnswer.mutate(pendingAcceptId, { onError: showError })
    setPendingAcceptId(null)
  }

  const handleStartChat = (targetUserId: number) => {
    if (!question) return
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
    setPendingReportId(null)
  }

  return (
    <>
      <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col">
        <AppBar
          title={messages.question.detailTitle}
          trailingIcon={null}
          onLeadingClick={() => router.back()}
        />

        {detailQuery.isError ? (
          <p className="w-full px-4 pt-10 text-center text-body-regular-14 text-gray-400">
            {getQuestionErrorMessage(detailQuery.error, messages) || messages.question.loadError}
          </p>
        ) : question ? (
          <div className="flex flex-1 flex-col gap-4 px-4 pb-24">
            <div className="flex w-full flex-col gap-3 pt-2">
              <div className="flex items-center gap-3">
                <div className="size-11 shrink-0 overflow-hidden rounded-full bg-gray-100">
                  {question.authorAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={question.authorAvatarUrl} alt="" className="size-full object-cover" />
                  ) : null}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-title-semibold-16 text-gray-900">{question.authorName}</span>
                  <span className="text-body-regular-14 text-gray-500">{question.address}</span>
                </div>
                {question.isResolved ? (
                  <span className="ml-auto rounded-full bg-primary-400 px-2.5 py-1 text-body-medium-14 text-white">
                    {messages.question.resolvedBadge}
                  </span>
                ) : null}
              </div>

              <div className="flex w-full flex-col gap-1">
                <h1 className="text-title-semibold-18 text-gray-900">{question.title}</h1>
                <p className="text-body-regular-14 whitespace-pre-line text-gray-700">
                  {question.content}
                </p>
              </div>

              {question.imageUrls.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {question.imageUrls.map((url) => (
                    <div key={url} className="relative h-40 w-full overflow-hidden rounded-2xl bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={messages.question.imageAlt} className="size-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex w-full flex-col">
              <span className="text-title-semibold-16 text-gray-900">
                {messages.question.answersTitle(question.answers.length)}
              </span>
              {isAuthor ? (
                <div className="flex w-full flex-col gap-3">
                  {question.answers.filter((a) => a.isAi).map((a) => (
                    <QuestionAiAnswerCard key={a.answerId} answer={a} />
                  ))}
                  {question.answers
                    .filter((a) => !a.isAi && !removedIds.has(a.answerId))
                    .map((a) => (
                      <QuestionAnswerAuthorItem
                        key={a.answerId}
                        answer={a}
                        isMine={a.authorUserId === me.data?.userId}
                        isReported={false}
                        canAccept={!question.isResolved && !hasAcceptedAnswer}
                        onAccept={() => setPendingAcceptId(a.answerId)}
                        onStartChat={() => handleStartChat(a.authorUserId)}
                        onLongPress={(rect) => setActiveAnswer({ id: a.answerId, rect, view: a })}
                      />
                    ))}
                  {question.answers.length === 0 ? (
                    <p className="w-full pt-6 text-center text-body-regular-14 text-gray-400">
                      {messages.question.emptyAnswers}
                    </p>
                  ) : null}
                </div>
              ) : question.answers.length === 0 ? (
                <p className="w-full pt-6 text-center text-body-regular-14 text-gray-400">
                  {messages.question.emptyAnswers}
                </p>
              ) : (
                question.answers.map((answer) => (
                  <QuestionAnswerItem
                    key={answer.answerId}
                    answer={answer}
                    canAccept={!question.isResolved && !hasAcceptedAnswer && !answer.isAccepted}
                    onAccept={() => setPendingAcceptId(answer.answerId)}
                  />
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {question && !isAuthor && !question.isResolved ? (
          <div className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-sm bg-white px-4 pt-2 pb-6">
            <div className="flex w-full items-center justify-between gap-2 rounded-full border border-gray-50 bg-gray-50/95 py-2 pr-2 pl-4">
              <input
                aria-label={messages.question.answerPlaceholder}
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.nativeEvent.isComposing) handleSend()
                }}
                placeholder={messages.question.answerPlaceholder}
                className="min-w-0 flex-1 bg-transparent text-body-regular-14 text-gray-900 outline-none placeholder:text-gray-400"
              />
              <button
                type="button"
                aria-label={messages.question.sendLabel}
                onClick={handleSend}
                disabled={postAnswer.isPending}
                className="size-8 shrink-0 disabled:opacity-50"
              >
                <Image src="/icons/chat/send-button.svg" alt="" width={32} height={32} className="size-8" />
              </button>
            </div>
          </div>
        ) : null}
      </main>

      {actionError && (
        <div className="fixed inset-x-0 bottom-24 z-50 mx-auto flex w-full max-w-sm justify-center px-4">
          <div className="rounded-xl bg-gray-900/90 px-4 py-2.5 text-body-regular-14 text-white">
            {actionError}
          </div>
        </div>
      )}

      {activeAnswer && (
        <LongPressActionOverlay
          anchorRect={activeAnswer.rect}
          onDismiss={() => setActiveAnswer(null)}
          actions={[
            {
              icon: <Flag className="size-5 text-red" />,
              label: messages.question.reportAction,
              tone: "destructive",
              onClick: () => setPendingReportId(activeAnswer.id),
            },
          ]}
        >
          <QuestionAnswerAuthorItem
            answer={activeAnswer.view}
            isMine={false}
            isReported={false}
            canAccept={false}
            onStartChat={() => {}}
            onAccept={() => {}}
            onLongPress={() => {}}
          />
        </LongPressActionOverlay>
      )}

      <ConfirmDialog
        open={pendingAcceptId != null}
        onOpenChange={(open) => !open && setPendingAcceptId(null)}
        title={messages.question.acceptConfirmTitle}
        description={messages.question.acceptConfirmDescription}
        cancelLabel={messages.question.acceptConfirmCancel}
        confirmLabel={messages.question.acceptButton}
        onConfirm={handleConfirmAccept}
      />

      <ConfirmDialog
        open={pendingReportId != null}
        onOpenChange={(open) => !open && setPendingReportId(null)}
        title={messages.question.reportConfirmTitle}
        description={messages.question.reportConfirmDescription}
        cancelLabel={messages.question.acceptConfirmCancel}
        confirmLabel={messages.question.reportAction}
        onConfirm={handleConfirmReport}
      />
    </>
  )
}

export { QuestionDetailScreen }
