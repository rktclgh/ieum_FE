"use client"

import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogPopup,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogViewport,
} from "@/components/ui/alert-dialog"
import { useTranslation } from "@/lib/i18n/use-translation"

interface InstallPromptDialogProps {
  method: "prompt" | "ios-manual"
  open: boolean
  onOpenChange: (open: boolean) => void
  onInstall: () => void
}

function InstallPromptDialog({ method, open, onOpenChange, onInstall }: InstallPromptDialogProps) {
  const { messages } = useTranslation()
  const t = messages.pwa

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogPortal>
        <AlertDialogBackdrop />
        <AlertDialogViewport>
          <AlertDialogPopup>
            <div className="flex w-full max-w-[272px] flex-col items-center gap-2.5 px-2 pt-2 pb-4">
              <AlertDialogTitle>{t.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {method === "ios-manual" ? t.iosDescription : t.description}
              </AlertDialogDescription>
            </div>
            {method === "ios-manual" ? (
              <div className="flex w-full max-w-[272px]">
                <AlertDialogClose className="flex w-full items-center justify-center rounded-full bg-gray-100 px-3 py-2.5 text-body-medium-14 text-gray-900">
                  {t.confirm}
                </AlertDialogClose>
              </div>
            ) : (
              <div className="flex w-full max-w-[272px] items-start gap-4">
                <AlertDialogClose className="flex flex-1 items-center justify-center rounded-full bg-gray-100 px-3 py-2.5 text-body-medium-14 text-gray-900">
                  {t.later}
                </AlertDialogClose>
                <button
                  type="button"
                  onClick={onInstall}
                  className="flex flex-1 items-center justify-center rounded-full bg-gray-100 px-3 py-2.5 text-body-medium-14 text-gray-900"
                >
                  {t.install}
                </button>
              </div>
            )}
          </AlertDialogPopup>
        </AlertDialogViewport>
      </AlertDialogPortal>
    </AlertDialog>
  )
}

export { InstallPromptDialog }
