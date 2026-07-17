# 홈 지도 GPS 정확도 반경 제거 설계

작성일: 2026-07-17 · 브랜치: `fix/#192-place-picker-gps`

## 문제

홈 지도는 `useGeolocation`이 제공하는 브라우저 GPS `accuracy`(미터)를 `MapCanvas`의 Leaflet `Circle` 반경으로 그대로 렌더링한다. 정확도가 낮을 때 반경이 수백 미터 이상이 되어, 현재 위치 마커 주위에 사용자가 원치 않는 큰 연한 주황색 원이 표시된다.

## 결정

- 홈 지도에서 GPS 정확도 반경 `Circle` 레이어를 제거한다.
- 현재 위치 마커에 포함된 고정 크기(48px) 주황색 halo는 유지한다. 이 표시는 위치를 찾았다는 상태만 전달하며 실제 거리 반경으로 해석되지 않는다.
- `useGeolocation`의 `accuracy` 수집, GPS 중심 이동, 장소 선택, 지도 핀과 클러스터 동작은 변경하지 않는다.

## 대안

1. **정확도 반경을 제거한다 — 채택.** 화면을 단순하게 유지하고, 실제 GPS 정확도를 임의의 작은 값으로 보이게 하지 않는다.
2. 반경에 최대값을 둔다. 큰 원은 작아지지만 정확도 값과 시각 표현이 달라져 사용자를 오도할 수 있다.
3. 투명도만 낮춘다. 큰 면적이 여전히 남아 지도의 가독성 문제를 해결하지 못한다.

## 구현 경계

- `src/features/map/components/map-canvas.tsx`에서 `liveAccuracy` prop과 Leaflet `Circle` 렌더링만 제거한다.
- `src/features/map/components/home-map-screen.tsx`는 더 이상 `accuracy`를 MapCanvas에 전달하지 않는다.
- `scripts/ci/test-map-source-contracts.mjs`에 GPS 정확도 반경이 다시 추가되지 않도록 정적 계약을 둔다.

## 검증

- 실패하는 소스 계약으로 `liveAccuracy`/`Circle` 정확도 레이어가 현재 구현에 존재함을 확인한 뒤 제거한다.
- 지도 계약 테스트와 타입 검사·lint를 실행한다.
- 홈 지도에서 현재 위치 마커의 작은 halo만 남고 큰 연한 원이 사라졌는지 브라우저로 확인한다.

## 비범위

- 브라우저 GPS 정확도 수집 방식, 위치 권한 처리, GPS 중심 이동, 장소 선택 picker의 초기 위치 정책은 바꾸지 않는다.
