import { routes } from "@/lib/navigation/routes"

// 알림 type/refId 를 앱 내부 경로로 변환한다. 매핑 불가하거나 refId 가 유효하지 않으면
// null 을 돌려 "이동 없음(읽음 처리만)"으로 처리한다. type 값은 서버 표기가 확정 전이라
// 소문자 부분일치로 관대하게 매칭한다(QUESTION_ANSWER, NEW_CHAT_MESSAGE 등 접미/접두 변형 대응).
function resolveNotificationRoute(type: string, refId: number | null): string | null {
  if (refId === null || !Number.isSafeInteger(refId) || refId <= 0) return null
  // 서버 표기가 확정 전이라 런타임에 문자열이 아닌 값이 올 가능성에 대비한다.
  if (typeof type !== "string") return null

  const normalized = type.toLowerCase()
  if (normalized.includes("question") || normalized.includes("answer")) {
    return routes.questionDetail(refId)
  }
  if (normalized.includes("meet")) {
    return routes.meetupDetail(refId)
  }
  if (
    normalized.includes("chat") ||
    normalized.includes("message") ||
    normalized.includes("room")
  ) {
    return routes.chatRoom(refId)
  }
  return null
}

export { resolveNotificationRoute }
