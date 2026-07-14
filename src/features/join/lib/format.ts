// UI shows birth date as "YYYY.MM.DD"; backend expects ISO "YYYY-MM-DD".
function toIsoDate(displayDate: string): string {
  return displayDate.replaceAll(".", "-")
}

export { toIsoDate }
