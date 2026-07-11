"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { AppBar } from "@/components/ui/app-bar"
import { Button } from "@/components/ui/button"
import {
  useCreateQuestion,
  useUploadQuestionImages,
} from "@/features/question/hooks/use-question-mutations"
import type { LocationSnapshot } from "@/features/question/api/question-types"
import { getQuestionErrorMessage } from "@/features/question/lib/question-error"
import { useTranslation } from "@/lib/i18n/use-translation"

const MAX_IMAGES = 10

// 위치는 지도(#31)에서 선택해 쿼리스트링(lat/lng/address)으로 전달받는다.
// address 는 백엔드 필수값이라, 없으면 제출을 막고 안내 문구를 띄운다.
function readLocation(params: URLSearchParams): LocationSnapshot | null {
  const lat = Number(params.get("lat"))
  const lng = Number(params.get("lng"))
  const address = params.get("address")?.trim()
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !address) return null
  const detailAddress = params.get("detailAddress")?.trim() || undefined
  const label = params.get("label")?.trim() || undefined
  return { lat, lng, address, detailAddress, label }
}

function QuestionCreateForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { messages } = useTranslation()

  const location = React.useMemo(
    () => readLocation(new URLSearchParams(searchParams.toString())),
    [searchParams]
  )

  const [title, setTitle] = React.useState("")
  const [content, setContent] = React.useState("")
  const [files, setFiles] = React.useState<File[]>([])
  const [actionError, setActionError] = React.useState<string | null>(null)

  const createQuestion = useCreateQuestion()
  const uploadImages = useUploadQuestionImages()
  const isSubmitting = createQuestion.isPending || uploadImages.isPending

  React.useEffect(() => {
    if (!actionError) return
    const timeoutId = window.setTimeout(() => setActionError(null), 2500)
    return () => window.clearTimeout(timeoutId)
  }, [actionError])

  const canSubmit =
    Boolean(location) && title.trim().length > 0 && content.trim().length > 0 && !isSubmitting

  const handlePickFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? [])
    if (picked.length === 0) return
    setFiles((prev) => [...prev, ...picked].slice(0, MAX_IMAGES))
    event.target.value = ""
  }

  const handleSubmit = async () => {
    if (!location || !canSubmit) return
    try {
      const imageFileIds = files.length > 0 ? await uploadImages.mutateAsync(files) : undefined
      const created = await createQuestion.mutateAsync({
        title: title.trim(),
        content: content.trim(),
        location,
        imageFileIds,
      })
      router.replace(`/questions/${created.questionId}`)
    } catch (error) {
      setActionError(getQuestionErrorMessage(error, messages))
    }
  }

  return (
    <>
      <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col">
        <AppBar
          title={messages.question.createTitle}
          trailingIcon={null}
          onLeadingClick={() => router.back()}
        />

        <div className="flex flex-1 flex-col gap-4 px-4 pb-28 pt-2">
          <input
            aria-label={messages.question.titlePlaceholder}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            placeholder={messages.question.titlePlaceholder}
            className="w-full border-b border-gray-100 pb-2 text-title-semibold-18 text-gray-900 outline-none placeholder:text-gray-400"
          />

          <textarea
            aria-label={messages.question.contentPlaceholder}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={5000}
            placeholder={messages.question.contentPlaceholder}
            className="min-h-40 w-full resize-none text-body-regular-14 text-gray-900 outline-none placeholder:text-gray-400"
          />

          <div className="flex flex-col gap-1">
            <span className="text-body-medium-14 text-gray-700">{messages.question.locationLabel}</span>
            {location ? (
              <span className="text-body-regular-14 text-gray-600">{location.address}</span>
            ) : (
              <span className="text-body-regular-14 text-gray-400">
                {messages.question.locationMissing}
              </span>
            )}
          </div>

          <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-gray-100 px-3 py-2 text-body-medium-14 text-gray-700">
            {messages.question.addImageLabel}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePickFiles}
              className="hidden"
            />
          </label>

          {files.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="relative size-20 overflow-hidden rounded-xl bg-gray-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(file)}
                    alt={messages.question.imageAlt}
                    className="size-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-sm bg-white px-4 pt-2 pb-6">
          <Button variant="primary" size="block" disabled={!canSubmit} onClick={handleSubmit}>
            {messages.question.submitButton}
          </Button>
        </div>
      </main>

      {actionError && (
        <div className="fixed inset-x-0 bottom-24 z-50 mx-auto flex w-full max-w-sm justify-center px-4">
          <div className="rounded-xl bg-gray-900/90 px-4 py-2.5 text-body-regular-14 text-white">
            {actionError}
          </div>
        </div>
      )}
    </>
  )
}

export { QuestionCreateForm }
