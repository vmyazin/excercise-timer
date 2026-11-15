mod audio;
mod runtime;
mod ui;

fn main() -> eframe::Result {
    let icon = eframe::icon_data::from_png_bytes(include_bytes!("../assets/icon.png"))
        .expect("bundled application icon is valid PNG");
    let options = eframe::NativeOptions {
        viewport: eframe::egui::ViewportBuilder::default()
            .with_title("Exercise Timer")
            .with_app_id("com.vm.excercise-timer")
            .with_inner_size([420.0, 640.0])
            .with_min_inner_size([380.0, 600.0])
            // Unified, transparent title bar like modern AppKit apps.
            .with_fullsize_content_view(true)
            .with_titlebar_shown(false)
            .with_icon(icon),
        centered: true,
        ..Default::default()
    };
    eframe::run_native(
        "Exercise Timer",
        options,
        Box::new(|cc| Ok(Box::new(ui::App::new(cc)))),
    )
}
