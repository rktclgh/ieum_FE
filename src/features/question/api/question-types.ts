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
}

interface AnswerResponse {
  answerId: number
  isAi: boolean
  author: QuestionAuthor
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
}

interface MyQuestionItem {
  questionId: number
  title: string
  isResolved: boolean
  thumbnailUrl: string | null
  answerCount: number
  createdAt: string
}

interface MyQuestionsPage {
  items: MyQuestionItem[]
  nextCursor: string | null
}

interface CreateQuestionRequest {
  title: string
  content: string
  location: LocationSnapshot
  imageFileIds?: number[]
}

// 비슷한 질문 제안(작성 중 노출). 채택된 답변이 있는 질문만 내려올 예정.
// 백엔드 GET /api/v1/questions/similar 는 아직 없어, 지금은 UI 계약만 정의한다.
interface SimilarQuestion {
  questionId: number
  title: string
  /** 채택된 답변 요약(제안 문구). 백엔드 확정 전까지 선택값. */
  acceptedAnswer?: string | null
}

interface UpdateQuestionRequest {
  title?: string
  content?: string
  imageFileIds?: number[]
}

interface PostAnswerRequest {
  content?: string
  imageFileIds?: number[]
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
  PostAnswerRequest,
  PostAnswerResponse,
}
