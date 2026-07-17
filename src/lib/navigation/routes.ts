function parsePositiveInteger(value: string | null): number | null {
  if (value === null || !/^[1-9]\d*$/.test(value)) return null

  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}

function requirePositiveInteger(value: number, field: string): string {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive safe integer`)
  }

  return String(value)
}

function queryRoute(path: string, values: Record<string, string | number>) {
  return `${path}?${new URLSearchParams(
    Object.entries(values).map(([key, value]) => [key, String(value)])
  ).toString()}`
}

const routes = {
  home: () => "/",
  login: () => "/login/",
  join: () => "/join/",
  socialJoin: () => "/join/social/",
  kakaoCallback: () => "/oauth/kakao/callback/",
  chats: () => "/chats/",
  questions: () => "/questions/",
  friends: () => "/friends/",
  notifications: () => "/notifications/",
  my: () => "/my/",
  myEdit: () => "/my/edit/",
  myNotifications: () => "/my/notifications/",
  myPermissions: () => "/my/permissions/",
  myInquiry: () => "/my/inquiry/",
  adminHome: () => "/admin/",
  adminLogin: () => "/admin/login/",
  adminUsers: () => "/admin/users/",
  adminReports: () => "/admin/reports/",
  adminInquiries: () => "/admin/inquiries/",
  adminKnowledge: () => "/admin/knowledge/",
  chatRoom: (chatId: number) =>
    queryRoute("/chats/room/", { chatId: requirePositiveInteger(chatId, "chatId") }),
  chatNotices: (chatId: number) =>
    queryRoute("/chats/notices/", { chatId: requirePositiveInteger(chatId, "chatId") }),
  chatReport: (chatId: number, messageId: number, target?: string) =>
    queryRoute("/chats/report/", {
      chatId: requirePositiveInteger(chatId, "chatId"),
      messageId: requirePositiveInteger(messageId, "messageId"),
      ...(target === undefined ? {} : { target }),
    }),
  chatScheduleReport: (meetingId: number, scheduleId: number, target?: string) =>
    queryRoute("/chats/report/", {
      kind: "schedule",
      meetingId: requirePositiveInteger(meetingId, "meetingId"),
      scheduleId: requirePositiveInteger(scheduleId, "scheduleId"),
      ...(target === undefined ? {} : { target }),
    }),
  chatSchedule: (chatId: number) =>
    queryRoute("/chats/schedule/", { chatId: requirePositiveInteger(chatId, "chatId") }),
  meetupDetail: (meetingId: number) =>
    queryRoute("/meetups/detail/", {
      meetingId: requirePositiveInteger(meetingId, "meetingId"),
    }),
  questionDetail: (questionId: number) =>
    queryRoute("/questions/detail/", {
      questionId: requirePositiveInteger(questionId, "questionId"),
    }),
  adminUserDetail: (userId: number) =>
    queryRoute("/admin/users/detail/", {
      userId: requirePositiveInteger(userId, "userId"),
    }),
  adminReportDetail: (reportId: number) =>
    queryRoute("/admin/reports/detail/", {
      reportId: requirePositiveInteger(reportId, "reportId"),
    }),
  adminKnowledgeCandidate: (candidateId: number) =>
    queryRoute("/admin/knowledge/", {
      candidateId: requirePositiveInteger(candidateId, "candidateId"),
    }),
} as const

export { parsePositiveInteger, routes }
