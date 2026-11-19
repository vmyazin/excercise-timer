use super::{App, Button, Palette, checkmark, phase_color, push_button};
use crate::runtime::Command;
use eframe::egui::{self, Align, FontId, Layout, Margin, RichText, Sense, vec2};
use exercise_timer::timer::{Config, Phase, Timer, format_time};

struct Readout {
    phase: &'static str,
    set: String,
    seconds: u32,
    current: String,
    next: Option<String>,
}

fn readout(timer: &Timer, setup: &Config) -> Readout {
    let config = if timer.phase == Phase::Ready {
        setup
    } else {
        &timer.config
    };
    let total = config.total_sets();
    let set = timer.current_set;
    let movement = |index| {
        let mut name = config.exercise_name(index);
        // The preset's parenthetical coaching notes stay available in the regular view.
        if let Some(start) = name.find(" (") {
            name.truncate(start);
        }
        name
    };
    let (phase, current) = match timer.phase {
        Phase::Ready => ("Ready", "Total workout time".to_owned()),
        Phase::WarmUp => ("Warm-up", "Get moving".to_owned()),
        Phase::Work if config.preset => ("Work", movement(set)),
        Phase::Work => ("Work", "Work interval".to_owned()),
        Phase::Rest => ("Rest", "Rest & recover".to_owned()),
        Phase::Complete => ("Complete", "Workout complete".to_owned()),
    };
    let next = match timer.phase {
        Phase::Ready | Phase::WarmUp => Some(movement(1)),
        Phase::Work | Phase::Rest if set < total => Some(movement(set + 1)),
        Phase::Work => Some("Workout complete".to_owned()),
        _ => None,
    };
    Readout {
        phase,
        set: match timer.phase {
            Phase::Ready if total == 1 => "1 set".to_owned(),
            Phase::Ready => format!("{total} sets"),
            Phase::WarmUp => format!("Starting set 1 of {total}"),
            Phase::Rest => format!("After set {set} of {total}"),
            Phase::Complete => format!("{total} of {total} finished"),
            _ => format!("Set {set} of {total}"),
        },
        seconds: if timer.phase == Phase::Ready {
            config.total_seconds()
        } else {
            timer.remaining
        },
        current,
        next,
    }
}

pub(super) fn show(app: &mut App, ctx: &egui::Context, timer: &Timer) {
    let p = Palette::of(ctx.style().visuals.dark_mode);
    let accent = phase_color(&p, timer);
    let view = readout(timer, &app.config);
    let size = ctx.content_rect().size();
    let scale = (size.x / 1000.0).min(size.y / 700.0).clamp(0.36, 2.25);
    let inset = (40.0 * scale) as i8;
    egui::TopBottomPanel::bottom("room_controls")
        .frame(
            egui::Frame::new()
                .fill(p.group)
                .inner_margin(Margin::symmetric(inset, 10)),
        )
        .show(ctx, |ui| {
            ui.horizontal(|ui| {
                if ui.button("Regular view · Esc").clicked() {
                    ctx.send_viewport_cmd(egui::ViewportCommand::Fullscreen(false));
                }
                ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                    match timer.phase {
                        Phase::Ready => {
                            if push_button(ui, "Start Workout · Enter", Button::Prominent, 170.0)
                                .clicked()
                            {
                                app.start();
                            }
                        }
                        Phase::Complete => {
                            if ui.button("New Workout · Enter").clicked() {
                                app.runtime.send(Command::Stop);
                                ctx.send_viewport_cmd(egui::ViewportCommand::Fullscreen(false));
                            }
                        }
                        _ => {
                            if ui.button("Skip").clicked() {
                                app.runtime.send(Command::Skip);
                            }
                        }
                    }
                });
            });
        });
    egui::CentralPanel::default()
        .frame(egui::Frame::new().fill(p.window).inner_margin(inset))
        .show(ctx, |ui| {
            let height = ui.available_height();
            let header_size = vec2(ui.available_width(), 50.0 * scale);
            ui.allocate_ui_with_layout(header_size, Layout::left_to_right(Align::Center), |ui| {
                let radius = 8.0 * scale;
                let (dot, _) =
                    ui.allocate_exact_size(vec2(radius * 2.0, radius * 2.0), Sense::hover());
                ui.painter().circle_filled(dot.center(), radius, accent);
                ui.label(
                    RichText::new(view.phase)
                        .size(40.0 * scale)
                        .strong()
                        .color(p.label),
                );
                ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                    ui.label(RichText::new(view.set).size(30.0 * scale).color(p.label));
                });
            });
            ui.add_space(height * 0.06);
            ui.vertical_centered(|ui| {
                if timer.phase == Phase::Complete {
                    let (rect, _) = ui.allocate_exact_size(
                        vec2(ui.available_width(), 224.0 * scale),
                        Sense::hover(),
                    );
                    checkmark(
                        ui.painter(),
                        rect.center(),
                        74.0 * scale,
                        16.0 * scale,
                        accent,
                    );
                } else {
                    ui.label(
                        RichText::new(format_time(view.seconds))
                            .font(FontId::monospace(188.0 * scale))
                            .color(p.label),
                    );
                }
                ui.label(
                    RichText::new(view.current)
                        .size(51.0 * scale)
                        .strong()
                        .color(p.label),
                );
            });
            if let Some(next) = view.next {
                // Anchor the preview near the bottom, allowing two lines on narrow screens.
                ui.add_space((ui.available_height() - 130.0 * scale).max(0.0));
                let fraction = if timer.running() {
                    1.0 - timer.progress()
                } else {
                    1.0
                };
                ui.add(
                    egui::ProgressBar::new(fraction)
                        .fill(accent)
                        .desired_height(8.0 * scale),
                );
                ui.add_space(8.0 * scale);
                let label = if matches!(timer.phase, Phase::Ready | Phase::WarmUp) {
                    "Up first"
                } else {
                    "Up next"
                };
                ui.label(RichText::new(label).size(22.0 * scale).color(p.secondary));
                ui.label(RichText::new(next).size(38.0 * scale).color(p.label));
            }
        });
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Instant;

    #[test]
    fn preset_preview_and_live_readout_follow_the_next_movement_across_rest() {
        let preset = Config {
            preset: true,
            rest: true,
            ..Config::default()
        };
        let mut timer = Timer::default();
        let ready = readout(&timer, &preset);
        assert_eq!(ready.seconds, preset.total_seconds());
        assert_eq!(ready.next.as_deref(), Some("Push-ups"));

        let now = Instant::now();
        timer.start(preset, now).unwrap();
        // Once running, even an unrelated draft must not change the displayed routine.
        let draft = Config::default();
        let warm = readout(&timer, &draft);
        assert_eq!(warm.phase, "Warm-up");
        assert_eq!(warm.next, ready.next);
        timer.skip(now);
        let work = readout(&timer, &draft);
        assert_eq!(work.current, "Push-ups");
        assert_eq!(work.set, "Set 1 of 8");
        assert_eq!(
            work.next.as_deref(),
            Some("Downward dog to upward dog flow")
        );
        timer.skip(now);
        let rest = readout(&timer, &draft);
        assert_eq!(rest.phase, "Rest");
        assert_eq!(rest.next, work.next);
        timer.skip(now);
        let second = readout(&timer, &draft);
        assert_eq!(Some(second.current), rest.next);
        assert_eq!(second.set, "Set 2 of 8");
    }

    #[test]
    fn custom_sets_without_rests_end_with_completion() {
        let config = Config {
            sets: 2,
            warm_up: false,
            ..Config::default()
        };
        let now = Instant::now();
        let mut timer = Timer::default();
        timer.start(config.clone(), now).unwrap();
        assert_eq!(readout(&timer, &config).next.as_deref(), Some("Set 2 of 2"));
        timer.skip(now);
        let last = readout(&timer, &config);
        assert_eq!(last.set, "Set 2 of 2");
        assert_eq!(last.next.as_deref(), Some("Workout complete"));
        timer.skip(now);
        let finished = readout(&timer, &config);
        assert_eq!(finished.phase, "Complete");
        assert!(finished.next.is_none());
    }
}
