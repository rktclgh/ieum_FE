import Image from "next/image"

import { cn } from "@/lib/utils"

const TEARDROP_SRC = "/icons/map/pin-teardrop.svg"

/** 모임 핀 — 눈물방울 배경 위에 원형 프로필 이미지 */
interface MeetupPinProps {
  imageSrc: string
  imageAlt?: string
  className?: string
}

function MeetupPin({ imageSrc, imageAlt = "", className }: MeetupPinProps) {
  return (
    <div className={cn("relative size-14", className)}>
      <Image src={TEARDROP_SRC} alt="" width={44} height={54} className="absolute top-0 left-1.5 h-[54px] w-11" />
      <div className="absolute top-0.5 left-1/2 size-10 -translate-x-1/2 overflow-hidden rounded-full bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageSrc} alt={imageAlt} className="size-full object-cover" />
      </div>
    </div>
  )
}

/** 질문 핀 — 눈물방울 배경 위에 흰 원 + 파란 물음표 */
function QuestionPin({ className }: { className?: string }) {
  return (
    <div className={cn("relative size-14", className)}>
      <Image src={TEARDROP_SRC} alt="" width={44} height={54} className="absolute top-0 left-1.5 h-[54px] w-11" />
      <div className="absolute top-0.5 left-1/2 flex size-10 -translate-x-1/2 items-center justify-center rounded-full bg-gray-50">
        <span className="text-[28px] leading-none font-bold text-primary-400">?</span>
      </div>
    </div>
  )
}

/** 클러스터 핀 — 다크 원 + 개수 */
function ClusterPin({ count, className }: { count: number; className?: string }) {
  return (
    <div className={cn("flex size-12 items-center justify-center rounded-full bg-gray-900", className)}>
      <span className="text-body-semibold-15 text-white">{count}</span>
    </div>
  )
}

export { MeetupPin, QuestionPin, ClusterPin }
