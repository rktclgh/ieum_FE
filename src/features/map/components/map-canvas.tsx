"use client"

import L from "leaflet"
import * as React from "react"
import { MapContainer, Marker, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"

import type { MapBounds, MapPin } from "@/features/map/api/pin-types"
import { ClusteredPins } from "@/features/map/components/clustered-pins"
import { PIN_ACCENT, PIN_COMBINED_SVG } from "@/features/map/components/map-center-pin"
import { VectorTileLayer } from "@/features/map/components/vector-tile-layer"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/features/map/constants/map"
import { isLeafletMapActive } from "@/features/map/lib/leaflet-map-lifecycle"
import {
  createProgrammaticMoveGate,
  type ProgrammaticMoveGate,
} from "@/features/map/lib/locate-following"
import {
  resolveVisibleCenterOffsetY,
  resolveVisibleCenterPoint,
} from "@/features/map/lib/visible-center"

/** 지도가 멈춘 뒤 중심 좌표를 방출하기까지의 지연(ms). 드래그 중 재조회를 막는다. */
const CENTER_SETTLE_DEBOUNCE_MS = 400

/**
 * 컨테이너 크기가 더는 바뀌지 않는다고 판단하기까지의 디바운스(ms).
 * 탭 전환 슬라이드(app/template.tsx, --motion-duration-base: 300ms)가 끝나며 나는
 * resize 한 번을 "최종 크기"로 확정하는 용도라, 애니메이션 길이보다 약간만 크면 된다.
 */
const SIZE_SETTLE_DEBOUNCE_MS = 150

interface MapCanvasProps {
  /** 재중심 시 이동할 좌표. 실시간 위치 갱신은 여기에 반영되어도 뷰를 움직이지 않는다(recenterKey로만 이동). */
  center: Coordinates | null
  /** 증가할 때마다 그 시점의 center로 지도를 이동시키는 nonce. 미지정이면 재중심 안 함 */
  recenterKey?: number
  /** 재중심 시 맞출 확대 단계. 없으면 현재 zoom 유지 */
  centerZoom?: number
  /** 재중심 시 flyTo로 부드럽게 이동할지 여부 */
  animateCenter?: boolean
  /** 상단 오버레이(헤더 등)에 가려지는 높이(px). 보이는 영역 정중앙 계산에 사용 */
  topInset?: number
  /** 하단 오버레이(시트 등)에 가려지는 높이(px). 보이는 영역 정중앙 계산에 사용 */
  bottomInset?: number
  className?: string
  onBoundsChange?: (bounds: MapBounds) => void
  pins?: MapPin[]
  onPinClick?: (pin: MapPin) => void
  /** 좌표가 겹쳐 확대해도 분리되지 않는 핀 더미를 탭했을 때 — 가로 캐러셀로 연다 */
  onPinStackClick?: (pins: MapPin[]) => void
  livePosition?: Coordinates | null
  /** 사용자가 지도에서 고른 지점 — Figma Location/XL 핀으로 표시 */
  selectedPosition?: Coordinates | null
  /** 선택 핀 마커를 클릭했을 때 (핀 토글 제거용). 미지정이면 마커 클릭 무반응 */
  onSelectedPositionClick?: () => void
  /** 지도가 움직이기 시작했을 때 — 화면 고정 핀 화면에서 "이동 중" 표시에 쓴다 */
  onCenterMoveStart?: () => void
  /** 지도가 멈춘 뒤(디바운스) 보이는 영역 중심의 좌표 */
  onCenterSettle?: (position: Coordinates) => void
  /**
   * 인셋이 바뀔 때 보이는 영역 중심에 있던 좌표를 새 중심으로 옮겨 유지한다.
   * 마운트 시에는 지도의 기하 중심(= center)을 보이는 영역 중심으로 정렬하는 효과.
   */
  alignCenterToVisibleArea?: boolean
  /** 사용자가 직접 지도를 움직였을 때. 코드가 일으킨 재중심에서는 호출되지 않는다 */
  onUserGesture?: () => void
  /** 베이스맵 스타일 로드가 끝나 지도가 실제로 그려진 시점. 로딩 스켈레톤을 걷는 신호로 쓴다 */
  onReady?: () => void
  /**
   * 컨테이너의 실제 크기가 더 이상 바뀌지 않는다고 확정된 시점(디바운스).
   * 탭 전환 애니메이션 중에는 지도 조상이 fixed 자식의 containing block이 되어 크기가
   * 일시적으로 뒤틀리므로(issue #355), 이 신호 이전에 스켈레톤을 걷으면 잘못된 크기의
   * 지도가 잠깐 보였다가 애니메이션이 끝난 뒤 툭 튀는(스냅) 것처럼 보인다.
   */
  onSizeSettle?: () => void
}

const LIVE_ACCENT = PIN_ACCENT

// Figma Location/XL (node 1716:12220): primary 색 물방울 핀 + 흰 구멍 + 회색 그림자 타원. 팁이 좌표를 가리킨다.
// 마크업은 화면 고정 핀(MapCenterPin)과 같은 path 데이터를 공유한다.
const selectedLocationIcon = L.divIcon({
  html: PIN_COMBINED_SVG,
  className: "",
  iconSize: [40, 47],
  iconAnchor: [20, 41],
})

// Leaflet은 같은 pane의 마커를 화면 y좌표 순으로 쌓아, 남쪽(아래) 마커가 위로 온다.
// 겹침 순서를 좌표가 아닌 역할로 고정하기 위해, 뷰포트 높이(px)보다 훨씬 큰 오프셋을 준다.
// 장소 선택 핀 > 내 위치 > 모임/질문 핀(오프셋 0).
const USER_LOCATION_Z_OFFSET = 10000
const SELECTED_LOCATION_Z_OFFSET = 20000

// Figma MyLocation (node 1716:11478): 44x44 컨테이너 = 헤일로 원 + 정중앙 점.
// 헤일로 에셋(Ellipse 400)은 44px 원(primary 20%)에 1px 가우시안 블러라, 블러가 사방 2px
// 번져 48x48로 그려진다. 그래서 컨테이너는 44인데 svg만 -2px 오프셋의 48x48이다.
const USER_LOCATION_SIZE = 44
const USER_LOCATION_HALO_SIZE = 48
const USER_LOCATION_HALO_OFFSET = (USER_LOCATION_SIZE - USER_LOCATION_HALO_SIZE) / 2

// 중심 점은 주황 코어 12px + 흰 테두리 3px = 바깥지름 18px.
// 테두리를 outline이 아닌 border로 그리는 것이 핵심이다. outline은 박스 바깥에 그려져
// box-shadow의 기준 박스가 코어(12px)로 남는 탓에, 주황 글로우가 흰 테두리와 같은 자리에서
// 피어올라 테두리 바깥 대비를 죽인다. border면 기준 박스가 18px이라 글로우가 테두리
// '바깥'에서 시작해, 흰 테두리가 헤일로 위에 또렷하게 얹힌다.
const userLocationIcon = L.divIcon({
  html: `<div style="position:relative;width:${USER_LOCATION_SIZE}px;height:${USER_LOCATION_SIZE}px">
    <svg xmlns="http://www.w3.org/2000/svg" width="${USER_LOCATION_HALO_SIZE}" height="${USER_LOCATION_HALO_SIZE}" viewBox="0 0 48 48" fill="none" style="position:absolute;left:${USER_LOCATION_HALO_OFFSET}px;top:${USER_LOCATION_HALO_OFFSET}px">
      <g filter="url(#user_loc_halo_blur)"><circle cx="24" cy="24" r="22" fill="${LIVE_ACCENT}" fill-opacity="0.2"/></g>
      <defs><filter id="user_loc_halo_blur" x="0" y="0" width="48" height="48" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur stdDeviation="1" result="effect1_foregroundBlur"/></filter></defs>
    </svg>
    <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);box-sizing:border-box;width:18px;height:18px;border-radius:999px;background:${LIVE_ACCENT};border:3px solid #ffffff;box-shadow:0 0 4px 0 rgba(0,0,0,0.25),0 0 8px 0 rgba(252,112,69,0.6)"></div>
  </div>`,
  className: "",
  iconSize: [USER_LOCATION_SIZE, USER_LOCATION_SIZE],
  iconAnchor: [USER_LOCATION_SIZE / 2, USER_LOCATION_SIZE / 2],
})

// react-leaflet Marker는 map이 해제되는 중(StrictMode 재마운트·HMR)에 마운트되면 mapPane이 없어
// leaflet Marker._initIcon의 getPane().appendChild에서 터진다. map이 살아 있을 때만 렌더한다.
function ActiveMarker(props: React.ComponentProps<typeof Marker>) {
  const map = useMap()
  if (!isLeafletMapActive(map)) return null
  return <Marker {...props} />
}

function MapCenterUpdater({
  center,
  recenterKey,
  zoom,
  animate,
  topInset = 0,
  bottomInset = 0,
  moveGate,
}: {
  center: Coordinates | null
  recenterKey: number
  zoom?: number
  animate?: boolean
  topInset?: number
  bottomInset?: number
  moveGate: ProgrammaticMoveGate
}) {
  const map = useMap()
  // 최초 마운트 시점의 key를 "이미 적용됨"으로 두어, 마운트만으로는 재중심하지 않는다.
  const appliedKeyRef = React.useRef(recenterKey)

  React.useEffect(() => {
    // recenterKey가 실제로 바뀌었을 때만 이동. center 실시간 갱신/인셋 변화에는 반응하지 않는다.
    if (appliedKeyRef.current === recenterKey) return
    // center가 아직 없으면 key를 소비하지 않는다. center는 deps에 있어 값이 채워지면 이 effect가
    // 다시 실행되고, 그때 비로소 재중심 후 key를 소비한다(요청 유실 방지).
    if (!center || !isLeafletMapActive(map)) return

    const targetZoom = zoom ?? map.getZoom()
    appliedKeyRef.current = recenterKey

    // 이 이동이 만들어낼 movestart/zoomstart를 사용자 제스처로 오인하지 않도록 구간을 연다.
    // 구간은 아래 moveend 리스너가 닫는다.
    moveGate.begin()

    // 헤더·하단 시트가 지도를 가리면 그만큼 패딩을 줘, 보이는 영역의 정중앙에 오도록 flyToBounds로 이동.
    if (topInset > 0 || bottomInset > 0) {
      map.flyToBounds(L.latLngBounds([center.lat, center.lng], [center.lat, center.lng]), {
        paddingTopLeft: [0, topInset],
        paddingBottomRight: [0, bottomInset],
        maxZoom: targetZoom,
      })
    } else if (animate) {
      map.flyTo([center.lat, center.lng], targetZoom)
    } else {
      map.setView([center.lat, center.lng], targetZoom)
    }
  }, [center, recenterKey, zoom, animate, topInset, bottomInset, map, moveGate])

  // 이동이 끝나면 구간을 닫는다. 목적지가 현재 뷰와 같아 moveend가 아예 오지 않을 수도 있으므로
  // 언마운트 시 reset으로 남은 구간을 정리한다.
  React.useEffect(() => {
    const closeGate = () => moveGate.end()
    map.on("moveend", closeGate)
    return () => {
      map.off("moveend", closeGate)
      moveGate.reset()
    }
  }, [map, moveGate])

  return null
}

/**
 * 사용자가 직접 지도를 움직였을 때만 알린다.
 *
 * dragstart는 사용자 드래그에서만 발생하지만 zoomstart는 flyTo에서도 발생하므로,
 * 프로그래매틱 이동 구간에서는 무시한다.
 */
function MapUserGestureWatcher({
  onUserGesture,
  moveGate,
}: {
  onUserGesture: () => void
  moveGate: ProgrammaticMoveGate
}) {
  const map = useMap()
  const onUserGestureRef = React.useRef(onUserGesture)

  React.useEffect(() => {
    onUserGestureRef.current = onUserGesture
  }, [onUserGesture])

  React.useEffect(() => {
    const handle = () => {
      if (moveGate.isProgrammatic()) return
      onUserGestureRef.current()
    }

    map.on("dragstart", handle)
    map.on("zoomstart", handle)

    return () => {
      map.off("dragstart", handle)
      map.off("zoomstart", handle)
    }
  }, [map, moveGate])

  return null
}

/**
 * 인셋이 바뀌어도 "보이는 영역 중심에 있던 좌표"가 그대로 중심에 남도록 지도를 픽셀 단위로 보정한다.
 *
 * 하단 시트는 주변 장소가 로드되면 높이가 자란다. 보정하지 않으면 화면 고정 핀의 위치가 밀리면서
 * 사용자가 고른 지점이 목록 로드만으로 바뀌어 버린다. 좌표가 아니라 픽셀 델타로 옮기므로
 * 핀 아래 좌표는 정의상 불변이고, 따라서 재조회도 일어나지 않는다.
 *
 * 최초 실행 시 이전 인셋은 0 — 즉 지도의 기하 중심이므로, 마운트 center(내 위치)를
 * 보이는 영역 정중앙으로 끌어내리는 초기 정렬이 같은 계산으로 처리된다.
 */
function VisibleCenterAligner({
  topInset = 0,
  bottomInset = 0,
}: {
  topInset?: number
  bottomInset?: number
}) {
  const map = useMap()
  const appliedInsetsRef = React.useRef({ topInset: 0, bottomInset: 0 })

  React.useEffect(() => {
    const align = () => {
      // whenReady는 map이 아직 준비되지 않았으면 콜백을 큐에 넣으므로 언마운트 뒤에 불릴 수 있다.
      if (!isLeafletMapActive(map)) return

      const size = map.getSize()
      if (size.x <= 0 || size.y <= 0) return

      const applied = appliedInsetsRef.current
      const previousOffset = resolveVisibleCenterOffsetY({
        width: size.x,
        height: size.y,
        topInset: applied.topInset,
        bottomInset: applied.bottomInset,
      })
      const nextOffset = resolveVisibleCenterOffsetY({
        width: size.x,
        height: size.y,
        topInset,
        bottomInset,
      })

      appliedInsetsRef.current = { topInset, bottomInset }

      const delta = nextOffset - previousOffset
      if (Math.abs(delta) < 1) return

      // 콘텐츠를 아래로 delta만큼 내리려면 뷰포트는 그 반대로 이동한다.
      map.panBy([0, -delta], { animate: false })
    }

    // 크기가 아직 0이면 위에서 그냥 빠져나가는데, 인셋은 이 컴포넌트가 붙기 전에 이미
    // 확정되는 경우가 많아(지도는 next/dynamic으로 늦게 마운트된다) effect가 다시 돌 계기가 없다.
    // resize를 재시도 경로로 둬서 초기 정렬이 영영 유실되지 않게 한다.
    map.whenReady(align)
    map.on("resize", align)

    return () => {
      map.off("resize", align)
    }
  }, [topInset, bottomInset, map])

  return null
}

/**
 * 보이는 영역 중심의 좌표를 부모에 알린다. 드래그·줌 중에는 방출하지 않고,
 * 멈춘 뒤 디바운스로 한 번만 방출해 역지오코딩 호출을 억제한다.
 */
function MapCenterWatcher({
  topInset = 0,
  bottomInset = 0,
  onMoveStart,
  onSettle,
}: {
  topInset?: number
  bottomInset?: number
  onMoveStart?: () => void
  onSettle: (position: Coordinates) => void
}) {
  const map = useMap()
  const onMoveStartRef = React.useRef(onMoveStart)
  const onSettleRef = React.useRef(onSettle)
  const insetsRef = React.useRef({ topInset, bottomInset })

  React.useEffect(() => {
    onMoveStartRef.current = onMoveStart
    onSettleRef.current = onSettle
    insetsRef.current = { topInset, bottomInset }
  }, [onMoveStart, onSettle, topInset, bottomInset])

  React.useEffect(() => {
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const emit = () => {
      if (disposed || !isLeafletMapActive(map)) return

      const size = map.getSize()
      if (size.x <= 0 || size.y <= 0) return

      const point = resolveVisibleCenterPoint({
        width: size.x,
        height: size.y,
        ...insetsRef.current,
      })
      const latlng = map.containerPointToLatLng([point.x, point.y])
      onSettleRef.current({ lat: latlng.lat, lng: latlng.lng })
    }

    const scheduleEmit = () => {
      if (disposed) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        emit()
      }, CENTER_SETTLE_DEBOUNCE_MS)
    }

    const handleMoveStart = () => {
      if (disposed) return
      onMoveStartRef.current?.()
    }

    // 최초 좌표도 디바운스를 거친다. 마운트 직후의 인셋 정렬 이동이 같은 창에 흡수되어
    // 정렬 전의 잘못된 중심으로 조회가 나가지 않는다.
    map.whenReady(scheduleEmit)
    map.on("movestart", handleMoveStart)
    map.on("zoomstart", handleMoveStart)
    map.on("moveend", scheduleEmit)
    map.on("zoomend", scheduleEmit)

    return () => {
      disposed = true
      if (timer) clearTimeout(timer)
      map.off("movestart", handleMoveStart)
      map.off("zoomstart", handleMoveStart)
      map.off("moveend", scheduleEmit)
      map.off("zoomend", scheduleEmit)
    }
  }, [map])

  return null
}

// 지도 영역(bbox)을 부모에 알린다. moveend/zoomend를 debounce로 합쳐 과도한 재조회를 막고,
// 최초 mount 시 1회 즉시 방출한다. onBoundsChange를 ref에 담아 effect 재실행/무한 루프를 피한다.
function MapBoundsWatcher({ onBoundsChange }: { onBoundsChange: (bounds: MapBounds) => void }) {
  const map = useMap()
  const onBoundsChangeRef = React.useRef(onBoundsChange)

  React.useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange
  }, [onBoundsChange])

  React.useEffect(() => {
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const emit = () => {
      if (disposed || !isLeafletMapActive(map)) return

      const bounds = map.getBounds()
      const sw = bounds.getSouthWest()
      const ne = bounds.getNorthEast()
      onBoundsChangeRef.current({ swLat: sw.lat, swLng: sw.lng, neLat: ne.lat, neLng: ne.lng })
    }

    const scheduleEmit = () => {
      if (disposed) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        emit()
      }, 250)
    }

    // Leaflet이 준비된 뒤에만 최초 bounds를 읽고, 해제 시 listener와 지연 작업을 함께 제거한다.
    map.whenReady(emit)
    map.on("moveend", scheduleEmit)
    map.on("zoomend", scheduleEmit)

    return () => {
      disposed = true
      if (timer) clearTimeout(timer)
      map.off("moveend", scheduleEmit)
      map.off("zoomend", scheduleEmit)
    }
  }, [map])

  return null
}

// 홈 탭 재진입 시 탭 전환 슬라이드 애니메이션(app/template.tsx)이 지도 조상 요소에
// transform을 거는 동안, transform이 없는 요소가 아닌 이상 그 조상이 하위 fixed 요소의
// containing block이 된다(CSS 스펙). 지도 루트가 fixed라 이 구간에 Leaflet이 마운트되면
// 컨테이너 크기를 잘못 측정하고, 애니메이션이 끝나 레이아웃이 정상으로 돌아와도
// Leaflet은 스스로 재측정하지 않아 그 잘못된 크기로 굳어버린다(issue #355).
// 컨테이너의 실제 박스 크기가 바뀔 때마다 invalidateSize()로 자가 교정하고,
// 크기가 잠잠해지면(디바운스) onSizeSettle로 "이제 최종 크기다"를 알린다 — 부모가 이 신호로
// 스켈레톤을 걷으면, 잘못된 크기가 잠깐 노출됐다가 애니메이션 종료 후 툭 튀는 스냅 없이
// 최종 크기로 자리잡은 지도만 크로스페이드로 드러난다.
function MapSizeObserver({ onSizeSettle }: { onSizeSettle?: () => void }) {
  const map = useMap()
  const onSizeSettleRef = React.useRef(onSizeSettle)
  React.useEffect(() => {
    onSizeSettleRef.current = onSizeSettle
  }, [onSizeSettle])

  React.useEffect(() => {
    if (!isLeafletMapActive(map)) return

    const container = map.getContainer()
    let settleTimer: ReturnType<typeof setTimeout> | null = null

    const observer = new ResizeObserver(() => {
      if (!isLeafletMapActive(map)) return
      map.invalidateSize()

      if (settleTimer) clearTimeout(settleTimer)
      settleTimer = setTimeout(() => {
        settleTimer = null
        onSizeSettleRef.current?.()
      }, SIZE_SETTLE_DEBOUNCE_MS)
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
      if (settleTimer) clearTimeout(settleTimer)
    }
  }, [map])

  return null
}

function MapCanvas({
  center,
  recenterKey,
  centerZoom,
  animateCenter,
  topInset,
  bottomInset,
  className,
  onBoundsChange,
  pins,
  onPinClick,
  onPinStackClick,
  livePosition,
  selectedPosition,
  onSelectedPositionClick,
  onCenterMoveStart,
  onCenterSettle,
  alignCenterToVisibleArea,
  onUserGesture,
  onReady,
  onSizeSettle,
}: MapCanvasProps) {
  const initialCenter = center ?? DEFAULT_MAP_CENTER
  // React refresh/조건부 재마운트에서 이전 Leaflet map의 remove가 늦더라도 새 map은 다른 DOM 컨테이너를 쓴다.
  const [mapContainerKey] = React.useState(() => crypto.randomUUID())
  // 재중심을 일으키는 쪽(MapCenterUpdater)과 제스처를 판정하는 쪽(MapUserGestureWatcher)이 공유한다.
  const [moveGate] = React.useState(createProgrammaticMoveGate)

  return (
    <MapContainer
      key={mapContainerKey}
      center={[initialCenter.lat, initialCenter.lng]}
      zoom={DEFAULT_MAP_ZOOM}
      zoomControl={false}
      attributionControl={false}
      className={className}
    >
      <VectorTileLayer onReady={onReady} />
      <MapSizeObserver onSizeSettle={onSizeSettle} />
      <MapCenterUpdater
        center={center}
        recenterKey={recenterKey ?? 0}
        zoom={centerZoom}
        animate={animateCenter}
        topInset={topInset}
        bottomInset={bottomInset}
        moveGate={moveGate}
      />
      {alignCenterToVisibleArea && (
        <VisibleCenterAligner topInset={topInset} bottomInset={bottomInset} />
      )}
      {onCenterSettle && (
        <MapCenterWatcher
          topInset={topInset}
          bottomInset={bottomInset}
          onMoveStart={onCenterMoveStart}
          onSettle={onCenterSettle}
        />
      )}
      {onUserGesture && <MapUserGestureWatcher onUserGesture={onUserGesture} moveGate={moveGate} />}
      {onBoundsChange && <MapBoundsWatcher onBoundsChange={onBoundsChange} />}
      {pins && pins.length > 0 && (
        <ClusteredPins
          pins={pins}
          onPinClick={onPinClick}
          onPinStackClick={onPinStackClick}
          topInset={topInset}
          bottomInset={bottomInset}
        />
      )}
      {selectedPosition && (
        <ActiveMarker
          position={[selectedPosition.lat, selectedPosition.lng]}
          icon={selectedLocationIcon}
          zIndexOffset={SELECTED_LOCATION_Z_OFFSET}
          eventHandlers={onSelectedPositionClick ? { click: onSelectedPositionClick } : undefined}
        />
      )}
      {livePosition && (
        <ActiveMarker
          position={[livePosition.lat, livePosition.lng]}
          icon={userLocationIcon}
          zIndexOffset={USER_LOCATION_Z_OFFSET}
          // 시각적으로는 맨 위지만 클릭은 통과시킨다(leaflet.css: .leaflet-interactive가 없으면 pointer-events:none).
          // 아래에 겹친 모임/질문 핀이 선택되도록.
          interactive={false}
        />
      )}
    </MapContainer>
  )
}

export { MapCanvas }
