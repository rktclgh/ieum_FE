#!/usr/bin/env bash
set -euo pipefail
workflow=.github/workflows/notify-app-main.yml
test -f "$workflow"
grep -Fq 'branches: ["main"]' "$workflow"
grep -Fq 'CI_GITHUB_TOKEN' "$workflow"
grep -Fq 'event_type: "frontend-updated"' "$workflow"
grep -Fq '"fe_sha": "${{ github.sha }}"' "$workflow"
! grep -Fq 'continue-on-error: true' "$workflow"
