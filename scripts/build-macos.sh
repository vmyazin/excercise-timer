#!/bin/bash
# Build, package, and optionally notarize a standalone macOS app.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.cargo/bin:${PATH}"
export MACOSX_DEPLOYMENT_TARGET=12.0
ARCH=universal
NOTARIZE=false

usage() {
  cat <<'USAGE'
Usage: scripts/build-macos.sh [--universal | --target TARGET] [--notarize]

Default: universal (Apple Silicon + Intel), ad-hoc signed for local testing.
Targets: aarch64-apple-darwin or x86_64-apple-darwin.

SIGNING_IDENTITY   Developer ID Application identity; omit for a local test build.
NOTARY_PROFILE    notarytool Keychain profile; required with --notarize.
NOTARY_KEYCHAIN   Optional path to the Keychain containing that profile.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --universal) ARCH=universal; shift ;;
    --target)
      [[ $# -ge 2 ]] || { usage; exit 2; }
      ARCH="$2"; shift 2
      case "$ARCH" in aarch64-apple-darwin|x86_64-apple-darwin) ;; *) usage; exit 2 ;; esac ;;
    --notarize) NOTARIZE=true; shift ;;
    --help|-h) usage; exit 0 ;;
    *) usage; exit 2 ;;
  esac
done

[[ "$(uname -s)" == Darwin ]] || { echo 'Build on macOS with Xcode Command Line Tools.' >&2; exit 1; }
for tool in cargo rustup python3 xcrun codesign hdiutil ditto; do
  command -v "$tool" >/dev/null || { echo "Missing required tool: $tool" >&2; exit 1; }
done
if $NOTARIZE; then
  [[ "${SIGNING_IDENTITY:-}" == "Developer ID Application:"* && -n "${NOTARY_PROFILE:-}" ]] || {
    echo '--notarize requires SIGNING_IDENTITY (Developer ID Application) and NOTARY_PROFILE.' >&2; exit 1;
  }
  xcrun --find notarytool >/dev/null
  NOTARY_ARGS=(--keychain-profile "$NOTARY_PROFILE")
  if [[ -n "${NOTARY_KEYCHAIN:-}" ]]; then
    NOTARY_ARGS+=(--keychain "$NOTARY_KEYCHAIN")
  fi
  # Check access before spending time building or requesting a signing-key unlock.
  xcrun notarytool history "${NOTARY_ARGS[@]}" --output-format json >/dev/null
fi

VERSION="$(cargo metadata --no-deps --format-version 1 | python3 -c 'import sys,json; print(json.load(sys.stdin)["packages"][0]["version"])')"
OUT="$ROOT/dist/macos/$ARCH"
mkdir -p "$OUT"
STAGE="$(mktemp -d "$OUT/.staging.XXXXXX")"
trap 'rm -rf "$STAGE"' EXIT
APP="$STAGE/Exercise Timer.app"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

if [[ "$ARCH" == universal ]]; then
  rustup target add aarch64-apple-darwin x86_64-apple-darwin
  cargo build --locked --release --target aarch64-apple-darwin
  cargo build --locked --release --target x86_64-apple-darwin
  lipo -create target/aarch64-apple-darwin/release/exercise-timer \
    target/x86_64-apple-darwin/release/exercise-timer -output "$APP/Contents/MacOS/exercise-timer"
else
  rustup target add "$ARCH"
  cargo build --locked --release --target "$ARCH"
  cp "target/$ARCH/release/exercise-timer" "$APP/Contents/MacOS/exercise-timer"
fi
cp assets/icon.icns "$APP/Contents/Resources/icon.icns"
python3 - "$APP/Contents/Info.plist" "$VERSION" <<'PY'
import plistlib, sys
with open(sys.argv[1], 'wb') as stream:
    plistlib.dump({
        'CFBundleName': 'Exercise Timer',
        'CFBundleDisplayName': 'Exercise Timer',
        'CFBundleExecutable': 'exercise-timer',
        'CFBundleIdentifier': 'com.vm.excercise-timer',
        'CFBundlePackageType': 'APPL',
        'CFBundleShortVersionString': sys.argv[2],
        'CFBundleVersion': sys.argv[2],
        'CFBundleIconFile': 'icon.icns',
        'CFBundleInfoDictionaryVersion': '6.0',
        'LSMinimumSystemVersion': '12.0',
        'LSApplicationCategoryType': 'public.app-category.healthcare-fitness',
        'NSHighResolutionCapable': True,
        'NSPrincipalClass': 'NSApplication',
        'NSHumanReadableCopyright': 'Simon at Smoxu',
    }, stream)
PY
plutil -lint "$APP/Contents/Info.plist"
if [[ -n "${SIGNING_IDENTITY:-}" ]]; then
  codesign --force --options runtime --timestamp --sign "$SIGNING_IDENTITY" "$APP"
else
  codesign --force --sign - "$APP"
fi
codesign --verify --strict --verbose=2 "$APP"

notarize() {
  local artifact="$1"
  local log="$2"
  xcrun notarytool submit "$artifact" "${NOTARY_ARGS[@]}" --wait --output-format json > "$log"
  python3 - "$log" <<'PY'
import json, sys
result = json.load(open(sys.argv[1]))
if result.get('status') != 'Accepted':
    raise SystemExit('Notarization failed. Inspect submission ' + str(result.get('id')) + ' with xcrun notarytool log.')
print('Notarization accepted:', result['id'])
PY
}

if $NOTARIZE; then
  ditto -c -k --sequesterRsrc --keepParent "$APP" "$STAGE/notarization.zip"
  notarize "$STAGE/notarization.zip" "$OUT/notarization-app.json"
  xcrun stapler staple "$APP"
  xcrun stapler validate "$APP"
  spctl --assess --type execute --verbose=2 "$APP"
fi

mkdir -p "$STAGE/dmg"
ditto "$APP" "$STAGE/dmg/Exercise Timer.app"
ln -s /Applications "$STAGE/dmg/Applications"
NAME="Exercise-Timer-$VERSION-$ARCH"
if ! $NOTARIZE; then NAME="$NAME-unnotarized"; fi
hdiutil create -volname 'Exercise Timer' -srcfolder "$STAGE/dmg" -ov -format UDZO "$STAGE/$NAME.dmg"
if [[ -n "${SIGNING_IDENTITY:-}" ]]; then
  codesign --force --timestamp --sign "$SIGNING_IDENTITY" "$STAGE/$NAME.dmg"
fi
if $NOTARIZE; then
  notarize "$STAGE/$NAME.dmg" "$OUT/notarization-dmg.json"
  xcrun stapler staple "$STAGE/$NAME.dmg"
  xcrun stapler validate "$STAGE/$NAME.dmg"
fi
ditto -c -k --sequesterRsrc --keepParent "$APP" "$STAGE/$NAME.zip"

# Replace only this build's named outputs after every verification succeeds.
rm -rf "$OUT/Exercise Timer.app"
mv "$APP" "$OUT/Exercise Timer.app"
mv "$STAGE/$NAME.dmg" "$OUT/$NAME.dmg"
mv "$STAGE/$NAME.zip" "$OUT/$NAME.zip"
(cd "$OUT" && shasum -a 256 "$NAME.dmg" "$NAME.zip" > "$NAME.sha256")
echo "Built: $OUT"
lipo -archs "$OUT/Exercise Timer.app/Contents/MacOS/exercise-timer"
if ! $NOTARIZE; then echo 'Local test artifacts only: not notarized for public distribution.'; fi
