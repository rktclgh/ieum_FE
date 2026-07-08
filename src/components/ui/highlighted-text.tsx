interface HighlightedTextProps {
  text: string
  /** 이 문자열과 일치하는 부분(대소문자 무시)을 강조 표시 */
  query?: string
}

function HighlightedText({ text, query }: HighlightedTextProps) {
  if (!query) return <>{text}</>

  const index = text.toLowerCase().indexOf(query.toLowerCase())
  if (index === -1) return <>{text}</>

  const before = text.slice(0, index)
  const match = text.slice(index, index + query.length)
  const after = text.slice(index + query.length)

  return (
    <>
      {before}
      <span className="text-primary-400">{match}</span>
      {after}
    </>
  )
}

export { HighlightedText }
