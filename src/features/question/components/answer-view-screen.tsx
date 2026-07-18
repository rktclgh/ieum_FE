"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Flag, Globe } from "lucide-react"

import { AppBar } from "@/components/ui/app-bar"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  ChatContextMenu,
  type ChatContextMenuItem,
} from "@/features/chat/components/chat-context-menu"
import { AnswerCard } from "@/features/question/components/answer-card"
import { QuestionAiAnswerCard } from "@/features/question/components/question-ai-answer-card"
import {
  useAcceptAnswer,
  useCreateQuestionRoom,
  useReportAnswer,
} from "@/features/question/hooks/use-question-mutations"
import { useQuestionDetail } from "@/features/question/hooks/use-question-queries"
import {
  resolveAcceptButtonState,
  type AcceptButtonState,
} from "@/features/question/lib/answer-acceptance"
import { getQuestionErrorMessage } from "@/features/question/lib/question-error"
import type { QuestionAnswerView } from "@/features/question/lib/question-adapter"
import { useMe } from "@/features/session/hooks/use-me"
import { useTranslateToggle } from "@/features/translate/hooks/use-translate-toggle"
import { useTranslation } from "@/lib/i18n/use-translation"
import { routes } from "@/lib/navigation/routes"

// 컨텍스트 메뉴 대략 높이 + 하단 여유. 아래 공간이 부족하면 메뉴를 카드 위로 띄운다.
const CONTEXT_MENU_HEIGHT_ESTIMATE = 140
const BOTTOM_SAFE_AREA = 96

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
  const [openMenuAnswerId, setOpenMenuAnswerId] = React.useState<number | null>(null)

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
    // 채택은 되돌릴 수 없다 — 연타로 두 번 요청이 나가지 않게 막는다(두 번째는 BE가 409).
    if (acceptAnswer.isPending) return
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
                  <AnswerRow
                    key={answer.answerId}
                    answer={answer}
                    acceptState={resolveAcceptButtonState({
                      answer,
                      isAuthor,
                      isAuthenticated,
                      hasAcceptedAnswer,
                      viewerUserId,
                    })}
                    isAuthenticated={isAuthenticated}
                    canReport={answer.authorUserId !== viewerUserId}
                    menuOpen={openMenuAnswerId === answer.answerId}
                    onAccept={() => handleAccept(answer)}
                    onOpenMenu={() => setOpenMenuAnswerId(answer.answerId)}
                    onCloseMenu={() => setOpenMenuAnswerId(null)}
                    onReport={() => {
                      setOpenMenuAnswerId(null)
                      setPendingReportId(answer.answerId)
                    }}
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

interface AnswerRowProps {
  answer: QuestionAnswerView
  acceptState: AcceptButtonState
  isAuthenticated: boolean
  canReport: boolean
  menuOpen: boolean
  onAccept: () => void
  onOpenMenu: () => void
  onCloseMenu: () => void
  onReport: () => void
}

/**
 * 답변 한 건 (Figma 1744-10029) + 롱프레스 컨텍스트 메뉴 (Figma 1951-27518) — 번역 / 신고.
 * 채팅 목록·말풍선과 동일하게 카드를 제자리에서 부상시키고 메뉴를 카드에 앵커한다.
 * 번역 훅은 반복 호출이 불가능해 답변마다 이 컴포넌트가 하나씩 맡는다.
 */
function AnswerRow({
  answer,
  acceptState,
  isAuthenticated,
  canReport,
  menuOpen,
  onAccept,
  onOpenMenu,
  onCloseMenu,
  onReport,
}: AnswerRowProps) {
  const { messages } = useTranslation()
  const rowRef = React.useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = React.useState<"top" | "bottom">("bottom")
  const translate = useTranslateToggle({ text: answer.content, isAuthenticated })

  const handleOpenMenu = () => {
    const rect = rowRef.current?.getBoundingClientRect()
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom
      setPlacement(spaceBelow < CONTEXT_MENU_HEIGHT_ESTIMATE + BOTTOM_SAFE_AREA ? "top" : "bottom")
    }
    onOpenMenu()
  }

  const menuItems: ChatContextMenuItem[] = [
    ...(translate.canTranslate
      ? [
          {
            icon: <Globe className="size-6 text-gray-900" />,
            label: translate.isLoading
              ? messages.translate.translatingLabel
              : translate.isShowingTranslation
                ? messages.translate.viewOriginalLabel
                : messages.translate.menuLabel,
            disabled: translate.isLoading,
            onClick: () => {
              translate.toggle()
              onCloseMenu()
            },
          },
        ]
      : []),
    ...(canReport
      ? [
          {
            icon: <Flag className="size-6 text-red" />,
            label: messages.question.reportAction,
            tone: "destructive" as const,
            onClick: onReport,
          },
        ]
      : []),
  ]

  return (
    <div ref={rowRef} className="relative">
      <AnswerCard
        answer={{ ...answer, content: translate.displayText }}
        acceptState={acceptState}
        active={menuOpen}
        onAccept={onAccept}
        onLongPress={handleOpenMenu}
      />
      {translate.isError ? (
        <p className="mt-1 text-body-regular-12 text-red">
          {messages.translate.translateFailedLabel}
        </p>
      ) : null}
      {menuOpen && menuItems.length > 0 && (
        <ChatContextMenu
          items={menuItems}
          dimmed
          onDismiss={onCloseMenu}
          className={placement === "top" ? "bottom-full left-0 mb-3" : "top-full left-0 mt-2"}
        />
      )}
    </div>
  )
}

export { AnswerViewScreen }
