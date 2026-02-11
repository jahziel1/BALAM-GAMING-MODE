// =============================================================================
// UWP (Universal Windows Platform) ACTIVATION
// =============================================================================

use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_LOCAL_SERVER, COINIT_APARTMENTTHREADED};
use windows::Win32::UI::Shell::{ApplicationActivationManager, IApplicationActivationManager};

/// Activates a UWP application natively using COM interfaces.
///
/// SAFETY: This function uses `unsafe` because it interacts directly with the
/// Windows COM API (`IApplicationActivationManager`).
/// Justification: There is no safe wrapper in Rust for UWP activation that returns
/// the process PID, which is required for our watchdog system.
pub fn launch_uwp_app(app_user_model_id: &str) -> Result<u32, String> {
    unsafe {
        // Initialize COM (Important for UWP activation)
        // We ignore the error because it likely means COM is already initialized
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);

        // Create Instance of ApplicationActivationManager
        let manager: IApplicationActivationManager =
            CoCreateInstance(&ApplicationActivationManager, None, CLSCTX_LOCAL_SERVER)
                .map_err(|e| format!("Failed to create ApplicationActivationManager: {e}"))?;

        let app_id_hstring = windows::core::HSTRING::from(app_user_model_id);

        // ActivateApplication returns the PID
        let pid = manager
            .ActivateApplication(
                &app_id_hstring,
                None, // Arguments
                windows::Win32::UI::Shell::AO_NONE,
            )
            .map_err(|e| format!("Failed to ActivateApplication: {e}"))?;

        Ok(pid)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_launch_uwp_app_handles_invalid_app_id() {
        let result = launch_uwp_app("InvalidAppId_NotReal!App");
        assert!(result.is_err(), "Invalid UWP app ID should return error");
    }
}
