# macOS distribution

## Build artifacts

Run `scripts/build-macos.sh --universal` on macOS with Rust, Python 3, and Xcode Command Line Tools. The script installs the two Rust compilation targets, builds both architectures, and combines them with `lipo`. It uses the Cargo version for bundle metadata and archive names.

Output in `dist/macos/universal/`:

- `Exercise Timer.app`: standalone app bundle with the existing icon.
- `Exercise-Timer-<version>-universal-unnotarized.dmg`: compressed disk image containing the app and an Applications shortcut.
- `Exercise-Timer-<version>-universal-unnotarized.zip`: app archive preserving macOS metadata.
- `Exercise-Timer-<version>-universal-unnotarized.sha256`: checksums for the ZIP and DMG.

Use `--target aarch64-apple-darwin` or `--target x86_64-apple-darwin` to package a single architecture. Output goes into a separate directory for that target. macOS 12 is the configured minimum; test on the oldest supported macOS before publishing.

## Local validation

```sh
cargo test --locked --all-targets
scripts/build-macos.sh --universal
open 'dist/macos/universal/Exercise Timer.app'
lipo -archs 'dist/macos/universal/Exercise Timer.app/Contents/MacOS/exercise-timer'
codesign --verify --strict --verbose=2 'dist/macos/universal/Exercise Timer.app'
cd dist/macos/universal
shasum -a 256 -c Exercise-Timer-*-unnotarized.sha256
```

Smoke-test custom sets, the bodyweight preset, warm-up/rest transitions, skip, stop, completion, mute, and minimized-window audio. Check long exercise names and resizing. Test the Intel build on an Intel Mac and the oldest supported macOS before release; cross-compilation alone does not establish runtime compatibility.

## Public release

Follow [CODE_SIGNING.md](CODE_SIGNING.md). Passing `--notarize` signs and notarizes the app, staples its ticket, verifies Gatekeeper acceptance, creates ZIP/DMG files from the stapled app, then signs, notarizes, and staples the DMG. Only this workflow omits `unnotarized` from archive names. Notarization submission results are saved alongside the artifacts.

The CI workflow produces **unnotarized test artifacts**, without publishing a GitHub release or handling signing credentials. Keep those artifacts distinct from public downloads.

For end users: open the release DMG, drag **Exercise Timer** to **Applications**, eject the disk image, then launch the installed app. Validate the downloaded notarized build on another Mac before sharing broadly. An ad-hoc signature is for local validation and does not establish Developer ID trust.
