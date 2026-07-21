// 앱 진입 시 SW를 등록해 설치 가능(installability) 판정을 받게 한다. 등록은 멱등.
// 실패를 삼키지 않는다 — 에러 정책은 호출자가 정한다(푸시는 fail-fast, 설치 배너는 best-effort).
async function registerServiceWorker(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return
  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  })

  await registration.update()
}

export { registerServiceWorker }
