"use client"

import * as React from "react"

import { BIRTH_DATE_DIGIT_LENGTH } from "@/features/join/constants/validation"
import { useCheckNicknameDuplicate } from "@/features/join/hooks/use-join-mutations"
import { toIsoDate } from "@/features/join/lib/format"
import { toIso2 } from "@/features/join/lib/nationality-map"
import type { Gender, NicknameStatus, ProfileValues } from "@/features/join/types"
import type { CountryCode } from "@/lib/constants/countries"
import { useTranslation } from "@/lib/i18n/use-translation"

function formatBirthDate(digits: string) {
  if (digits.length <= 4) return digits
  if (digits.length <= 6) return `${digits.slice(0, 4)}.${digits.slice(4)}`
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`
}

function useProfileForm() {
  const { language } = useTranslation()

  const [nickname, setNickname] = React.useState("")
  const [nicknameStatus, setNicknameStatus] = React.useState<NicknameStatus>("idle")
  const [birthDateDigits, setBirthDateDigits] = React.useState("")
  const [gender, setGender] = React.useState<Gender | null>(null)
  const [nationality, setNationality] = React.useState<CountryCode | "">("")

  const checkNicknameMutation = useCheckNicknameDuplicate()

  const isBirthDateComplete = birthDateDigits.length === BIRTH_DATE_DIGIT_LENGTH
  const isBirthDateInvalid = birthDateDigits.length > 0 && !isBirthDateComplete
  const isValid =
    nicknameStatus === "available" && isBirthDateComplete && gender !== null && nationality !== ""

  const handleNicknameChange = (rawValue: string) => {
    setNickname(rawValue)
    setNicknameStatus("idle")
    if (checkNicknameMutation.isError) checkNicknameMutation.reset()
  }

  const handleNicknameDuplicateCheck = () => {
    if (!nickname) return
    checkNicknameMutation.mutate(
      { nickname },
      {
        onSuccess: (data) => {
          setNicknameStatus(data.available ? "available" : "duplicate")
        },
      }
    )
  }

  const handleBirthDateChange = (rawValue: string) => {
    setBirthDateDigits(rawValue.replace(/\D/g, "").slice(0, BIRTH_DATE_DIGIT_LENGTH))
  }

  const values = React.useMemo<ProfileValues | null>(() => {
    const selectedNationality = nationality
    if (!isValid || gender === null || selectedNationality === "") return null

    return {
      nickname,
      birthDate: toIsoDate(formatBirthDate(birthDateDigits)),
      gender,
      nationality: toIso2(selectedNationality),
      language,
    }
  }, [birthDateDigits, gender, isValid, language, nationality, nickname])

  return {
    nickname,
    onNicknameChange: handleNicknameChange,
    nicknameStatus,
    onDuplicateCheck: handleNicknameDuplicateCheck,
    checkNicknameMutation,
    birthDateDigits: formatBirthDate(birthDateDigits),
    onBirthDateChange: handleBirthDateChange,
    isBirthDateInvalid,
    gender,
    setGender,
    nationality,
    onNationalityChange: (value: string) => setNationality(value as CountryCode),
    isValid,
    values,
  }
}

export { useProfileForm }
