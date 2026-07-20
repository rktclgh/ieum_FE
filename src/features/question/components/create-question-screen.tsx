"use client"

import * as React from "react"

import { AppBar } from "@/components/ui/app-bar"
import { FullScreenOverlay } from "@/components/ui/full-screen-overlay"
import { Explanation } from "@/components/ui/text-field/explanation"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import { uploadImage } from "@/features/question/api/question-file-api"
import { SimilarQuestionsSection } from "@/features/question/components/similar-questions-section"
import { useCreateQuestion, useUpdateQuestion } from "@/features/question/hooks/use-question-mutations"
import { useQuestionDetail } from "@/features/question/hooks/use-question-queries"
import { useSimilarQuestions } from "@/features/question/hooks/use-similar-questions"
import { getQuestionErrorMessage } from "@/features/question/lib/question-error"
import type { QuestionDetailView } from "@/features/question/lib/question-adapter"
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

interface CreateQuestionScreenProps extends CreateQuestionScreenContentProps {
  open: boolean
}

/**
 * 새 질문 작성 풀스크린 오버레이. 지도 홈 FAB의 "질문하기"에서 열린다(모임 만들기와 동일한 흐름).
 * 제목·장소·내용을 채우면 제출이 활성화되고, 제출 시 POST /questions 로 생성한 뒤 지도로 돌아간다.
 * 장소는 MeetupLocationPicker(지도 기반)에서 좌표·주소·라벨까지 확보한다.
 *
 * mode="edit"이면 질문 내역 리스트 롱프레스 → 수정에서 열리며, 기존 제목/내용/장소/이미지를
 * prefill한 뒤 PATCH /questions/{id}로 제출한다(#92).
 *
 * 오버레이 껍데기(fixed·모션·언마운트 지연)는 FullScreenOverlay가 맡고, 상세 fetch를 포함한
 * 모든 상태는 Content가 들고 있어 닫히면 함께 언마운트된다.
 */
function CreateQuestionScreen({ open, ...props }: CreateQuestionScreenProps) {
  return (
    <FullScreenOverlay
      open={open}
      className="z-50 mx-auto flex w-full max-w-sm flex-col bg-white"
    >
      <CreateQuestionScreenContent {...props} />
    </FullScreenOverlay>
  )
}

interface CreateQuestionScreenContentProps {
  /** 닫기(X) 또는 제출 완료 시 호출 — 오버레이 언마운트는 부모가 담당 */
  onClose: () => void
  /** "edit"이면 기존 질문을 prefill해 수정 화면으로 동작한다. 기본값 "create". */
  mode?: "create" | "edit"
  /** mode="edit"일 때 필수 — 수정 대상 질문 id */
  questionId?: number
  /** 지도 홈 핀에서 넘어온 초기 장소 — create 모드에서 장소 칸을 프리필한다 */
  initialPlace?: MeetupPlaceValue | null
  /** 지도 홈이 이미 확보한 최신 GPS 좌표 — 장소 picker의 첫 지도 중심에 사용한다 */
  currentPosition?: Coordinates | null
}

/**
 * 컨테이너: edit 모드에서는 상세가 로드된 뒤에만 폼을 마운트해, 프리필용 렌더 중
 * setState 없이 초기값을 확정한다(edit-profile-content.tsx와 동일한 패턴).
 */
function CreateQuestionScreenContent({
  onClose,
  mode = "create",
  questionId,
  initialPlace = null,
  currentPosition = null,
}: CreateQuestionScreenContentProps) {
  const { messages } = useTranslation()
  const detail = useQuestionDetail(questionId ?? 0, mode === "edit")

  if (mode === "edit" && detail.isError) {
    // 상세 fetch 실패 시 null을 반환하면 AppBar도 없는 먹통 화면이 되므로,
    // answer-view-screen.tsx와 동일하게 닫기 가능한 에러 상태를 보여준다.
    return (
      <>
        <AppBar
          title={messages.question.editTitle}
          leadingIcon={null}
          trailingVariant="close"
          onTrailingClick={onClose}
          className="shrink-0"
        />
        <p className="w-full px-4 pt-10 text-center text-body-regular-14 text-gray-400">
          {getQuestionErrorMessage(detail.error, messages) || messages.question.loadError}
        </p>
      </>
    )
  }

  if (mode === "edit" && !detail.data) return null

  // 위 가드를 통과하면 mode="edit"일 때 detail.data가 반드시 채워져 있다.
  // TS는 이 사실을 dotted-name까지 narrowing하지 못하므로 `as` 대신 `?? null`로 안전하게 좁힌다.
  const editDetail = mode === "edit" ? (detail.data ?? null) : null

  return (
    <CreateQuestionForm
      onClose={onClose}
      mode={mode}
      questionId={questionId}
      initial={editDetail}
      initialPlace={initialPlace}
      currentPosition={currentPosition}
    />
  )
}

interface CreateQuestionFormProps {
  onClose: () => void
  mode: "create" | "edit"
  questionId?: number
  initial: QuestionDetailView | null
  initialPlace: MeetupPlaceValue | null
  currentPosition: Coordinates | null
}

function CreateQuestionForm({
  onClose,
  mode,
  questionId,
  initial,
  initialPlace,
  currentPosition,
}: CreateQuestionFormProps) {
  const { messages } = useTranslation()
  const t = messages.question
  const createQuestion = useCreateQuestion()
  const updateQuestion = useUpdateQuestion(questionId ?? 0)

  const [title, setTitle] = React.useState(initial?.title ?? "")
  const [content, setContent] = React.useState(initial?.content ?? "")
  const [place, setPlace] = React.useState<MeetupPlaceValue | null>(
    initial
      ? {
          lat: initial.location.lat,
          lng: initial.location.lng,
          address: initial.location.address,
          label: initial.location.label ?? initial.location.address,
        }
      : (initialPlace ?? null)
  )
  const [image, setImage] = React.useState<{ preview: string; file: File } | null>(null)
  const [existingImageUrl, setExistingImageUrl] = React.useState<string | null>(
    initial?.imageUrls[0] ?? null
  )
  // edit 모드에서 prefill된 이미지를 제거하고 새 이미지를 고르지 않은 채 저장하면,
  // 서버에 imageFileIds를 아예 보내지 않아 기존 이미지가 그대로 남는다 → 명시적 clear 플래그로 [] 전송.
  const [imageCleared, setImageCleared] = React.useState(false)
  const [locationPickerOpen, setLocationPickerOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const cameraInputRef = React.useRef<HTMLInputElement>(null)
  const albumInputRef = React.useRef<HTMLInputElement>(null)

  // 비슷한 질문 제안: 백엔드 API 생기기 전까지 stub(빈 목록) → 섹션은 자동으로 숨겨진다.
  const { items: similarQuestions } = useSimilarQuestions(title)

  const submitting = createQuestion.isPending || updateQuestion.isPending

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

    // 이미지 업로드 실패와 질문 생성/수정 실패를 구분해, 원인에 맞는 메시지를 노출한다.
    let imageFileIds: string[] | undefined
    if (image) {
      try {
        imageFileIds = [await uploadImage(image.file)]
      } catch {
        setError(t.imageUploadFailed)
        return
      }
    } else if (mode === "edit" && imageCleared) {
      // 새 이미지 없이 기존 이미지만 제거한 경우: 빈 배열을 명시적으로 보내 서버 쪽 이미지도 지운다.
      imageFileIds = []
    }

    if (mode === "edit" && questionId != null) {
      try {
        // 계약(PATCH /questions/{id})에 위치 필드가 없어 수정 시에는 title/content/imageFileIds만 보낸다.
        await updateQuestion.mutateAsync({
          title: title.trim(),
          content: content.trim(),
          imageFileIds,
        })
        onClose()
      } catch (err) {
        setError(getQuestionErrorMessage(err, messages))
      }
      return
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
    <>
      <AppBar
        title={mode === "edit" ? t.editTitle : t.createTitle}
        leadingIcon={null}
        trailingVariant="close"
        onTrailingClick={onClose}
        className="shrink-0"
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-3 pb-4">
        {/* 제목 */}
        <div className="flex h-[3.375rem] w-full shrink-0 items-center rounded-xl border border-gray-100 p-4 transition-colors focus-within:border-primary">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value.slice(0, TITLE_MAX_LENGTH))}
            maxLength={TITLE_MAX_LENGTH}
            placeholder={t.titlePlaceholder}
            className="w-full min-w-0 bg-transparent text-body-regular-16 text-gray-900 caret-primary outline-none placeholder:text-body-regular-16 placeholder:text-gray-400"
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
        <div className="relative h-[18.75rem] shrink-0 rounded-lg border border-gray-100 transition-colors focus-within:border-primary">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value.slice(0, CONTENT_MAX_LENGTH))}
            maxLength={CONTENT_MAX_LENGTH}
            placeholder={t.contentPlaceholder}
            className="size-full resize-none bg-transparent px-[15px] pt-[11px] pb-24 text-body-regular-14 text-gray-900 caret-primary outline-none placeholder:text-gray-400"
          />
          <MeetupImagePicker
            image={image?.preview ?? existingImageUrl}
            onTakePhoto={() => cameraInputRef.current?.click()}
            onChooseAlbum={() => albumInputRef.current?.click()}
            onRemove={() => {
              if (existingImageUrl && !image) setImageCleared(true)
              setImage(null)
              setExistingImageUrl(null)
            }}
            className="absolute bottom-[15px] left-[15px]"
          />
        </div>

        {/* 비슷한 질문 (채택 답변 있는 질문만 · 데이터는 백엔드 API 연동 후) */}
        <SimilarQuestionsSection items={similarQuestions} className="shrink-0" />
      </div>

      {/* 제출 */}
      <div className="shrink-0 px-4 pt-2 pb-[calc(0.75rem+var(--safe-area-bottom))]">
        {error ? <Explanation variant="error" text={error} className="px-1 pb-1" /> : null}
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className={cn(
            "h-12 w-full rounded-full text-body-medium-14 text-white transition-colors",
            canSubmit ? "bg-primary" : "bg-gray-200"
          )}
        >
          {submitting ? t.submittingButton : mode === "edit" ? t.updateButton : t.submitButton}
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

      <MeetupLocationPicker
        open={locationPickerOpen}
        value={place?.label ?? null}
        currentPosition={currentPosition}
        onConfirm={setPlace}
        onClose={() => setLocationPickerOpen(false)}
      />
    </>
  )
}

export { CreateQuestionScreen }
