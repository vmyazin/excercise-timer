#!/bin/bash
# Download a pinned, checksum-verified SDK. stdout is its absolute directory.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION=2.10.1
SHA256=1a856d2a9edb8e628de88121d7be04cf0e2167f8641650b78fca00b14244cf27
SDK="$ROOT/dist/sparkle/$VERSION"
ARCHIVE="$ROOT/dist/sparkle/Sparkle-$VERSION.tar.xz"
mkdir -p "$(dirname "$SDK")"
if [[ ! -f "$ARCHIVE" ]]; then
  curl --fail --location --silent --show-error \
    "https://github.com/sparkle-project/Sparkle/releases/download/$VERSION/Sparkle-$VERSION.tar.xz" \
    -o "$ARCHIVE.download"
  mv "$ARCHIVE.download" "$ARCHIVE"
fi
printf '%s  %s\n' "$SHA256" "$ARCHIVE" | shasum -a 256 --check >&2
# Re-extract so local modifications cannot silently alter the SDK used to build.
mkdir -p "$SDK"
tar -xf "$ARCHIVE" -C "$SDK"
printf '%s\n' "$SDK"
