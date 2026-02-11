/// UAC Elevation Helper
///
/// Uses Windows ShellExecuteW API with "runas" verb to execute commands with elevation.
use std::path::Path;
use windows::core::{w, PCWSTR};
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::Shell::{ShellExecuteW, SE_ERR_ACCESSDENIED};
use windows::Win32::UI::WindowsAndMessaging::SW_HIDE;

/// Execute a command with UAC elevation
///
/// Uses ShellExecuteW with "runas" verb which:
/// 1. Triggers UAC prompt
/// 2. Executes the command with administrator privileges
/// 3. Returns immediately (doesn't wait for completion)
///
/// # Arguments
/// * `executable` - Path to executable to run
/// * `arguments` - Command line arguments (optional)
/// * `working_dir` - Working directory (optional)
///
/// # Returns
/// Ok(()) if UAC prompt was shown, Err if access denied or other error
pub fn execute_elevated(
    executable: impl AsRef<Path>,
    arguments: Option<&str>,
    working_dir: Option<impl AsRef<Path>>,
) -> Result<(), String> {
    let exe_path = executable.as_ref();

    // Verify executable exists
    if !exe_path.exists() {
        return Err(format!("Executable not found: {}", exe_path.display()));
    }

    unsafe {
        // Convert paths to wide strings
        let exe_wide = to_wide_string(exe_path.to_string_lossy().as_ref());
        let args_wide = arguments.map(to_wide_string);
        let dir_wide = working_dir
            .as_ref()
            .map(|p| to_wide_string(p.as_ref().to_string_lossy().as_ref()));

        // Execute with elevation
        let result = ShellExecuteW(
            HWND::default(),                     // No parent window
            w!("runas"),                         // "runas" verb triggers UAC
            PCWSTR::from_raw(exe_wide.as_ptr()), // Executable path
            args_wide
                .as_ref()
                .map(|w| PCWSTR::from_raw(w.as_ptr()))
                .unwrap_or(PCWSTR::null()), // Arguments (optional)
            dir_wide
                .as_ref()
                .map(|w| PCWSTR::from_raw(w.as_ptr()))
                .unwrap_or(PCWSTR::null()), // Working directory (optional)
            SW_HIDE,                             // Don't show window
        );

        // Check result (values > 32 indicate success)
        if result.0 <= 32 {
            if result.0 == SE_ERR_ACCESSDENIED as isize {
                return Err("Access denied. User declined UAC prompt.".to_string());
            }
            return Err(format!("ShellExecuteW failed with error code: {}", result.0));
        }
    }

    Ok(())
}

/// Convert string to wide (UTF-16) null-terminated
fn to_wide_string(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_nonexistent_executable() {
        let result = execute_elevated("nonexistent.exe", None, None::<&str>);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not found"));
    }
}
