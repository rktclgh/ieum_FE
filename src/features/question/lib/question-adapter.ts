import { resolveFileUrl } from "@/lib/api/file-url"
import type {
  AnswerResponse,
  QuestionDetailResponse,
} from "@/features/question/api/question-types"
import type { QuestionSummary } from "@/features/question/types"

// UI(질문 상세 화면/시트)가 쓰는 뷰 모델. 파일 URL은 same-origin 경로로 정규화한다.
interface QuestionAnswerView {
  answerId: number
  isAi: boolean
  isAccepted: boolean
  authorUserId: number
  authorName: string
  authorAvatarUrl?: string
  content: string
  createdAt: string
  imageUrls: string[]
}

interface QuestionDetailView {
  questionId: number
  title: string
  content: string
  isResolved: boolean
  authorUserId: number
  authorName: string
  authorAvatarUrl?: string
  address: string
  imageUrls: string[]
  answers: QuestionAnswerView[]
}

function adaptAnswer(answer: AnswerResponse): QuestionAnswerView {
  return {
    answerId: answer.answerId,
    isAi: answer.isAi,
    isAccepted: answer.isAccepted,
    authorUserId: answer.author.userId,
    authorName: answer.author.nickname,
    authorAvatarUrl: resolveFileUrl(answer.author.profileImageUrl),
    content: answer.content ?? "",
    createdAt: answer.createdAt,
    imageUrls: answer.imageUrls
      .map((url) => resolveFileUrl(url))
      .filter((url): url is string => Boolean(url)),
  }
}

function adaptQuestionDetail(detail: QuestionDetailResponse): QuestionDetailView {
  return {
    questionId: detail.questionId,
    title: detail.title,
    content: detail.content,
    isResolved: detail.isResolved,
    authorUserId: detail.author.userId,
    authorName: detail.author.nickname,
    authorAvatarUrl: resolveFileUrl(detail.author.profileImageUrl),
    address: detail.location.address,
    imageUrls: detail.imageUrls
      .map((url) => resolveFileUrl(url))
      .filter((url): url is string => Boolean(url)),
    answers: detail.answers.map(adaptAnswer),
  }
}

// 홈 지도 상세 시트(#31 연동 예정)가 쓰는 요약 모델. 상세 응답과 타입 호환.
function adaptQuestionSummary(detail: QuestionDetailResponse): QuestionSummary {
  return {
    id: String(detail.questionId),
    authorName: detail.author.nickname,
    authorAvatarUrl: resolveFileUrl(detail.author.profileImageUrl),
    title: detail.title,
    body: detail.content,
    timeLabel: "",
    imageUrl: resolveFileUrl(detail.imageUrls[0]),
  }
}

export { adaptAnswer, adaptQuestionDetail, adaptQuestionSummary }
export type { QuestionAnswerView, QuestionDetailView }
