"use client"

import * as React from "react"
import Image from "next/image"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerPopup,
  DrawerPortal,
  DrawerTrigger,
  DrawerViewport,
} from "@/components/ui/drawer"
import { LANGUAGE_CODES, LANGUAGE_NATIVE_NAMES, type LanguageCode } from "@/lib/i18n/languages"
import { MESSAGES } from "@/lib/i18n/messages"
import { useTranslation } from "@/lib/i18n/use-translation"

function LanguageToggle({ className, ...props }: React.ComponentProps<"button">) {
  const { language, setLanguage, messages } = useTranslation()
  const [pendingLanguage, setPendingLanguage] = React.useState<LanguageCode>(language)

  return (
    <Drawer
      onOpenChange={(open) => {
        if (open) setPendingLanguage(language)
      }}
    >
      <DrawerTrigger
        data-slot="language-toggle"
        className={cn(
          "flex items-center gap-0.5 rounded-full border border-gray-100 bg-gray-50 py-1.5 pr-2.5 pl-3 text-body-regular-12 text-gray-900",
          className
        )}
        {...props}
      >
        {messages.languages[language]}
        <Image src="/icons/arrow/down.svg" alt="" width={20} height={20} className="size-5" />
      </DrawerTrigger>
      <DrawerPortal>
        <DrawerBackdrop />
        <DrawerViewport>
          <DrawerPopup>
            <DrawerContent>
              <div className="flex w-full flex-col items-start">
                {LANGUAGE_CODES.map((code) => {
                  const selected = code === pendingLanguage
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setPendingLanguage(code)}
                      className={cn(
                        "flex w-full items-center justify-between px-4 py-4 text-body-medium-16 text-gray-900",
                        selected ? "rounded-2xl bg-gray-50" : "rounded-xl"
                      )}
                    >
                      {LANGUAGE_NATIVE_NAMES[code]}
                      {selected && <Check className="size-6 text-gray-400" strokeWidth={1.5} />}
                    </button>
                  )
                })}
              </div>

              <DrawerClose
                render={<Button variant="primary" size="block" />}
                onClick={() => setLanguage(pendingLanguage)}
              >
                {MESSAGES[pendingLanguage].languagePicker.confirm}
              </DrawerClose>
            </DrawerContent>
          </DrawerPopup>
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  )
}

export { LanguageToggle }
