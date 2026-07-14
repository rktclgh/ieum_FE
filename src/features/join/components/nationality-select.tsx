"use client"

import * as React from "react"

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
      COUNTRIES.map((country) => ({
        value: country.code,
        label: messages.countries[country.code],
        icon: country.flag,
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
