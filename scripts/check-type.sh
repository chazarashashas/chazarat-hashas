#!/usr/bin/env bash
# The type scale is closed: 12, 13, 14, 16, 20, 28, 36px and nothing else.
# 36px is Home's Hebrew hero alone.
#
# Blocking as of the last PR of the visual-consistency pass: an
# off-scale font-size fails the build. Hebrew reading text is 17px via
# --fs-hebrew-read, which is a token and so never appears here.
set -uo pipefail
BLOCKING=1

hits=$(grep -rEn "font-size:[[:space:]]*[0-9.]+px" src --include=*.css \
  | grep -v "src/styles/theme.css" \
  | grep -vE "font-size:[[:space:]]*(12|13|14|16|20|28|36)px" \
  || true)

count=$(printf '%s' "$hits" | grep -c . || true)

if [ "$count" -eq 0 ]; then
  echo "check-type: clean — every font-size is on the scale"
  exit 0
fi

echo "check-type: $count off-scale font-size(s)"
printf '%s\n' "$hits"

if [ "$BLOCKING" -eq 1 ]; then
  exit 1
fi

echo "check-type: reporting only (BLOCKING=0) — not failing the build yet"
exit 0
