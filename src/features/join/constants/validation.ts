export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const PASSWORD_MIN_LENGTH = 10
export const PASSWORD_SPECIAL_CHAR_REGEX = /[!"#$%&'()*+,\-./:;<=>?@[\]^_`{|}~]/

export const VERIFICATION_CODE_LENGTH = 6
export const VERIFICATION_TIMEOUT_SECONDS = 180

export const BIRTH_DATE_DIGIT_LENGTH = 8

// Backend nickname duplicate check isn't wired up yet, so a fixed blocklist
// stands in as the placeholder for what would be a server-side lookup.
export const TAKEN_NICKNAMES = ["admin", "관리자", "test", "이음"]
