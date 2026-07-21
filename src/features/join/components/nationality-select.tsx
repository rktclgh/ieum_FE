"use client"

import * as React from "react"

import { FlagIcon } from "@/components/ui/flag-icon"
import { SelectInput } from "@/components/ui/text-field/select-input"
import { COUNTRIES } from "@/lib/constants/countries"
import { useTranslation } from "@/lib/i18n/use-translation"

interface NationalitySelectProps {
  className?: string
  value?: string
  onValueChange?: (value: string) => void
  error?: boolean
}

function NationalitySelect({ className, value, onValueChange, error }: NationalitySelectProps) {
  const { messages, language } = useTranslation()

  const options = React.useMemo(
    () =>
      // 국기는 개별 파일이 아니라 스프라이트(FlagIcon)로 그린다. 목록이 199개라
      // 파일당 요청 1개면 국기가 순차적으로 팝인한다.
      COUNTRIES.map((country) => ({
        value: country.code,
        label: messages.countries[country.code],
        icon: <FlagIcon code={country.code} />,
      })).sort((a, b) => a.label.localeCompare(b.label, language)),
    [messages, language]
  )

  return (
    <SelectInput
      className={className}
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={messages.join.nationalityPlaceholder}
      confirmLabel={messages.languagePicker.confirm}
      searchPlaceholder={messages.join.nationalitySearchPlaceholder}
      error={error}
    />
  )
}

export { NationalitySelect }
