import Image from "next/image"

import { cn } from "@/lib/utils"

const NO_IMAGE_SRC = "/icons/map/pin-no-image.svg"

// #111 디자인: 티어드롭 꼬리를 없애고 모든 핀을 44px 원 + 드롭섀도로 통일.
// 흰 원(44) 안에 40px 콘텐츠 원을 얹는 공통 컨테이너.
const OUTER = "relative flex size-11 items-center justify-center rounded-full bg-white shadow-[0_2px_4px_0_rgba(0,0,0,0.25)]"
const INNER = "flex size-10 items-center justify-center overflow-hidden rounded-full"

// ⚠️ 지도 위 실제 핀은 leaflet divIcon(React 트리 밖)이라 pin-marker.tsx/cluster-marker.tsx의
// plain HTML이 렌더링한다. 아래 컴포넌트는 동일 비주얼의 참조용 React 구현이다.

/** 모임 핀 — 흰 원 위에 40px 원형 프로필 이미지(없으면 no-image 아이콘) */
interface MeetupPinProps {
  imageSrc?: string
  imageAlt?: string
  className?: string
}

function MeetupPin({ imageSrc, imageAlt = "", className }: MeetupPinProps) {
  return (
    <div className={cn(OUTER, className)}>
      <div className={cn(INNER, "bg-gray-100")}>
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc} alt={imageAlt} className="size-full object-cover" />
        ) : (
          <Image src={NO_IMAGE_SRC} alt="" width={24} height={24} className="size-6" />
        )}
      </div>
    </div>
  )
}

/**
 * 질문 핀 — 흰 원 위에 40px 원.
 * 미해결: 흰 원 + gray900 물음표(#111). 해결됨: primary 원 + 흰 체크.
 * resolved는 pin-marker.tsx divIcon의 해결 분기와 동일 전제(현재 BE 미전송 선제 필드).
 */
function QuestionPin({ resolved, className }: { resolved?: boolean; className?: string }) {
  return (
    <div className={cn(OUTER, className)}>
      {resolved ? (
        <div className={cn(INNER, "bg-primary")}>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      ) : (
        <div className={cn(INNER, "bg-white")}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <path
              d="M18.185 29.2395V29.0424C18.1853 28.0705 18.998 27.2821 20 27.2818C21.0022 27.2818 21.8147 28.0703 21.815 29.0424V29.2395C21.815 30.2118 21.0024 31 20 31C18.9979 30.9997 18.185 30.2116 18.185 29.2395ZM23.37 16.9022C23.3695 14.9978 21.8235 13.521 20 13.521C18.1768 13.5213 16.6305 14.9979 16.63 16.9022C16.63 17.8745 15.8174 18.6627 14.815 18.6627C13.8126 18.6627 13 17.8745 13 16.9022C13.0005 13.1273 16.0966 10.0003 20 10C23.9037 10 26.9995 13.1271 27 16.9022C27 20.6777 23.904 23.8067 20 23.8067C18.998 23.8064 18.1852 23.0181 18.185 22.0462C18.185 21.0741 18.9979 20.286 20 20.2857C21.8238 20.2857 23.37 18.8071 23.37 16.9022Z"
              fill="#1f2324"
            />
          </svg>
        </div>
      )}
    </div>
  )
}

/** 클러스터 핀 — 다크 원(44) + 개수 */
function ClusterPin({ count, className }: { count: number; className?: string }) {
  return (
    <div
      className={cn(
        "flex size-11 items-center justify-center rounded-full bg-gray-900 shadow-[0_2px_4px_0_rgba(0,0,0,0.25)]",
        className,
      )}
    >
      <span className="text-body-semibold-15 text-white">{count}</span>
    </div>
  )
}

export { MeetupPin, QuestionPin, ClusterPin }
