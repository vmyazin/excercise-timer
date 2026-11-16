# In-app updates

Packaged builds made with `--updater` use [Sparkle 2](https://sparkle-project.org/documentation/) for native macOS updates. The **Exercise Timer** application menu contains **Check for Updates…** and a toggle for automatic checks. Checks run daily by default; installation always requires the user's choice. Sparkle handles progress, errors, signature verification, replacement, and relaunch. An approved relaunch waits for an active workout to finish or stop.

The update feed defaults to [the latest GitHub release's appcast](https://github.com/vmyazin/excercise-timer/releases/latest/download/appcast.xml). Every release must include `appcast.xml` and the universal ZIP referenced by it. No server or GitHub token is needed in the app. Workout and audio functionality remain offline.

## One-time signing setup

Sparkle's Ed25519 archive signing key is separate from the Apple Developer ID certificate. Create it once on the release machine:

```sh
SDK="$(scripts/prepare-sparkle.sh)"
"$SDK/bin/generate_keys" --account com.vm.excercise-timer
```

This stores the private key in macOS Keychain. Keep the same key for future releases and back it up securely using Sparkle's key export workflow. Never commit or upload the private key. `generate_keys -p` retrieves only the public key.

The release signing key is now configured under Keychain account `com.vm.excercise-timer`. Its public key is tracked in `assets/update-public-key.txt` and used by `--updater` builds by default. The private key remains in Keychain on the release Mac; another machine needs a securely transferred copy before it can sign updates. Do not generate a replacement key for an existing update channel.

The SDK version and SHA-256 are pinned in `scripts/prepare-sparkle.sh`. SDK downloads and generated artifacts live in ignored `dist/` directories. Review the upstream release when changing that pin.

## Prepare a release

First increase `version` in `Cargo.toml` beyond the last published release and run `cargo check` to update `Cargo.lock`. Existing 0.2.0 installations have no updater; users must install the first updater-enabled release manually once.

```sh
source .signing.local
SDK="$(scripts/prepare-sparkle.sh)"
export SPARKLE_PUBLIC_KEY="$("$SDK/bin/generate_keys" --account com.vm.excercise-timer -p)"
scripts/build-macos.sh --universal --notarize --updater
scripts/prepare-update.sh /absolute/path/to/release-notes.md
```

The release-notes argument is optional. Notes are embedded in the feed. `SPARKLE_KEY_ACCOUNT` selects another Keychain account if needed; use its matching public key when building. `UPDATE_FEED_URL` can override the HTTPS feed URL at build time if hosting moves; existing installations still need their old feed maintained.

The build embeds Sparkle, signs its helper tools and framework before signing the app, and then runs the normal notarization workflow. Feed preparation checks the archive's ticket, code signature, universal architectures, version, and public key before generating an Ed25519-signed download entry. It uses a fresh staging directory so stale local archives cannot enter the feed. It produces `dist/updates/<version>/appcast.xml` and does **not** publish anything.

## Publish

Create a draft GitHub release with a tag matching the Cargo version (for example, `v0.3.0`). Upload these exact files from that build:

- `dist/macos/universal/Exercise-Timer-<version>-universal.zip`
- `dist/macos/universal/Exercise-Timer-<version>-universal.dmg`
- `dist/macos/universal/Exercise-Timer-<version>-universal.sha256`
- `dist/updates/<version>/appcast.xml`

Publish it as the latest stable release only after all assets are attached. The appcast uses the version-specific release URL for its ZIP; do not rename assets after generation or replace an archive without regenerating its signature. Later releases repeat this process. Do not publish a stable release without an appcast: that would break the `/releases/latest/download/appcast.xml` URL. Prereleases do not enter this stable channel.

## Validation

```sh
cargo fmt --all --check
cargo clippy --locked --all-targets -- -D warnings
cargo test --locked --all-targets
scripts/test-updater.sh
```

The native checks cover menu insertion, duplicate initialization, and deferring an update exactly once until a workout ends. CI also compiles and packages the updater with a test public key; these ad-hoc artifacts are not release builds.

For a development package with the updater, set `SPARKLE_PUBLIC_KEY` and run `scripts/build-macos.sh --target aarch64-apple-darwin --updater`. Launch the `.app`, not the standalone executable; Sparkle requires bundle metadata and the embedded framework. Ordinary `cargo run` builds have a menu action explaining how to download a release.

Before the first public rollout, test an older notarized updater-enabled build against a higher-version test release/feed: check manually, decline, install, verify relaunch/version, and repeat installation while a workout is active. Also check the up-to-date and offline error dialogs. Local compilation and menu tests do not establish end-to-end update installation or compatibility on Intel and macOS 12.

References: [programmatic integration](https://sparkle-project.org/documentation/programmatic-setup/), [publishing updates](https://sparkle-project.org/documentation/publishing/), [framework signing](https://sparkle-project.org/documentation/sandboxing/#code-signing).
