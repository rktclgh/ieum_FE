import type { LanguageCode } from "@/lib/i18n/languages"

import { ko, type Messages } from "./ko"
import { en } from "./en"
import { ja } from "./ja"
import { zh } from "./zh"
import { vi } from "./vi"
import { th } from "./th"
import { ru } from "./ru"

export type { Messages }

export const MESSAGES: Record<LanguageCode, Messages> = { ko, en, ja, zh, vi, th, ru }
