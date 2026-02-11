/// FPS Service Manager - Robust service lifecycle management
///
/// Handles installation, uninstallation, start, stop, and status checking
/// of the Balam FPS monitoring Windows Service.
///
/// Features:
/// - Safe install/uninstall with admin privilege checking
/// - Automatic service updates when app version changes
/// - Graceful error handling and recovery
/// - Status monitoring and health checks
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use tauri::AppHandle;

/// Service status information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceStatus {
    pub installed: bool,
    pub running: bool,
    pub version: Option<String>,
    pub error: Option<String>,
}

/// Service configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceConfig {
    pub enabled: bool,
    pub auto_start: bool,
}

const SERVICE_NAME: &str = "BalamFpsService";
const SERVICE_DISPLAY_NAME: &str = "Balam FPS Monitoring Service";
const SERVICE_DESCRIPTION: &str = "ETW-based FPS monitoring for Balam Console Experience";

/// Check if the current process has administrator privileges
fn is_elevated() -> bool {
    #[cfg(windows)]
    {
        use windows::Win32::Foundation::HANDLE;
        use windows::Win32::Security::{GetTokenInformation, TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY};
        use windows::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};

        unsafe {
            let mut token = HANDLE::default();
            if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token).is_err() {
                return false;
            }

            let mut elevation = TOKEN_ELEVATION { TokenIsElevated: 0 };
            let mut size = 0u32;

            if GetTokenInformation(
                token,
                TokenElevation,
                Some(&mut elevation as *mut _ as *mut _),
                std::mem::size_of::<TOKEN_ELEVATION>() as u32,
                &mut size,
            )
            .is_ok()
            {
                elevation.TokenIsElevated != 0
            } else {
                false
            }
        }
    }

    #[cfg(not(windows))]
    false
}

/// Get the service binary path from the app's resources
fn get_service_binary_path(app: &AppHandle) -> Result<PathBuf, String> {
    use tauri::Manager;

    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource directory: {}", e))?;

    let service_path = resource_dir.join("balam-fps-service.exe");

    if !service_path.exists() {
        return Err(format!("Service binary not found at: {}", service_path.display()));
    }

    Ok(service_path)
}

/// Get service status (installed, running, etc.)
#[tauri::command]
pub async fn get_fps_service_status() -> Result<ServiceStatus, String> {
    let output = Command::new("sc")
        .args(["query", SERVICE_NAME])
        .output()
        .map_err(|e| format!("Failed to query service: {}", e))?;

    if !output.status.success() {
        // Service not installed
        return Ok(ServiceStatus {
            installed: false,
            running: false,
            version: None,
            error: None,
        });
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let running = stdout.contains("RUNNING");

    Ok(ServiceStatus {
        installed: true,
        running,
        version: Some(env!("CARGO_PKG_VERSION").to_string()),
        error: None,
    })
}

/// Install the FPS monitoring service
#[tauri::command]
pub async fn install_fps_service(app: AppHandle) -> Result<ServiceStatus, String> {
    // Check admin privileges
    if !is_elevated() {
        return Err("Administrator privileges required to install service".to_string());
    }

    // Get service binary path
    let service_path = get_service_binary_path(&app)?;

    // Check if already installed
    let status = get_fps_service_status().await?;
    if status.installed {
        // Service already installed, just return status
        return Ok(status);
    }

    // Install service
    let install_output = Command::new("sc")
        .args([
            "create",
            SERVICE_NAME,
            &format!("binPath= \"{}\"", service_path.display()),
            "start=auto",
            &format!("DisplayName= \"{}\"", SERVICE_DISPLAY_NAME),
        ])
        .output()
        .map_err(|e| format!("Failed to create service: {}", e))?;

    if !install_output.status.success() {
        let stderr = String::from_utf8_lossy(&install_output.stderr);
        return Err(format!("Failed to create service: {}", stderr));
    }

    // Set description
    Command::new("sc")
        .args(["description", SERVICE_NAME, SERVICE_DESCRIPTION])
        .output()
        .ok();

    // Start service
    start_fps_service().await?;

    get_fps_service_status().await
}

/// Uninstall the FPS monitoring service
#[tauri::command]
pub async fn uninstall_fps_service() -> Result<ServiceStatus, String> {
    // Check admin privileges
    if !is_elevated() {
        return Err("Administrator privileges required to uninstall service".to_string());
    }

    // Check if installed
    let status = get_fps_service_status().await?;
    if !status.installed {
        return Ok(status);
    }

    // Stop service first
    if status.running {
        stop_fps_service().await.ok();
    }

    // Wait for service to fully stop
    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

    // Delete service
    let delete_output = Command::new("sc")
        .args(["delete", SERVICE_NAME])
        .output()
        .map_err(|e| format!("Failed to delete service: {}", e))?;

    if !delete_output.status.success() {
        let stderr = String::from_utf8_lossy(&delete_output.stderr);
        return Err(format!("Failed to delete service: {}", stderr));
    }

    Ok(ServiceStatus {
        installed: false,
        running: false,
        version: None,
        error: None,
    })
}

/// Start the FPS monitoring service
#[tauri::command]
pub async fn start_fps_service() -> Result<ServiceStatus, String> {
    let status = get_fps_service_status().await?;

    if !status.installed {
        return Err("Service not installed".to_string());
    }

    if status.running {
        return Ok(status);
    }

    let start_output = Command::new("sc")
        .args(["start", SERVICE_NAME])
        .output()
        .map_err(|e| format!("Failed to start service: {}", e))?;

    if !start_output.status.success() {
        let stderr = String::from_utf8_lossy(&start_output.stderr);
        // Check if already started
        if stderr.contains("1056") {
            // ERROR_SERVICE_ALREADY_RUNNING
            return get_fps_service_status().await;
        }
        return Err(format!("Failed to start service: {}", stderr));
    }

    // Wait for service to start
    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;

    get_fps_service_status().await
}

/// Stop the FPS monitoring service
#[tauri::command]
pub async fn stop_fps_service() -> Result<ServiceStatus, String> {
    let status = get_fps_service_status().await?;

    if !status.installed {
        return Err("Service not installed".to_string());
    }

    if !status.running {
        return Ok(status);
    }

    let stop_output = Command::new("sc")
        .args(["stop", SERVICE_NAME])
        .output()
        .map_err(|e| format!("Failed to stop service: {}", e))?;

    if !stop_output.status.success() {
        let stderr = String::from_utf8_lossy(&stop_output.stderr);
        // Check if already stopped
        if stderr.contains("1062") {
            // ERROR_SERVICE_NOT_ACTIVE
            return get_fps_service_status().await;
        }
        return Err(format!("Failed to stop service: {}", stderr));
    }

    // Wait for service to stop
    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;

    get_fps_service_status().await
}

/// Update service binary (stop, replace, start)
#[tauri::command]
pub async fn update_fps_service(app: AppHandle) -> Result<ServiceStatus, String> {
    // Check admin privileges
    if !is_elevated() {
        return Err("Administrator privileges required to update service".to_string());
    }

    // Get current status
    let status = get_fps_service_status().await?;
    if !status.installed {
        return Err("Service not installed. Install it first.".to_string());
    }

    // Stop service
    if status.running {
        stop_fps_service().await?;
    }

    // Wait for service to fully stop
    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

    // Get paths
    let service_path = get_service_binary_path(&app)?;

    // Query service config to get current binary path
    let query_output = Command::new("sc")
        .args(["qc", SERVICE_NAME])
        .output()
        .map_err(|e| format!("Failed to query service config: {}", e))?;

    let config = String::from_utf8_lossy(&query_output.stdout);
    let current_path = config
        .lines()
        .find(|line| line.contains("BINARY_PATH_NAME"))
        .and_then(|line| line.split(':').nth(1))
        .map(|s| s.trim())
        .ok_or("Could not find service binary path")?;

    // Copy new binary
    std::fs::copy(&service_path, current_path).map_err(|e| format!("Failed to copy service binary: {}", e))?;

    // Restart service
    start_fps_service().await
}

/// Enable/disable FPS monitoring (toggle service on/off)
#[tauri::command]
pub async fn toggle_fps_service(app: AppHandle, enabled: bool) -> Result<ServiceStatus, String> {
    let status = get_fps_service_status().await?;

    if enabled {
        // Enable: Install if needed, then start
        if !status.installed {
            install_fps_service(app).await
        } else if !status.running {
            start_fps_service().await
        } else {
            Ok(status)
        }
    } else {
        // Disable: Stop service (but don't uninstall)
        if status.running {
            stop_fps_service().await
        } else {
            Ok(status)
        }
    }
}
