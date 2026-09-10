#!/usr/bin/env bash
# theme.css is the only place a colour value may be written. Everything
# else uses a var(--token).
#
# The one permitted exception is the Google logo, whose four brand fills
# are not ours to re-colour.
#
# BLOCKING=0 while the visual-consistency pass is still migrating screens:
# the count is reported but does not fail the build. The last PR of the
# pass flips it to 1, and from then on a literal colour breaks CI.
set -uo pipefail
BLOCKING=0

hits=$(grep -rEn "#[0-9a-fA-F]{3,8}\b|rgba?\(" src \
  --include=*.css --include=*.tsx \
  | grep -v "src/styles/theme.css" \
  | grep -v "GOOGLE_LOGO" \
  || true)

count=$(printf '%s' "$hits" | grep -c . || true)

if [ "$count" -eq 0 ]; then
  echo "check-colors: clean — no colour literals outside theme.css"
  exit 0
fi

echo "check-colors: $count colour literal(s) outside theme.css"
printf '%s\n' "$hits"

if [ "$BLOCKING" -eq 1 ]; then
  exit 1
fi

echo "check-colors: reporting only (BLOCKING=0) — not failing the build yet"
exit 0
