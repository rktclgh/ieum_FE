// 서버가 알림에 실어 보내는 메시지 키. 문구는 서버가 아니라 이 저장소의 카탈로그가 소유한다
// (백엔드 이슈 #193). 서버는 "어떤 사건인지"(키)와 "그 사건의 값"(params)만 알려준다.
//
// ★ 이 목록은 백엔드 NotificationMessageKey.java 와 1:1로 맞춘다. 한쪽만 늘리면
//   카탈로그에 없는 키가 내려와 title/body 폴백으로 조용히 떨어진다.
const NOTIFICATION_MESSAGE_KEYS = [
  "notification.answer.created",
  "notification.answer.accepted",
  "notification.friend.request",
  "notification.radius.question",
  "notification.radius.meeting",
  "notification.chat.message",
] as const

type NotificationMessageKey = (typeof NOTIFICATION_MESSAGE_KEYS)[number]

// 발송 시점에 굳어진 스냅샷 값. 닉네임·제목처럼 번역 대상이 아닌 사용자 콘텐츠가 들어온다.
type NotificationMessageParams = Record<string, string>

const REQUIRED_NOTIFICATION_MESSAGE_PARAMS: Partial<
  Record<NotificationMessageKey, readonly string[]>
> = {
  "notification.friend.request": ["nickname"],
  "notification.radius.question": ["subject"],
  "notification.radius.meeting": ["subject"],
}

interface NotificationCopy {
  title: string
  body: (params: NotificationMessageParams) => string
}

function isNotificationMessageKey(value: string): value is NotificationMessageKey {
  return (NOTIFICATION_MESSAGE_KEYS as readonly string[]).includes(value)
}

function hasRequiredNotificationMessageParams(
  key: NotificationMessageKey,
  params: NotificationMessageParams | null | undefined,
): boolean {
  const required = REQUIRED_NOTIFICATION_MESSAGE_PARAMS[key]
  return !required || required.every((name) => typeof params?.[name] === "string" && params[name].trim())
}

export {
  NOTIFICATION_MESSAGE_KEYS,
  hasRequiredNotificationMessageParams,
  isNotificationMessageKey,
}
export type { NotificationMessageKey, NotificationMessageParams, NotificationCopy }
