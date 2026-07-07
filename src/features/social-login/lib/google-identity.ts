const GSI_SCRIPT_SRC = "https://accounts.google.com/gsi/client"

interface GoogleCredentialResponse {
  credential?: string
}

interface GoogleIdConfiguration {
  client_id: string
  callback: (response: GoogleCredentialResponse) => void
  nonce?: string
}

interface GoogleButtonConfiguration {
  type?: "standard" | "icon"
  theme?: "outline" | "filled_blue" | "filled_black"
  size?: "large" | "medium" | "small"
  text?: "signin_with" | "signup_with" | "continue_with" | "signin"
  shape?: "rectangular" | "pill" | "circle" | "square"
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfiguration) => void
          renderButton: (parent: HTMLElement, options: GoogleButtonConfiguration) => void
        }
      }
    }
  }
}

let scriptPromise: Promise<void> | null = null
let initializedClientId: string | null = null
let initializedNonce: string | null = null
let activeTokenRequest: Promise<{ idToken: string; nonce: string }> | null = null

interface PendingTokenRequest {
  container: HTMLElement
  reject: (reason?: unknown) => void
  resolve: (value: { idToken: string; nonce: string }) => void
  timeoutId: number
}

let pendingTokenRequest: PendingTokenRequest | null = null

function loadGsiScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("GSI requires a browser"))
  if (window.google?.accounts.id) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${GSI_SCRIPT_SRC}"]`
    )
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true })
      existingScript.addEventListener("error", () => reject(new Error("Failed to load GSI")), {
        once: true,
      })
      return
    }

    const script = document.createElement("script")
    script.src = GSI_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load GSI"))
    document.head.appendChild(script)
  })

  return scriptPromise
}

function generateNonce() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "")
}

function createHiddenButtonContainer() {
  const container = document.createElement("div")
  container.style.position = "fixed"
  container.style.left = "-9999px"
  container.style.top = "0"
  container.style.width = "1px"
  container.style.height = "1px"
  container.style.overflow = "hidden"
  document.body.appendChild(container)
  return container
}

function cleanupPendingRequest() {
  if (!pendingTokenRequest) return
  window.clearTimeout(pendingTokenRequest.timeoutId)
  pendingTokenRequest.container.remove()
  pendingTokenRequest = null
}

function initializeGoogleIdentity(clientId: string) {
  if (initializedClientId === clientId && initializedNonce) return initializedNonce

  if (initializedClientId && initializedClientId !== clientId) {
    throw new Error("Google client ID changed after initialization")
  }

  const nonce = generateNonce()

  window.google?.accounts.id.initialize({
    client_id: clientId,
    nonce,
    callback: (response) => {
      const request = pendingTokenRequest
      if (!request) return

      if (!response.credential) {
        cleanupPendingRequest()
        request.reject(new Error("Google credential is empty"))
        return
      }

      cleanupPendingRequest()
      request.resolve({ idToken: response.credential, nonce })
    },
  })

  initializedClientId = clientId
  initializedNonce = nonce
  return nonce
}

async function requestGoogleIdToken(): Promise<{ idToken: string; nonce: string }> {
  if (activeTokenRequest) return activeTokenRequest

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  if (!clientId) throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured")

  activeTokenRequest = loadGsiScript()
    .then(
      () =>
        new Promise<{ idToken: string; nonce: string }>((resolve, reject) => {
          initializeGoogleIdentity(clientId)

          const container = createHiddenButtonContainer()
          const timeoutId = window.setTimeout(() => {
            cleanupPendingRequest()
            reject(new Error("Google sign-in was not completed"))
          }, 30000)

          pendingTokenRequest = {
            container,
            reject,
            resolve,
            timeoutId,
          }

          window.google?.accounts.id.renderButton(container, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "pill",
          })

          window.setTimeout(() => {
            container
              .querySelector<HTMLElement>('div[role="button"], iframe, button')
              ?.click()
          }, 0)
        })
    )
    .finally(() => {
      activeTokenRequest = null
    })

  return activeTokenRequest
}

export { generateNonce, loadGsiScript, requestGoogleIdToken }
