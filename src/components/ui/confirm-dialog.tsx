import * as React from "react"

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

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description: React.ReactNode
  cancelLabel: string
  confirmLabel: string
  onConfirm: () => void
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel,
  confirmLabel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogPortal>
        <AlertDialogBackdrop />
        <AlertDialogViewport>
          <AlertDialogPopup>
            <div className="flex w-full max-w-[272px] flex-col items-center gap-2.5 px-2 pt-2 pb-4">
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription>{description}</AlertDialogDescription>
            </div>
            <div className="flex w-full max-w-[272px] items-start gap-4">
              <AlertDialogClose className="flex flex-1 items-center justify-center rounded-full bg-gray-100 px-3 py-2.5 text-body-medium-14 text-gray-900">
                {cancelLabel}
              </AlertDialogClose>
              <button
                type="button"
                onClick={onConfirm}
                className="flex flex-1 items-center justify-center rounded-full bg-gray-100 px-3 py-2.5 text-body-medium-14 text-gray-900"
              >
                {confirmLabel}
              </button>
            </div>
          </AlertDialogPopup>
        </AlertDialogViewport>
      </AlertDialogPortal>
    </AlertDialog>
  )
}

export { ConfirmDialog }
