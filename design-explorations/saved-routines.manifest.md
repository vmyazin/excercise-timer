# Saved routines and quick repeat

The comparison uses the two configurations below, sampled from the Rust defaults and preset-switch behavior. Counts refer to these two configurations. The repo has zero persisted routine or workout-history records. Every direction starts from identical fixtures. Each direction and scenario maintains its own browser-local demo state.

| Displayed element | Source or proposed field | Class | Count |
| --- | --- | --- | --- |
| Custom / Bodyweight | `Config.preset` | ✅ Real | 2/2 |
| Set count / exercise count | `Config.total_sets()` | ✅ Real | Custom 5, Bodyweight 8 |
| Work duration | `Config.duration` | ✅ Real | 2/2 at 30 seconds |
| Warm-up switch and duration | `Config.warm_up`, `Config.warm_up_duration` | ✅ Real | 2/2 enabled at 10 seconds |
| Rest switch and duration | `Config.rest`, `Config.rest_duration` | ✅ Real | 1/2 enabled, both store 5 seconds |
| Total dial and duration in routine summaries | `Config.total_seconds()`, `format_time` | ✅ Real | 2/2, Custom 02:40 and Bodyweight 04:45 |
| Exercises disclosure and current exercise | `EXERCISES`, `Config.exercise_name()` | ⚠️ Sometimes | 8 named movements for 1/2 configurations |
| Active dial, set, caption and phase color | `Timer.phase`, `remaining`, `current_set`, `phase_color` | ✅ Real | 2/2 configurations can run |
| Named saved entries and config snapshots | Proposed local routine id, name and copy of Config | ❌ Aspirational | 0 stored today, 2 seeded per returning preview |
| Pin state and pinned ordering | Proposed per-routine pinned flag | ❌ Aspirational | 0 stored today, 1 of 2 demo routines pinned |
| Repeat after relaunch | Proposed last successful start with an independent Config snapshot and display name | ❌ Aspirational | 0 stored today, 1 seeded per returning preview |

Custom uses the unmodified default. Switching to Bodyweight enables five-second rests between eight exercises. The exercise names and limits follow `src/timer.rs` and `src/ui.rs`. Both sample names (“Morning circuit” and “Five rounds”) are invented. A new user starts with zero routines and no last start. The choice to remember a workout at start makes an interrupted session repeatable from the beginning.

## Selected implementation · A, Setup shelf

A named save now supplies the name and a complete copy of Config. The pin checkbox and the library Pin and Unpin controls supply the pin state. Every start records an independent last-workout snapshot. The first launch explains how to populate Quick start. The Bodyweight disclosure uses the existing eight exercise names.

First-launch and returning views were rendered with the real egui controls. The returning example used a Bodyweight routine named and pinned through the UI, followed by the default Custom workout. The ready dial is 115 points and the existing numeric steppers, blue switches and interactive footer keep their native controls. The offscreen render omits the system window frame and traffic lights.
