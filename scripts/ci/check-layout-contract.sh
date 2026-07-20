#!/usr/bin/env bash
set -euo pipefail

# 앱 셸 레이아웃 계약 가드 — issue #419.
#
# 같은 레이아웃 이음매를 #269·#279·#304·#334·#381·#395·#411로 일곱 번 고쳤다. 매번
# 새 화면이 셸의 규칙(높이 계약·safe-area 단일 출처)을 우회해 자기 여백을 발명한 것이
# 재발의 뿌리였다. 규칙을 주석으로만 두면 강제되지 않으므로 여기서 기계적으로 막는다.
#
# 통과 조건: 아래 안티패턴이 허용 목록 밖에서 나타나지 않을 것.

fail() {
  echo "layout-contract 위반: $*" >&2
  echo "  → 화면 높이는 src/components/layout/screen.tsx 의 <Screen>을 쓰고," >&2
  echo "    safe-area는 globals.css의 --safe-area-* 변수를 통해서만 참조한다." >&2
  exit 1
}

# grep -rn 결과에서 허용 경로를 걸러낸다. 매치가 남으면 위반.
# $1: 사람이 읽을 패턴 이름, $2: grep 확장정규식, 나머지: 허용 경로(부분일치)
guard() {
  local label=$1 pattern=$2
  shift 2
  local hits
  hits=$(grep -rnE "$pattern" src --include='*.tsx' --include='*.ts' --include='*.css' || true)

  # 주석 라인(JSDoc `*`, `//`, 블록/CSS `/*`)은 제외한다 — 규칙을 설명하는 산문에서
  # 패턴 이름을 언급하는 것까지 위반으로 잡으면 안 된다. grep -rn 형식은 `경로:번호:내용`이라
  # 내용의 첫 비공백이 주석 기호면 건너뛴다.
  hits=$(printf '%s\n' "$hits" | grep -vE ':[0-9]+:[[:space:]]*(\*|//|/\*)' || true)

  local allow
  for allow in "$@"; do
    hits=$(printf '%s\n' "$hits" | grep -vF "$allow" || true)
  done

  hits=$(printf '%s\n' "$hits" | grep -v '^$' || true)
  if [[ -n "$hits" ]]; then
    echo "[$label] 허용되지 않은 사용:" >&2
    printf '%s\n' "$hits" >&2
    fail "$label"
  fi
}

# 1) 화면 높이 계약: min-h-dvh / h-dvh 는 Screen을 통해서만.
#    허용: Screen 정의 자신, admin(별도 데스크톱 셸), 오버레이 프리미티브(백드롭/패널).
guard "화면 높이(min-h-dvh/h-dvh)는 Screen 경유" \
  '\b(min-h-dvh|h-dvh)\b' \
  src/components/layout/screen.tsx \
  src/features/admin/ \
  src/components/ui/bottom-sheet.tsx \
  src/components/ui/drawer.tsx \
  src/components/ui/side-panel.tsx

# 2) safe-area 단일 출처: env(safe-area-inset(...))는 globals.css에서만.
#    컴포넌트는 --safe-area-* 변수를 참조한다.
guard "safe-area는 --safe-area-* 변수 경유" \
  'env\(safe-area-inset' \
  src/app/globals.css

# 탭바 클리어런스는 별도 규칙을 두지 않는다. 탭 경로 페이지가 min-h-dvh를 쓰면 규칙 1이
# Screen으로 유도하고, Screen이 --tab-bar-height로 클리어런스를 자동 삽입한다. 하단 여백을
# 직접 pb-[...]로 주는 경우는 FAB 클리어런스 등 탭바와 무관한 값이 많아 패턴으로 구분되지 않는다.

echo "layout-contract 통과"
