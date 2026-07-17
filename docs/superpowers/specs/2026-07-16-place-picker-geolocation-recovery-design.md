# #192 장소 선택 현재 위치 복구 설계

작성일: 2026-07-16 · 브랜치: `fix/#192-place-picker-gps` · 기준 브랜치: `develop`

## 문제

질문과 모임 작성은 같은 `MeetupLocationPicker`를 사용한다. 홈 지도에서 이미 GPS 위치를 조회하고 있어도 picker가 새 `watchPosition`을 시작한다. 그 새 watch가 10초 안에 high-accuracy 좌표를 주지 못하면, 현재 구현은 `TIMEOUT`·`POSITION_UNAVAILABLE`·권한 거부를 구분하지 않고 최초 상태를 `error`로 고정한다.

`MeetupLocationMap`은 그 `error`를 서울시청 fallback lock으로 해석한다. 이후 `watchPosition`이 success를 보내도 좌표를 최초 지도 중심과 역지오코딩 대상으로 쓰지 않으므로, 사용자는 GPS 버튼을 다시 눌러야만 현재 위치를 쓸 수 있다. 이는 GPS가 느릴 때에도 첫 지도는 GPS 좌표여야 하고 자동 `flyToBounds`가 보여서는 안 된다는 #170의 핵심 사용자 계약과 충돌한다.

## 사용자 계약

1. 홈에서 확보한 좌표가 있으면 질문·모임 장소 선택은 새 GPS watch 없이 그 좌표를 첫 지도 중심으로 사용한다.
2. 홈 좌표가 아직 없더라도 `TIMEOUT`과 일시적인 위치 불가는 fallback으로 확정하지 않는다. watcher의 이후 success를 기다린 뒤 그 좌표로 최초 지도 엔진을 만든다.
3. 권한 거부와 미지원만 서울시청 fallback으로 확정한다. 이 경우에도 지도 클릭으로 장소를 선택하는 기존 흐름은 유지한다.
4. 정상 GPS 경로에서 `MapCanvas`는 GPS 좌표로 한 번만 최초 마운트하며 자동 `flyToBounds`/`flyTo`를 호출하지 않는다.
5. 위치 버튼의 명시적 recenter 동작은 그대로 유지한다.
6. 질문 생성과 모임 생성은 같은 공용 picker 계약을 사용한다. 질문 수정처럼 홈 밖에서 열린 경우에는 picker의 자체 watch가 위 규칙을 따른다.

## 선택한 구조

### A. 홈 GPS snapshot 전달 + 일시 오류 대기 — 채택

`HomeMapScreen`의 `position`을 `CreateMeetupScreen`·`CreateQuestionScreen`을 거쳐 `MeetupLocationPicker`에 `currentPosition`으로 전달한다. `currentPosition`이 있으면 picker는 새 `watchPosition`을 시작하지 않고, 그 좌표를 즉시 최초 중심으로 사용한다.

홈 좌표가 없는 독립 진입에서는 picker가 자체 `useGeolocation`을 사용한다. hook은 `PERMISSION_DENIED`만 `initialStatus="error"`로 확정하고, `TIMEOUT`과 `POSITION_UNAVAILABLE`은 현재 상태를 기록하되 초기 viewport gate는 `loading`으로 유지한다. 따라서 지도가 서울에 먼저 마운트되지 않으며, 뒤늦은 success는 GPS 좌표로 최초 마운트된다.

권한 거부 fallback 뒤에 사용자가 권한을 바꾸는 드문 경우에는 기존처럼 GPS 버튼의 명시적 recenter가 현재 위치 채택의 경계가 된다. 이 경로는 자동 이동을 새로 만들지 않는다.

### B. timeout마다 서울 fallback을 띄운 뒤 late GPS로 이동 — 미채택

서울에서 현재 위치로의 자동 이동이 다시 생기며, 사용자가 명시적으로 원치 않은 `flyToBounds` 모션을 되살린다.

### C. 전역 geolocation provider/store 도입 — 미채택

장기적으로 단일 watch를 보장할 수 있지만, 현재 홈 생성 플로우의 회귀 수정에 비해 인증·앱 루트·독립 진입까지 영향 범위가 커진다. 이번에는 이미 존재하는 홈 상태를 명시적으로 전달하고, 독립 진입은 안전한 자체 watch로 보완한다.

## 상태 전이

| 입력 | picker 최초 지도 | 자동 이동 | 장소 입력 기준 |
| --- | --- | --- | --- |
| 홈 `currentPosition` 있음 | 해당 GPS 좌표 | 없음 | 해당 GPS 좌표 |
| 자체 watch `loading` | 스켈레톤 | 없음 | 없음 |
| `TIMEOUT`/`POSITION_UNAVAILABLE` 후 success 대기 | 스켈레톤 유지 | 없음 | 없음 |
| 자체 watch success | 해당 GPS 좌표 | 없음 | 해당 GPS 좌표 |
| 권한 거부/미지원 | 서울시청 fallback | 없음 | 지도 클릭 좌표 또는 명시적 GPS recenter |

## 파일 경계와 검증

- `src/features/map/lib/geolocation-initial-status.ts`: browser error code를 초기 fallback 확정 여부로 분류하는 순수 함수.
- `src/features/map/hooks/use-geolocation.ts`: `enabled` 선택지와 권한 거부만 초기 error로 확정하는 watcher 정책.
- `src/features/map/components/home-map-screen.tsx`, 생성 화면 2개, `meetup-location-picker.tsx`: 홈 GPS 전달과 picker 자체 watch 비활성화.
- `scripts/ci/test-geolocation-initial-status.ts`: 권한 거부만 terminal, timeout/unavailable은 재시도 대기라는 순수 회귀 테스트.
- `scripts/ci/test-map-source-contracts.mjs`: 두 생성 플로우의 GPS 전달과 picker의 single-watch 선택을 정적 계약으로 고정.

브라우저 검증은 고정 GPS 좌표 환경에서 모임·질문 각각의 장소 선택을 열어, 첫 Leaflet container가 서울 fallback이 아닌 고정 GPS 좌표로 생성되는지 확인한다. 권한 거부 시에는 fallback 지도와 지도 클릭 선택 가능 여부를 별도 확인한다.

## 범위 밖과 UX 경계

- 홈 지도 자체의 3.5초 fallback 및 그 뒤 늦은 GPS recenter 정책은 #192에서 바꾸지 않는다. 이번 이슈의 대상은 질문·모임 **장소 선택 picker**이며, picker는 홈의 좌표를 재사용하거나 자체 watcher success까지 대기해 서울→GPS 자동 이동을 만들지 않는다.
- `TIMEOUT`·`POSITION_UNAVAILABLE`이 계속되는 동안 picker는 fallback 대신 스켈레톤을 유지한다. 이때도 상단 검색·뒤로 가기는 계속 사용할 수 있다. 권한 거부와 미지원은 즉시 fallback으로 확정해 지도 클릭 선택을 가능하게 한다.
