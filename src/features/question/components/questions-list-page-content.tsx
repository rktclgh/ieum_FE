"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"

import { AppBar } from "@/components/ui/app-bar"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { TabBar } from "@/features/navigation/components/tab-bar"
import { ChatContextMenu, type ChatContextMenuItem } from "@/features/chat/components/chat-context-menu"
import { QuestionHistoryItem } from "@/features/question/components/question-history-item"
import { useDeleteQuestion } from "@/features/question/hooks/use-question-mutations"
import { useMyQuestions } from "@/features/question/hooks/use-question-queries"
import { adaptMyQuestionItem } from "@/features/question/lib/question-adapter"
import { useTranslation } from "@/lib/i18n/use-translation"

// 질문 내역 화면 — 목록 + 무한스크롤 + 롱프레스 삭제. 탭바가 있는 (main) 화면.
function QuestionsListPageContent() {
  const router = useRouter()
  const { messages } = useTranslation()
  const query = useMyQuestions()
  const deleteQuestion = useDeleteQuestion()

  const [menuFor, setMenuFor] = React.useState<number | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = React.useState<number | null>(null)

  const items = React.useMemo(
    () => (query.data?.pages.flatMap((page) => page.items) ?? []).map(adaptMyQuestionItem),
    [query.data]
  )

  // 무한스크롤 센티널 — 화면 하단에 노출되면 다음 페이지를 가져온다.
  const sentinelRef = React.useRef<HTMLDivElement | null>(null)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query
  React.useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasNextPage) return

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isFetchingNextPage) fetchNextPage()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const menuItems: ChatContextMenuItem[] = [
    {
      icon: <Trash2 className="size-5 text-red" />,
      label: messages.question.deleteAction,
      tone: "destructive",
      onClick: () => {
        setPendingDeleteId(menuFor)
        setMenuFor(null)
      },
    },
  ]

  return (
    <>
      <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col bg-gray-50">
        <AppBar title={messages.question.historyTitle} leadingIcon={null} trailingIcon={null} />

        <div className="flex flex-1 flex-col gap-3 px-4 pt-2 pb-24">
          {items.length === 0 && !query.isLoading ? (
            <p className="w-full pt-16 text-center text-body-regular-14 text-gray-400">
              {messages.question.historyEmpty}
            </p>
          ) : (
            items.map((item) => (
              <QuestionHistoryItem
                key={item.questionId}
                item={item}
                onOpen={() => router.push(`/questions/${item.questionId}`)}
                onLongPress={() => setMenuFor(item.questionId)}
              />
            ))
          )}
          <div ref={sentinelRef} className="h-4" />
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-sm">
        <TabBar />
      </div>

      {menuFor != null && (
        <div className="fixed inset-0 z-50">
          <ChatContextMenu
            dimmed
            items={menuItems}
            onDismiss={() => setMenuFor(null)}
            className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          />
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteId != null}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        title={messages.question.deleteConfirmTitle}
        description={messages.question.deleteConfirmDescription}
        cancelLabel={messages.question.deleteConfirmCancel}
        confirmLabel={messages.question.deleteConfirmConfirm}
        onConfirm={() => {
          if (pendingDeleteId != null) deleteQuestion.mutate(pendingDeleteId)
          setPendingDeleteId(null)
        }}
      />
    </>
  )
}

export { QuestionsListPageContent }
