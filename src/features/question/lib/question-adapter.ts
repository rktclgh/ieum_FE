import { resolveFileUrl } from "@/lib/api/file-url"
import { flagFromIso2, fromIso2 } from "@/features/join/lib/nationality-map"
import type {
  AnswerResponse,
  MyQuestionItem,
  QuestionDetailResponse,
} from "@/features/question/api/question-types"
import type { QuestionSummary } from "@/features/question/types"
import type { CountryCode } from "@/lib/constants/countries"

// UI(질문 상세 화면/시트)가 쓰는 뷰 모델. 파일 URL은 same-origin 경로로 정규화한다.
// 국적 표시명은 i18n(messages.countries) 의존이라 어댑터가 아닌 컴포넌트(Task 10)가
// nationalityCode로 조회한다. BE가 nationality를 안 주면 둘 다 undefined(국기 미표시).
interface QuestionAnswerView {
  answerId: number
  isAi: boolean
  isAccepted: boolean
  authorUserId: number
  authorName: string
  authorAvatarUrl?: string
  countryFlagSrc?: string
  nationalityCode?: CountryCode
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
    countryFlagSrc: flagFromIso2(answer.author.nationality),
    nationalityCode: fromIso2(answer.author.nationality),
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
    authorUserId: detail.author.userId,
    answeredUserIds: detail.answers
      .filter((answer) => !answer.isAi)
      .map((answer) => answer.author.userId),
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

// 질문 내역 목록 카드용 뷰모델. 썸네일 URL은 same-origin 경로로 정규화.
// 부제(본문 미리보기) 필드는 BE MyQuestionItem에서 오면 노출, 없으면 undefined(줄 생략).
interface MyQuestionListItemView {
  questionId: number
  title: string
  isResolved: boolean
  thumbnailSrc?: string
  answerCount: number
  createdAt: string
  contentPreview?: string
}

function adaptMyQuestionItem(item: MyQuestionItem): MyQuestionListItemView {
  return {
    questionId: item.questionId,
    title: item.title,
    isResolved: item.isResolved,
    thumbnailSrc: resolveFileUrl(item.thumbnailUrl),
    answerCount: item.answerCount,
    createdAt: item.createdAt,
    contentPreview: item.contentPreview?.trim() || undefined,
  }
}

export { adaptAnswer, adaptQuestionDetail, adaptQuestionSummary, adaptMyQuestionItem }
export type { QuestionAnswerView, QuestionDetailView, MyQuestionListItemView }
