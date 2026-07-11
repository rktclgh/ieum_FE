"use client"

import * as React from "react"

import {
  TITLE_MAX_LENGTH,
  type MeetupDateValue,
  type MeetupTimeValue,
} from "@/features/meetup/constants/create-meetup"

/** 새 모임 작성 폼의 로컬 상태·검증 로직. 제출(모임 생성) API 연동은 #47. */
function useCreateMeetupForm() {
  const [title, setTitle] = React.useState("")
  const [date, setDate] = React.useState<MeetupDateValue | null>(null)
  const [time, setTime] = React.useState<MeetupTimeValue | null>(null)
  const [address, setAddress] = React.useState<string | null>(null)
  const [description, setDescription] = React.useState("")
  const [image, setImage] = React.useState<string | null>(null)

  const titleTooLong = title.length > TITLE_MAX_LENGTH

  // 이미지는 선택 항목. 나머지 필수값이 모두 채워지고 제목 글자 수가 유효할 때만 제출 가능.
  const canSubmit =
    title.trim().length > 0 &&
    !titleTooLong &&
    date !== null &&
    time !== null &&
    Boolean(address) &&
    description.trim().length > 0

  return {
    title,
    setTitle,
    date,
    setDate,
    time,
    setTime,
    address,
    setAddress,
    description,
    setDescription,
    image,
    setImage,
    titleTooLong,
    canSubmit,
  }
}

export { useCreateMeetupForm }
