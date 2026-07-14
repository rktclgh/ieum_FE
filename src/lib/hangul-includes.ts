import { disassemble } from "es-hangul"

// 완성형 글자만 비교하면 조합 중인 글자("용ㅅ")를 못 잡는다. 자모 단위로 풀어서
// 비교하면 조합 중 상태가 자연스럽게 앞부분 일치(prefix)가 되어 실시간 검색에 걸린다.
function hangulIncludes(target: string, query: string): boolean {
  if (!query) return true
  if (!target) return false
  return disassemble(target.toLowerCase()).includes(disassemble(query.toLowerCase()))
}

export { hangulIncludes }
