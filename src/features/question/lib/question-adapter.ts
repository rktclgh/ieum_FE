import { resolveFileUrl } from "@/lib/api/file-url"
import { flagFromIso2 } from "@/features/join/lib/nationality-map"
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

// 홈 지도 상세 시트가 쓰는 요약 모델. 국적(ISO2)→국기, 장소는 라벨 우선.
// 시각 라벨은 i18n이 필요해 컴포넌트에서 createdAt으로 포매팅한다.
function adaptQuestionSummary(detail: QuestionDetailResponse): QuestionSummary {
  return {
    id: String(detail.questionId),
    authorName: detail.author.nickname,
    authorAvatarUrl: resolveFileUrl(detail.author.profileImageUrl),
    countryFlagSrc: flagFromIso2(detail.author.nationality),
    createdAt: detail.createdAt ?? undefined,
    location: detail.location.label ?? detail.location.address,
    title: detail.title,
    body: detail.content,
    imageUrl: resolveFileUrl(detail.imageUrls[0]),
  }
}

export { adaptAnswer, adaptQuestionDetail, adaptQuestionSummary }
export type { QuestionAnswerView, QuestionDetailView }
