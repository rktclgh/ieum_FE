"use client"

import { useSyncExternalStore } from "react"

import { useTranslation } from "@/lib/i18n/use-translation"

const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)"

type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (listener: (event: MediaQueryListEvent) => void) => void
  removeListener?: (listener: (event: MediaQueryListEvent) => void) => void
}

let cachedMediaQueryList: LegacyMediaQueryList | null | undefined

function getMediaQueryList() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null
  }

  if (cachedMediaQueryList !== undefined) return cachedMediaQueryList

  const mediaQueryList = window.matchMedia(DESKTOP_MEDIA_QUERY) as LegacyMediaQueryList
  const supportsModernEvents = typeof mediaQueryList.addEventListener === "function"
  const supportsLegacyEvents =
    typeof mediaQueryList.addListener === "function" &&
    typeof mediaQueryList.removeListener === "function"

  cachedMediaQueryList =
    supportsModernEvents || supportsLegacyEvents ? mediaQueryList : null
  return cachedMediaQueryList
}

function subscribe(onStoreChange: () => void) {
  const mediaQueryList = getMediaQueryList()
  if (mediaQueryList === null) return () => undefined

  if (typeof mediaQueryList.addEventListener === "function") {
    mediaQueryList.addEventListener("change", onStoreChange)
    return () => mediaQueryList.removeEventListener("change", onStoreChange)
  }

  const legacyListener = () => onStoreChange()
  mediaQueryList.addListener?.(legacyListener)
  return () => mediaQueryList.removeListener?.(legacyListener)
}

function getSnapshot() {
  return getMediaQueryList()?.matches ?? false
}

function getServerSnapshot() {
  return false
}

function AdminDesktopBoundary({ children }: { children: React.ReactNode }) {
  const { messages } = useTranslation()
  const isDesktop = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  if (!isDesktop) {
    return (
      <main className="flex min-h-dvh w-full items-center justify-center bg-gray-50 px-6">
        <p className="max-w-lg text-center text-body-medium-16 text-gray-900">
          {messages.admin.auth.desktopOnly}
        </p>
      </main>
    )
  }

  return children
}

export { AdminDesktopBoundary }
