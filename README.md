# Exercise Timer

A standalone Rust interval timer for macOS 12 or newer. The interface uses egui/eframe with GPU rendering; audio is synthesized locally with Rodio. Workouts work offline. Updater-enabled releases use Sparkle to check for and install new versions.

- Custom workouts: 1–20 sets, 5–300 seconds per set.
- Optional warm-up (5–30 seconds) and rest between sets (5–60 seconds).
- Eight-exercise bodyweight preset with exercise names and a preview.
- Audible 3–2–1 countdown, interval chime, completion melody, and a mute control.
- Skip, stop, and start a new workout; Escape stops and Command-Q quits.
- Timer and audio continue while minimized. Active workouts prevent idle system sleep. Avoid explicit system sleep during a workout; closing the app discards the session.
- Native **Check for Updates…** menu, optional daily checks, and signed updates in updater-enabled releases. See [UPDATES.md](UPDATES.md) for setup and publishing.

## Develop

Install [Rust with rustup](https://rustup.rs/) and Xcode Command Line Tools (`xcode-select --install`). The repository pins its Rust toolchain in `rust-toolchain.toml`.

```sh
cargo run
cargo fmt --all --check
cargo clippy --locked --all-targets -- -D warnings
cargo test --locked --all-targets
```

Settings are session-only, matching the original app. Without an audio device the visual timer still works, and the interface reports that sound is unavailable.

## Package for macOS

```sh
# Universal app, ZIP, and DMG for Apple Silicon and Intel
scripts/build-macos.sh --universal

# Faster local Apple Silicon build
scripts/build-macos.sh --target aarch64-apple-darwin
```

Artifacts are written to `dist/macos/<architecture>/`. Local builds are ad-hoc signed and labeled `unnotarized`. For public distribution, use your Developer ID certificate and Apple's notarization service as described in [CODE_SIGNING.md](CODE_SIGNING.md). See [DISTRIBUTION.md](DISTRIBUTION.md) for installation and verification.

## Source layout

| Path | Responsibility |
| --- | --- |
| `src/timer.rs` | Validated configuration and deterministic workout state machine with unit tests |
| `src/runtime.rs` | Background clock, command handling, and idle-sleep assertion |
| `src/ui.rs` | Rust desktop interface and input |
| `src/audio.rs` | Synthesized countdown and completion cues |
| `src/updates.rs`, `src/macos_updates.m` | Native update menu, Sparkle lifecycle, workout-aware relaunch |
| `assets/` | Original application icons |
| `scripts/build-macos.sh` | Universal builds, bundle metadata, signing, notarization, ZIP, DMG, checksums |
| `.github/workflows/macos.yml` | Formatting, linting, tests, universal package artifacts |

This replaces the previous Tauri/TypeScript implementation. The bundle identifier `com.vm.excercise-timer` is retained for continuity; the displayed app name is corrected to **Exercise Timer**. No App Store submission is configured.
