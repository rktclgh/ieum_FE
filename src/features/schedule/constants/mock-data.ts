export interface ScheduleEvent {
  id: string
  /** YYYY-MM-DD */
  date: string
  /** 상대 시간 라벨, ex) "2시간 전" */
  time: string
  title: string
  meetingTime: string
  meetingLocation: string
}

export const MOCK_SCHEDULES: ScheduleEvent[] = [
  {
    id: "e1",
    date: "2026-07-01",
    time: "1일 전",
    title: "용산 러닝 크루",
    meetingTime: "오전 7:00",
    meetingLocation: "용산공원 입구",
  },
  {
    id: "e2",
    date: "2026-07-10",
    time: "2시간 전",
    title: "용산 와인바에서 봅시다",
    meetingTime: "오후 7:00",
    meetingLocation: "용산역 2번 출구",
  },
  {
    id: "e3",
    date: "2026-07-10",
    time: "5시간 전",
    title: "용산 심야 영화",
    meetingTime: "오후 10:00",
    meetingLocation: "용산역 1번 출구",
  },
  {
    id: "e4",
    date: "2026-07-15",
    time: "3일 전",
    title: "한강 자전거 라이딩",
    meetingTime: "오전 10:00",
    meetingLocation: "이촌한강공원",
  },
  {
    id: "e5",
    date: "2026-08-03",
    time: "1주일 전",
    title: "용산 보드게임 카페",
    meetingTime: "오후 6:00",
    meetingLocation: "용산역 3번 출구",
  },
]
