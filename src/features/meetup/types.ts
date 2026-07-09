/** 홈 지도 상세 시트에서 다루는 모임 요약 정보 (백엔드 연동 전 프레젠테이션 계약) */
export interface MeetupSummary {
  id: string
  title: string
  /** 표시용으로 포매팅된 일시 문자열 (예: "2026.07.07 오후 7:00") */
  dateLabel: string
  /** 표시용 장소 문자열 (예: "용산역 2번 출구") */
  locationLabel: string
  participantCount: number
  description: string
  imageUrl?: string
}
