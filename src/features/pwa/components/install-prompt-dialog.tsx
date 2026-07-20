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
import { IosInstallGuide } from "@/features/pwa/components/ios-install-guide"
import type { IosInstallFlow } from "@/features/pwa/lib/platform"
import { useTranslation } from "@/lib/i18n/use-translation"

interface InstallPromptDialogProps {
  method: "prompt" | "ios-manual"
  flow: IosInstallFlow
  open: boolean
  onOpenChange: (open: boolean) => void
  onInstall: () => void
}

function InstallPromptDialog({
  method,
  flow,
  open,
  onOpenChange,
  onInstall,
}: InstallPromptDialogProps) {
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
              {/* AlertDialogDescription은 <p>로 렌더되어 <ol>을 품을 수 없다.
                  ios-manual에서는 설명 대신 단계 목록을 제목의 형제로 둔다. */}
              {method === "ios-manual" ? (
                <IosInstallGuide flow={flow} />
              ) : (
                <AlertDialogDescription>{t.description}</AlertDialogDescription>
              )}
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
