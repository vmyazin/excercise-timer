#!/bin/bash
# Prepare a signed appcast for an already notarized universal release. No upload.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.cargo/bin:${PATH}"
VERSION="$(cargo metadata --no-deps --format-version 1 | python3 -c 'import sys,json; print(json.load(sys.stdin)["packages"][0]["version"])')"
SOURCE="$ROOT/dist/macos/universal"
APP="$SOURCE/Exercise Timer.app"
ARCHIVE="Exercise-Timer-$VERSION-universal.zip"
[[ -f "$SOURCE/$ARCHIVE" ]] || { echo "Build with --universal --notarize --updater first." >&2; exit 1; }
SDK="$(scripts/prepare-sparkle.sh)"
ACCOUNT="${SPARKLE_KEY_ACCOUNT:-com.vm.excercise-timer}"
PUBLIC_KEY="$("$SDK/bin/generate_keys" --account "$ACCOUNT" -p)"
python3 - "$APP/Contents/Info.plist" "$PUBLIC_KEY" "$VERSION" <<'PY'
import plistlib, sys
with open(sys.argv[1], 'rb') as stream:
    info = plistlib.load(stream)
if info.get('SUPublicEDKey') != sys.argv[2]:
    raise SystemExit('The app public key does not match the signing key in Keychain.')
if info.get('CFBundleVersion') != sys.argv[3]:
    raise SystemExit('Rebuild the app after changing the Cargo version.')
PY
# Validate the archive itself, not only the adjacent app (which may be newer).
STAGE="$(mktemp -d "$ROOT/dist/.update.XXXXXX")"
trap 'rm -rf "$STAGE"' EXIT
ditto -x -k "$SOURCE/$ARCHIVE" "$STAGE/extracted"
ARCHIVED_APP="$STAGE/extracted/Exercise Timer.app"
cmp "$APP/Contents/Info.plist" "$ARCHIVED_APP/Contents/Info.plist"
codesign --verify --deep --strict "$ARCHIVED_APP"
xcrun stapler validate "$ARCHIVED_APP"
spctl --assess --type execute "$ARCHIVED_APP"
ARCHS="$(lipo -archs "$ARCHIVED_APP/Contents/MacOS/exercise-timer")"
[[ "$ARCHS" == *arm64* && "$ARCHS" == *x86_64* ]] || { echo 'Updates must be universal.' >&2; exit 1; }
mkdir -p "$STAGE/feed"
cp "$SOURCE/$ARCHIVE" "$STAGE/feed/"
if [[ $# -gt 0 ]]; then
  cp "$1" "$STAGE/feed/${ARCHIVE%.zip}.md"
fi
"$SDK/bin/generate_appcast" --account "$ACCOUNT" --maximum-deltas 0 --embed-release-notes \
  --download-url-prefix "https://github.com/vmyazin/excercise-timer/releases/download/v$VERSION/" \
  "$STAGE/feed"
python3 - "$STAGE/feed/appcast.xml" "$VERSION" <<'PY'
import sys, xml.etree.ElementTree as ET
sparkle = '{http://www.andymatuschak.org/xml-namespaces/sparkle}'
items = ET.parse(sys.argv[1]).findall('./channel/item')
if len(items) != 1 or items[0].findtext(sparkle + 'version') != sys.argv[2]:
    raise SystemExit('Unexpected appcast version or number of entries.')
enclosure = items[0].find('enclosure')
if enclosure is None or not enclosure.get(sparkle + 'edSignature'):
    raise SystemExit('Refusing to publish an unsigned update.')
PY
OUT="$ROOT/dist/updates/$VERSION"
mkdir -p "$OUT"
cp "$STAGE/feed/appcast.xml" "$OUT/appcast.xml"
echo "Prepared $OUT/appcast.xml"
echo "Upload it with $ARCHIVE and the DMG to GitHub release v$VERSION. See UPDATES.md."
