"use client"

import * as React from "react"

import { AppBar } from "@/components/ui/app-bar"
import { Explanation } from "@/components/ui/text-field/explanation"
import { uploadImage } from "@/features/question/api/question-file-api"
import { SimilarQuestionsSection } from "@/features/question/components/similar-questions-section"
import { useCreateQuestion } from "@/features/question/hooks/use-question-mutations"
import { useSimilarQuestions } from "@/features/question/hooks/use-similar-questions"
import { getQuestionErrorMessage } from "@/features/question/lib/question-error"
// 입력 UI는 "모임 생성과 동일"하게 맞추기 위해 meetup 도메인의 장소·사진 위젯을 공유한다.
// (장소 선택기는 사실상 map 기반 공용 위젯이라 재구현 대신 재사용한다.)
import type { MeetupPlaceValue } from "@/features/meetup/constants/create-meetup"
import { MeetupImagePicker } from "@/features/meetup/components/meetup-image-picker"
import { MeetupLocationPicker } from "@/features/meetup/components/meetup-location-picker"
import { MeetupSelectField } from "@/features/meetup/components/meetup-select-field"
import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

const TITLE_MAX_LENGTH = 200
const CONTENT_MAX_LENGTH = 5000
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

interface CreateQuestionScreenProps {
  /** 닫기(X) 또는 제출 완료 시 호출 — 오버레이 언마운트는 부모가 담당 */
  onClose: () => void
}

/**
 * 새 질문 작성 풀스크린 오버레이. 지도 홈 FAB의 "질문하기"에서 열린다(모임 만들기와 동일한 흐름).
 * 제목·장소·내용을 채우면 제출이 활성화되고, 제출 시 POST /questions 로 생성한 뒤 지도로 돌아간다.
 * 장소는 MeetupLocationPicker(지도 기반)에서 좌표·주소·라벨까지 확보한다.
 */
function CreateQuestionScreen({ onClose }: CreateQuestionScreenProps) {
  const { messages } = useTranslation()
  const t = messages.question
  const createQuestion = useCreateQuestion()

  const [title, setTitle] = React.useState("")
  const [content, setContent] = React.useState("")
  const [place, setPlace] = React.useState<MeetupPlaceValue | null>(null)
  const [image, setImage] = React.useState<{ preview: string; file: File } | null>(null)
  const [locationPickerOpen, setLocationPickerOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const cameraInputRef = React.useRef<HTMLInputElement>(null)
  const albumInputRef = React.useRef<HTMLInputElement>(null)

  // 비슷한 질문 제안: 백엔드 API 생기기 전까지 stub(빈 목록) → 섹션은 자동으로 숨겨진다.
  const { items: similarQuestions } = useSimilarQuestions(title)

  const submitting = createQuestion.isPending

  const canSubmit =
    Boolean(place) && title.trim().length > 0 && content.trim().length > 0 && !submitting

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = "" // 같은 파일 재선택 허용
    if (!file) return
    if (file.size > MAX_IMAGE_SIZE) {
      setError(t.imageTooLarge)
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = () => setImage({ preview: reader.result as string, file })
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!canSubmit || !place) return
    setError(null)

    // 이미지 업로드 실패와 질문 생성 실패를 구분해, 원인에 맞는 메시지를 노출한다.
    let imageFileIds: string[] | undefined
    if (image) {
      try {
        imageFileIds = [await uploadImage(image.file)]
      } catch {
        setError(t.imageUploadFailed)
        return
      }
    }

    try {
      await createQuestion.mutateAsync({
        title: title.trim(),
        content: content.trim(),
        location: {
          lat: place.lat,
          lng: place.lng,
          address: place.address,
          label: place.label,
        },
        imageFileIds,
      })
      onClose()
    } catch (err) {
      setError(getQuestionErrorMessage(err, messages))
    }
  }

  return (
    <div className="fixed inset-0 z-50 mx-auto flex w-full max-w-sm flex-col bg-white">
      <AppBar
        title={t.createTitle}
        leadingIcon={null}
        trailingVariant="close"
        onTrailingClick={onClose}
        className="shrink-0"
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-3 pb-4">
        {/* 제목 */}
        <div className="flex h-[3.375rem] w-full shrink-0 items-center rounded-xl border border-gray-100 p-4 transition-colors focus-within:border-primary-600">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value.slice(0, TITLE_MAX_LENGTH))}
            maxLength={TITLE_MAX_LENGTH}
            placeholder={t.titlePlaceholder}
            className="w-full min-w-0 bg-transparent text-body-regular-16 text-gray-900 caret-primary-600 outline-none placeholder:text-body-regular-16 placeholder:text-gray-400"
          />
        </div>

        {/* 장소 */}
        <MeetupSelectField
          iconSrc="/icons/write/location-200.svg"
          selectedIconSrc="/icons/write/location-700.svg"
          placeholder={t.locationPlaceholder}
          value={place?.label ?? null}
          active={locationPickerOpen}
          onClick={() => setLocationPickerOpen(true)}
          className="shrink-0"
        />

        {/* 내용 + 사진 첨부 */}
        <div className="relative h-[18.75rem] shrink-0 rounded-lg border border-gray-100 transition-colors focus-within:border-primary-600">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value.slice(0, CONTENT_MAX_LENGTH))}
            maxLength={CONTENT_MAX_LENGTH}
            placeholder={t.contentPlaceholder}
            className="size-full resize-none bg-transparent px-[15px] pt-[11px] pb-24 text-body-regular-14 text-gray-900 caret-primary-600 outline-none placeholder:text-gray-400"
          />
          <MeetupImagePicker
            image={image?.preview ?? null}
            onTakePhoto={() => cameraInputRef.current?.click()}
            onChooseAlbum={() => albumInputRef.current?.click()}
            onRemove={() => setImage(null)}
            className="absolute bottom-[15px] left-[15px]"
          />
        </div>

        {/* 비슷한 질문 (채택 답변 있는 질문만 · 데이터는 백엔드 API 연동 후) */}
        <SimilarQuestionsSection items={similarQuestions} className="shrink-0" />
      </div>

      {/* 제출 */}
      <div className="shrink-0 px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
        {error ? <Explanation variant="error" text={error} className="px-1 pb-1" /> : null}
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className={cn(
            "h-12 w-full rounded-full text-body-medium-14 text-white transition-colors",
            canSubmit ? "bg-primary-600" : "bg-gray-200"
          )}
        >
          {submitting ? t.submittingButton : t.submitButton}
        </button>
      </div>

      {/* 숨긴 파일 입력 (사진 찍기 / 앨범에서 고르기) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={albumInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {locationPickerOpen ? (
        <MeetupLocationPicker
          value={place?.label ?? null}
          onConfirm={setPlace}
          onClose={() => setLocationPickerOpen(false)}
        />
      ) : null}
    </div>
  )
}

export { CreateQuestionScreen }
