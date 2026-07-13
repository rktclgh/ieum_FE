"use client"

import * as React from "react"

import { useGeolocation } from "@/features/map/hooks/use-geolocation"
import { MeetupLocationMap } from "@/features/meetup/components/meetup-location-map"
import { MeetupLocationName } from "@/features/meetup/components/meetup-location-name"
import { MeetupLocationSearch } from "@/features/meetup/components/meetup-location-search"

interface MeetupLocationPickerProps {
  /** 확정된 장소명 (직접입력 화면 초기값) */
  value: string | null
  /** 장소를 확정하면 그 장소명을 넘긴다 */
  onConfirm: (value: string) => void
  /** 닫기 (오버레이 언마운트는 부모가 담당) */
  onClose: () => void
}

type Step =
  | { name: "map" }
  | { name: "search" }
  | { name: "create"; address: string }

/**
 * 모임 장소 선택 풀스크린 오버레이. 지도(#1) → 검색(#2) / 직접입력(#3) 3단계를 오간다.
 * 임시 텍스트 입력용 MeetupAddressPicker를 대체한다. 좌표까지 저장하는 폼 모델은 생성 API(#47)에서 확장.
 * 부모가 조건부로 마운트하므로 열 때마다 지도 단계에서 새로 시작한다.
 */
function MeetupLocationPicker({ value, onConfirm, onClose }: MeetupLocationPickerProps) {
  const [step, setStep] = React.useState<Step>({ name: "map" })
  const { position, requestLocation } = useGeolocation()

  const confirm = (name: string) => {
    onConfirm(name)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 mx-auto w-full max-w-sm bg-white">
      {step.name === "map" && (
        <MeetupLocationMap
          position={position}
          onRequestLocation={requestLocation}
          onBack={onClose}
          onOpenSearch={() => setStep({ name: "search" })}
          onCreateName={(address) => setStep({ name: "create", address })}
          onSelectPlace={confirm}
        />
      )}

      {step.name === "search" && (
        <MeetupLocationSearch
          near={position}
          onBack={() => setStep({ name: "map" })}
          onSelectPlace={confirm}
        />
      )}

      {step.name === "create" && (
        <MeetupLocationName
          address={step.address}
          initialValue={value ?? ""}
          onBack={() => setStep({ name: "map" })}
          onDone={confirm}
        />
      )}
    </div>
  )
}

export { MeetupLocationPicker }
