import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 로컬 git worktree(.claude/worktrees/*)에는 각자의 .next/out 빌드 산출물이 들어 있다.
    // 위 기본 무시 패턴은 최상위 경로만 가리므로, 메인 디렉터리에서 lint를 돌리면
    // 워크트리의 빌드 산출물까지 스캔해 수천 건의 가짜 에러가 난다(CI에는 워크트리가 없어 초록).
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
