# 프로필 이미지 업로드/크롭 + 공용 업로드 코어 설계

- 이슈: [#30](https://github.com/rktclgh/ieum_FE/issues/30)
- 브랜치: `feat/#30` (base `develop`)
- 작성일: 2026-07-14

## 1. 목표

이미지 **촬영·앨범선택 → 1:1 원형 크롭 → presigned S3 업로드**를 구현하고, 다음에서 재사용한다.

1. 회원가입 정보입력 단계 — 프로필 사진 등록 (Figma `정보 입력`, 아바타 + 카메라 → `사진 찍기`/`앨범에서 고르기`)
2. 마이페이지 정보수정(`/my/edit`) — 프로필 사진 등록/수정/삭제
3. 모임 등록 / 4. 질문 등록 — 사진 촬영·업로드 (기존 기능의 업로드 경로 공용화)

## 2. 핵심 제약 — 가입 직후엔 세션이 없다

- `PUT /users/me/profile-image` 는 경로에 userId를 받지 않고 **세션(`me`)** 으로 동작한다.
- `POST /auth/signup` → `201 { userId }` 만 주고 **인증 쿠키를 발급하지 않는다.** 쿠키 발급은 `/auth/login`·`/auth/social`·`/auth/social/signup` 뿐.
- 현재 FE는 가입 성공 시 `router.push("/login")` 으로 이동 → 가입 직후 세션이 없어 프로필 등록 API 호출 불가.

**결정: 가입 후 자동 로그인.** 크롭 결과 blob을 메모리에 보관 → 가입 성공 → 메모리의 email/password로 `POST /auth/login` → 쿠키 확보 → (blob 있으면) 업로드+link → 홈 이동.

## 3. 스코프 결정

- **원형 크롭 UI는 프로필(가입·마이) 전용.** 모임/질문 사진은 콘텐츠 사진(자유 비율)이고 이미 `capture` 피커가 있으므로 크롭을 강제하지 않는다.
- **모임/질문은 업로드 코어만 공용화** — 기존 `meetup-file-api.ts`(`purpose:"meeting"`)·`question-file-api.ts`(`purpose:"question"`) 의 presign→S3→complete 복사본을 공용 코어에 위임.
- 크롭 진입은 **별도 라우트가 아니라 오버레이 모달**(Figma가 정보입력 화면 내 인라인 오버레이). 원안의 `/my/profile-image` 라우트는 폐기.

## 4. 모듈 구조

### 4.1 업로드 코어 — `src/lib/files/upload-image.ts`
- `presignImage({ purpose, contentType, sizeBytes })` → `POST /api/v1/files/presign` → `{ fileId, uploadUrl }`
- `putToS3(uploadUrl, blob, contentType)` — **raw `fetch` PUT** (apiClient 아님: 쿠키/CSRF 미포함), `Content-Type` 일치, `blob.type` 빈 문자열이면 `image/jpeg` 폴백
- `completeFile(fileId)` → `POST /api/v1/files/{fileId}/complete`
- `uploadImage(blob, purpose): Promise<number>` — 위 3단계 묶음, `fileId(number)` 반환
- 리팩터: `meetup-file-api.ts`·`question-file-api.ts` 는 `uploadImage(file, "meeting"|"question")` 위임으로 축소

`purpose` 타입: `"profile" | "meeting" | "question"`

### 4.2 프로필 이미지 피처 — `src/features/profile-image/`
join·my 양쪽에서 쓰므로 독립 피처로 둔다.

- `components/profile-image-editor.tsx`
  - 풀스크린 오버레이. `사진 찍기`(`<input capture="environment">`)/`앨범에서 고르기`(`<input>`)를 `ui/bottom-sheet`로 노출
  - `react-easy-crop` 1:1 **원형** 크롭, 확정 시 `canvas`로 blob 추출(JPEG, 긴 변 기준 리사이즈로 ≤10MB 보장)
  - **네트워크 없음.** props: `open`, `onClose`, `onCropped(blob)` — 크롭된 blob만 방출
- `components/profile-avatar-button.tsx` — 원형 아바타 + 카메라 버튼(Figma). `currentUrl?`, `previewUrl?`, `onClick` 으로 editor 오픈
- `api/profile-image-api.ts`
  - `updateProfileImage(fileId)` → `PUT /api/v1/users/me/profile-image { fileId }` → `{ profileImageUrl }`
  - `deleteProfileImage()` → `DELETE /api/v1/users/me/profile-image` → `204`
- `hooks/use-profile-image-upload.ts` — `uploadImage(blob,"profile")` → `updateProfileImage` → `queryClient.invalidateQueries(["me"])`. 삭제 뮤테이션 포함
- i18n 키 추가: 카탈로그(`src/lib/i18n`)에 `사진 찍기`/`앨범에서 고르기`/업로드·용량·타입 에러 문구

## 5. 소비처 배선

### 5.1 가입 정보입력 (`features/join`)
- `profile-form.tsx` 상단에 `profile-avatar-button` + `profile-image-editor` 추가
- 크롭 blob과 objectURL 프리뷰를 `useJoinFlow` state로 보관(**업로드하지 않음**)
- `handleSignupSubmit` 성공 콜백 흐름 변경:
  1. `login({ email, password })` (기존 `features/login/api/auth-api.ts` `login` 재사용)
  2. blob 있으면 `uploadImage("profile")` → `updateProfileImage` — **best-effort**: 실패해도 가입/로그인은 완료로 간주(사진은 마이에서 재시도)
  3. 홈으로 이동
- `join/page.tsx` `onSignupSuccess: () => router.push("/login")` → 자동로그인+홈 흐름으로 대체
- `passwordResetRequired`는 신규가입 경로에서 false 기대. true여도 흐름은 방어적으로 통과시키되 후속 이슈로 분리

### 5.2 마이 정보수정 (`/my/edit`, `edit-profile-content.tsx`)
- 폼 상단에 `profile-avatar-button`(현재 `user.profileImageUrl` 표시) + editor
- 크롭 → `use-profile-image-upload` → 성공 시 `["me"]` invalidate로 아바타 갱신
- 삭제 액션 제공(`deleteProfileImage` → `["me"]` invalidate)

### 5.3 모임/질문 등록
- `uploadMeetingImage`/`uploadQuestionImage` 내부를 공용 `uploadImage`로 교체. 화면/크롭 UX 변경 없음

## 6. 에러 처리
- `INVALID_FILE_REQUEST` — presign 단계 크기/타입 위반 → 사용자 문구
- S3 `SignatureDoesNotMatch` — PUT `Content-Type`이 presign 서명과 불일치할 때 → `contentType` 일치로 예방, 실패 시 재시도 안내
- 자동로그인 실패 — 가입은 성공했으므로 `/login`으로 폴백 이동

## 7. 검증
- `GET /api/v1/files/{id}` 크로스오리진 쿠키 전송(FE/BE 도메인 분리, `SameSite=None; Secure`) 확인
- PWA(iOS/Android)에서 `capture="environment"` 촬영 동작 확인
- 하드코딩 한국어 없음(전부 i18n)
- `pnpm build` clean

## 8. 참고
- BE 명세: `ieum_BE/docs/api-endpoints.md` §1(auth)·§2(users)·§10(files)
- 엔드포인트 체인: `POST /files/presign` → `PUT {S3 uploadUrl}` → `POST /files/{id}/complete` → `PUT /users/me/profile-image`
- Figma: node `1789-13121`, `1774-12818`
