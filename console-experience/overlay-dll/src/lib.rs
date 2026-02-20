/// Overlay DLL - Injected into legacy games
///
/// Provides in-game overlay for DirectX 9/11 games without FSO.
/// Uses DirectX hooking + ImGui for rendering.
///
/// # Architecture
/// ```
/// DllMain (entry) → Initialize hooks
///     ↓
/// Hook DirectX Present() → Render ImGui
///     ↓
/// ImGui → Overlay UI (FPS, menus, etc)
///     ↓
/// IPC Bridge → Communication with Balam
/// ```
///
/// # Safety
/// - Only injected into whitelisted games
/// - Minimal performance impact
/// - Clean unhooking on detach
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use windows::Win32::Foundation::{BOOL, HINSTANCE};
use windows::Win32::System::SystemServices::{
    DLL_PROCESS_ATTACH, DLL_PROCESS_DETACH, DLL_THREAD_ATTACH, DLL_THREAD_DETACH,
};

/// Global overlay state
static OVERLAY_VISIBLE: AtomicBool = AtomicBool::new(true);
static OVERLAY_FPS: AtomicU32 = AtomicU32::new(0);
static HOOKS_INSTALLED: AtomicBool = AtomicBool::new(false);

/// DLL entry point
///
/// Called by Windows when DLL is loaded/unloaded.
#[no_mangle]
#[allow(non_snake_case)]
pub extern "system" fn DllMain(
    _hinst_dll: HINSTANCE,
    fdw_reason: u32,
    _lpv_reserved: *mut std::ffi::c_void,
) -> BOOL {
    match fdw_reason {
        DLL_PROCESS_ATTACH => {
            // DLL is being loaded into process
            if let Err(_e) = on_attach() {
                // Failed to initialize
                // Note: Can't use stdout in DLL context
                // TODO: Log to file or Windows Event Log
                return BOOL(0); // Fail
            }
            BOOL(1) // Success
        }
        DLL_PROCESS_DETACH => {
            // DLL is being unloaded
            on_detach();
            BOOL(1)
        }
        DLL_THREAD_ATTACH | DLL_THREAD_DETACH => {
            // Thread notifications (ignore)
            BOOL(1)
        }
        _ => BOOL(1),
    }
}

/// Initialize overlay when DLL is attached
fn on_attach() -> Result<(), String> {
    // TODO: Initialize DirectX hooks
    // This will hook Present() to render overlay
    // For now, just mark as initialized
    HOOKS_INSTALLED.store(true, Ordering::SeqCst);

    // TODO: Initialize IPC bridge
    // This will communicate with Balam for FPS data

    // TODO: Start render thread or hook Present()

    Ok(())
}

/// Cleanup overlay when DLL is detached
fn on_detach() {
    // Remove hooks
    if HOOKS_INSTALLED.load(Ordering::SeqCst) {
        // TODO: Unhook DirectX functions
        HOOKS_INSTALLED.store(false, Ordering::SeqCst);
    }
}

/// Toggle overlay visibility
///
/// Called by hotkey (F12) or from Balam IPC.
#[no_mangle]
pub extern "C" fn toggle_overlay() {
    let current = OVERLAY_VISIBLE.load(Ordering::SeqCst);
    OVERLAY_VISIBLE.store(!current, Ordering::SeqCst);
}

/// Update FPS counter
///
/// Called from IPC bridge when Balam sends FPS data.
#[no_mangle]
pub extern "C" fn update_fps(fps: f32) {
    // Store FPS as u32 (bits)
    OVERLAY_FPS.store(fps.to_bits(), Ordering::SeqCst);
}

/// Get current overlay visibility
#[no_mangle]
pub extern "C" fn is_overlay_visible() -> bool {
    OVERLAY_VISIBLE.load(Ordering::SeqCst)
}

/// Get current FPS value
#[no_mangle]
pub extern "C" fn get_fps() -> f32 {
    let bits = OVERLAY_FPS.load(Ordering::SeqCst);
    f32::from_bits(bits)
}

/// Render overlay
///
/// Called from DirectX Present hook.
/// This will be implemented with DirectX + ImGui rendering.
#[no_mangle]
pub extern "C" fn render_overlay() {
    if !OVERLAY_VISIBLE.load(Ordering::SeqCst) {
        return;
    }

    // TODO: Render ImGui UI
    // 1. Get DirectX device from hook context
    // 2. Initialize ImGui context if needed
    // 3. Build UI (FPS counter, menu, etc.)
    // 4. Render ImGui to DirectX

    // Placeholder implementation
    let _fps = get_fps();
    // In real implementation, this would render with ImGui
    // For now, it's just a placeholder to verify DLL loads
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_overlay_visibility_toggle() {
        let initial = OVERLAY_VISIBLE.load(Ordering::SeqCst);
        toggle_overlay();
        let after_toggle = OVERLAY_VISIBLE.load(Ordering::SeqCst);
        assert_ne!(initial, after_toggle);
    }

    #[test]
    fn test_fps_update() {
        update_fps(60.5);
        let _fps = get_fps();
        assert!((fps - 60.5).abs() < 0.01);
    }

    #[test]
    fn test_initial_state() {
        assert!(OVERLAY_VISIBLE.load(Ordering::SeqCst));
        assert!(!HOOKS_INSTALLED.load(Ordering::SeqCst));
    }
}
