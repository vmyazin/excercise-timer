use crate::runtime::{Command, Runtime};
use eframe::egui::{self, Color32, RichText, Stroke, Vec2};
use exercise_timer::timer::{Config, EXERCISES, Phase, Timer, format_time};

const BLUE: Color32 = Color32::from_rgb(0, 112, 235);
const GREEN: Color32 = Color32::from_rgb(32, 150, 77);
const ORANGE: Color32 = Color32::from_rgb(185, 103, 0);
const RED: Color32 = Color32::from_rgb(210, 50, 45);

pub struct App {
    config: Config,
    runtime: Runtime,
    muted: bool,
    error: Option<String>,
}

impl App {
    pub fn new(cc: &eframe::CreationContext<'_>) -> Self {
        cc.egui_ctx.set_visuals(egui::Visuals::light());
        cc.egui_ctx.style_mut(|style| {
            style.spacing.item_spacing = Vec2::new(12.0, 12.0);
            style.spacing.button_padding = Vec2::new(16.0, 10.0);
            style.spacing.interact_size.y = 32.0;
            style.visuals.panel_fill = Color32::from_rgb(245, 245, 247);
            style.visuals.selection.bg_fill = BLUE;
            style
                .text_styles
                .insert(egui::TextStyle::Body, egui::FontId::proportional(16.0));
            style
                .text_styles
                .insert(egui::TextStyle::Button, egui::FontId::proportional(16.0));
        });
        Self {
            config: Config::default(),
            runtime: Runtime::new(cc.egui_ctx.clone()),
            muted: false,
            error: None,
        }
    }

    fn start(&mut self) {
        self.error = self.config.validate().err().map(str::to_owned);
        if self.error.is_none() {
            self.runtime.send(Command::Start(self.config.clone()));
        }
    }

    fn setup(&mut self, ui: &mut egui::Ui) {
        card().show(ui, |ui| {
            ui.set_width(ui.available_width());
            let previous = self.config.preset;
            egui::ComboBox::from_label("Workout")
                .selected_text(if self.config.preset {
                    "Bodyweight · 8 exercises"
                } else {
                    "Custom intervals"
                })
                .width(260.0)
                .show_ui(ui, |ui| {
                    ui.selectable_value(&mut self.config.preset, false, "Custom intervals");
                    ui.selectable_value(&mut self.config.preset, true, "Bodyweight · 8 exercises");
                });
            if self.config.preset && !previous {
                self.config.rest = true;
                self.config.rest_duration = 5;
            }
            egui::Grid::new("configuration")
                .num_columns(2)
                .spacing([24.0, 12.0])
                .show(ui, |ui| {
                    ui.label("Number of sets");
                    if self.config.preset {
                        ui.label("8 exercises");
                    } else {
                        ui.add(
                            egui::DragValue::new(&mut self.config.sets)
                                .range(1..=20)
                                .speed(1),
                        );
                    }
                    ui.end_row();
                    ui.label("Duration per set");
                    ui.add(
                        egui::DragValue::new(&mut self.config.duration)
                            .range(5..=300)
                            .suffix(" sec")
                            .speed(1),
                    );
                    ui.end_row();
                    ui.checkbox(&mut self.config.warm_up, "Warm-up");
                    ui.add_enabled(
                        self.config.warm_up,
                        egui::DragValue::new(&mut self.config.warm_up_duration)
                            .range(5..=30)
                            .suffix(" sec")
                            .speed(1),
                    );
                    ui.end_row();
                    ui.checkbox(&mut self.config.rest, "Rest between sets");
                    ui.add_enabled(
                        self.config.rest,
                        egui::DragValue::new(&mut self.config.rest_duration)
                            .range(5..=60)
                            .suffix(" sec")
                            .speed(1),
                    );
                    ui.end_row();
                });
            ui.separator();
            ui.label(
                RichText::new(format!(
                    "{} sets  ·  {} total",
                    self.config.total_sets(),
                    format_time(self.config.total_seconds())
                ))
                .color(Color32::DARK_GRAY),
            );
            if self.config.preset {
                egui::CollapsingHeader::new("Preview exercises").show(ui, |ui| {
                    for (index, exercise) in EXERCISES.iter().enumerate() {
                        ui.label(format!("{}. {exercise}", index + 1));
                    }
                });
            }
        });
        ui.add_space(4.0);
        if action(ui, "Start Timer", BLUE) {
            self.start();
        }
    }

    fn display(&self, ui: &mut egui::Ui, timer: &Timer) {
        let color = match timer.phase {
            Phase::WarmUp => ORANGE,
            Phase::Rest => Color32::from_rgb(130, 75, 190),
            Phase::Complete => GREEN,
            _ if timer.running() && timer.remaining <= 3 => RED,
            _ => BLUE,
        };
        let title = match timer.phase {
            Phase::Ready => "Ready to start".to_owned(),
            Phase::WarmUp => "Warm-up".to_owned(),
            Phase::Work => timer.config.exercise_name(timer.current_set),
            Phase::Rest => "Rest & recover".to_owned(),
            Phase::Complete => "Workout complete!".to_owned(),
        };
        let detail = match timer.phase {
            Phase::Ready => "Find your rhythm. Make every set count.".to_owned(),
            Phase::WarmUp => format!("Up first: {}", timer.config.exercise_name(1)),
            Phase::Work => format!(
                "Set {} of {}  ·  {} sets remaining",
                timer.current_set,
                timer.config.total_sets(),
                timer.config.total_sets() - timer.current_set
            ),
            Phase::Rest => format!(
                "Next: {}",
                timer.config.exercise_name(timer.current_set + 1)
            ),
            Phase::Complete => format!(
                "All {} sets finished. Great work!",
                timer.config.total_sets()
            ),
        };
        card().show(ui, |ui| {
            ui.set_width(ui.available_width());
            ui.add_space(8.0);
            ui.vertical_centered(|ui| {
                ui.visuals_mut().extreme_bg_color = Color32::from_gray(232);
                ui.label(RichText::new(title).size(21.0).strong().color(color));
                let time = if timer.phase == Phase::Complete {
                    "DONE".to_owned()
                } else {
                    format_time(timer.remaining)
                };
                ui.label(
                    RichText::new(time)
                        .monospace()
                        .size(72.0)
                        .strong()
                        .color(color),
                );
                ui.add(
                    egui::ProgressBar::new(timer.progress())
                        .fill(color)
                        .desired_height(8.0),
                );
                ui.add_space(4.0);
                ui.label(RichText::new(detail).size(14.0).color(Color32::DARK_GRAY));
            });
            ui.add_space(8.0);
        });
    }
}

impl eframe::App for App {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        let snapshot = self.runtime.snapshot();
        let timer = &snapshot.timer;
        if ctx.input_mut(|input| input.consume_key(egui::Modifiers::COMMAND, egui::Key::Q)) {
            ctx.send_viewport_cmd(egui::ViewportCommand::Close);
        }
        if ctx.input_mut(|input| input.consume_key(egui::Modifiers::NONE, egui::Key::Escape))
            && timer.running()
        {
            self.runtime.send(Command::Stop);
        }
        egui::TopBottomPanel::bottom("footer")
            .frame(
                egui::Frame::new()
                    .inner_margin(16)
                    .fill(Color32::from_rgb(245, 245, 247)),
            )
            .show(ctx, |ui| {
                ui.horizontal(|ui| {
                    ui.small("Made by Simon at Smoxu");
                    ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                        if ui.checkbox(&mut self.muted, "Mute sounds").changed() {
                            self.runtime.send(Command::Mute(self.muted));
                        }
                    });
                });
            });
        egui::CentralPanel::default().frame(egui::Frame::new().inner_margin(24).fill(Color32::from_rgb(245,245,247))).show(ctx, |ui| {
            egui::ScrollArea::vertical().show(ui, |ui| {
                ui.label(RichText::new("Exercise Timer").size(28.0).strong());
                ui.label(RichText::new("A little structure. A stronger you.").color(Color32::DARK_GRAY));
                ui.add_space(8.0);
                if timer.phase == Phase::Ready { self.setup(ui); }
                else { ui.add_space(36.0); }
                ui.add_space(8.0);
                self.display(ui, timer);
                ui.add_space(8.0);
                if timer.running() {
                    if action(ui, "Skip Step", BLUE) { self.runtime.send(Command::Skip); }
                    if action(ui, "Stop Timer", RED) { self.runtime.send(Command::Stop); }
                    ui.vertical_centered(|ui| { ui.small("Esc to stop  ·  Timer continues when minimized"); });
                } else if timer.phase == Phase::Complete && action(ui, "New Workout", BLUE) {
                    self.runtime.send(Command::Stop);
                }
                if let Some(error) = self.error.as_ref().or(snapshot.error.as_ref()) {
                    ui.colored_label(RED, error);
                }
                if snapshot.audio_error.is_some() && !self.muted {
                    ui.colored_label(ORANGE, "Audio unavailable. The visual timer still works. Restart a workout to retry audio.")
                        .on_hover_text(snapshot.audio_error.as_deref().unwrap_or_default());
                }
            });
        });
    }
}

fn card() -> egui::Frame {
    egui::Frame::new()
        .fill(Color32::WHITE)
        .stroke(Stroke::new(1.0_f32, Color32::from_gray(225)))
        .corner_radius(14)
        .inner_margin(20)
}

fn action(ui: &mut egui::Ui, text: &str, color: Color32) -> bool {
    ui.add_sized(
        [ui.available_width(), 44.0],
        egui::Button::new(RichText::new(text).color(Color32::WHITE).strong())
            .fill(color)
            .corner_radius(9),
    )
    .clicked()
}
