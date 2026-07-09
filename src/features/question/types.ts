/** 홈 지도 상세 시트에서 다루는 질문 요약 정보 (백엔드 연동 전 프레젠테이션 계약) */
export interface QuestionSummary {
  id: string
  authorName: string
  authorAvatarUrl?: string
  /** 국기 SVG 경로 (예: "/icons/flag/flag-1.svg") */
  countryFlagSrc?: string
  /** 표시용으로 포매팅된 작성 시각 문자열 (예: "3분 전") */
  timeLabel: string
  title: string
  body: string
  imageUrl?: string
}
