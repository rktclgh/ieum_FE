# 지도 터치감/위치 떨림 개선 설계

> **최종 결과 업데이트 (2026-07-26)**: 이 문서의 "문제 2(zoomSnap)"·"문제 3(관성)" 해법은 실제로는
> 채택되지 않았다. zoomSnap 조정은 줌아웃을 깨뜨려 롤백했고, 드래그/핀치줌 진동의 실제 원인은
> `@maplibre/maplibre-gl-leaflet`의 Leaflet↔MapLibre GL 이중 렌더링 엔진 동기화 자체로 판명되어
> `updateInterval` 튜닝으로도 해소되지 않았다. 최종적으로 #493(MapLibre GL 마커 마이그레이션)을
> 되돌려 마커를 Leaflet DOM 마커로 복귀시켜 해결했다(이슈 #507, PR #508). "문제 1(GPS dot 필터)"만
> 설계대로 채택되어 유지된다. 아래 본문은 당시 조사·설계 과정의 기록으로 남겨둔다.

## 배경

사용자가 이동 중일 때 지도의 "내 위치 점"이 위아래로 민감하게 떨리고, 손가락으로 드래그·핀치줌을 한 뒤에도 지도가 딱 멈추지 않고 계속 떨리는 것처럼 보인다는 리포트. 홈 지도(`home-map-screen.tsx`)와 모임 장소 선택 지도(`meetup-location-map.tsx`) 양쪽 모두에서 발생한다.

원인 조사(systematic-debugging) 결과 서로 다른 메커니즘을 가진 두 개의 하위 문제로 나뉜다.

## 문제 1: 내 위치 점(GPS dot) 떨림 — 원인 확정

- `src/features/map/hooks/use-geolocation.ts:50-60` — `watchPosition` 콜백이 `result.coords.accuracy`를 전혀 읽지 않고, 이전 좌표와의 최소 이동거리 검사도 없이 매 콜백마다 `setPosition(next)`을 호출한다.
- `src/features/map/hooks/use-marker-layers.ts:250-256` — `livePosition`이 바뀔 때마다 `source.setData(pointFeatureCollection(livePosition))`을 호출하는데, MapLibre GL의 `setData`는 보간 없이 즉시 스냅한다.
- 결과: 오차가 큰(수십 m) GPS fix나 정지 상태의 수 m 단위 자연 흔들림까지 모두 그대로 반영되어, 매 갱신마다 점이 순간이동하며 떨림으로 보인다.

### 채택안: 정확도 필터 + 최소 이동거리 임계값 + 짧은 전환 애니메이션

1. `coords.accuracy`가 임계값(예: 30m)보다 나쁜 fix는 무시한다.
2. 이전에 반영한 좌표로부터 최소 이동거리(예: 3~5m) 미만이면 상태를 갱신하지 않는다.
3. 임계값을 통과해 실제로 갱신되는 좌표는 MapLibre GL의 `easeTo`류 짧은 전환(150~200ms, ease-out)으로 이동시켜, 통과 즉시 스냅이 아니라 부드럽게 이어지도록 한다.

**기각한 대안**
- 이동평균/저역통과 스무딩: 노이즈에 더 강하지만 실제 이동에도 지연(lag)이 생겨 실시간 추적 목적에 안 맞음.
- 매 GPS 틱마다 `flyTo`: 구현은 간단하나 GPS 주기(수 초)에 비해 애니메이션이 과해 오히려 부자연스러움.

## 문제 2: 핀치줌 종료 후 튀는 점프

- `src/features/map/components/map-canvas.tsx`의 `MapContainer`가 `zoomSnap`/`zoomDelta`를 지정하지 않아 Leaflet 기본값(`zoomSnap: 1`)이 적용된다.
- 핀치줌은 연속(소수점) 확대인데 제스처 종료 시 가장 가까운 정수 줌으로 강제 스냅되며 지도 중심이 한 번에 튄다.

### 채택안
`MapContainer`에 `zoomSnap`을 소수 단위(예: 0.25)로, `zoomDelta`도 이에 맞춰 낮춰서 설정한다. 부작용이 거의 없는 설정값 변경이며, 모바일 지도 UI에서 흔히 쓰는 표준적인 조정이다.

## 문제 3: 드래그 관성 자체의 떨림 — 확정되지 않은 원인

코드 재검토 결과 연속 `move` 이벤트에 반응해 상태를 갱신하는 커스텀 로직은 없음을 확인했다(클러스터링은 `moveend`/`zoomend`에서만 재계산 — `use-pin-clusters.ts:31-38`). 즉 별도의 로직 충돌은 아니며, Leaflet 기본 관성 물리(`inertiaDeceleration`, `easeLinearity`) 자체의 느낌 문제이거나, 문제 2(줌 스냅 점프)를 관성 드래그로 오인했을 가능성이 있다.

### 계획
1. 문제 2를 먼저 고친 뒤 실기기에서 재현되는지 다시 확인한다 — 겹쳐서 해소될 수 있음.
2. 여전히 남아 있다면 `inertiaDeceleration`/`easeLinearity`를 모바일 웹지도에서 흔히 쓰는 값으로 1차 튜닝한다.
3. 이 항목은 코드 정확성만으로 "완료"를 판단할 수 없다 — **실기기 터치 테스트를 통과해야 완료로 간주한다.**

## 적용 범위

두 화면 모두 `MapCanvas`(`src/features/map/components/map-canvas.tsx`)를 공유하므로, 문제 2·3의 설정 변경은 이 한 곳에서 이루어지며 자동으로 양쪽에 적용된다. 문제 1의 수정은 `use-geolocation.ts`(스무딩 로직) + `use-marker-layers.ts` 또는 그 하위 GL 레이어 갱신 지점(전환 애니메이션)에 걸친다.

## 테스트 전략

- 문제 1: 정확도 필터·최소 이동거리 임계값은 순수 함수로 분리해 단위 테스트로 검증한다(예: `src/features/map/lib/live-position-filter.ts` 신설 + `.test.ts`).
- 문제 2: 설정값 변경이라 단위 테스트 대상 없음 — 실기기 확인.
- 문제 3: 코드 변경이 있다면 설정값 수준 — 실기기 확인.
- 최종적으로 `npm run build` 클린 확인 후 실기기(또는 최소 모바일 브라우저 에뮬레이션)에서 도보 이동 시나리오와 드래그/핀치줌 제스처를 직접 테스트한다. 실기기 검증 전에는 "완료"로 보고하지 않는다.
