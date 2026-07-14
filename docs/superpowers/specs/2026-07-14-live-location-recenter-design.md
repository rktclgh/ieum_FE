# 실시간 내 위치 표시 + 위치 버튼 recenter 설계

- 날짜: 2026-07-14
- 브랜치(예정): `fix/#<이슈번호>` (base: `develop`)
- 라벨: `fix`
- 대상 화면 2개: 홈 지도, 모임 만들기 - 장소 선택

## 배경 / 문제

**홈 지도** — 현재 `circle/location` 버튼은 follow-me 토글이다. 누르면 실시간 추적이
켜지면서 내 위치 마커(파란 점)가 나타나고, 지도를 드래그하면 추적이 해제된다. 버튼을
누르지 않은 기본 상태에서는 **내 위치 마커가 보이지 않는다.**

**모임 장소 선택** — 내 위치 마커는 항상 표시되고 drawer를 제외한 보이는 영역 중심으로
recenter하는 UI/로직은 이미 구현돼 있으나, 위치는 `getCurrentPosition` **1회 조회 + GPS
버튼 수동 재조회**만 하고 **실시간 추적을 하지 않는다.**

## 목표 (원하는 동작)

두 화면 공통:

1. **내 위치 마커(파란 점 + 정확도 원)를 기본으로 항상 표시**하고, 위치를 **실시간
   추적**(watchPosition)하여 마커가 실시간 갱신된다.
2. 실시간 위치 갱신은 **마커만 움직이고 지도 뷰(중심)는 자동으로 따라가지 않는다.**
   지도 중심 이동은 명시적 트리거(최초 위치 확보 1회 / 위치 버튼 클릭 / 검색 선택)에만
   일어난다.
3. **위치 버튼**은 토글이 아니라 **일회성 recenter 액션**이다. 누르면 현재 내 위치가
   지도 중심에 오도록 지도를 이동한다.
   - 홈: 화면 정중앙으로 이동.
   - 모임 장소 선택: **drawer(하단 시트)·헤더를 제외한, 사용자에게 보이는 지도 영역의
     정중앙**으로 이동 (이미 구현된 inset 기반 `flyToBounds` 유지).

시각 디자인(Figma node 1716-12206)은 모임 장소 선택 화면 기준이며 **현재 구현과 이미
일치**한다. 따라서 이 작업에 **시각적 변경은 없고 동작(behavior) 변경만** 포함한다.

## 핵심 설계 결정

### 왜 recenter를 좌표 갱신과 분리하는가 (nonce 패턴)

`useGeolocation`을 항상-watch로 바꾸면 `position`이 매 GPS 틱마다 **새 객체**가 된다.
두 화면 모두 지도 중심을 `center = position`으로 잡고, `MapCenterUpdater`가 `center`
객체가 바뀔 때마다 재중심하므로, 그대로 두면 **지도가 실시간으로 계속 재중심**되어
사용자 조작을 방해한다.

→ 지도 중심 이동을 "좌표(center)"가 아니라 **명시적 recenter 신호(`recenterKey` nonce)**
로 구동한다. `recenterKey`가 증가할 때만 그 시점의 최신 `center`로 이동한다. 마커
위치(`livePosition`)는 이와 무관하게 항상 실시간 `position`을 쓴다.

## 컴포넌트별 변경

### 1. `src/features/map/hooks/use-geolocation.ts` (공통, 리라이트)

- mount 시 `navigator.geolocation.watchPosition` 시작, 언마운트 시 `clearWatch`.
- 반환 표면을 단순화: `{ position, accuracy, status, isSupported }`.
- **제거**: `requestLocation`, `startFollow`, `stopFollow`, `toggleFollow`, `isFollowing`,
  `watchIdRef` 기반 follow 토글, requestId 재조회 이펙트.
- 미지원/권한 거부 시 `status = "error"`, `position`은 `null` 유지.

### 2. `src/features/map/components/map-canvas.tsx` (공통)

- `MapCenterUpdater`의 "center 객체 동일성" 가드를 **`recenterKey`(number nonce) 기반**
  으로 교체.
  - 최신 `center`를 ref에 보관.
  - `recenterKey`가 바뀌면 그 시점의 `centerRef.current`로 이동.
  - 이동 방식은 기존 유지: inset(topInset/bottomInset) > 0이면 `flyToBounds`(패딩),
    아니면 `animate`면 `flyTo`, 아니면 `setView`. `centerZoom`/`animateCenter` 유지.
- `MapCanvasProps`에 `recenterKey?: number` 추가. `center`는 "이동할 좌표"로만 쓰이고
  더 이상 그 자체로 재중심을 트리거하지 않는다.
- `livePosition`/`liveAccuracy`/`selectedPosition`/pin/bounds 로직은 그대로.
- `MapDragListener`/`onUserPan`은 유지하되 홈에서 사용을 뗀다(아래).

### 3. `src/features/map/components/map-controls.tsx` (홈)

- prop `onToggleFollow`/`isFollowing` → **`onRecenter: () => void`** 로 교체.
- 위치 Circle 버튼: `aria-pressed`·`outline` 상태 스타일 제거, `onClick={onRecenter}`.
- aria-label i18n 키는 "내 위치로 이동" 의미로 유지/보정.

### 4. `src/features/map/components/home-map-screen.tsx` (홈)

- `const { position, accuracy } = useGeolocation()` — 항상 사용.
- `livePosition={position}`·`liveAccuracy={accuracy}`를 **항상** 전달(isFollowing 게이팅
  제거).
- `recenterKey`(nonce) + `recenterTarget`(이동 목표 좌표) 상태 관리:
  - **최초 위치 fix 1회**: `position`이 처음 non-null이 될 때 target=position, key++.
  - **위치 버튼**: `onRecenter` → target=현재 `position`, key++.
  - **검색 선택**: `focusedPlace` 설정 + target=place, key++.
- `center`(=이동 목표)는 `recenterTarget`을 넘기고, `recenterKey`도 함께 넘긴다.
- **제거**: `toggleFollow`, `stopFollow`, `onUserPan`(MapDragListener 사용), follow 토글
  핸들러.

### 5. `src/features/meetup/components/meetup-location-map.tsx` (모임)

- `livePosition={position}` 유지(공통 hook 덕에 자동으로 실시간 갱신됨).
- 지도 중심을 `recenterKey`로 구동하도록 전환:
  - **최초 fix 1회** auto-center, **GPS 버튼** 클릭 시 target=`position`, key++.
  - inset(header/sheet 높이) 계산·`flyToBounds`·`centerZoom`·`animateCenter`는 유지 →
    "drawer 제외 보이는 영역 정중앙" 동작 그대로.
- GPS 버튼 핸들러: `onRequestLocation()` → recenter(nonce) 로 의미 변경.
- 시각/레이아웃 변경 없음.

### 6. `src/features/meetup/components/meetup-location-picker.tsx` (모임)

- `const { position } = useGeolocation()` — `requestLocation` 제거.
- recenter nonce는 `meetup-location-map` 내부에서 관리하므로 picker는 `position`만
  전달하도록 정리(또는 nonce 관리를 map 컴포넌트로 위임).

## 영향 없음 / 범위 밖 (YAGNI)

- 지도 타일/핀/역지오코딩/장소 검색 로직 변경 없음.
- 홈 리스트 버튼(#75) 배선은 이 이슈 범위 밖.
- 시각 디자인 변경 없음(Figma와 이미 일치).

## 독립성

이 fix가 건드리는 6개 파일은 feat/#75·feat/#76 어느 브랜치에서도 수정 이력이 없어
**병렬 진행 가능**. `develop`에서 `fix/#<번호>` 브랜치로 작업한다.

## 검증

- 홈: 진입 시 파란 점이 즉시 보이고 실시간 갱신, 지도는 자동으로 안 따라감. 위치 버튼
  누르면 내 위치가 정중앙으로 이동. 드래그해도 마커 유지(추적 해제 개념 없음).
- 모임 장소 선택: 파란 점 실시간 갱신, GPS 버튼 누르면 drawer 위 보이는 영역 정중앙으로
  이동.
- `pnpm build` 클린.
