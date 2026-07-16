import type { LanguageCode } from "@/lib/i18n/languages"

// 앱 언어(LanguageCode) → DeepL target_lang 코드. 대문자, 영어는 지역 변형 필수(EN-US).
// 주의: DeepL은 이 저장소 시점 기준 태국어(th)·베트남어(vi)를 지원하지 않는다.
// 두 언어는 그대로 전달하되 실제 번역 가능 여부는 BE가 DeepL 응답으로 판단해야 한다(FE에서 임의 차단하지 않음).
const DEEPL_TARGET_LANG: Record<LanguageCode, string> = {
  ko: "KO",
  en: "EN-US",
  ja: "JA",
  zh: "ZH",
  vi: "VI",
  th: "TH",
  ru: "RU",
}

function toDeepLTargetLang(language: LanguageCode): string {
  return DEEPL_TARGET_LANG[language]
}

// 원문 언어 코드(예: "KO", "ko", "ko-KR")를 앱 LanguageCode와 비교 가능한 소문자 주 서브태그로 정규화.
function normalizeLangCode(code: string): string {
  return code.trim().toLowerCase().split(/[-_]/)[0] ?? ""
}

// 번역 버튼 노출 여부. 원문 언어를 몰라 판단 불가하면(BE 미구현/데이터 없음) 안전하게 노출한다.
function shouldShowTranslateButton(
  sourceLang: string | null | undefined,
  currentLanguage: LanguageCode
): boolean {
  if (!sourceLang) return true
  return normalizeLangCode(sourceLang) !== currentLanguage
}

export { toDeepLTargetLang, normalizeLangCode, shouldShowTranslateButton }
