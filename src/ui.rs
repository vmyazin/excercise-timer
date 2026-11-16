use crate::runtime::{Command, Runtime};
use eframe::egui::{
    self, Align, Align2, Color32, CornerRadius, FontFamily, FontId, Layout, Margin, Pos2, RichText,
    Sense, Stroke, Theme, pos2, vec2,
};
use exercise_timer::timer::{Config, EXERCISES, Phase, Timer, format_time};
use std::{f32::consts::TAU, ops::RangeInclusive, sync::Arc};

/// Height of the transparent title bar that the content runs underneath.
const TITLE_BAR_HEIGHT: f32 = 28.0;

/// AppKit's semantic colours, resolved for the current appearance.
#[derive(Clone, Copy)]
struct Palette {
    window: Color32,
    group: Color32,
    border: Color32,
    separator: Color32,
    label: Color32,
    secondary: Color32,
    field: Color32,
    field_border: Color32,
    control: Color32,
    track: Color32,
    accent: Color32,
    green: Color32,
    orange: Color32,
    red: Color32,
    purple: Color32,
}

impl Palette {
    fn of(dark: bool) -> Self {
        let rgba = Color32::from_rgba_unmultiplied;
        if dark {
            Self {
                window: Color32::from_rgb(30, 30, 30),
                group: Color32::from_rgb(43, 43, 43),
                border: rgba(255, 255, 255, 14),
                separator: rgba(255, 255, 255, 22),
                label: rgba(255, 255, 255, 222),
                secondary: rgba(255, 255, 255, 140),
                field: rgba(255, 255, 255, 13),
                field_border: rgba(255, 255, 255, 34),
                control: Color32::from_rgb(88, 88, 88),
                track: rgba(255, 255, 255, 26),
                accent: Color32::from_rgb(10, 132, 255),
                green: Color32::from_rgb(48, 209, 88),
                orange: Color32::from_rgb(255, 159, 10),
                red: Color32::from_rgb(255, 69, 58),
                purple: Color32::from_rgb(191, 90, 242),
            }
        } else {
            Self {
                window: Color32::from_rgb(240, 240, 240),
                group: Color32::from_rgb(252, 252, 252),
                border: rgba(0, 0, 0, 14),
                separator: rgba(0, 0, 0, 20),
                label: rgba(0, 0, 0, 218),
                secondary: rgba(0, 0, 0, 128),
                field: Color32::WHITE,
                field_border: rgba(0, 0, 0, 36),
                control: Color32::WHITE,
                track: rgba(0, 0, 0, 18),
                accent: Color32::from_rgb(0, 122, 255),
                green: Color32::from_rgb(40, 180, 75),
                orange: Color32::from_rgb(245, 140, 0),
                red: Color32::from_rgb(255, 59, 48),
                purple: Color32::from_rgb(175, 82, 222),
            }
        }
    }

    fn current(ui: &egui::Ui) -> Self {
        Self::of(ui.visuals().dark_mode)
    }
}

pub struct App {
    config: Config,
    runtime: Runtime,
    muted: bool,
    error: Option<String>,
}

impl App {
    pub fn new(cc: &eframe::CreationContext<'_>) -> Self {
        crate::updates::initialize();
        install_system_fonts(&cc.egui_ctx);
        cc.egui_ctx.set_style_of(Theme::Light, style(false));
        cc.egui_ctx.set_style_of(Theme::Dark, style(true));
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
            crate::updates::set_workout_active(true);
            self.runtime.send(Command::Start(self.config.clone()));
        }
    }

    fn setup(&mut self, ui: &mut egui::Ui) {
        let p = Palette::current(ui);
        group(ui, |ui| {
            row(ui, "Workout", |ui| {
                let previous = self.config.preset;
                segmented(
                    ui,
                    &mut self.config.preset,
                    [(false, "Custom"), (true, "Bodyweight")],
                );
                if self.config.preset && !previous {
                    self.config.rest = true;
                    self.config.rest_duration = 5;
                }
            });
            separator(ui);
            row(ui, "Sets", |ui| {
                if self.config.preset {
                    ui.label(RichText::new("8 exercises").color(p.secondary));
                } else {
                    number_field(ui, "sets", &mut self.config.sets, 1..=20, 1, "");
                }
            });
            separator(ui);
            row(ui, "Work duration", |ui| {
                number_field(ui, "work", &mut self.config.duration, 5..=300, 5, " sec");
            });
            separator(ui);
            row(ui, "Warm-up", |ui| {
                toggle(ui, &mut self.config.warm_up);
                ui.add_space(6.0);
                ui.add_enabled_ui(self.config.warm_up, |ui| {
                    number_field(
                        ui,
                        "warm",
                        &mut self.config.warm_up_duration,
                        5..=30,
                        5,
                        " sec",
                    );
                });
            });
            separator(ui);
            row(ui, "Rest between sets", |ui| {
                toggle(ui, &mut self.config.rest);
                ui.add_space(6.0);
                ui.add_enabled_ui(self.config.rest, |ui| {
                    number_field(
                        ui,
                        "rest",
                        &mut self.config.rest_duration,
                        5..=60,
                        5,
                        " sec",
                    );
                });
            });
        });
        if self.config.preset {
            ui.add_space(2.0);
            egui::CollapsingHeader::new(RichText::new("Exercises").color(p.secondary))
                .id_salt("exercises")
                .show(ui, |ui| {
                    for (index, exercise) in EXERCISES.iter().enumerate() {
                        ui.label(
                            RichText::new(format!("{}.  {exercise}", index + 1)).color(p.secondary),
                        );
                    }
                });
        }
        ui.add_space(12.0);
        if push_button(ui, "Start Workout", Button::Prominent, ui.available_width()).clicked() {
            self.start();
        }
    }

    fn controls(&mut self, ui: &mut egui::Ui, timer: &Timer) {
        if timer.running() {
            let gap = ui.spacing().item_spacing.x;
            let width = (ui.available_width() - gap) / 2.0;
            ui.horizontal(|ui| {
                if push_button(ui, "Stop", Button::Destructive, width).clicked() {
                    self.runtime.send(Command::Stop);
                }
                if push_button(ui, "Skip", Button::Bordered, width).clicked() {
                    self.runtime.send(Command::Skip);
                }
            });
            ui.add_space(4.0);
            ui.vertical_centered(|ui| {
                ui.small("Esc to stop  ·  The timer keeps running when minimized");
            });
        } else if timer.phase == Phase::Complete
            && push_button(ui, "New Workout", Button::Prominent, ui.available_width()).clicked()
        {
            self.runtime.send(Command::Stop);
        }
    }
}

impl eframe::App for App {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        let snapshot = self.runtime.snapshot();
        let timer = &snapshot.timer;
        let update_pending = crate::updates::set_workout_active(timer.running());
        let editing = ctx.wants_keyboard_input();
        if ctx.input_mut(|input| input.consume_key(egui::Modifiers::COMMAND, egui::Key::Q)) {
            ctx.send_viewport_cmd(egui::ViewportCommand::Close);
        }
        if ctx.input_mut(|input| input.consume_key(egui::Modifiers::NONE, egui::Key::Escape))
            && timer.running()
        {
            self.runtime.send(Command::Stop);
        }
        if !editing
            && ctx.input_mut(|input| input.consume_key(egui::Modifiers::NONE, egui::Key::Enter))
        {
            match timer.phase {
                Phase::Ready => self.start(),
                Phase::Complete => self.runtime.send(Command::Stop),
                _ => {}
            }
        }

        let p = Palette::of(ctx.style().visuals.dark_mode);
        egui::TopBottomPanel::bottom("footer")
            .show_separator_line(true)
            .frame(
                egui::Frame::new()
                    .inner_margin(Margin::symmetric(20, 8))
                    .fill(p.window),
            )
            .show(ctx, |ui| {
                ui.horizontal(|ui| {
                    ui.small("Made by Simon at Smoxu");
                    ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                        let mut sound = !self.muted;
                        if toggle(ui, &mut sound).changed() {
                            self.muted = !sound;
                            self.runtime.send(Command::Mute(self.muted));
                        }
                        ui.small("Sound");
                    });
                });
            });

        egui::CentralPanel::default()
            .frame(egui::Frame::new().fill(p.window).inner_margin(Margin {
                left: 20,
                right: 20,
                top: 0,
                bottom: 12,
            }))
            .show(ctx, |ui| {
                title_bar(ui);
                egui::ScrollArea::vertical().show(ui, |ui| {
                    ui.add_space(8.0);
                    let ready = timer.phase == Phase::Ready;
                    let diameter = if ready { 196.0 } else { 260.0 };
                    if !ready {
                        let spare = ui.available_height() - diameter - 190.0;
                        ui.add_space((spare / 2.0).clamp(0.0, 60.0));
                    }
                    dial(ui, timer, &self.config, diameter);
                    ui.add_space(16.0);
                    if ready {
                        self.setup(ui);
                    } else {
                        caption(ui, timer);
                        ui.add_space(20.0);
                        self.controls(ui, timer);
                    }
                    if update_pending {
                        ui.small("Update ready. The app will restart when your workout ends.");
                    }
                    if let Some(error) = self.error.as_ref().or(snapshot.error.as_ref()) {
                        ui.add_space(4.0);
                        ui.colored_label(p.red, error);
                    }
                    if snapshot.audio_error.is_some() && !self.muted {
                        ui.add_space(4.0);
                        ui.colored_label(
                            p.orange,
                            "Audio unavailable. The visual timer still works. Restart a workout to retry audio.",
                        )
                        .on_hover_text(snapshot.audio_error.as_deref().unwrap_or_default());
                    }
                });
            });
    }
}

/// Space under the transparent title bar, draggable like the native one.
fn title_bar(ui: &mut egui::Ui) {
    let (_, response) = ui.allocate_exact_size(
        vec2(ui.available_width(), TITLE_BAR_HEIGHT),
        Sense::click_and_drag(),
    );
    if response.drag_started() {
        ui.ctx().send_viewport_cmd(egui::ViewportCommand::StartDrag);
    }
    if response.double_clicked() {
        let maximized = ui
            .ctx()
            .input(|input| input.viewport().maximized.unwrap_or(false));
        ui.ctx()
            .send_viewport_cmd(egui::ViewportCommand::Maximized(!maximized));
    }
}

fn phase_color(p: &Palette, timer: &Timer) -> Color32 {
    match timer.phase {
        Phase::Ready => p.accent,
        Phase::WarmUp => p.orange,
        Phase::Rest => p.purple,
        Phase::Complete => p.green,
        Phase::Work if timer.remaining <= 3 => p.red,
        Phase::Work => p.accent,
    }
}

/// A circular countdown in the spirit of the system Clock timer.
fn dial(ui: &mut egui::Ui, timer: &Timer, config: &Config, diameter: f32) {
    let p = Palette::current(ui);
    let color = phase_color(&p, timer);
    let (rect, _) = ui.allocate_exact_size(vec2(ui.available_width(), diameter), Sense::hover());
    let painter = ui.painter_at(rect.expand(4.0));
    let width = (diameter * 0.04).max(6.0);
    let radius = diameter / 2.0 - width / 2.0;
    let center = rect.center();

    let target = match timer.phase {
        Phase::Ready | Phase::Complete => 1.0,
        _ => 1.0 - timer.progress(),
    };
    let fraction = ui
        .ctx()
        .animate_value_with_time(ui.id().with("dial"), target, 0.35);
    painter.circle_stroke(center, radius, Stroke::new(width, p.track));
    arc(
        &painter,
        center,
        radius,
        fraction,
        Stroke::new(width, color),
    );

    let (label, time, detail) = match timer.phase {
        Phase::Ready => (
            "Total".to_owned(),
            format_time(config.total_seconds()),
            format!("{} sets", config.total_sets()),
        ),
        Phase::WarmUp => (
            "Warm-up".to_owned(),
            format_time(timer.remaining),
            String::new(),
        ),
        Phase::Work => (
            "Work".to_owned(),
            format_time(timer.remaining),
            if timer.config.preset {
                format!("Set {} of {}", timer.current_set, timer.config.total_sets())
            } else {
                String::new()
            },
        ),
        Phase::Rest => (
            "Rest".to_owned(),
            format_time(timer.remaining),
            String::new(),
        ),
        Phase::Complete => {
            checkmark(&painter, center, diameter * 0.16, width * 0.9, color);
            return;
        }
    };
    let digits = diameter * 0.23;
    painter.text(
        center + vec2(0.0, -digits * 0.82),
        Align2::CENTER_CENTER,
        label,
        FontId::proportional(15.0),
        if timer.phase == Phase::Ready {
            p.secondary
        } else {
            color
        },
    );
    painter.text(
        center,
        Align2::CENTER_CENTER,
        time,
        FontId::monospace(digits),
        p.label,
    );
    painter.text(
        center + vec2(0.0, digits * 0.82),
        Align2::CENTER_CENTER,
        detail,
        FontId::proportional(13.0),
        p.secondary,
    );
}

fn arc(painter: &egui::Painter, center: Pos2, radius: f32, fraction: f32, stroke: Stroke) {
    if fraction <= 0.001 {
        return;
    }
    let point = |t: f32| {
        let angle = -TAU / 4.0 + t * TAU;
        center + radius * vec2(angle.cos(), angle.sin())
    };
    let steps = (fraction * 120.0).ceil().max(2.0) as usize;
    let points: Vec<Pos2> = (0..=steps)
        .map(|step| point(fraction * step as f32 / steps as f32))
        .collect();
    painter.add(egui::Shape::line(points, stroke));
    // Rounded caps.
    painter.circle_filled(point(0.0), stroke.width / 2.0, stroke.color);
    painter.circle_filled(point(fraction), stroke.width / 2.0, stroke.color);
}

fn checkmark(painter: &egui::Painter, center: Pos2, size: f32, width: f32, color: Color32) {
    let points = vec![
        center + vec2(-size, 0.05 * size),
        center + vec2(-0.3 * size, 0.7 * size),
        center + vec2(size, -0.65 * size),
    ];
    for point in &points {
        painter.circle_filled(*point, width / 2.0, color);
    }
    painter.add(egui::Shape::line(points, Stroke::new(width, color)));
}

/// Headline and detail below the dial while a workout is underway.
fn caption(ui: &mut egui::Ui, timer: &Timer) {
    let p = Palette::current(ui);
    let config = &timer.config;
    let remaining = config.total_sets().saturating_sub(timer.current_set);
    let (title, detail) = match timer.phase {
        Phase::WarmUp => (
            "Get ready".to_owned(),
            format!("Up first: {}", config.exercise_name(1)),
        ),
        Phase::Work => (
            config.exercise_name(timer.current_set),
            match (config.preset, remaining) {
                (_, 0) => "Final set".to_owned(),
                (true, n) => format!("{n} remaining"),
                (false, 1) => "1 set remaining".to_owned(),
                (false, n) => format!("{n} sets remaining"),
            },
        ),
        Phase::Rest => (
            "Rest & recover".to_owned(),
            format!("Next: {}", config.exercise_name(timer.current_set + 1)),
        ),
        Phase::Complete => (
            "Workout complete".to_owned(),
            format!("All {} sets finished. Great work!", config.total_sets()),
        ),
        Phase::Ready => return,
    };
    ui.vertical_centered(|ui| {
        ui.label(RichText::new(title).size(20.0).color(p.label));
        ui.add_space(-4.0);
        ui.label(RichText::new(detail).color(p.secondary));
    });
}

// ---------------------------------------------------------------------------
// Native-looking controls

/// An inset grouped box, as in System Settings.
fn group<R>(ui: &mut egui::Ui, add: impl FnOnce(&mut egui::Ui) -> R) -> R {
    let p = Palette::current(ui);
    egui::Frame::new()
        .fill(p.group)
        .stroke(Stroke::new(1.0_f32, p.border))
        .corner_radius(10)
        .inner_margin(Margin::symmetric(12, 0))
        .show(ui, |ui| {
            ui.set_width(ui.available_width());
            ui.spacing_mut().item_spacing.y = 0.0;
            add(ui)
        })
        .inner
}

fn row(ui: &mut egui::Ui, label: &str, add: impl FnOnce(&mut egui::Ui)) {
    let size = vec2(ui.available_width(), 40.0);
    ui.allocate_ui_with_layout(size, Layout::left_to_right(Align::Center), |ui| {
        ui.set_min_size(size);
        ui.spacing_mut().item_spacing.x = 6.0;
        ui.label(label);
        ui.with_layout(Layout::right_to_left(Align::Center), add);
    });
}

fn separator(ui: &mut egui::Ui) {
    let p = Palette::current(ui);
    let (rect, _) = ui.allocate_exact_size(vec2(ui.available_width(), 1.0), Sense::hover());
    let thickness = 1.0 / ui.ctx().pixels_per_point();
    ui.painter().hline(
        rect.x_range(),
        rect.center().y,
        Stroke::new(thickness, p.separator),
    );
}

/// An NSSwitch-style toggle.
fn toggle(ui: &mut egui::Ui, on: &mut bool) -> egui::Response {
    let p = Palette::current(ui);
    let size = vec2(32.0, 18.0);
    let (rect, mut response) = ui.allocate_exact_size(size, Sense::click());
    if response.clicked() {
        *on = !*on;
        response.mark_changed();
    }
    response.widget_info(|| egui::WidgetInfo::selected(egui::WidgetType::Checkbox, true, *on, ""));
    let t = ui.ctx().animate_bool_with_time(response.id, *on, 0.15);
    let off = if ui.visuals().dark_mode {
        Color32::from_rgba_unmultiplied(255, 255, 255, 40)
    } else {
        Color32::from_rgba_unmultiplied(0, 0, 0, 28)
    };
    let fill = egui::lerp(egui::Rgba::from(off)..=egui::Rgba::from(p.accent), t);
    let painter = ui.painter();
    painter.rect_filled(rect, CornerRadius::same(9), Color32::from(fill));
    let knob_radius = rect.height() / 2.0 - 1.5;
    let x = egui::lerp(
        (rect.left() + rect.height() / 2.0)..=(rect.right() - rect.height() / 2.0),
        t,
    );
    let knob = pos2(x, rect.center().y);
    painter.circle_filled(
        knob + vec2(0.0, 0.5),
        knob_radius + 0.5,
        Color32::from_black_alpha(30),
    );
    painter.circle_filled(knob, knob_radius, Color32::WHITE);
    response
}

/// A segmented control with a raised selected segment.
fn segmented<T: PartialEq + Copy, const N: usize>(
    ui: &mut egui::Ui,
    value: &mut T,
    options: [(T, &str); N],
) {
    let p = Palette::current(ui);
    let dark = ui.visuals().dark_mode;
    let segment = vec2(88.0, 24.0);
    let (rect, _) = ui.allocate_exact_size(vec2(segment.x * N as f32, segment.y), Sense::hover());
    let painter = ui.painter_at(rect.expand(2.0));
    painter.rect_filled(
        rect,
        CornerRadius::same(7),
        if dark {
            Color32::from_rgba_unmultiplied(255, 255, 255, 18)
        } else {
            Color32::from_rgba_unmultiplied(0, 0, 0, 14)
        },
    );
    let selected = options
        .iter()
        .position(|(option, _)| option == value)
        .unwrap_or(0);
    let id = ui.id().with("segmented");
    let x = ui.ctx().animate_value_with_time(id, selected as f32, 0.15);
    let thumb = egui::Rect::from_min_size(rect.min + vec2(segment.x * x, 0.0), segment).shrink(2.0);
    painter.rect(
        thumb,
        CornerRadius::same(5),
        if dark {
            Color32::from_rgb(98, 98, 98)
        } else {
            Color32::WHITE
        },
        Stroke::new(
            0.5_f32,
            Color32::from_black_alpha(if dark { 0 } else { 30 }),
        ),
        egui::StrokeKind::Outside,
    );
    for (index, (option, label)) in options.into_iter().enumerate() {
        let cell =
            egui::Rect::from_min_size(rect.min + vec2(segment.x * index as f32, 0.0), segment);
        let response = ui.interact(cell, id.with(index), Sense::click());
        if response.clicked() {
            *value = option;
        }
        painter.text(
            cell.center(),
            Align2::CENTER_CENTER,
            label,
            FontId::proportional(13.0),
            p.label,
        );
    }
}

/// A text field with an NSStepper beside it.
fn number_field(
    ui: &mut egui::Ui,
    id: &str,
    value: &mut u32,
    range: RangeInclusive<u32>,
    step: u32,
    suffix: &str,
) {
    stepper(ui, id, value, range.clone(), step);
    ui.add_sized(
        [68.0, 22.0],
        egui::DragValue::new(value)
            .range(range)
            .suffix(suffix)
            .speed(0.25),
    );
}

fn stepper(ui: &mut egui::Ui, id: &str, value: &mut u32, range: RangeInclusive<u32>, step: u32) {
    let p = Palette::current(ui);
    let enabled = ui.is_enabled();
    let (rect, _) = ui.allocate_exact_size(vec2(14.0, 22.0), Sense::hover());
    let id = ui.id().with(id).with("stepper");
    let halves = [
        (
            egui::Rect::from_min_max(rect.min, pos2(rect.right(), rect.center().y)),
            1,
        ),
        (
            egui::Rect::from_min_max(pos2(rect.left(), rect.center().y), rect.max),
            -1,
        ),
    ];
    let now = ui.input(|input| input.time);
    let painter = ui.painter();
    painter.rect(
        rect,
        CornerRadius::same(4),
        p.control,
        Stroke::new(1.0_f32, p.field_border),
        egui::StrokeKind::Inside,
    );
    for (half, direction) in halves {
        let response = ui.interact(half, id.with(direction), Sense::click());
        let repeat = response.id.with("repeat");
        if response.is_pointer_button_down_on() {
            painter.rect_filled(half.shrink(1.0), CornerRadius::same(3), p.track);
            // Fire once on press, then repeat while held, like AppKit.
            let next: Option<f64> = ui.data(|data| data.get_temp(repeat));
            let due = next.is_none_or(|next| now >= next);
            if due {
                let delay = if next.is_none() { 0.4 } else { 0.08 };
                ui.data_mut(|data| data.insert_temp(repeat, now + delay));
                *value = stepped(*value, direction, step, &range);
            }
            ui.ctx().request_repaint();
        } else {
            ui.data_mut(|data| data.remove::<f64>(repeat));
        }
        let c = half.center();
        let (tip, base) = (3.0 * direction as f32, 1.5 * direction as f32);
        let color = if enabled { p.label } else { p.secondary };
        painter.add(egui::Shape::convex_polygon(
            vec![
                c + vec2(0.0, -tip + base / 2.0),
                c + vec2(3.0, base),
                c + vec2(-3.0, base),
            ],
            color,
            Stroke::NONE,
        ));
    }
}

fn stepped(value: u32, direction: i32, step: u32, range: &RangeInclusive<u32>) -> u32 {
    let next = if direction > 0 {
        (value / step + 1) * step
    } else {
        value.saturating_sub(1) / step * step
    };
    next.clamp(*range.start(), *range.end())
}

#[derive(Clone, Copy)]
enum Button {
    Prominent,
    Bordered,
    Destructive,
}

fn push_button(ui: &mut egui::Ui, text: &str, kind: Button, width: f32) -> egui::Response {
    let p = Palette::current(ui);
    let dark = ui.visuals().dark_mode;
    let bordered = if dark {
        Color32::from_rgb(85, 85, 85)
    } else {
        Color32::WHITE
    };
    let (fill, text_color, stroke) = match kind {
        Button::Prominent => (p.accent, Color32::WHITE, Stroke::NONE),
        Button::Bordered => (bordered, p.label, Stroke::new(0.5_f32, p.field_border)),
        Button::Destructive => (bordered, p.red, Stroke::new(0.5_f32, p.field_border)),
    };
    let response = ui.add_sized(
        [width, 32.0],
        egui::Button::new(RichText::new(text).size(14.0).color(text_color))
            .fill(fill)
            .stroke(stroke)
            .corner_radius(7),
    );
    if response.is_pointer_button_down_on() {
        ui.painter().rect_filled(
            response.rect,
            CornerRadius::same(7),
            Color32::from_black_alpha(if dark { 40 } else { 22 }),
        );
    }
    response
}

// ---------------------------------------------------------------------------
// Theme

/// Use San Francisco, the system font, when it is available.
fn install_system_fonts(ctx: &egui::Context) {
    let mut fonts = egui::FontDefinitions::default();
    for (name, path, family) in [
        (
            "SF Pro",
            "/System/Library/Fonts/SFNS.ttf",
            FontFamily::Proportional,
        ),
        (
            "SF Mono",
            "/System/Library/Fonts/SFNSMono.ttf",
            FontFamily::Monospace,
        ),
    ] {
        if let Ok(bytes) = std::fs::read(path) {
            fonts
                .font_data
                .insert(name.to_owned(), Arc::new(egui::FontData::from_owned(bytes)));
            if let Some(list) = fonts.families.get_mut(&family) {
                list.insert(0, name.to_owned());
            }
        }
    }
    ctx.set_fonts(fonts);
}

fn style(dark: bool) -> egui::Style {
    let p = Palette::of(dark);
    let mut style = egui::Style {
        visuals: if dark {
            egui::Visuals::dark()
        } else {
            egui::Visuals::light()
        },
        ..Default::default()
    };
    use egui::TextStyle;
    style.text_styles = [
        (TextStyle::Small, FontId::proportional(11.0)),
        (TextStyle::Body, FontId::proportional(13.0)),
        (TextStyle::Button, FontId::proportional(13.0)),
        (TextStyle::Heading, FontId::proportional(20.0)),
        (TextStyle::Monospace, FontId::monospace(13.0)),
    ]
    .into();
    style.spacing.item_spacing = vec2(8.0, 8.0);
    style.spacing.button_padding = vec2(12.0, 4.0);
    style.spacing.interact_size.y = 22.0;

    let v = &mut style.visuals;
    v.panel_fill = p.window;
    v.window_fill = p.group;
    v.extreme_bg_color = p.field;
    v.hyperlink_color = p.accent;
    v.selection.bg_fill = p.accent.gamma_multiply(0.35);
    v.selection.stroke = Stroke::new(1.0_f32, p.label);
    v.text_cursor.stroke = Stroke::new(1.5_f32, p.accent);
    v.window_corner_radius = CornerRadius::same(10);
    v.menu_corner_radius = CornerRadius::same(8);
    v.widgets.noninteractive.fg_stroke.color = p.label;
    v.widgets.noninteractive.bg_stroke = Stroke::new(1.0_f32, p.separator);
    for (widget, border) in [
        (&mut v.widgets.inactive, p.field_border),
        (&mut v.widgets.hovered, p.field_border),
        (&mut v.widgets.active, p.accent),
        (&mut v.widgets.open, p.accent),
    ] {
        widget.bg_fill = p.field;
        widget.weak_bg_fill = p.field;
        widget.bg_stroke = Stroke::new(1.0_f32, border);
        widget.fg_stroke.color = p.label;
        widget.corner_radius = CornerRadius::same(5);
        widget.expansion = 0.0;
    }
    style
}
