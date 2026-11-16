//! The native updater and menu live on AppKit's main thread, alongside eframe.
#[cfg(target_os = "macos")]
unsafe extern "C" {
    fn et_updates_initialize();
    fn et_updates_set_workout_active(active: bool) -> bool;
}

/// Call once from eframe's app constructor, after winit creates the native menu.
pub fn initialize() {
    #[cfg(target_os = "macos")]
    // SAFETY: eframe constructs the app on the main AppKit thread.
    unsafe {
        et_updates_initialize();
    }
}

/// Returns true while an approved update is waiting for this workout to end.
pub fn set_workout_active(active: bool) -> bool {
    #[cfg(target_os = "macos")]
    // SAFETY: called only by eframe's main-thread UI callbacks.
    unsafe {
        et_updates_set_workout_active(active)
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = active;
        false
    }
}
