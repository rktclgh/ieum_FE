// 앱 진입 시 SW를 등록해 설치 가능(installability) 판정을 받게 한다. 등록은 멱등.
async function registerServiceWorker(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" })
  } catch {
    // 등록 실패는 설치 유도만 못 할 뿐 앱 동작에 무관하므로 조용히 넘어간다.
  }
}

export { registerServiceWorker }
