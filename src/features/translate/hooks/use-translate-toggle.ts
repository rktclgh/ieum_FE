"use client"

import * as React from "react"
import { useMutation } from "@tanstack/react-query"

import { translateContent } from "@/features/translate/api/translate-api"
import { toDeepLTargetLang } from "@/features/translate/lib/translate-lang"
import { useTranslation } from "@/lib/i18n/use-translation"

interface UseTranslateToggleOptions {
  contentId: number
  // 원문 언어(BE가 저장해두면 자동감지 생략 → 더 정확·빠름). 없으면 DeepL이 자동감지.
  sourceLang?: string | null
}

interface UseTranslateToggleResult {
  isShowingTranslation: boolean
  translatedText: string | null
  isLoading: boolean
  isError: boolean
  toggle: () => void
}

// 번역 보기 ↔ 원문 보기 토글 + 조회를 함께 관리한다.
// 최초 토글에서만 POST /api/v1/translate를 호출하고, 이후 토글은 응답을 재사용한다
// (같은 화면 세션 안에서 언어를 바꾸지 않는 한 재조회하지 않음).
function useTranslateToggle({ contentId, sourceLang }: UseTranslateToggleOptions): UseTranslateToggleResult {
  const { language } = useTranslation()
  const [isShowingTranslation, setIsShowingTranslation] = React.useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      translateContent({
        contentId,
        targetLang: toDeepLTargetLang(language),
        sourceLang: sourceLang ?? undefined,
      }),
  })

  // 언어/대상 콘텐츠가 바뀌면 이전 번역 결과·노출 상태를 초기화한다.
  const reset = mutation.reset
  React.useEffect(() => {
    reset()
    setIsShowingTranslation(false)
  }, [language, contentId, reset])

  const toggle = () => {
    if (mutation.isPending) {
      return
    }
    if (isShowingTranslation) {
      setIsShowingTranslation(false)
      return
    }
    if (mutation.data) {
      setIsShowingTranslation(true)
      return
    }
    mutation.mutate(undefined, {
      onSuccess: () => setIsShowingTranslation(true),
    })
  }

  return {
    isShowingTranslation,
    translatedText: mutation.data?.translatedText ?? null,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    toggle,
  }
}

export { useTranslateToggle }
export type { UseTranslateToggleResult }
