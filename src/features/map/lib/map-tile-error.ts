// 지도를 줌/이동하면 MapLibre는 새 줌 레벨의 타일을 한꺼번에 요청하고, 그 사이 화면 밖으로
// 밀려난 요청은 즉시 abort한다. abort된 fetch는 HTTP 응답이 없어 status 0 / 빈 body의
// AJAXError로 올라오는데, 이건 실패가 아니라 정상적인 취소다. 순간적인 네트워크 단절도 같은
// 모양이고 MapLibre가 알아서 재요청하므로, 둘 다 사용자에게 보일 문제가 아니다.
//
// 반면 404/429/500처럼 서버가 상태 코드로 응답한 실패는 스타일 URL 오타나 rate limit 같은
// 진짜 문제이므로 여기서 걸러내지 않는다.
//
// maplibre-gl은 AJAXError를 런타임 export하지만 브라우저 전용 모듈이라, 이 판별식이 node
// 테스트에서도 돌 수 있도록 instanceof 대신 구조로 확인한다.
function isTransientTileRequestError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const { status, url } = error as { status?: unknown; url?: unknown }

  return status === 0 && typeof url === "string" && url.length > 0
}

export { isTransientTileRequestError }
