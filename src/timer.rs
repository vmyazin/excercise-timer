use std::time::{Duration, Instant};

pub const EXERCISES: [&str; 8] = [
    "Push-ups (standard or knees)",
    "Downward dog to upward dog flow (slow breaths)",
    "Bodyweight squats",
    "Forearm plank",
    "Prone Y-T raises (face down, lift arms in Y then T, light squeezes)",
    "Glute bridge",
    "Toe touch to overhead reach (hamstring to extension)",
    "Standing hip openers (slow knee circles)",
];

#[derive(Clone, Debug)]
pub struct Config {
    pub sets: u32,
    pub duration: u32,
    pub warm_up: bool,
    pub warm_up_duration: u32,
    pub rest: bool,
    pub rest_duration: u32,
    pub preset: bool,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            sets: 5,
            duration: 30,
            warm_up: true,
            warm_up_duration: 10,
            rest: false,
            rest_duration: 5,
            preset: false,
        }
    }
}

impl Config {
    pub fn total_sets(&self) -> u32 {
        if self.preset {
            EXERCISES.len() as u32
        } else {
            self.sets
        }
    }

    pub fn validate(&self) -> Result<(), &'static str> {
        if !(1..=20).contains(&self.total_sets()) {
            return Err("Sets must be between 1 and 20.");
        }
        if !(5..=300).contains(&self.duration) {
            return Err("Set duration must be between 5 and 300 seconds.");
        }
        if self.warm_up && !(5..=30).contains(&self.warm_up_duration) {
            return Err("Warm-up must be between 5 and 30 seconds.");
        }
        if self.rest && !(5..=60).contains(&self.rest_duration) {
            return Err("Rest must be between 5 and 60 seconds.");
        }
        Ok(())
    }

    pub fn total_seconds(&self) -> u32 {
        self.total_sets() * self.duration
            + if self.warm_up {
                self.warm_up_duration
            } else {
                0
            }
            + if self.rest {
                (self.total_sets() - 1) * self.rest_duration
            } else {
                0
            }
    }

    pub fn exercise_name(&self, set: u32) -> String {
        if self.preset {
            EXERCISES
                .get(set.saturating_sub(1) as usize)
                .unwrap_or(&"Workout")
                .to_string()
        } else {
            format!("Set {set} of {}", self.total_sets())
        }
    }
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum Phase {
    #[default]
    Ready,
    WarmUp,
    Work,
    Rest,
    Complete,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Cue {
    Warning,
    Transition,
    Complete,
}

#[derive(Clone, Debug, Default)]
pub struct Timer {
    pub config: Config,
    pub phase: Phase,
    pub current_set: u32,
    pub remaining: u32,
    deadline: Option<Instant>,
}

impl Timer {
    pub fn start(&mut self, config: Config, now: Instant) -> Result<(), &'static str> {
        config.validate()?;
        self.config = config;
        self.current_set = if self.config.warm_up { 0 } else { 1 };
        self.enter(
            if self.config.warm_up {
                Phase::WarmUp
            } else {
                Phase::Work
            },
            now,
        );
        Ok(())
    }

    pub fn running(&self) -> bool {
        matches!(self.phase, Phase::WarmUp | Phase::Work | Phase::Rest)
    }

    pub fn stop(&mut self) {
        self.phase = Phase::Ready;
        self.current_set = 0;
        self.remaining = 0;
        self.deadline = None;
    }

    pub fn phase_duration(&self) -> u32 {
        match self.phase {
            Phase::WarmUp => self.config.warm_up_duration,
            Phase::Rest => self.config.rest_duration,
            Phase::Work => self.config.duration,
            _ => 0,
        }
    }

    pub fn progress(&self) -> f32 {
        if self.phase == Phase::Complete {
            return 1.0;
        }
        let duration = self.phase_duration();
        if duration == 0 {
            return 0.0;
        }
        1.0 - self.remaining as f32 / duration as f32
    }

    fn enter(&mut self, phase: Phase, start: Instant) {
        self.phase = phase;
        self.remaining = self.phase_duration();
        self.deadline = self
            .running()
            .then(|| start + Duration::from_secs(self.remaining as u64));
    }

    fn advance(&mut self, at: Instant) -> Option<Cue> {
        let next = match self.phase {
            Phase::WarmUp => {
                self.current_set = 1;
                Phase::Work
            }
            Phase::Work if self.current_set == self.config.total_sets() => Phase::Complete,
            Phase::Work if self.config.rest => Phase::Rest,
            Phase::Work | Phase::Rest => {
                self.current_set += 1;
                Phase::Work
            }
            _ => return None,
        };
        self.enter(next, at);
        Some(if next == Phase::Complete {
            Cue::Complete
        } else {
            Cue::Transition
        })
    }

    /// Advance from scheduled deadlines, so delayed frames never stretch a workout.
    /// Only the latest cue is returned, avoiding a burst of stale sounds after a delay.
    pub fn tick(&mut self, now: Instant) -> Option<Cue> {
        let previous_remaining = self.remaining;
        let mut cue = None;
        while let Some(deadline) = self.deadline {
            if now < deadline {
                break;
            }
            cue = self.advance(deadline);
        }
        if let Some(deadline) = self.deadline {
            let left = deadline.saturating_duration_since(now);
            self.remaining = (left.as_secs() + u64::from(left.subsec_nanos() > 0)) as u32;
            if cue.is_none()
                && self.remaining != previous_remaining
                && (1..=3).contains(&self.remaining)
            {
                cue = Some(Cue::Warning);
            }
        }
        cue
    }

    pub fn skip(&mut self, now: Instant) -> Option<Cue> {
        self.advance(now)
    }
}

pub fn format_time(seconds: u32) -> String {
    format!("{:02}:{:02}", seconds / 60, seconds % 60)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn warm_up_work_rest_and_completion_have_exact_boundaries() {
        let now = Instant::now();
        let mut timer = Timer::default();
        timer
            .start(
                Config {
                    sets: 2,
                    duration: 5,
                    warm_up_duration: 5,
                    rest: true,
                    ..Config::default()
                },
                now,
            )
            .unwrap();
        for (seconds, phase, set, remaining) in [
            (0, Phase::WarmUp, 0, 5),
            (5, Phase::Work, 1, 5),
            (10, Phase::Rest, 1, 5),
            (15, Phase::Work, 2, 5),
            (20, Phase::Complete, 2, 0),
        ] {
            timer.tick(now + Duration::from_secs(seconds));
            assert_eq!(
                (timer.phase, timer.current_set, timer.remaining),
                (phase, set, remaining)
            );
        }
        assert_eq!(timer.tick(now + Duration::from_secs(21)), None);
    }

    #[test]
    fn delayed_ticks_catch_up_without_drift_or_replaying_cues() {
        let now = Instant::now();
        let mut timer = Timer::default();
        timer
            .start(
                Config {
                    sets: 3,
                    duration: 5,
                    warm_up: false,
                    ..Config::default()
                },
                now,
            )
            .unwrap();
        assert_eq!(
            timer.tick(now + Duration::from_millis(11_200)),
            Some(Cue::Transition)
        );
        assert_eq!((timer.current_set, timer.remaining), (3, 4));
        assert_eq!(
            timer.tick(now + Duration::from_secs(100)),
            Some(Cue::Complete)
        );
        assert!(!timer.running());
    }

    #[test]
    fn countdown_rounds_up_and_beeps_once_per_second() {
        let now = Instant::now();
        let mut timer = Timer::default();
        timer
            .start(
                Config {
                    sets: 1,
                    duration: 5,
                    warm_up: false,
                    ..Config::default()
                },
                now,
            )
            .unwrap();
        assert_eq!(timer.tick(now + Duration::from_millis(1)), None);
        assert_eq!(timer.remaining, 5);
        for second in 2..5 {
            assert_eq!(
                timer.tick(now + Duration::from_secs(second)),
                Some(Cue::Warning)
            );
            assert_eq!(
                timer.tick(now + Duration::from_secs(second) + Duration::from_millis(10)),
                None
            );
        }
        assert_eq!(
            timer.tick(now + Duration::from_secs(5)),
            Some(Cue::Complete)
        );
    }

    #[test]
    fn skip_uses_now_and_preserves_rest_and_final_completion() {
        let now = Instant::now();
        let mut timer = Timer::default();
        timer
            .start(
                Config {
                    sets: 2,
                    rest: true,
                    ..Config::default()
                },
                now,
            )
            .unwrap();
        for (offset, expected) in [
            (1, Phase::Work),
            (2, Phase::Rest),
            (3, Phase::Work),
            (4, Phase::Complete),
        ] {
            timer.skip(now + Duration::from_secs(offset));
            assert_eq!(timer.phase, expected);
            assert_eq!(timer.remaining, timer.phase_duration());
        }
        assert_eq!(timer.skip(now), None);
    }

    #[test]
    fn stop_and_restart_clear_deadlines() {
        let now = Instant::now();
        let mut timer = Timer::default();
        timer.start(Config::default(), now).unwrap();
        timer.stop();
        assert_eq!(timer.tick(now + Duration::from_secs(500)), None);
        assert_eq!(timer.phase, Phase::Ready);
        timer
            .start(
                Config {
                    warm_up: false,
                    ..Config::default()
                },
                now,
            )
            .unwrap();
        assert_eq!(
            (timer.phase, timer.current_set, timer.remaining),
            (Phase::Work, 1, 30)
        );
    }

    #[test]
    fn preset_has_eight_named_sets_and_seven_rests() {
        let config = Config {
            preset: true,
            sets: 1,
            rest: true,
            ..Config::default()
        };
        assert_eq!(config.total_sets(), 8);
        assert_eq!(config.total_seconds(), 10 + 8 * 30 + 7 * 5);
        assert_eq!(config.exercise_name(8), EXERCISES[7]);
    }

    #[test]
    fn rejects_invalid_configuration_without_changing_running_timer() {
        let now = Instant::now();
        let mut timer = Timer::default();
        timer.start(Config::default(), now).unwrap();
        for invalid in [
            Config {
                sets: 0,
                ..Config::default()
            },
            Config {
                sets: 21,
                ..Config::default()
            },
            Config {
                duration: 4,
                ..Config::default()
            },
            Config {
                duration: 301,
                ..Config::default()
            },
            Config {
                warm_up_duration: 0,
                ..Config::default()
            },
            Config {
                rest: true,
                rest_duration: 61,
                ..Config::default()
            },
        ] {
            assert!(timer.start(invalid, now).is_err());
            assert_eq!(timer.phase, Phase::WarmUp);
            assert_eq!(timer.remaining, 10);
        }
    }
}
