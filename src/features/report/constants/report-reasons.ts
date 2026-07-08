// 신고 사유 옵션. 각 값은 i18n `report` 카탈로그의 메시지 키와 1:1로 대응한다.
export const REPORT_REASON_KEYS = [
  "reasonDobae",
  "reasonAd",
  "reasonAbuse",
  "reasonSexualHarassment",
  "reasonPornography",
  "reasonEtc",
] as const

export type ReportReasonKey = (typeof REPORT_REASON_KEYS)[number]
