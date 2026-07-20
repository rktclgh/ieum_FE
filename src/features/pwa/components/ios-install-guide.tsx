"use client"

import { Ellipsis, Share, SquarePlus } from "lucide-react"

import type { IosInstallFlow } from "@/features/pwa/lib/platform"
import type { InstallGuideIcon, InstallGuideStep } from "@/lib/i18n/messages/install-guide-step"
import { useTranslation } from "@/lib/i18n/use-translation"

const ICON_COMPONENTS: Record<InstallGuideIcon, typeof Share> = {
  ellipsis: Ellipsis,
  share: Share,
  "square-plus": SquarePlus,
}

interface IosInstallGuideProps {
  flow: IosInstallFlow
}

// 아이콘은 문구를 보조할 뿐이라 aria-hidden으로 감춘다. 각 단계는 버튼 이름을
// 텍스트로도 담고 있어 아이콘 없이 읽어도 뜻이 통한다.
function IosInstallGuide({ flow }: IosInstallGuideProps) {
  const { messages } = useTranslation()
  const steps: InstallGuideStep[] = messages.pwa.iosSteps[flow]

  return (
    <ol className="flex w-full list-none flex-col gap-2">
      {steps.map((parts, stepIndex) => (
        <li key={stepIndex} className="flex gap-1.5 text-body-regular-14 text-gray-900">
          <span className="shrink-0 tabular-nums">{stepIndex + 1}.</span>
          <span className="flex-1">
            {parts.map((part, partIndex) => {
              if (typeof part === "string") return part
              const Icon = ICON_COMPONENTS[part.icon]
              return (
                <Icon
                  key={partIndex}
                  aria-hidden
                  className="inline-block size-[1em] shrink-0 translate-y-[0.1em]"
                />
              )
            })}
          </span>
        </li>
      ))}
    </ol>
  )
}

export { IosInstallGuide }
