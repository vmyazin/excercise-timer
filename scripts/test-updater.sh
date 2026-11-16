#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SDK="$("$ROOT/scripts/prepare-sparkle.sh")"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
for mode in development sparkle; do
  FLAGS=()
  if [[ "$mode" == sparkle ]]; then
    FLAGS=(-DET_SPARKLE -F "$SDK" -framework Sparkle -Wl,-rpath,"$SDK")
  fi
  xcrun clang -fobjc-arc -Wall -Wextra -Wno-unused-parameter -Werror \
    -framework AppKit ${FLAGS[@]+"${FLAGS[@]}"} "$ROOT/tests/macos_updates.m" -o "$STAGE/$mode"
  "$STAGE/$mode"
done
