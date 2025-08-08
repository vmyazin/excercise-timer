<!-- excercise-timer/README.md -->

# Excercise Timer

A simple desktop interval timer built with Tauri and vanilla HTML/CSS/JavaScript. Configure the number of sets and the duration per set to guide structured workouts or practice sessions.

## What this app is for
- Quick, focused interval workouts (e.g., 10 sets × 30 seconds)
- Pomodoro-style sprints or rehearsal reps
- Any task broken into equal-length sets with an audible and visual guide

## How it works
- 5‑second warm‑up countdown before the first set starts
- For each set:
  - Big time display and progress bar
  - Audible countdown beeps at 3, 2, 1 seconds remaining
  - Chime when a set completes and the next set begins
- Final completion plays a short celebratory chime sequence
- A Stop button lets you cancel and reset at any time

## Features
- Configure number of sets (1–20)
- Configure set duration (5–300 seconds)
- Visual progress with warning pulse in the final seconds
- Works fully offline; no data is sent anywhere

## Getting started
### Prerequisites
- Node.js 18+ and npm
- Rust and Cargo
- Tauri system prerequisites for your OS (see Tauri docs)

### Install
```bash
npm install
```

### Run in development
```bash
npm run tauri dev
```

### Build a release app
```bash
npm run tauri build
```

## Project structure
- `src/`: UI (HTML/CSS/JS) for the timer interface
- `src-tauri/`: Tauri Rust backend and configuration

## Notes
- Built with Tauri 2 and vanilla web technologies
- Designed to be simple, focused, and distraction-free
