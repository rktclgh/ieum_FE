"use client"

import * as React from "react"

import type { Place } from "@/features/map/api/place-search-api"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import { useGeolocation } from "@/features/map/hooks/use-geolocation"
import type { MeetupPlaceValue } from "@/features/meetup/constants/create-meetup"
import { MeetupLocationMap } from "@/features/meetup/components/meetup-location-map"
import { MeetupLocationName } from "@/features/meetup/components/meetup-location-name"
import { MeetupLocationSearch } from "@/features/meetup/components/meetup-location-search"

interface MeetupLocationPickerProps {
  /** 확정된 장소명 (직접입력 화면 초기값) */
  value: string | null
  /** 장소를 확정하면 좌표·주소·라벨을 담아 넘긴다 (POST /meetings location) */
  onConfirm: (place: MeetupPlaceValue) => void
  /** 닫기 (오버레이 언마운트는 부모가 담당) */
  onClose: () => void
}

type Step =
  | { name: "map" }
  | { name: "search" }
  | { name: "create"; address: string; coords: Coordinates }

/**
 * 모임 장소 선택 풀스크린 오버레이. 지도(#1) → 검색(#2) / 직접입력(#3) 3단계를 오간다.
 * 확정 시 좌표(lat/lng)·도로명 주소·라벨을 담은 MeetupPlaceValue를 내보내 POST /meetings에 매핑한다.
 * 부모가 조건부로 마운트하므로 열 때마다 지도 단계에서 새로 시작한다.
 */
function MeetupLocationPicker({ value, onConfirm, onClose }: MeetupLocationPickerProps) {
  const [step, setStep] = React.useState<Step>({ name: "map" })
  const { position, initialStatus } = useGeolocation()

  const confirm = (place: MeetupPlaceValue) => {
    onConfirm(place)
    onClose()
  }

  // 검색·주변 결과(상호): 라벨=상호명, 주소=도로명, 좌표=Place
  const confirmPlace = (place: Place) =>
    confirm({ lat: place.lat, lng: place.lng, address: place.address, label: place.name })

  return (
    <div className="fixed inset-0 z-50 mx-auto w-full max-w-sm bg-white">
      {step.name === "map" && (
        <MeetupLocationMap
          position={position}
          initialStatus={initialStatus}
          onBack={onClose}
          onOpenSearch={() => setStep({ name: "search" })}
          onCreateName={(address, coords) => setStep({ name: "create", address, coords })}
          onSelectPlace={confirmPlace}
        />
      )}

      {step.name === "search" && (
        <MeetupLocationSearch
          near={position}
          onBack={() => setStep({ name: "map" })}
          onSelectPlace={confirmPlace}
          onCreateName={(address, coords) => setStep({ name: "create", address, coords })}
        />
      )}

      {step.name === "create" && (
        <MeetupLocationName
          address={step.address}
          initialValue={value ?? ""}
          onBack={() => setStep({ name: "map" })}
          onDone={(label) =>
            confirm({ lat: step.coords.lat, lng: step.coords.lng, address: step.address, label })
          }
        />
      )}
    </div>
  )
}

export { MeetupLocationPicker }
