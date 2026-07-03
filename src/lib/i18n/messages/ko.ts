import type { LanguageCode } from "@/lib/i18n/languages"

export interface Messages {
  common: {
    or: string
  }
  login: {
    logoAlt: string
    emailPlaceholder: string
    passwordPlaceholder: string
    submit: string
    forgotPassword: string
    signUp: string
    continueWithGoogle: string
    continueWithApple: string
    continueWithKakao: string
  }
  languagePicker: {
    confirm: string
  }
  languages: Record<LanguageCode, string>
}

export const ko: Messages = {
  common: {
    or: "or",
  },
  login: {
    logoAlt: "로고",
    emailPlaceholder: "이메일 입력",
    passwordPlaceholder: "비밀번호 입력",
    submit: "로그인",
    forgotPassword: "비밀번호 찾기",
    signUp: "회원가입",
    continueWithGoogle: "구글로 로그인",
    continueWithApple: "애플로 로그인",
    continueWithKakao: "카카오로 로그인",
  },
  languagePicker: {
    confirm: "선택 완료",
  },
  languages: {
    ko: "한국어",
    en: "영어",
    ja: "일본어",
    zh: "중국어",
    vi: "베트남어",
    th: "태국어",
    ru: "러시아어",
  },
}
