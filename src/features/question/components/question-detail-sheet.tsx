"use client"

import * as React from "react"

import { BottomSheet } from "@/components/ui/bottom-sheet"
import {
  QuestionDetailCard,
  type QuestionBottomVariant,
} from "@/features/question/components/question-detail-card"
import type { QuestionSummary } from "@/features/question/types"

interface QuestionDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  question: QuestionSummary | null
  bottomVariant?: QuestionBottomVariant
  /** 답변 전송. 사진을 첨부하면 imageFile 로 함께 넘어간다. */
  onSend?: (value: string, imageFile?: File | null) => void
  /** "답변 보기" 버튼 클릭(내가 쓴 질문일 때만 노출). */
  onViewAnswers?: () => void
  /** 첨부 이미지가 최대 크기를 초과했을 때(안내는 부모 토스트에서 처리). */
  onImageTooLarge?: () => void
}

/** 질문 상세 단일 바텀시트. 본문은 QuestionDetailCard(겹친 핀 캐러셀과 공유)가 그린다. */
function QuestionDetailSheet({
  open,
  onOpenChange,
  question,
  ...cardProps
}: QuestionDetailSheetProps) {
  // 닫힘 애니메이션 중 부모가 question을 null로 먼저 비워도 마지막 내용을 유지해 렌더링한다.
  // 렌더 중 상태 조정(React 권장 패턴) — question이 바뀌면 즉시 반영해 effect 없이 동기화한다.
  const [lastQuestion, setLastQuestion] = React.useState(question)
  if (question && question !== lastQuestion) setLastQuestion(question)
  const display = question ?? lastQuestion

  if (!display) return null

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <QuestionDetailCard question={display} {...cardProps} />
    </BottomSheet>
  )
}

export { QuestionDetailSheet }
