function parsePositiveInteger(value: string | null): number | null {
  if (value === null || !/^[1-9]\d*$/.test(value)) return null

  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
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
  kakaoCallback: () => "/oauth/kakao/callback",
  chats: () => "/chats/",
  questions: () => "/questions/",
  friends: () => "/friends/",
  my: () => "/my/",
  myEdit: () => "/my/edit/",
  mySettings: () => "/my/settings/",
  chatRoom: (chatId: number) => queryRoute("/chats/room/", { chatId }),
  chatNotices: (chatId: number) => queryRoute("/chats/notices/", { chatId }),
  chatReport: (chatId: number, messageId: number, target?: string) =>
    queryRoute("/chats/report/", {
      chatId,
      messageId,
      ...(target === undefined ? {} : { target }),
    }),
  chatSchedule: (chatId: number) => queryRoute("/chats/schedule/", { chatId }),
  meetupDetail: (meetingId: number) => queryRoute("/meetups/detail/", { meetingId }),
  questionDetail: (questionId: number) => queryRoute("/questions/detail/", { questionId }),
} as const

export { parsePositiveInteger, routes }
