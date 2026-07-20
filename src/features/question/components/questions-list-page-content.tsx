"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Pencil, Trash2 } from "lucide-react"

import { AppBar } from "@/components/ui/app-bar"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  ChatContextMenu,
  type ChatContextMenuItem,
} from "@/features/chat/components/chat-context-menu"
import { contextMenuHeight } from "@/features/chat/lib/context-menu-geometry"
import { CreateQuestionScreen } from "@/features/question/components/create-question-screen"
import { QuestionHistoryItem } from "@/features/question/components/question-history-item"
import { useDeleteQuestion } from "@/features/question/hooks/use-question-mutations"
import { useMyQuestions } from "@/features/question/hooks/use-question-queries"
import { useMe } from "@/features/session/hooks/use-me"
import { adaptMyQuestionItem, type MyQuestionListItemView } from "@/features/question/lib/question-adapter"
import { useTranslation } from "@/lib/i18n/use-translation"
import { routes } from "@/lib/navigation/routes"

// 컨텍스트 메뉴 대략 높이 + 하단 탭바 여유. 아래 공간이 부족하면 메뉴를 행 위로 띄운다.
const BOTTOM_SAFE_AREA = 96

interface QuestionRowProps {
  item: MyQuestionListItemView
  menuOpen: boolean
  menuItems: ChatContextMenuItem[]
  onOpenMenu: () => void
  onCloseMenu: () => void
  onNavigate: () => void
}

/** 채팅 목록(ChatRow)과 동일한 롱프레스 동작 — 행을 부상시키고 아래에 컨텍스트 메뉴를 앵커한다. */
function QuestionRow({
  item,
  menuOpen,
  menuItems,
  onOpenMenu,
  onCloseMenu,
  onNavigate,
}: QuestionRowProps) {
  const rowRef = React.useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = React.useState<"top" | "bottom">("bottom")

  const handleOpenMenu = () => {
    const rect = rowRef.current?.getBoundingClientRect()
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom
      setPlacement(spaceBelow < contextMenuHeight(menuItems.length) + BOTTOM_SAFE_AREA ? "top" : "bottom")
    }
    onOpenMenu()
  }

  return (
    <div ref={rowRef} className="relative">
      <QuestionHistoryItem
        item={item}
        active={menuOpen}
        onOpen={onNavigate}
        onLongPress={handleOpenMenu}
      />
      {menuOpen && (
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

// 질문 내역 화면 — 목록 + 무한스크롤 + 롱프레스 수정/삭제. 탭바가 있는 (main) 화면.
function QuestionsListPageContent() {
  const router = useRouter()
  const { messages } = useTranslation()
  const query = useMyQuestions()
  const deleteQuestion = useDeleteQuestion()
  // 목록은 my-questions(서버 my-scoped)라 항상 본인 질문이지만, 수정/삭제 진입은
  // 로그인 사용자로 방어한다(로그아웃 후 캐시 잔존 등 엣지 케이스 차단).
  const { data: me } = useMe()

  const [openMenuId, setOpenMenuId] = React.useState<number | null>(null)
  const [editId, setEditId] = React.useState<number | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = React.useState<number | null>(null)

  const items = React.useMemo(
    () => (query.data?.pages.flatMap((page) => page.items) ?? []).map(adaptMyQuestionItem),
    [query.data]
  )

  // resolved(확정) 질문은 삭제만 허용 — 수정 진입점을 숨긴다(BE 409 QUESTION_RESOLVED).
  const menuItemsFor = (item: MyQuestionListItemView): ChatContextMenuItem[] => [
    ...(item.isResolved
      ? []
      : [
          {
            icon: <Pencil className="size-6 text-gray-900" />,
            label: messages.question.editAction,
            onClick: () => {
              setOpenMenuId(null)
              setEditId(item.questionId)
            },
          },
        ]),
    {
      icon: <Trash2 className="size-6 text-red" />,
      label: messages.question.deleteAction,
      tone: "destructive" as const,
      onClick: () => {
        setOpenMenuId(null)
        setPendingDeleteId(item.questionId)
      },
    },
  ]

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

  return (
    <>
      <main className="app-column flex min-h-dvh flex-col bg-white">
        <AppBar title={messages.question.historyTitle} leadingIcon={null} trailingIcon={null} />

        {/* 탭바 총높이(pill 60 + pt 8 + SCREEN_BOTTOM_GAP 28 = 96px) 위로 여유를 둔다.
            여기는 스크롤 콘텐츠의 바닥 여백이라 safe-area를 그대로 더한다. */}
        <div className="flex flex-1 flex-col px-4 pt-2 pb-[calc(7rem+var(--safe-area-bottom))]">
          {/* 로드 실패를 "질문 없음"으로 오인하게 두지 않는다 — 알림 목록과 동일한 처리. */}
          {query.isError ? (
            <p className="w-full pt-16 text-center text-body-regular-14 text-gray-400">
              {messages.question.loadError}
            </p>
          ) : items.length === 0 && !query.isLoading ? (
            <p className="w-full pt-16 text-center text-body-regular-14 text-gray-400">
              {messages.question.historyEmpty}
            </p>
          ) : (
            items.map((item) => (
              <QuestionRow
                key={item.questionId}
                item={item}
                menuOpen={openMenuId === item.questionId}
                menuItems={menuItemsFor(item)}
                onOpenMenu={() => {
                  if (me) setOpenMenuId(item.questionId)
                }}
                onCloseMenu={() => setOpenMenuId(null)}
                onNavigate={() => router.push(routes.questionDetail(item.questionId))}
              />
            ))
          )}
          <div ref={sentinelRef} className="h-4" />
        </div>
      </main>

      <CreateQuestionScreen
        open={editId != null}
        mode="edit"
        questionId={editId ?? undefined}
        onClose={() => setEditId(null)}
      />

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
