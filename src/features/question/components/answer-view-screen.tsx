"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Flag, Globe } from "lucide-react"

import { Screen } from "@/components/layout/screen"
import { AppBar } from "@/components/ui/app-bar"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  ChatContextMenu,
  type ChatContextMenuItem,
} from "@/features/chat/components/chat-context-menu"
import { contextMenuHeight } from "@/features/chat/lib/context-menu-geometry"
import { AnswerCard } from "@/features/question/components/answer-card"
import { AnswerViewSkeleton } from "@/features/question/components/answer-view-skeleton"
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

// 하단 여유. 이만큼도 남지 않으면 메뉴를 카드 위로 띄운다 (높이는 contextMenuHeight 로 계산).
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
  // 이미 채택된 답변을 탭했을 때 뜨는 "개인채팅 하시겠습니까?" 확인 다이얼로그 대상.
  // 채택 직후 acceptedAuthor 다이얼로그와 설명·버튼은 같고 제목만 다르다.
  const [chatPromptAuthor, setChatPromptAuthor] = React.useState<{
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
  // 비로그인 사용자는 /questions/layout.tsx의 AuthGate(protected)가 먼저 /login으로 보내므로
  // 여기까지 오지 않는다. 그래도 게이트가 걷히는 경우를 대비해 me가 확정된 뒤에만 판정한다.
  React.useEffect(() => {
    if (!question || me.isLoading) return
    if (!isAuthor) router.replace(routes.home())
  }, [question, me.isLoading, isAuthor, router])

  const handleAccept = (answer: QuestionAnswerView) => {
    // 채택은 되돌릴 수 없다 — 연타로 두 번 요청이 나가지 않게 막는다(두 번째는 BE가 409).
    // 성공 직후 ~ 리페치가 끝나 hasAcceptedAnswer가 반영되기 전 사이에도 버튼이 다시
    // 눌릴 수 있어 isSuccess까지 함께 막는다.
    if (acceptAnswer.isPending || acceptAnswer.isSuccess) return
    acceptAnswer.mutate(answer.answerId, {
      onSuccess: () =>
        setAcceptedAuthor({ name: answer.authorName, userId: answer.authorUserId }),
      onError: (error) => setActionError(getQuestionErrorMessage(error, messages)),
    })
  }

  // 꼬리질문 채팅방 진입. BE는 getOrCreateQuestionRoom이라 같은 (질문, 상대) 조합이면
  // 매번 같은 방을 돌려준다 — 채택 완료 다이얼로그와 채택된 답변 카드 탭이 같이 쓴다.
  const startChatWith = (targetUserId: number | null) => {
    if (!question || targetUserId == null || createRoom.isPending) return
    createRoom.mutate(
      { questionId: question.questionId, targetUserId },
      {
        onSuccess: (room) => router.push(routes.chatRoom(room.roomId)),
        onError: () => setActionError(messages.question.chatStartFailed),
      }
    )
  }

  const handleStartChatFromDialog = () => {
    const targetUserId = acceptedAuthor?.userId ?? null
    setAcceptedAuthor(null)
    startChatWith(targetUserId)
  }

  const handleStartChatFromPrompt = () => {
    const targetUserId = chatPromptAuthor?.userId ?? null
    setChatPromptAuthor(null)
    startChatWith(targetUserId)
  }

  const handleConfirmReport = () => {
    if (pendingReportId == null || reportAnswer.isPending) return
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
      <Screen kind="scroll" as="main" className="bg-white">
        <AppBar
          center={
            <span className="min-w-0 flex-1 truncate text-center text-title-semibold-18 text-gray-900">
              {question?.title ?? ""}
            </span>
          }
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
                      // 성공 직후 아직 리페치가 끝나지 않아도 낙관적으로 버튼을 접어
                      // 두 번째 채택 요청(BE ANSWER_SELECTION_FINALIZED)을 막는다.
                      hasAcceptedAnswer: hasAcceptedAnswer || acceptAnswer.isSuccess,
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
                    // 채택된 답변 카드를 탭하면 개인채팅 진입 확인 다이얼로그를 먼저 띄운다 —
                    // 확인 후에야 꼬리질문 채팅방으로 들어간다.
                    onOpenChat={
                      answer.isAccepted && answer.authorUserId != null
                        ? () =>
                            setChatPromptAuthor({
                              name: answer.authorName,
                              userId: answer.authorUserId,
                            })
                        : undefined
                    }
                  />
                )
              )
            )}
          </div>
        ) : (
          <AnswerViewSkeleton />
        )}
      </Screen>

      {actionError && (
        <div className="fixed inset-x-0 bottom-[calc(6rem+max(var(--safe-area-bottom),var(--keyboard-inset,0px)))] z-50 app-column flex justify-center px-4">
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
        confirmDisabled={acceptedAuthor?.userId == null}
        onConfirm={handleStartChatFromDialog}
      />

      <ConfirmDialog
        open={chatPromptAuthor != null}
        onOpenChange={(open) => !open && setChatPromptAuthor(null)}
        title={messages.question.chatPromptDialogTitle(chatPromptAuthor?.name ?? "")}
        description={messages.question.acceptedDialogDescription(chatPromptAuthor?.name ?? "")}
        cancelLabel={messages.question.acceptedDialogClose}
        confirmLabel={messages.question.acceptedDialogStartChat}
        confirmDisabled={chatPromptAuthor?.userId == null}
        onConfirm={handleStartChatFromPrompt}
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
  /** 채택된 답변에만 주어진다 — 카드를 탭하면 꼬리질문 채팅방으로 들어간다. */
  onOpenChat?: () => void
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
  onOpenChat,
}: AnswerRowProps) {
  const { messages } = useTranslation()
  const rowRef = React.useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = React.useState<"top" | "bottom">("bottom")
  const translate = useTranslateToggle({ text: answer.content, isAuthenticated })

  const handleOpenMenu = () => {
    // 띄울 액션이 하나도 없으면 아무것도 열지 않는다 — 카드만 떠올라 닫을 수 없는 상태가 되는 걸 막는다.
    // (menuItems는 아래에서 선언되지만 이 핸들러는 렌더 후 이벤트 시점에만 호출된다.)
    if (menuItems.length === 0) return
    const rect = rowRef.current?.getBoundingClientRect()
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom
      setPlacement(spaceBelow < contextMenuHeight(menuItems.length) + BOTTOM_SAFE_AREA ? "top" : "bottom")
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

  // 항목이 없는 메뉴는 딤도 닫을 방법도 없이 카드만 떠 있게 된다(현재는 도달 불가 —
  // canReport/canTranslate 중 하나는 항상 있음) — active/렌더 조건을 하나로 묶어 이 불변식을
  // 명시한다.
  const hasMenu = menuOpen && menuItems.length > 0

  return (
    <div ref={rowRef} className="relative">
      <AnswerCard
        answer={{ ...answer, content: translate.displayText }}
        // 메뉴가 열려 카드가 떠 있는 동안엔 딤 위로 버튼이 튀어나오지 않도록 숨긴다 —
        // 메뉴를 닫으려는 탭이 채택(되돌릴 수 없음)으로 오인되면 안 된다.
        acceptState={menuOpen ? "hidden" : acceptState}
        active={hasMenu}
        onAccept={onAccept}
        onLongPress={handleOpenMenu}
        // 메뉴가 열려 있는 동안에는 카드 탭을 막는다 — 딤을 닫으려다 채팅방으로 들어가지 않도록.
        onOpenChat={menuOpen ? undefined : onOpenChat}
      />
      {translate.isError ? (
        <p className="mt-1 text-body-regular-12 text-red">
          {messages.translate.translateFailedLabel}
        </p>
      ) : null}
      {hasMenu && (
        <ChatContextMenu
          items={menuItems}
          dimmed
          onDismiss={onCloseMenu}
          className={placement === "top" ? "bottom-full left-0 mb-5" : "top-full left-0 mt-3"}
        />
      )}
    </div>
  )
}

export { AnswerViewScreen }
