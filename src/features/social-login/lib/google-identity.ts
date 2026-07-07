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
          prompt: () => void
          renderButton: (parent: HTMLElement, options: GoogleButtonConfiguration) => void
        }
      }
    }
  }
}

let scriptPromise: Promise<void> | null = null

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

async function requestGoogleIdToken(): Promise<{ idToken: string; nonce: string }> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  if (!clientId) throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured")

  await loadGsiScript()

  const nonce = generateNonce()

  return new Promise((resolve, reject) => {
    const container = createHiddenButtonContainer()

    const timeoutId = window.setTimeout(() => {
      container.remove()
      reject(new Error("Google sign-in was not completed"))
    }, 120000)

    const cleanup = (container: HTMLElement) => {
      window.clearTimeout(timeoutId)
      container.remove()
    }

    window.google?.accounts.id.initialize({
      client_id: clientId,
      nonce,
      callback: (response) => {
        if (!response.credential) {
          cleanup(container)
          reject(new Error("Google credential is empty"))
          return
        }

        cleanup(container)
        resolve({ idToken: response.credential, nonce })
      },
    })

    window.google?.accounts.id.renderButton(container, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "pill",
    })

    window.google?.accounts.id.prompt()
    window.setTimeout(() => {
      container
        .querySelector<HTMLElement>('div[role="button"], iframe, button')
        ?.click()
    }, 0)
  })
}

export { generateNonce, loadGsiScript, requestGoogleIdToken }
