// 백엔드 질문/답변 API 응답·요청 타입. 응답 DTO는 Java record라 JSON 키가 필드명 그대로다.
// 주의: isResolved / isAi / isAccepted 는 record 키라 is 접두사를 떼지 않고 그대로 내려온다.

// LocationSnapshot (Question/Meeting 공용). address 필수(≤255), detailAddress/label 선택.
// 좌표는 한국 서비스 영역으로 제한: lat 33.0~39.0, lng 124.0~132.0.
interface LocationSnapshot {
  lat: number
  lng: number
  address: string
  detailAddress?: string | null
  label?: string | null
}

interface QuestionAuthor {
  userId: number
  nickname: string
  profileImageUrl: string | null
  // 국적(ISO 3166-1 alpha-2, 예: "KR"). 상세 시트에서 국기로 표시. 백엔드가 없으면 국기 생략.
  nationality?: string | null
}

interface AnswerResponse {
  answerId: number
  isAi: boolean
  author: QuestionAuthor | null
  content: string | null
  isAccepted: boolean
  createdAt: string
  imageUrls: string[]
}

interface QuestionDetailResponse {
  questionId: number
  title: string
  content: string
  isResolved: boolean
  author: QuestionAuthor
  location: LocationSnapshot
  imageUrls: string[]
  answers: AnswerResponse[]
  // 작성 시각(ISO-8601). 상세 시트의 "N분 전" 상대시각 표시용. 백엔드가 없으면 시각 생략.
  createdAt?: string | null
}

interface MyQuestionItem {
  questionId: number
  title: string
  isResolved: boolean
  thumbnailUrl: string | null
  answerCount: number
  createdAt: string
  // 리스트 본문 미리보기. BE 미구현(계약우선) — 오면 표시, 없으면 생략. #92
  contentPreview?: string | null
}

interface MyQuestionsPage {
  items: MyQuestionItem[]
  nextCursor: string | null
}

interface CreateQuestionRequest {
  title: string
  content: string
  location: LocationSnapshot
  imageFileIds?: string[]
}

// 비슷한 질문 제안(작성 중 노출). 채택된 답변이 있는 질문만 내려올 예정.
// 백엔드 GET /api/v1/questions/similar 는 아직 없어, 지금은 UI 계약만 정의한다.
interface SimilarQuestion {
  questionId: number
  title: string
  /** 채택된 답변 요약(제안 문구). 백엔드 확정 전까지 선택값. */
  acceptedAnswer?: string | null
}

// 질문 수정 요청 — PATCH /api/v1/questions/{questionId}. 미확정(isResolved=false) 질문만
// 허용되며, 확정된 질문은 409 QUESTION_RESOLVED로 거부된다. title/content는 필수이고
// imageFileIds는 있으면 전체 교체(유지할 fileId를 모두 포함, 빈 배열이면 이미지 제거)다.
// 위치(pin)는 계약에 없어 수정 대상이 아니다.
interface UpdateQuestionRequest {
  title: string
  content: string
  imageFileIds?: string[]
}

// 답변 채택 확정. 다중채택 계약이지만 본 서비스는 단일 채택(answerIds 길이 1)만 사용한다.
interface FinalizeAcceptedAnswersResponse {
  questionId: number
  answerSelectionFinalized: boolean
  acceptedAnswerIds: number[]
}

interface PostAnswerRequest {
  content?: string
  imageFileIds?: string[]
}

interface PostAnswerResponse {
  answerId: number
}

export type {
  LocationSnapshot,
  QuestionAuthor,
  AnswerResponse,
  QuestionDetailResponse,
  MyQuestionItem,
  MyQuestionsPage,
  CreateQuestionRequest,
  SimilarQuestion,
  UpdateQuestionRequest,
  FinalizeAcceptedAnswersResponse,
  PostAnswerRequest,
  PostAnswerResponse,
}
