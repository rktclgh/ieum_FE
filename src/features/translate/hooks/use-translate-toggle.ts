"use client"

import * as React from "react"
import { useMutation } from "@tanstack/react-query"

import { translateText } from "@/features/translate/api/translate-api"
import { useTranslation } from "@/lib/i18n/use-translation"
import type { LanguageCode } from "@/lib/i18n/languages"

interface UseTranslateToggleOptions {
  text: string
  isAuthenticated?: boolean
}

interface UseTranslateToggleResult {
  displayText: string
  originalText: string
  isShowingTranslation: boolean
  translatedText: string | null
  canTranslate: boolean
  isLoading: boolean
  isError: boolean
  toggle: () => void
  showOriginal: () => void
}

interface TranslateMutationVariables {
  text: string
  targetLang: LanguageCode
  key: string
}

// 표시 중인 텍스트만 임시로 번역문과 원문 사이에서 갈아끼운다.
function useTranslateToggle({
  text: originalText,
  isAuthenticated = true,
}: UseTranslateToggleOptions): UseTranslateToggleResult {
  const { language } = useTranslation()
  const translationKey = `${language}:${originalText}`
  const [visibleTranslationKey, setVisibleTranslationKey] = React.useState<string | null>(null)
  const isShowingTranslation = visibleTranslationKey === translationKey
  const canTranslate = isAuthenticated && originalText.trim().length > 0

  const mutation = useMutation({
    mutationFn: async ({ text, targetLang, key }: TranslateMutationVariables) => {
      const data = await translateText({ text, targetLang })
      return { ...data, key }
    },
  })

  const reset = mutation.reset
  React.useEffect(() => {
    reset()
  }, [language, originalText, reset])

  const showOriginal = () => {
    setVisibleTranslationKey(null)
  }

  const toggle = () => {
    if (!canTranslate || mutation.isPending) {
      return
    }
    if (isShowingTranslation) {
      showOriginal()
      return
    }
    if (mutation.data?.key === translationKey) {
      setVisibleTranslationKey(translationKey)
      return
    }
    mutation.mutate({ text: originalText, targetLang: language, key: translationKey }, {
      onSuccess: (data) => setVisibleTranslationKey(data.key),
    })
  }

  const translatedText = mutation.data?.key === translationKey ? mutation.data.translatedText : null

  return {
    displayText: isShowingTranslation && translatedText ? translatedText : originalText,
    originalText,
    isShowingTranslation,
    translatedText,
    canTranslate,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    toggle,
    showOriginal,
  }
}

export { useTranslateToggle }
export type { UseTranslateToggleResult }
