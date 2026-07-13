// 홈 지도 상세 시트가 쓰는 질문 요약 뷰 모델.
// 백엔드 QuestionDetailResponse에서 lib/question-adapter.ts:adaptQuestionSummary 로 파생한다.
// 상세 화면(question-detail-screen)은 더 풍부한 QuestionDetailView 를 직접 사용한다.
export interface QuestionSummary {
  id: string
  /** 작성자 userId — 내가 쓴 질문인지 판별해 답변 입력을 막는 데 쓴다 */
  authorUserId: number
  /** 답변 단 사용자 userId 목록(AI 제외) — 내가 이미 답변했는지 판별해 "답변 완료" 표시에 쓴다 */
  answeredUserIds: number[]
  authorName: string
  authorAvatarUrl?: string
  /** 국기 SVG 경로 (예: "/icons/flag/flag-1.svg") — 작성자 국적(ISO2)에서 파생, 없으면 생략 */
  countryFlagSrc?: string
  /** 작성 시각(ISO-8601). 시트에서 "N분 전" 상대시각으로 포매팅. 없으면 시각 생략 */
  createdAt?: string
  /** 표시용 장소 (라벨 우선, 없으면 주소) */
  location?: string
  title: string
  body: string
  imageUrl?: string
}
