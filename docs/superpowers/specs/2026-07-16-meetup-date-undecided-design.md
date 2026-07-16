# 새 모임 작성 날짜 미정 설계

**Issue:** #173
**Branch:** `feat/#173-meetup-date-undecided`
**Status:** approved by the supplied creation-screen design and implementation request

## 목표

사용자가 새 모임을 만들 때 날짜가 아직 정해지지 않은 모임도 생성할 수 있게 한다. 날짜가 정해진 기존 흐름은 그대로 유지하고, 날짜 미정 모임은 서버가 정한 계약대로 `schedule` 필드를 보내지 않는다.

## 범위와 비범위

### 포함

- 날짜 선택 바텀시트에 `날짜 미정` 토글을 추가한다.
- 선택 시 날짜와 시간을 함께 해제하고, 작성 화면의 날짜 값은 `날짜 미정`으로 표시한다.
- 시간 선택 필드는 비활성화한다.
- 제목·장소·내용이 유효하면 날짜 미정 상태에서도 제출을 활성화한다.
- `POST /meetings`에서 날짜 미정이면 `schedule` 키를 완전히 생략한다.
- 다국어 문구와 순수 계약 테스트를 추가한다.

### 제외

- 새 아이콘·이미지·의존성 추가.
- 백엔드 API 또는 Spring 모델 변경.
- 지도·핀·캘린더 목록에서 날짜 미정 모임을 별도 섹션으로 렌더링하는 작업. 현재 응답의 `meetingAt: null`/일정 없음에 대한 캘린더 표현은 후속 이슈로 다룬다.
- 반복 모임 작성 UI 변경.

## 고려한 방식

1. 날짜 미정 전용 작성 화면을 추가한다. 화면 전환과 검증이 분기되어 기존 UX와 폴더 구조를 불필요하게 늘린다.
2. 날짜 필드를 비워 둔 채 제출만 허용한다. 사용자가 날짜를 빼먹은 상태와 의도적으로 미정으로 고른 상태를 구분할 수 없다.
3. **선택: 기존 날짜 바텀시트 안에 접근 가능한 `날짜 미정` 체크 옵션을 둔다.** 첨부 디자인과 일치하고, 명시적 상태를 하나만 추가해 날짜·시간·요청 본문을 일관되게 제어할 수 있다.

## UX와 상태 전이

`useCreateMeetupForm`이 `isDateUndecided`를 소유한다.

| 사용자 동작 | 날짜 | 시간 | 화면/요청 결과 |
| --- | --- | --- | --- |
| 처음 열기 | 없음 | 없음 | 기존처럼 제출 불가 |
| 실제 날짜 완료 | 선택값 | 없음 | 시간 필드 활성화, 기존 흐름 |
| 날짜 미정 선택 후 완료 | 없음 | 없음 | 날짜 필드 `날짜 미정`, 시간 필드 비활성화 |
| 날짜 미정 상태로 날짜 필드 재진입 후 실제 날짜 완료 | 선택값 | 없음 | 날짜 미정 해제, 시간 재선택 필요 |
| 날짜 미정 상태로 제출 | 없음 | 없음 | `schedule` 키 생략 |

바텀시트에서는 휠 아래와 버튼 위에 `role="checkbox"`/`aria-checked`인 한 줄짜리 옵션을 배치한다. 선택된 동안 휠은 흐리게 보이고 `inert`로 포인터·키보드 입력을 모두 받지 않는다. 완료를 누를 때만 부모 폼에 반영하므로 취소는 기존과 동일하게 초안 전체를 버린다.

## 컴포넌트 경계

- `src/features/meetup/hooks/use-create-meetup-form.ts`: 날짜 미정 상태, 날짜 확정 시 시간 초기화, 제출 가능 여부를 소유한다.
- `src/features/meetup/components/meetup-date-picker.tsx`: 바텀시트 안의 초안 날짜/날짜 미정 선택과 확정 콜백을 담당한다.
- `src/features/meetup/components/meetup-select-field.tsx`: 기존 날짜·시간·장소 선택 필드에 native `disabled` 표현만 추가한다.
- `src/features/meetup/lib/create-meetup-schedule.ts`: 화면 상태를 API의 선택적 `schedule` 값으로 바꾸는 순수 함수다.
- `src/features/meetup/components/create-meetup-screen.tsx`: 표현과 제출 조립만 담당하고, 날짜 미정일 때 시간 모달을 열지 않는다.
- `src/features/meetup/api/meetup-types.ts`: one-time에만 선택적인 `schedule`, recurring에는 필수 `schedule`, nullable `firstScheduleId`를 표현한다.

## API 계약

날짜가 정해진 one-time 모임은 기존 요청을 유지한다.

```ts
{ schedule: { startsAt: "2026-07-16T19:00:00+09:00" } }
```

날짜 미정 one-time 모임은 다음처럼 `schedule` 키가 **없어야 한다**. `null`을 보내지 않는다.

```ts
{ title, content, type: "one_time", location, maxMembers, imageFileId }
```

이 계약은 서버가 `schedule` 미전송을 허용하고 `firstScheduleId: null`을 반환하는 현재 API 사양에 맞춘다.

반복 모임은 이 예외의 대상이 아니다. 타입 계약에서 recurring 요청은 계속 `schedule`을 필수로 유지한다.

## 접근성·디자인 시스템

- 기존 `Drawer`, `WheelPicker`, primary/gray 토큰, 버튼 타이포그래피를 사용한다.
- 새 에셋은 넣지 않는다. 체크 시각화는 `ReportReasonOption`과 같은 CSS 원형 선택 표시를 재사용한다.
- 비활성 시간 필드는 실제 `disabled` 버튼으로 만들어 키보드 탭과 클릭에서 모두 제외한다.
- 날짜 미정 상태의 휠은 `inert`로 만들어 키보드 포커스·조작에서도 제외한다.
- 날짜 미정 체크는 스크린 리더가 상태를 읽을 수 있도록 `role="checkbox"`와 `aria-checked`를 사용한다.

## 오류 처리

이미지 업로드·모임 생성 API 오류 표시는 기존 `CreateMeetupScreen` 로직을 그대로 사용한다. 날짜 미정은 서버 오류가 아니라 유효한 작성 상태이므로 별도 오류 문구를 만들지 않는다.

## 검증

- 순수 계약 테스트로 실제 날짜에서는 KST schedule을 만들고, 날짜 미정에서는 `undefined`를 반환하는지 고정한다.
- 폼 준비 상태가 날짜 미정 + 제목·장소·내용일 때만 날짜·시간 없이 허용되는지 검증한다.
- 소스 계약으로 시간 필드 disabled 및 `schedule` 조건부 전달을 확인한다.
- 브라우저에서 날짜 미정 선택 → 완료 → 시간 비활성화 → 제출 활성화를 확인한다.

## 수용 기준

1. 날짜 선택 바텀시트에서 `날짜 미정`을 켜고 끌 수 있다.
2. 날짜 미정으로 완료하면 날짜 필드에 번역된 라벨이 보이고 시간 필드는 비활성화된다.
3. 다시 실제 날짜를 고르면 날짜 미정이 해제되고 시간은 새로 골라야 한다.
4. 날짜 미정 + 제목 + 장소 + 내용이 있으면 제출할 수 있고 요청 객체에 `schedule` 자체가 없다.
5. 기존 날짜 + 시간 작성 및 이미지 오류 흐름은 회귀하지 않는다.
