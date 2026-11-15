use crate::audio::Audio;
use eframe::egui;
use exercise_timer::timer::{Config, Timer};
use std::{
    process::{Child, Command as ProcessCommand},
    sync::{
        Arc, Mutex,
        mpsc::{self, RecvTimeoutError, Sender},
    },
    thread::{self, JoinHandle},
    time::{Duration, Instant},
};

pub enum Command {
    Start(Config),
    Skip,
    Stop,
    Mute(bool),
    Shutdown,
}

#[derive(Clone, Default)]
pub struct Snapshot {
    pub timer: Timer,
    pub audio_error: Option<String>,
    pub error: Option<String>,
}

/// The timer and audio run off the UI thread, including while the window is minimized.
pub struct Runtime {
    sender: Sender<Command>,
    snapshot: Arc<Mutex<Snapshot>>,
    worker: Option<JoinHandle<()>>,
}

impl Runtime {
    pub fn new(ctx: egui::Context) -> Self {
        let (sender, receiver) = mpsc::channel();
        let snapshot = Arc::new(Mutex::new(Snapshot::default()));
        let shared = snapshot.clone();
        let worker = thread::spawn(move || {
            let mut state = Snapshot::default();
            let mut audio = None;
            let mut muted = false;
            let mut awake = KeepAwake::default();
            loop {
                let command = if state.timer.running() || audio.is_some() {
                    receiver.recv_timeout(Duration::from_millis(50))
                } else {
                    receiver.recv().map_err(|_| RecvTimeoutError::Disconnected)
                };
                let now = Instant::now();
                let old_phase = state.timer.phase;
                let old_remaining = state.timer.remaining;
                let mut cue = state.timer.tick(now);
                let received_command = command.is_ok();
                match command {
                    Ok(Command::Shutdown) | Err(RecvTimeoutError::Disconnected) => break,
                    Ok(Command::Start(config)) => {
                        if audio.is_none() && !muted {
                            match Audio::new() {
                                Ok(device) => {
                                    audio = Some(device);
                                    state.audio_error = None;
                                }
                                Err(error) => state.audio_error = Some(error),
                            }
                        }
                        state.error = state.timer.start(config, now).err().map(str::to_owned);
                        cue = None;
                    }
                    Ok(Command::Skip) => cue = state.timer.skip(now),
                    Ok(Command::Stop) => {
                        state.timer.stop();
                        state.error = None;
                        cue = None;
                        audio = None;
                    }
                    Ok(Command::Mute(value)) => {
                        muted = value;
                        if muted {
                            audio = None;
                        } else if audio.is_none() && state.timer.running() {
                            match Audio::new() {
                                Ok(device) => {
                                    audio = Some(device);
                                    state.audio_error = None;
                                }
                                Err(error) => state.audio_error = Some(error),
                            }
                        }
                    }
                    Err(RecvTimeoutError::Timeout) => {}
                }
                awake.set_active(state.timer.running());
                if !muted && let (Some(audio), Some(cue)) = (&mut audio, cue) {
                    audio.play(cue);
                }
                // Release CoreAudio after the final melody, so an idle app does not
                // retain an audio-device sleep assertion or a continuous audio callback.
                if !state.timer.running() && audio.as_ref().is_some_and(Audio::finished) {
                    audio = None;
                }
                if received_command
                    || state.timer.phase != old_phase
                    || state.timer.remaining != old_remaining
                {
                    *shared.lock().unwrap_or_else(|e| e.into_inner()) = state.clone();
                    ctx.request_repaint();
                }
            }
        });
        Self {
            sender,
            snapshot,
            worker: Some(worker),
        }
    }

    pub fn send(&self, command: Command) {
        let _ = self.sender.send(command);
    }
    pub fn snapshot(&self) -> Snapshot {
        self.snapshot
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .clone()
    }
}

impl Drop for Runtime {
    fn drop(&mut self) {
        self.send(Command::Shutdown);
        if let Some(worker) = self.worker.take() {
            let _ = worker.join();
        }
    }
}

#[derive(Default)]
struct KeepAwake {
    child: Option<Child>,
    active: bool,
}

impl KeepAwake {
    fn set_active(&mut self, active: bool) {
        if self.active == active {
            return;
        }
        self.active = active;
        if active {
            // Release automatically if the app crashes; never prevent explicit sleep.
            #[cfg(target_os = "macos")]
            {
                self.child = ProcessCommand::new("/usr/bin/caffeinate")
                    .args(["-i", "-w", &std::process::id().to_string()])
                    .spawn()
                    .ok();
            }
        } else {
            self.release();
        }
    }

    fn release(&mut self) {
        if let Some(mut child) = self.child.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

impl Drop for KeepAwake {
    fn drop(&mut self) {
        self.release();
    }
}
