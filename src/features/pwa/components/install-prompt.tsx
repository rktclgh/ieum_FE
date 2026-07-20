"use client"

import { InstallPromptDialog } from "@/features/pwa/components/install-prompt-dialog"
import { useInstallPrompt } from "@/features/pwa/hooks/use-install-prompt"

function InstallPrompt() {
  const { method, flow, isOpen, onInstall, onClose } = useInstallPrompt()

  if (method === "unavailable") return null

  return (
    <InstallPromptDialog
      method={method}
      flow={flow}
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      onInstall={onInstall}
    />
  )
}

export { InstallPrompt }
