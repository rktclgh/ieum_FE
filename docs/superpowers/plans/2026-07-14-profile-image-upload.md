# 프로필 이미지 업로드/크롭 + 공용 업로드 코어 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이미지 촬영·앨범선택 → 1:1 원형 크롭 → presigned S3 업로드를 구현하고, 회원가입·마이수정의 프로필 사진과 모임·질문 첨부에서 재사용한다.

**Architecture:** presign→S3 PUT→complete 3단계를 `src/lib/files/upload-image.ts` 공용 코어로 추출하고, 모임/질문 file-api를 이 코어에 위임한다. 원형 크롭 UI·프로필 API·업로드 훅은 `src/features/profile-image/` 독립 피처로 만들어 join(가입)·my(수정) 양쪽에서 소비한다. 가입은 세션이 없어 크롭 blob을 메모리에 보관했다가 가입 성공 후 자동 로그인으로 세션을 확보한 뒤 업로드한다.

**Tech Stack:** Next.js(App Router) · React · TypeScript · TanStack Query · axios(apiClient) · react-easy-crop · base-ui drawer(bottom-sheet)

## Global Constraints

- 파일/폴더명: 전부 lowercase kebab-case
- 하드코딩 한국어 금지: 모든 UI 문자열은 `src/lib/i18n/messages/*.ts` 7개 로케일(ko·en·ja·zh·vi·th·ru) 전부에 추가 (`Messages` 타입은 `ko.ts` 상단에 정의 → 누락 시 타입에러)
- 패키지 매니저: **pnpm** 만 사용 (`pnpm add`, `pnpm build`, `pnpm lint`) — npm 금지
- 테스트 러너 없음: 각 태스크 검증 게이트는 `pnpm lint` + `pnpm build` clean, UI는 추가로 런타임 수동확인
- 커밋 메시지에 Co-Authored-By 트레일러 금지
- S3 presigned PUT은 쿠키/CSRF 미포함(`apiClient` 아님), `Content-Type` 이 presign 서명과 일치해야 함
- `src/components/ui` 는 stateless 전용 — 상태를 가진 프로필 컴포넌트는 `src/features/profile-image` 에 둔다
- 완료 후 develop 로 PR (로컬 머지·직접 push 금지)

---

### Task 1: 공용 업로드 코어 + 모임/질문 리팩터

**Files:**
- Create: `src/lib/files/upload-image.ts`
- Modify: `src/features/meetup/api/meetup-file-api.ts` (전체 대체)
- Modify: `src/features/question/api/question-file-api.ts` (전체 대체)

**Interfaces:**
- Produces:
  - `type UploadPurpose = "profile" | "meeting" | "question"`
  - `uploadImage(blob: Blob, purpose: UploadPurpose): Promise<number>` — 완료된 `fileId` 반환
  - meetup: `uploadMeetingImage(file: File): Promise<number>` (기존 시그니처 유지)
  - question: `uploadImage(file: File): Promise<number>` (기존 시그니처 유지)

- [ ] **Step 1: 공용 코어 작성**

Create `src/lib/files/upload-image.ts`:

```typescript
import axios from "axios"

import { apiClient } from "@/lib/api/client"

// 이미지 업로드 3단계(presign → S3 직접 PUT → complete). 계약: ieum_BE/docs/api-endpoints.md §10.
export type UploadPurpose = "profile" | "meeting" | "question"

interface PresignResponse {
  fileId: number
  uploadUrl: string
}

// S3 presigned PUT은 same-origin이 아니므로 쿠키/CSRF를 실으면 안 된다.
// apiClient(withCredentials + X-CSRF-Token) 대신 순수 axios로 업로드한다.
const s3Client = axios.create({ withCredentials: false })

// blob.type이 빈 문자열이면 presign 서명과 Content-Type이 불일치(SignatureDoesNotMatch)할 수 있어 폴백을 둔다.
function resolveContentType(blob: Blob): string {
  return blob.type || "image/jpeg"
}

async function presign(blob: Blob, purpose: UploadPurpose): Promise<PresignResponse> {
  const { data } = await apiClient.post<PresignResponse>("/api/v1/files/presign", {
    purpose,
    contentType: resolveContentType(blob),
    sizeBytes: blob.size,
  })
  return data
}

async function putToS3(uploadUrl: string, blob: Blob): Promise<void> {
  await s3Client.put(uploadUrl, blob, {
    headers: { "Content-Type": resolveContentType(blob) },
  })
}

async function completeFile(fileId: number): Promise<void> {
  await apiClient.post(`/api/v1/files/${fileId}/complete`)
}

// 이미지 1건을 업로드하고 완료 처리된 fileId를 반환한다.
export async function uploadImage(blob: Blob, purpose: UploadPurpose): Promise<number> {
  const { fileId, uploadUrl } = await presign(blob, purpose)
  await putToS3(uploadUrl, blob)
  await completeFile(fileId)
  return fileId
}
```

- [ ] **Step 2: 모임 file-api를 코어에 위임**

Replace `src/features/meetup/api/meetup-file-api.ts` entirely:

```typescript
import { uploadImage } from "@/lib/files/upload-image"

// 모임 대표 이미지 업로드 → imageFileId(number) 반환. 공용 코어에 위임한다(#30).
async function uploadMeetingImage(file: File): Promise<number> {
  return uploadImage(file, "meeting")
}

export { uploadMeetingImage }
```

- [ ] **Step 3: 질문 file-api를 코어에 위임**

Replace `src/features/question/api/question-file-api.ts` entirely:

```typescript
import { uploadImage as uploadImageCore } from "@/lib/files/upload-image"

// 질문/답변 첨부 이미지 업로드 → fileId(number) 반환. 공용 코어에 위임한다(#30).
async function uploadImage(file: File): Promise<number> {
  return uploadImageCore(file, "question")
}

export { uploadImage }
```

- [ ] **Step 4: 검증**

Run: `pnpm lint && pnpm build`
Expected: 통과 (모임/질문 화면의 import 시그니처 불변)

- [ ] **Step 5: Commit**

```bash
git add src/lib/files/upload-image.ts src/features/meetup/api/meetup-file-api.ts src/features/question/api/question-file-api.ts
git commit -m "refactor: #30 이미지 업로드 presign→S3→complete 공용 코어 추출 및 모임/질문 위임"
```

---

### Task 2: i18n `profileImage` 네임스페이스

**Files:**
- Modify: `src/lib/i18n/messages/ko.ts` (`Messages` 타입 블록 + `ko` 값 블록)
- Modify: `src/lib/i18n/messages/en.ts`, `ja.ts`, `zh.ts`, `vi.ts`, `th.ts`, `ru.ts` (값 블록)

**Interfaces:**
- Produces: `messages.profileImage.{ takePhoto, chooseAlbum, editLabel, deleteLabel, uploadFailed, invalidType, tooLarge, cropTitle, cropConfirm, cropCancel }`

- [ ] **Step 1: `ko.ts` `Messages` 타입에 네임스페이스 추가**

`src/lib/i18n/messages/ko.ts` 상단 `Messages` 타입 정의 블록(다른 `join:`/`my:` 타입이 있는 곳)에 추가:

```typescript
  profileImage: {
    takePhoto: string
    chooseAlbum: string
    editLabel: string
    deleteLabel: string
    uploadFailed: string
    invalidType: string
    tooLarge: string
    cropTitle: string
    cropConfirm: string
    cropCancel: string
  }
```

- [ ] **Step 2: 각 로케일 값 추가**

각 파일의 값 객체(`export const ko = {...}` 등)에 아래 블록을 추가한다. 위치는 파일 내 `my:` 값 블록 뒤 등 눈에 띄는 곳이면 무방.

`ko.ts`:
```typescript
  profileImage: {
    takePhoto: "사진 찍기",
    chooseAlbum: "앨범에서 고르기",
    editLabel: "프로필 사진 편집",
    deleteLabel: "사진 삭제",
    uploadFailed: "사진 업로드에 실패했어요. 잠시 후 다시 시도해주세요.",
    invalidType: "이미지 파일만 업로드할 수 있어요.",
    tooLarge: "10MB 이하의 이미지를 사용해주세요.",
    cropTitle: "사진 편집",
    cropConfirm: "확인",
    cropCancel: "취소",
  },
```

`en.ts`:
```typescript
  profileImage: {
    takePhoto: "Take a photo",
    chooseAlbum: "Choose from album",
    editLabel: "Edit profile photo",
    deleteLabel: "Remove photo",
    uploadFailed: "Failed to upload the photo. Please try again.",
    invalidType: "Only image files can be uploaded.",
    tooLarge: "Please use an image under 10MB.",
    cropTitle: "Edit photo",
    cropConfirm: "Done",
    cropCancel: "Cancel",
  },
```

`ja.ts`:
```typescript
  profileImage: {
    takePhoto: "写真を撮る",
    chooseAlbum: "アルバムから選ぶ",
    editLabel: "プロフィール写真を編集",
    deleteLabel: "写真を削除",
    uploadFailed: "写真のアップロードに失敗しました。しばらくして再度お試しください。",
    invalidType: "画像ファイルのみアップロードできます。",
    tooLarge: "10MB以下の画像をご利用ください。",
    cropTitle: "写真を編集",
    cropConfirm: "確認",
    cropCancel: "キャンセル",
  },
```

`zh.ts`:
```typescript
  profileImage: {
    takePhoto: "拍照",
    chooseAlbum: "从相册选择",
    editLabel: "编辑头像",
    deleteLabel: "删除照片",
    uploadFailed: "照片上传失败，请稍后重试。",
    invalidType: "只能上传图片文件。",
    tooLarge: "请使用10MB以内的图片。",
    cropTitle: "编辑照片",
    cropConfirm: "确定",
    cropCancel: "取消",
  },
```

`vi.ts`:
```typescript
  profileImage: {
    takePhoto: "Chụp ảnh",
    chooseAlbum: "Chọn từ thư viện",
    editLabel: "Chỉnh sửa ảnh đại diện",
    deleteLabel: "Xóa ảnh",
    uploadFailed: "Tải ảnh lên thất bại. Vui lòng thử lại.",
    invalidType: "Chỉ có thể tải lên tệp hình ảnh.",
    tooLarge: "Vui lòng dùng ảnh dưới 10MB.",
    cropTitle: "Chỉnh sửa ảnh",
    cropConfirm: "Xong",
    cropCancel: "Hủy",
  },
```

`th.ts`:
```typescript
  profileImage: {
    takePhoto: "ถ่ายรูป",
    chooseAlbum: "เลือกจากอัลบั้ม",
    editLabel: "แก้ไขรูปโปรไฟล์",
    deleteLabel: "ลบรูป",
    uploadFailed: "อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
    invalidType: "อัปโหลดได้เฉพาะไฟล์รูปภาพเท่านั้น",
    tooLarge: "กรุณาใช้รูปภาพขนาดไม่เกิน 10MB",
    cropTitle: "แก้ไขรูป",
    cropConfirm: "ตกลง",
    cropCancel: "ยกเลิก",
  },
```

`ru.ts`:
```typescript
  profileImage: {
    takePhoto: "Сделать фото",
    chooseAlbum: "Выбрать из галереи",
    editLabel: "Изменить фото профиля",
    deleteLabel: "Удалить фото",
    uploadFailed: "Не удалось загрузить фото. Повторите попытку позже.",
    invalidType: "Можно загружать только изображения.",
    tooLarge: "Используйте изображение до 10 МБ.",
    cropTitle: "Редактировать фото",
    cropConfirm: "Готово",
    cropCancel: "Отмена",
  },
```

- [ ] **Step 3: 검증**

Run: `pnpm build`
Expected: 통과 (한 로케일이라도 키 누락 시 `Record<LanguageCode, Messages>` 타입에러 → 통과하면 7개 전부 채워짐)

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/messages
git commit -m "feat: #30 프로필 이미지 편집 i18n profileImage 네임스페이스 추가"
```

---

### Task 3: 프로필 이미지 API

**Files:**
- Create: `src/features/profile-image/api/profile-image-api.ts`

**Interfaces:**
- Produces:
  - `updateProfileImage(fileId: number): Promise<ProfileImageResponse>` where `ProfileImageResponse = { profileImageUrl: string }`
  - `deleteProfileImage(): Promise<void>`

- [ ] **Step 1: API 작성**

Create `src/features/profile-image/api/profile-image-api.ts`:

```typescript
import { apiClient } from "@/lib/api/client"

interface ProfileImageResponse {
  profileImageUrl: string
}

// 업로드 완료된 fileId를 내 프로필 사진으로 연결한다. 계약: api-endpoints.md §2 (/users/me/profile-image).
async function updateProfileImage(fileId: number): Promise<ProfileImageResponse> {
  const { data } = await apiClient.put<ProfileImageResponse>(
    "/api/v1/users/me/profile-image",
    { fileId }
  )
  return data
}

// 내 프로필 사진 제거(204).
async function deleteProfileImage(): Promise<void> {
  await apiClient.delete("/api/v1/users/me/profile-image")
}

export { updateProfileImage, deleteProfileImage }
export type { ProfileImageResponse }
```

- [ ] **Step 2: 검증**

Run: `pnpm lint && pnpm build`
Expected: 통과

- [ ] **Step 3: Commit**

```bash
git add src/features/profile-image/api/profile-image-api.ts
git commit -m "feat: #30 프로필 이미지 연결/삭제 API 레이어"
```

---

### Task 4: 크롭 이미지 유틸 + 에디터 오버레이

**Files:**
- Modify: `package.json` (`pnpm add react-easy-crop`)
- Create: `src/features/profile-image/lib/crop-image.ts`
- Create: `src/features/profile-image/components/profile-image-editor.tsx`

**Interfaces:**
- Consumes: `messages.profileImage.*` (Task 2)
- Produces:
  - `getCroppedBlob(imageSrc: string, cropPixels: { x: number; y: number; width: number; height: number }): Promise<Blob>` — 1:1 JPEG, 최대 변 1024px 리사이즈(≤10MB 보장)
  - `<ProfileImageEditor open={boolean} imageSrc={string | null} onClose={() => void} onCropped={(blob: Blob) => void} />` — 네트워크 없음, 크롭 blob만 방출

- [ ] **Step 1: react-easy-crop 설치**

Run: `pnpm add react-easy-crop`
Expected: `package.json` dependencies 에 `react-easy-crop` 추가

- [ ] **Step 2: 크롭 canvas 유틸 작성**

Create `src/features/profile-image/lib/crop-image.ts`:

```typescript
// react-easy-crop 의 cropAreaPixels 로 원본 이미지를 1:1 정사각형 canvas 에 그려 JPEG blob 을 추출한다.
// 긴 변을 1024px 로 제한해 10MB 이하를 보장한다.

const MAX_EDGE = 1024

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener("load", () => resolve(image))
    image.addEventListener("error", (event) => reject(event))
    image.src = src
  })
}

interface CropPixels {
  x: number
  y: number
  width: number
  height: number
}

async function getCroppedBlob(imageSrc: string, cropPixels: CropPixels): Promise<Blob> {
  const image = await loadImage(imageSrc)
  const edge = Math.min(cropPixels.width, MAX_EDGE)

  const canvas = document.createElement("canvas")
  canvas.width = edge
  canvas.height = edge

  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas 2D context unavailable")

  context.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    edge,
    edge
  )

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to export cropped image"))),
      "image/jpeg",
      0.9
    )
  })
}

export { getCroppedBlob }
export type { CropPixels }
```

- [ ] **Step 3: 에디터 오버레이 작성**

Create `src/features/profile-image/components/profile-image-editor.tsx`:

```tsx
"use client"

import * as React from "react"
import Cropper, { type Area } from "react-easy-crop"

import { Button } from "@/components/ui/button"
import { getCroppedBlob } from "@/features/profile-image/lib/crop-image"
import { useTranslation } from "@/lib/i18n/use-translation"

interface ProfileImageEditorProps {
  open: boolean
  imageSrc: string | null
  onClose: () => void
  onCropped: (blob: Blob) => void
}

// 풀스크린 원형 크롭 오버레이. 네트워크 호출 없이 크롭된 blob 만 onCropped 로 방출한다.
function ProfileImageEditor({ open, imageSrc, onClose, onCropped }: ProfileImageEditorProps) {
  const { messages } = useTranslation()
  const t = messages.profileImage
  const [crop, setCrop] = React.useState({ x: 0, y: 0 })
  const [zoom, setZoom] = React.useState(1)
  const [areaPixels, setAreaPixels] = React.useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)

  const handleCropComplete = React.useCallback((_area: Area, pixels: Area) => {
    setAreaPixels(pixels)
  }, [])

  const handleConfirm = async () => {
    if (!imageSrc || !areaPixels) return
    setIsProcessing(true)
    try {
      const blob = await getCroppedBlob(imageSrc, areaPixels)
      onCropped(blob)
      onClose()
    } finally {
      setIsProcessing(false)
    }
  }

  if (!open || !imageSrc) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={handleCropComplete}
        />
      </div>
      <div className="flex items-center justify-between gap-3 bg-black px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        <Button variant="ghost" onClick={onClose} className="flex-1 text-white">
          {t.cropCancel}
        </Button>
        <Button onClick={handleConfirm} disabled={isProcessing || !areaPixels} className="flex-1">
          {t.cropConfirm}
        </Button>
      </div>
    </div>
  )
}

export { ProfileImageEditor }
```

> 참고: `Button` variant/props 는 `src/components/ui/button.tsx` 를 열어 실제 시그니처에 맞춘다(`variant="ghost"` 미존재 시 존재하는 값으로 대체).

- [ ] **Step 4: 검증**

Run: `pnpm lint && pnpm build`
Expected: 통과 (`react-easy-crop` 타입 포함)

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml src/features/profile-image/lib/crop-image.ts src/features/profile-image/components/profile-image-editor.tsx
git commit -m "feat: #30 원형 크롭 에디터 + canvas blob 추출 유틸"
```

---

### Task 5: 아바타 + 카메라 버튼 컴포넌트

**Files:**
- Create: `src/features/profile-image/components/profile-avatar-button.tsx`

**Interfaces:**
- Consumes: `messages.profileImage.*`, 기존 `ChatContextMenu`(`src/features/chat/components/chat-context-menu.tsx`), 아이콘 `/icons/chat/camera-line.svg`·`/icons/chat/image.svg`
- Produces:
  - `<ProfileAvatarButton previewUrl={string | null} onTakePhoto={() => void} onChooseAlbum={() => void} />`
  - 숨은 파일 input 은 소비처가 소유하지 않고 이 컴포넌트가 내부에서 렌더 → 선택 시 objectURL 을 만들지 않고 파일을 상위로 전달: `onFileSelected(file: File)`

정정된 인터페이스(파일 입력을 이 컴포넌트가 소유):
- `<ProfileAvatarButton previewUrl={string | null} onFileSelected={(file: File) => void} />`

- [ ] **Step 1: 컴포넌트 작성**

Create `src/features/profile-image/components/profile-avatar-button.tsx`:

```tsx
"use client"

import * as React from "react"
import Image from "next/image"

import { ChatContextMenu } from "@/features/chat/components/chat-context-menu"
import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

interface ProfileAvatarButtonProps {
  previewUrl: string | null
  onFileSelected: (file: File) => void
  className?: string
}

// Figma: 원형 아바타 + 우하단 카메라 배지. 탭 → "사진 찍기 / 앨범에서 고르기" 메뉴.
function ProfileAvatarButton({ previewUrl, onFileSelected, className }: ProfileAvatarButtonProps) {
  const { messages } = useTranslation()
  const t = messages.profileImage
  const [menuOpen, setMenuOpen] = React.useState(false)
  const cameraInputRef = React.useRef<HTMLInputElement>(null)
  const albumInputRef = React.useRef<HTMLInputElement>(null)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = "" // 같은 파일 재선택 허용
    if (file) onFileSelected(file)
  }

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      <div className="relative size-24">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="size-24 rounded-full object-cover" />
        ) : (
          <div className="size-24 rounded-full bg-gray-100" />
        )}
        <button
          type="button"
          aria-label={t.editLabel}
          onClick={() => setMenuOpen(true)}
          className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full border-2 border-white bg-gray-700"
        >
          <Image src="/icons/chat/camera-line.svg" alt="" width={16} height={16} className="size-4 invert" />
        </button>
      </div>

      {menuOpen && (
        <ChatContextMenu
          dimmed
          onDismiss={() => setMenuOpen(false)}
          className="top-[calc(100%+8px)] left-1/2 -translate-x-1/2"
          items={[
            {
              icon: <Image src="/icons/chat/camera-line.svg" alt="" width={24} height={24} />,
              label: t.takePhoto,
              onClick: () => {
                setMenuOpen(false)
                cameraInputRef.current?.click()
              },
            },
            {
              icon: <Image src="/icons/chat/image.svg" alt="" width={24} height={24} />,
              label: t.chooseAlbum,
              onClick: () => {
                setMenuOpen(false)
                albumInputRef.current?.click()
              },
            },
          ]}
        />
      )}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />
      <input
        ref={albumInputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  )
}

export { ProfileAvatarButton }
```

- [ ] **Step 2: 검증**

Run: `pnpm lint && pnpm build`
Expected: 통과 (`/icons/chat/camera-line.svg`·`/icons/chat/image.svg` 존재는 모임 피커에서 이미 사용 중이라 확인됨)

- [ ] **Step 3: Commit**

```bash
git add src/features/profile-image/components/profile-avatar-button.tsx
git commit -m "feat: #30 프로필 아바타+카메라 버튼(촬영/앨범 메뉴) 컴포넌트"
```

---

### Task 6: 업로드 훅

**Files:**
- Create: `src/features/profile-image/hooks/use-profile-image.ts`

**Interfaces:**
- Consumes: `uploadImage`(Task 1), `updateProfileImage`/`deleteProfileImage`(Task 3), `UserMeResponse`(`@/features/session/api/session-api`)
- Produces:
  - `useProfileImageUpload()` → `{ upload(blob: Blob): Promise<void>, isUploading: boolean, isError: boolean }` — 성공 시 `["me"]` 캐시의 `profileImageUrl` 갱신
  - `useDeleteProfileImage()` → `{ remove(): Promise<void>, isDeleting: boolean }` — 성공 시 `["me"]` 의 `profileImageUrl` 을 null 로

- [ ] **Step 1: 훅 작성**

Create `src/features/profile-image/hooks/use-profile-image.ts`:

```typescript
"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { deleteProfileImage, updateProfileImage } from "@/features/profile-image/api/profile-image-api"
import type { UserMeResponse } from "@/features/session/api/session-api"
import { uploadImage } from "@/lib/files/upload-image"

// 크롭 blob → presign/S3/complete → 프로필 연결. 성공 시 ["me"] 의 profileImageUrl 만 갱신한다.
function useProfileImageUpload() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (blob: Blob) => {
      const fileId = await uploadImage(blob, "profile")
      return updateProfileImage(fileId)
    },
    onSuccess: ({ profileImageUrl }) => {
      queryClient.setQueryData<UserMeResponse>(["me"], (previous) =>
        previous ? { ...previous, profileImageUrl } : previous
      )
    },
  })
  return {
    upload: (blob: Blob) => mutation.mutateAsync(blob),
    isUploading: mutation.isPending,
    isError: mutation.isError,
  }
}

function useDeleteProfileImage() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: deleteProfileImage,
    onSuccess: () => {
      queryClient.setQueryData<UserMeResponse>(["me"], (previous) =>
        previous ? { ...previous, profileImageUrl: null } : previous
      )
    },
  })
  return {
    remove: () => mutation.mutateAsync(),
    isDeleting: mutation.isPending,
  }
}

export { useProfileImageUpload, useDeleteProfileImage }
```

- [ ] **Step 2: 검증**

Run: `pnpm lint && pnpm build`
Expected: 통과

- [ ] **Step 3: Commit**

```bash
git add src/features/profile-image/hooks/use-profile-image.ts
git commit -m "feat: #30 프로필 이미지 업로드/삭제 훅(['me'] 캐시 갱신)"
```

---

### Task 7: 마이 정보수정 배선

**Files:**
- Modify: `src/features/my/components/edit-profile-content.tsx`

**Interfaces:**
- Consumes: `ProfileAvatarButton`(Task 5), `ProfileImageEditor`(Task 4), `useProfileImageUpload`/`useDeleteProfileImage`(Task 6), `messages.profileImage.*`

- [ ] **Step 1: 파일을 읽고 폼 상단에 아바타 편집 UI 삽입**

먼저 `edit-profile-content.tsx` 전체를 읽는다. `EditProfileForm` 컴포넌트 폼 상단(첫 `Title`/`Input` 위)에 아래를 삽입하고, 필요한 import 를 추가한다.

컴포넌트 내부 상태/핸들러(EditProfileForm 함수 본문 상단):
```tsx
  const { upload, isUploading } = useProfileImageUpload()
  const { remove } = useDeleteProfileImage()
  const [editorSrc, setEditorSrc] = React.useState<string | null>(null)

  const handleFileSelected = (file: File) => {
    setEditorSrc(URL.createObjectURL(file))
  }

  const handleCropped = async (blob: Blob) => {
    try {
      await upload(blob)
    } catch {
      // 실패 시 me 캐시는 그대로 — 사용자에게 별도 토스트 없이 프리뷰 롤백(현재 user.profileImageUrl 유지)
    }
  }
```

폼 JSX 최상단(아바타 영역):
```tsx
        <div className="flex w-full flex-col items-center py-4">
          <ProfileAvatarButton
            previewUrl={user.profileImageUrl}
            onFileSelected={handleFileSelected}
          />
          {user.profileImageUrl && (
            <button
              type="button"
              onClick={() => remove()}
              className="mt-2 text-body-regular-14 text-gray-500"
            >
              {messages.profileImage.deleteLabel}
            </button>
          )}
        </div>

        <ProfileImageEditor
          open={editorSrc !== null}
          imageSrc={editorSrc}
          onClose={() => {
            if (editorSrc) URL.revokeObjectURL(editorSrc)
            setEditorSrc(null)
          }}
          onCropped={handleCropped}
        />
```

Imports 추가:
```tsx
import { ProfileAvatarButton } from "@/features/profile-image/components/profile-avatar-button"
import { ProfileImageEditor } from "@/features/profile-image/components/profile-image-editor"
import { useDeleteProfileImage, useProfileImageUpload } from "@/features/profile-image/hooks/use-profile-image"
```

> `isUploading` 는 아바타에 로딩 오버레이를 줄 때 사용(선택). 최소 구현에서는 disable 없이 두어도 무방하나 lint 의 unused 경고를 피하려면 사용하거나 구조분해에서 제외한다.

- [ ] **Step 2: 검증 (빌드)**

Run: `pnpm lint && pnpm build`
Expected: 통과

- [ ] **Step 3: 검증 (런타임)**

`pnpm dev` → 로그인 상태로 `/my/edit` 진입 → 아바타 카메라 탭 → "앨범에서 고르기" → 이미지 선택 → 원형 크롭 → 확인 → 아바타가 새 이미지로 갱신되는지 확인. 삭제 버튼으로 제거 확인.

- [ ] **Step 4: Commit**

```bash
git add src/features/my/components/edit-profile-content.tsx
git commit -m "feat: #30 마이 정보수정 프로필 사진 등록/수정/삭제 배선"
```

---

### Task 8: 회원가입 정보입력 배선 + 자동 로그인

**Files:**
- Modify: `src/features/join/hooks/use-join-flow.ts`
- Modify: `src/features/join/components/profile-form.tsx`
- Modify: `src/app/join/page.tsx`

**Interfaces:**
- Consumes: `ProfileAvatarButton`(Task 5), `ProfileImageEditor`(Task 4), `login`(`@/features/login/api/auth-api`), `uploadImage`(Task 1), `updateProfileImage`(Task 3)
- Produces: `useJoinFlow` 의 `profile` 객체에 `avatarPreview: string | null`, `onAvatarFileSelected: (file: File) => void`, `editorSrc/onEditorClose/onCropped` 노출

- [ ] **Step 1: `use-join-flow.ts` 에 크롭 blob 상태 + 자동로그인 흐름 추가**

`useJoinFlow` 내부에 상태 추가:
```tsx
  const [croppedBlob, setCroppedBlob] = React.useState<Blob | null>(null)
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null)
  const [editorSrc, setEditorSrc] = React.useState<string | null>(null)
```

핸들러 추가:
```tsx
  const handleAvatarFileSelected = (file: File) => {
    setEditorSrc(URL.createObjectURL(file))
  }

  const handleCropped = (blob: Blob) => {
    setCroppedBlob(blob)
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarPreview(URL.createObjectURL(blob))
  }

  const handleEditorClose = () => {
    if (editorSrc) URL.revokeObjectURL(editorSrc)
    setEditorSrc(null)
  }
```

`handleSignupSubmit` 를 자동로그인 + best-effort 업로드로 교체(기존 `onSuccess: onSignupSuccess` 대체):
```tsx
  const handleSignupSubmit = () => {
    if (!profile.values) return
    signupMutation.mutate(
      { email, password, ...profile.values, emailVerificationToken },
      {
        onSuccess: async () => {
          try {
            await login({ email, password })
          } catch {
            // 자동로그인 실패 시 사진 업로드는 건너뛰고 상위 콜백(로그인 페이지 폴백)만 호출
            onSignupSuccess?.()
            return
          }
          if (croppedBlob) {
            try {
              const fileId = await uploadImage(croppedBlob, "profile")
              await updateProfileImage(fileId)
            } catch {
              // 사진 업로드 실패는 가입/로그인 완료를 막지 않는다(마이에서 재시도 가능)
            }
          }
          onSignupSuccess?.()
        },
      }
    )
  }
```

상단 import 추가:
```tsx
import { login } from "@/features/login/api/auth-api"
import { updateProfileImage } from "@/features/profile-image/api/profile-image-api"
import { uploadImage } from "@/lib/files/upload-image"
```

`return` 의 `profile` 객체에 아바타 필드 추가:
```tsx
    profile: {
      ...profile,
      isNextEnabled: profile.isValid,
      onSubmit: handleSignupSubmit,
      signupMutation,
      avatarPreview,
      onAvatarFileSelected: handleAvatarFileSelected,
      editorSrc,
      onEditorClose: handleEditorClose,
      onCropped: handleCropped,
    },
```

- [ ] **Step 2: `ProfileFormApi` 타입 확장**

`src/features/join/types.ts` `ProfileFormApi` 에 필드 추가:
```typescript
  avatarPreview: string | null
  onAvatarFileSelected: (file: File) => void
  editorSrc: string | null
  onEditorClose: () => void
  onCropped: (blob: Blob) => void
```

- [ ] **Step 3: `profile-form.tsx` 에 아바타 편집 UI 삽입**

폼 상단(첫 `Title` 위, `messages.join.nicknameLabel` 블록 앞)에 삽입하고 flow 구조분해에 새 필드 추가:
```tsx
        <div className="flex w-full flex-col items-center py-2">
          <ProfileAvatarButton
            previewUrl={avatarPreview}
            onFileSelected={onAvatarFileSelected}
          />
        </div>
```
그리고 폼 어딘가(루트 form 내부 최하단)에서 에디터 렌더:
```tsx
      <ProfileImageEditor
        open={editorSrc !== null}
        imageSrc={editorSrc}
        onClose={onEditorClose}
        onCropped={onCropped}
      />
```
구조분해(`const { ... } = flow`)에 `avatarPreview, onAvatarFileSelected, editorSrc, onEditorClose, onCropped` 추가, import 추가:
```tsx
import { ProfileAvatarButton } from "@/features/profile-image/components/profile-avatar-button"
import { ProfileImageEditor } from "@/features/profile-image/components/profile-image-editor"
```

- [ ] **Step 4: `join/page.tsx` 성공 콜백을 홈으로 변경**

```tsx
  const flow = useJoinFlow({ onSignupSuccess: () => router.push("/") })
```
(기존 `router.push("/login")` → `router.push("/")`. 자동로그인으로 세션이 확보되므로 홈으로 이동)

- [ ] **Step 5: 검증 (빌드)**

Run: `pnpm lint && pnpm build`
Expected: 통과

- [ ] **Step 6: 검증 (런타임)**

`pnpm dev` → `/join` 신규 이메일로 진행 → 정보입력 단계 아바타에 사진 선택→크롭→미리보기 확인 → 계정 만들기 → 자동로그인 후 홈 이동, 홈/마이에서 프로필 사진 반영 확인. (BE 로컬 필요; 미가용 시 이 스텝은 통합 시점에 확인하고 표기)

- [ ] **Step 7: Commit**

```bash
git add src/features/join/hooks/use-join-flow.ts src/features/join/types.ts src/features/join/components/profile-form.tsx src/app/join/page.tsx
git commit -m "feat: #30 회원가입 정보입력 프로필 사진 등록 + 가입 후 자동 로그인 흐름"
```

---

### Task 9: 마감 검증 + 이슈 동기화

**Files:** (문서/이슈만)

- [ ] **Step 1: 전체 빌드/린트 clean 확인**

Run: `pnpm lint && pnpm build`
Expected: 경고/에러 없이 통과

- [ ] **Step 2: 크로스오리진 이미지 조회 확인 메모**

`GET /api/v1/files/{id}` 이 FE/BE 도메인 분리 환경에서 쿠키 전송되는지(`SameSite=None; Secure`) 통합 배포 시 확인해야 함을 이슈에 코멘트로 남긴다(로컬 same-origin에서는 재현 불가할 수 있음).

- [ ] **Step 3: 이슈 체크리스트 동기화**

`gh issue edit 30 --repo rktclgh/ieum_FE` 로 완료 항목 체크, 문서화 안 된 작업(자동로그인, 업로드 코어 공용화, profile-image 피처 신설) 반영.

- [ ] **Step 4: develop 로 PR**

```bash
git push -u origin feat/#30
gh pr create --repo rktclgh/ieum_FE --base develop --head feat/#30 \
  --title "feat: #30 프로필 이미지 업로드/크롭 + 공용 업로드 코어" \
  --body "이슈 #30. 업로드 코어 공용화, 원형 크롭 에디터, 가입 정보입력 프로필 등록(가입 후 자동 로그인), 마이 수정 프로필 등록/삭제, 모임/질문 업로드 위임."
```

---

## Self-Review

**Spec coverage:**
- §4.1 업로드 코어 + 모임/질문 위임 → Task 1 ✅
- §4.2 profile-image-editor / api / hook → Task 4·3·6 ✅ / avatar-button → Task 5 ✅ / i18n → Task 2 ✅
- §5.1 가입 배선 + 자동로그인 + best-effort + join/page 변경 → Task 8 ✅
- §5.2 마이수정 배선 + 삭제 → Task 7 ✅
- §5.3 모임/질문 업로드 교체 → Task 1 ✅
- §6 에러 처리(INVALID_FILE_REQUEST/SignatureDoesNotMatch/자동로그인 실패 폴백) → Task 1(Content-Type 폴백)·Task 8(폴백) ✅
- §7 검증(크로스오리진/PWA capture/build) → Task 9·Task 8 Step6 ✅

**Placeholder scan:** 코드 스텝 전부 실제 코드 포함. "필요시 실제 시그니처 확인" 주석은 존재 파일 대조 지시로, 플레이스홀더 아님.

**Type consistency:** `uploadImage(blob, purpose)` 시그니처가 Task1 정의 = Task6·Task8 사용 일치. `updateProfileImage(fileId): Promise<{profileImageUrl}>` Task3 정의 = Task6·Task8 사용 일치. `ProfileAvatarButton` props(`previewUrl`,`onFileSelected`) Task5 정의 = Task7·Task8 사용 일치. `ProfileImageEditor` props(`open`,`imageSrc`,`onClose`,`onCropped`) Task4 정의 = Task7·Task8 사용 일치.
