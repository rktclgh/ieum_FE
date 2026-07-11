// 홈 지도 상세 시트(#31 연동 예정)가 쓰는 질문 요약 뷰 모델.
// 백엔드 QuestionDetailResponse에서 lib/question-adapter.ts:adaptQuestionSummary 로 파생한다.
// 상세 화면(question-detail-screen)은 더 풍부한 QuestionDetailView 를 직접 사용한다.
export interface QuestionSummary {
  id: string
  authorName: string
  authorAvatarUrl?: string
  /** 국기 SVG 경로 (예: "/icons/flag/flag-1.svg") — 요약 응답에 국적이 없어 선택값 */
  countryFlagSrc?: string
  /** 표시용으로 포매팅된 작성 시각 문자열 (예: "3분 전") */
  timeLabel: string
  title: string
  body: string
  imageUrl?: string
}
