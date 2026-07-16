# #170 장소 선택 지도 초기 GPS viewport 설계

작성일: 2026-07-16 · 브랜치: fix/#170-map-initial-gps · 기준 브랜치: develop

## 배경

새 모임 작성에서 장소 선택을 열면 MeetupLocationPicker의 geolocation 결과가 아직 null인 상태에도 MeetupLocationMap이 즉시 MapCanvas를 렌더한다. MapCanvas는 null center를 서울시청 기본 좌표로 바꿔 MapContainer를 생성한다. 그 뒤 첫 GPS 결과가 도착하면 장소 선택 화면의 초기 중심 effect가 recenterKey를 증가시키고, header/sheet inset이 있는 경로가 flyToBounds를 실행한다.

따라서 사용자는 서울 중심 지도를 먼저 본 뒤 현재 위치까지 이동하는 모션을 보게 된다. dynamic import 완료 시점과 GPS 응답 순서에 따라 GPS가 먼저 도착하면 처음부터 정상으로 보일 수 있어, 재현이 간헐적으로 보인다.

홈 지도는 #106에서 GPS 상태가 확정될 때까지 지도 마운트를 늦춰 이 문제를 완화했지만, 장소 선택 화면에는 같은 보호막이 없다.

## 확정된 사용자 계약

1. 정상 GPS 경로에서 첫 Leaflet 지도 viewport는 현재 GPS 좌표여야 한다.
2. 정상 GPS 경로는 서울 기본 좌표를 렌더링하거나 자동 flyToBounds를 호출하지 않는다.
3. 장소 선택은 임의 3.5초 제한으로 fallback하지 않는다. 브라우저 geolocation이 실제 error 상태가 될 때만 fallback한다.
4. 위치 버튼을 사용자가 누르는 명시적 recenter는 기존 header/sheet 제외 정중앙 동작을 유지한다.
5. 권한 거부·미지원·timeout fallback에서는 서울시청 기준 지도와 원인을 안내하고, 사용자가 지도에서 지점을 고르면 기존 장소 선택 흐름을 계속 사용할 수 있어야 한다.

현재 useGeolocation의 browser timeout은 10초다. 따라서 이 화면은 위치 결과를 최대 그 terminal result까지 기다리며, 기존 홈 화면의 MAP_LOCATION_WAIT_MS 3.5초 타이머를 재사용하지 않는다.

## 선택한 접근

### A. 장소 선택 전용 초기 viewport gate — 채택

MeetupLocationPicker가 이미 소유한 position과 status를 MeetupLocationMap에 함께 전달한다. 새 순수 resolver가 다음 규칙으로 최초 중심을 결정한다.

~~~ts
function resolveInitialMapCenter({
  position,
  status,
  fallbackCenter,
}: InitialMapCenterInput): Coordinates | null {
  if (position) return position
  return status === "error" ? fallbackCenter : null
}
~~~

- null: GPS 조회 중이므로 MapCanvas를 마운트하지 않고 MapLoadingSkeleton만 렌더한다.
- GPS 좌표: 그 값을 MapCanvas.center에 전달해 MapContainer가 해당 좌표로 최초 생성된다.
- error + 좌표 없음: 서울시청 fallback을 최초 center로 사용하고 안내 문구를 표시한다.

첫 GPS 수신용 hasCenteredRef effect는 제거한다. 따라서 정상 경로에서 recenterKey는 0으로 남고 MapCenterUpdater는 자동 flyToBounds를 실행하지 않는다. recenterKey 증가는 GPS 버튼의 명시적 사용자 행동에서만 일어난다.

이 접근은 공용 MapCanvas와 홈 지도 동작을 바꾸지 않아 영향 범위가 가장 작다.

### B. 홈의 3.5초 wait timer 복제 — 미채택

빠르게 서울 기본 지도를 보여줄 수 있지만, GPS가 3.5초 뒤에 오면 같은 서울→GPS 모션이 다시 생긴다. 사용자가 요청한 fallback 거의 없음과 맞지 않는다.

### C. MapCanvas의 flyToBounds 전역 정책 변경 — 미채택

홈 지도·명시적 위치 버튼·클러스터 동작까지 영향을 받아 이번 초기화 버그보다 범위가 크다. 명시적 recenter는 기존 UX를 유지해야 하므로 전역 변경은 하지 않는다.

## 상태 전이

| Geolocation 상태 | position | 지도 표면 | 최초 center | 자동 이동 |
| --- | --- | --- | --- | --- |
| loading | null | MapLoadingSkeleton | 없음 | 없음 |
| success | GPS 좌표 | MapCanvas | GPS 좌표 | 없음 |
| error | null | MapCanvas + fallback 안내 | 서울시청 | 없음 |
| error 후 늦은 success | GPS 좌표 | 이미 fallback MapCanvas | 기존 fallback 유지 | 없음; 사용자가 위치 버튼을 누를 때만 이동 |

마지막 행은 geolocation watcher가 timeout 뒤 뒤늦게 성공할 수 있는 경우를 의도적으로 안정화한다. 자동 이동을 다시 만들지 않고, live location marker는 최신 위치로 갱신된다. 사용자는 위치 버튼으로 현재 위치로 이동할 수 있다.

## 컴포넌트와 책임

### initial-map-center.ts

src/features/map/lib/initial-map-center.ts는 브라우저 API·React·Leaflet에 의존하지 않는 순수 상태 결정 함수다. fallback center를 인자로 받아 Node 내장 test에서 GPS 성공·대기·실패를 독립적으로 검증한다.

### MeetupLocationPicker

geolocation의 단일 소유자다. position뿐 아니라 status도 map step에 전달한다. 검색 step은 기존처럼 position만 near 값으로 사용한다.

### MeetupLocationMap

resolver 결과가 null일 때는 지도 엔진을 렌더하지 않고 기존 MapLoadingSkeleton을 배경으로 사용한다. 결과가 있으면 recenterTarget ?? initialMapCenter를 MapCanvas에 전달한다. 초기 GPS effect를 제거해 첫 위치 수신이 recenter를 유발하지 않게 한다.

fallback 상태에서는 기존 하단 행의 subtitle로 위치를 가져올 수 없다는 점과 서울시청 fallback을 안내한다. 주소가 없는 동안 직접입력 액션 버튼을 disabled로 만들어 빈 callback처럼 보이지 않게 한다. 지도 클릭 후 역지오코딩이 완료되면 기존처럼 활성화된다.

### MapCanvas

변경하지 않는다. 자동 초기화 경로가 recenterKey를 증가시키지 않으므로 flyToBounds는 사용자 위치 버튼을 누르는 기존 명시적 경로에서만 호출된다.

## 파일 경계

1. Create: src/features/map/lib/initial-map-center.ts — 순수 최초 center resolver
2. Modify: src/features/meetup/components/meetup-location-picker.tsx — status 전달
3. Modify: src/features/meetup/components/meetup-location-map.tsx — gate, 초기 auto-recenter 제거, fallback 안내, disabled 전달
4. Modify: src/features/meetup/components/location-list-item.tsx — 재사용 가능한 disabled 버튼 지원
5. Modify: src/lib/i18n/messages/ko.ts 및 6개 locale — fallback 안내 키
6. Create: scripts/ci/test-initial-map-center.ts — 순수 상태 테스트
7. Create: scripts/ci/test-map-source-contracts.mjs — 화면이 resolver를 사용하고 초기 auto-recenter를 되살리지 않는 계약
8. Create: scripts/ci/test-map-contracts.sh 및 Modify: scripts/ci/test-client-contracts.sh — 기존 CI bundle에 연결

## 검증 전략

1. TDD: production resolver가 없는 상태에서 Node test를 먼저 작성해 컴파일 실패를 확인한다.
2. resolver 구현 후 GPS 대기·성공·error fallback·error 후 position 우선 규칙을 node --test로 통과시킨다.
3. source contract로 picker가 status를 전달하고, map이 resolver 결과가 있을 때만 MapCanvas를 마운트하며, hasCenteredRef 초기 recenter가 없는지 고정한다.
4. 실제 브라우저에서는 Playwright에 서울 밖 고정 geolocation을 주고 새 모임 작성 → 장소 선택을 연다. Leaflet container가 GPS 전에는 없고, 처음 생긴 지도 center가 고정 GPS여야 한다.
5. pnpm test:contracts, pnpm lint, pnpm typecheck, pnpm build, pnpm verify:out을 실행한다.

## 범위 밖

- 홈 지도 3.5초 skeleton 정책 변경
- useGeolocation timeout 값 변경
- 수동 GPS 버튼의 기존 recenter 애니메이션 변경
- 지도 타일·마커·장소 검색·역지오코딩 API 변경

