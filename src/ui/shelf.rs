use super::{App, Button, Palette, dial, group, push_button, separator};
use crate::routines::{Routine, Workout};
use eframe::egui::{self, Align, Layout, RichText, vec2};
use exercise_timer::timer::{Config, Timer, format_time};
use std::time::{Duration, Instant};

pub(super) enum Sheet {
    Save {
        name: String,
        pinned: bool,
        focus: bool,
    },
    Library,
}

pub(super) fn kind(config: &Config) -> &'static str {
    if config.preset {
        "Bodyweight"
    } else {
        "Custom"
    }
}

fn intervals(config: &Config) -> String {
    let unit = if config.preset {
        "exercises"
    } else if config.sets == 1 {
        "set"
    } else {
        "sets"
    };
    format!(
        "{} {unit} · {} sec work",
        config.total_sets(),
        config.duration
    )
}

// Scalable line icons keep saved actions legible in either system appearance.
fn routine_button(ui: &mut egui::Ui, name: &str, pinned: bool) -> egui::Response {
    let p = Palette::current(ui);
    let id = egui::Id::new("routine_symbol");
    let color = if pinned { p.accent } else { p.label };
    let icon = egui::Atom::custom(id, vec2(13.0, 14.0));
    let text = RichText::new(name).color(color);
    let button = egui::Button::new((icon, text)).truncate().corner_radius(7);
    let response = if pinned {
        button
            .right_text(RichText::new("▶").size(10.0).color(color))
            .atom_ui(ui)
    } else {
        button.min_size(vec2(134.0, 32.0)).atom_ui(ui)
    };
    if let Some(rect) = response.rect(id) {
        let points: &[(f32, f32)] = if pinned {
            &[
                (1., 13.),
                (6., 8.),
                (3., 5.),
                (7., 4.),
                (9., 1.),
                (13., 5.),
                (10., 7.),
                (9., 11.),
                (6., 8.),
            ]
        } else {
            &[
                (2., 1.),
                (11., 1.),
                (11., 13.),
                (6.5, 10.),
                (2., 13.),
                (2., 1.),
            ]
        };
        ui.painter().add(egui::Shape::line(
            points.iter().map(|&(x, y)| rect.min + vec2(x, y)).collect(),
            egui::Stroke::new(1.3_f32, color),
        ));
    }
    response.response
}

impl App {
    pub(super) fn setup_header(&self, ui: &mut egui::Ui, timer: &Timer) {
        let p = Palette::current(ui);
        ui.horizontal(|ui| {
            ui.allocate_ui_with_layout(vec2(115.0, 115.0), Layout::top_down(Align::Min), |ui| {
                dial(ui, timer, &self.config, 115.0);
            });
            ui.add_space(6.0);
            ui.vertical(|ui| {
                ui.add_space(24.0);
                ui.spacing_mut().item_spacing.y = 2.0;
                ui.label(
                    RichText::new("CURRENT SETUP")
                        .monospace()
                        .size(10.0)
                        .color(p.secondary),
                );
                ui.label(
                    RichText::new(format!("{} workout", kind(&self.config)))
                        .strong()
                        .size(21.0),
                );
                ui.label(
                    RichText::new(intervals(&self.config))
                        .size(12.0)
                        .color(p.secondary),
                );
            });
        });
    }

    pub(super) fn shelf_actions(&mut self, ui: &mut egui::Ui) {
        let p = Palette::current(ui);
        ui.horizontal(|ui| {
            if routine_button(ui, "Save routine…", false).clicked() {
                self.error = None;
                self.sheet = Some(Sheet::Save {
                    name: String::new(),
                    pinned: false,
                    focus: true,
                });
            }
            if push_button(
                ui,
                "▶  Start Workout",
                Button::Prominent,
                ui.available_width(),
            )
            .clicked()
            {
                self.start();
            }
        });
        ui.add_space(5.0);
        separator(ui);
        ui.horizontal(|ui| {
            ui.label(
                RichText::new("Quick start")
                    .strong()
                    .size(12.0)
                    .color(p.secondary),
            );
            ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                if ui.link("☰  Saved routines").clicked() {
                    self.sheet = Some(Sheet::Library);
                }
                if self
                    .saved_notice
                    .is_some_and(|t| t.elapsed() < Duration::from_secs(2))
                {
                    ui.small("Routine saved");
                }
            });
        });
        let mut start = None;
        if let Some(last) = &self.library.last {
            let summary = format!(
                "{} · {}",
                last.name,
                format_time(last.config.total_seconds())
            );
            let mut label = egui::text::LayoutJob::default();
            RichText::new("Repeat last workout\n").strong().append_to(
                &mut label,
                ui.style(),
                Default::default(),
                Align::Center,
            );
            RichText::new(&summary)
                .small()
                .color(p.secondary)
                .append_to(&mut label, ui.style(), Default::default(), Align::Center);
            let repeat = egui::Button::new((RichText::new("⟲").size(17.0).color(p.accent), label))
                .right_text(RichText::new("▶").color(p.accent))
                .fill(p.group)
                .corner_radius(7)
                .truncate();
            if ui
                .add_sized([ui.available_width(), 49.0], repeat)
                .on_hover_text(&summary)
                .clicked()
            {
                start = Some(last.clone());
            }
        } else {
            group(ui, |ui| {
                ui.add_space(10.0);
                ui.label(
                    RichText::new("Start a workout once to repeat it here.")
                        .size(12.0)
                        .color(p.secondary),
                );
                ui.add_space(10.0);
            });
        }
        ui.horizontal_wrapped(|ui| {
            for routine in self.library.routines.iter().filter(|r| r.pinned) {
                if routine_button(ui, &routine.workout.name, true)
                    .on_hover_text(format!("Start {}", routine.workout.name))
                    .clicked()
                {
                    start = Some(routine.workout.clone());
                }
            }
        });
        if let Some(workout) = start {
            self.start_workout(workout);
        }
    }

    pub(super) fn routine_sheet(&mut self, ctx: &egui::Context) {
        let Some(mut sheet) = self.sheet.take() else {
            return;
        };
        let mut launch = None;
        let mut close = false;
        let modal = egui::Modal::new("routine_sheet".into()).show(ctx, |ui| {
            ui.set_width((ctx.content_rect().width() - 68.0).min(380.0));
            match &mut sheet {
                Sheet::Save {
                    name,
                    pinned,
                    focus,
                } => close = self.save_form(ui, name, pinned, focus),
                Sheet::Library => {
                    (close, launch) = self.library_form(ui);
                }
            }
            if let Some(error) = &self.error {
                ui.colored_label(Palette::current(ui).red, error);
            }
        });
        if let Some(workout) = launch {
            self.start_workout(workout);
        } else if !(close || modal.should_close()) {
            self.sheet = Some(sheet);
        }
    }

    fn save_form(
        &mut self,
        ui: &mut egui::Ui,
        name: &mut String,
        pinned: &mut bool,
        focus: &mut bool,
    ) -> bool {
        let mut close = false;
        ui.heading("Save routine");
        ui.small(format!(
            "{} · {} · {}",
            kind(&self.config),
            intervals(&self.config),
            format_time(self.config.total_seconds())
        ));
        let label = ui.label("Routine name");
        let field = ui
            .add(
                egui::TextEdit::singleline(name)
                    .char_limit(60)
                    .desired_width(f32::INFINITY)
                    .hint_text("e.g. Morning intervals"),
            )
            .labelled_by(label.id);
        if std::mem::take(focus) {
            field.request_focus();
        }
        ui.checkbox(pinned, "Pin for quick start");
        let submit = field.lost_focus() && ui.input(|i| i.key_pressed(egui::Key::Enter));
        ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
            let valid = !name.trim().is_empty();
            let save = ui
                .add_enabled_ui(valid, |ui| {
                    push_button(ui, "Save routine", Button::Prominent, 95.0)
                })
                .inner
                .clicked();
            if valid && (save || submit) {
                let workout = Workout {
                    name: name.trim().into(),
                    config: self.config.clone(),
                };
                if self.persist("save this routine", |lib| {
                    lib.routines.push(Routine {
                        workout: workout.clone(),
                        pinned: *pinned,
                    })
                }) {
                    self.draft_routine = Some(workout);
                    self.saved_notice = Some(Instant::now());
                    ui.ctx().request_repaint_after(Duration::from_secs(2));
                    close = true;
                }
            }
            close |= ui.button("Cancel").clicked();
        });
        close
    }

    fn library_form(&mut self, ui: &mut egui::Ui) -> (bool, Option<Workout>) {
        let mut close = false;
        let mut launch = None;
        ui.horizontal(|ui| {
            ui.heading("Saved routines");
            ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                close = ui.button("Done").clicked()
            });
        });
        if self.library.routines.is_empty() {
            ui.label("Save your setup as a routine. Pin a favorite to keep it at the top.");
        }
        let mut pin = None;
        egui::ScrollArea::vertical()
            .max_height(ui.ctx().content_rect().height() * 0.65)
            .show(ui, |ui| {
                for pinned in [true, false] {
                    let list = self
                        .library
                        .routines
                        .iter()
                        .enumerate()
                        .filter(|(_, r)| r.pinned == pinned);
                    let mut list = list.peekable();
                    if list.peek().is_none() {
                        continue;
                    }
                    ui.strong(if pinned {
                        "Pinned"
                    } else {
                        "All other routines"
                    });
                    for (id, routine) in list {
                        ui.push_id(id, |ui| {
                            let workout = &routine.workout;
                            ui.horizontal(|ui| {
                                let width = ui.available_width() - 64.0;
                                let start =
                                    egui::Button::new(format!("▶   {}", workout.name)).truncate();
                                if ui
                                    .add_sized([width, 28.0], start)
                                    .on_hover_text(&workout.name)
                                    .clicked()
                                {
                                    launch = Some(workout.clone());
                                }
                                if ui.button(if pinned { "Unpin" } else { "Pin" }).clicked() {
                                    pin = Some((id, !pinned));
                                }
                            });
                            ui.small(format!(
                                "{} · {} · {}",
                                kind(&workout.config),
                                intervals(&workout.config),
                                format_time(workout.config.total_seconds())
                            ));
                        });
                    }
                }
            });
        if let Some((id, value)) = pin {
            self.persist("change this pin", |lib| {
                if let Some(routine) = lib.routines.get_mut(id) {
                    routine.pinned = value;
                }
            });
        }
        (close, launch)
    }
}
