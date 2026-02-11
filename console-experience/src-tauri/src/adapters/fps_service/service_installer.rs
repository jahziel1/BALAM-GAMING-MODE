/// FPS Service Installer - Install/uninstall Windows Service
///
/// Handles installation and management of the Balam FPS Service.
///
/// # Security
/// Requires administrator privileges to install/uninstall service.
use std::path::PathBuf;
use tracing::info;
use windows::core::PCWSTR;
use windows::Win32::Foundation::TRUE;
use windows::Win32::Storage::FileSystem::DELETE;
use windows::Win32::System::Services::{
    ChangeServiceConfig2W, CloseServiceHandle, ControlService, CreateServiceW, DeleteService, OpenSCManagerW,
    OpenServiceW, QueryServiceStatus, StartServiceW, SC_MANAGER_CONNECT, SC_MANAGER_CREATE_SERVICE, SERVICE_ALL_ACCESS,
    SERVICE_AUTO_START, SERVICE_CONFIG_DELAYED_AUTO_START_INFO, SERVICE_CONFIG_DESCRIPTION, SERVICE_CONTROL_STOP,
    SERVICE_DELAYED_AUTO_START_INFO, SERVICE_DESCRIPTIONW, SERVICE_ERROR_NORMAL, SERVICE_QUERY_STATUS, SERVICE_RUNNING,
    SERVICE_START, SERVICE_STATUS, SERVICE_STOP, SERVICE_STOPPED, SERVICE_WIN32_OWN_PROCESS,
};

const SERVICE_NAME: &str = "BalamFpsService";
const SERVICE_DISPLAY_NAME: &str = "Balam FPS Monitoring Service";
const SERVICE_DESCRIPTION: &str = "Provides FPS monitoring for Balam Console using ETW (Event Tracing for Windows)";

/// FPS Service Installer
pub struct FpsServiceInstaller;

impl FpsServiceInstaller {
    /// Install the FPS service
    ///
    /// # Arguments
    /// * `service_binary_path` - Path to `balam-fps-service.exe`
    ///
    /// # Errors
    /// Returns error if:
    /// - Not running as administrator
    /// - Service already exists
    /// - Binary not found
    pub fn install(service_binary_path: PathBuf) -> Result<(), String> {
        info!("📦 Installing FPS service...");

        // Verify binary exists
        if !service_binary_path.exists() {
            return Err(format!("Service binary not found: {}", service_binary_path.display()));
        }

        unsafe {
            // Open Service Control Manager
            let scm = OpenSCManagerW(None, None, SC_MANAGER_CREATE_SERVICE)
                .map_err(|e| format!("Failed to open Service Control Manager: {}. Are you administrator?", e))?;

            if scm.is_invalid() {
                return Err("Failed to open Service Control Manager (are you administrator?)".to_string());
            }

            // Convert paths to wide strings using w! macro for literals
            let service_name = Self::to_wide(SERVICE_NAME);
            let display_name = Self::to_wide(SERVICE_DISPLAY_NAME);
            let binary_path = Self::to_wide(&service_binary_path.to_string_lossy());

            // Create service - using PCWSTR::from_raw() for safety
            let service = CreateServiceW(
                scm,
                PCWSTR::from_raw(service_name.as_ptr()),
                PCWSTR::from_raw(display_name.as_ptr()),
                SERVICE_ALL_ACCESS,
                SERVICE_WIN32_OWN_PROCESS,
                SERVICE_AUTO_START,
                SERVICE_ERROR_NORMAL,
                PCWSTR::from_raw(binary_path.as_ptr()),
                None, // No load order group
                None, // No tag identifier
                None, // No dependencies
                None, // LocalSystem account
                None, // No password
            );

            if let Err(e) = service {
                let _ = CloseServiceHandle(scm);
                return Err(format!("Failed to create service: {}", e));
            }

            let service = service.unwrap();

            // Set description
            let description = Self::to_wide(SERVICE_DESCRIPTION);
            let service_desc = SERVICE_DESCRIPTIONW {
                lpDescription: windows::core::PWSTR::from_raw(description.as_ptr().cast_mut()),
            };

            let _ = ChangeServiceConfig2W(
                service,
                SERVICE_CONFIG_DESCRIPTION,
                Some(&service_desc as *const _ as *const _),
            );

            // Set delayed auto-start (starts 2 minutes after boot to not slow down startup)
            let delayed_info = SERVICE_DELAYED_AUTO_START_INFO {
                fDelayedAutostart: TRUE,
            };

            let _ = ChangeServiceConfig2W(
                service,
                SERVICE_CONFIG_DELAYED_AUTO_START_INFO,
                Some(&delayed_info as *const _ as *const _),
            );

            // Cleanup
            let _ = CloseServiceHandle(service);
            let _ = CloseServiceHandle(scm);
        }

        info!("✅ FPS service installed successfully");
        Ok(())
    }

    /// Uninstall the FPS service
    pub fn uninstall() -> Result<(), String> {
        info!("🗑️ Uninstalling FPS service...");

        unsafe {
            // Open Service Control Manager
            let scm = OpenSCManagerW(None, None, SC_MANAGER_CONNECT)
                .map_err(|e| format!("Failed to open Service Control Manager: {}", e))?;

            if scm.is_invalid() {
                return Err("Failed to open Service Control Manager".to_string());
            }

            // Open service
            let service_name = Self::to_wide(SERVICE_NAME);
            let service = OpenServiceW(
                scm,
                PCWSTR::from_raw(service_name.as_ptr()),
                SERVICE_STOP | SERVICE_QUERY_STATUS | DELETE.0,
            );

            if let Err(e) = service {
                let _ = CloseServiceHandle(scm);
                return Err(format!("Failed to open service: {}", e));
            }

            let service = service.unwrap();

            // Stop service if running
            let mut status = SERVICE_STATUS::default();
            if QueryServiceStatus(service, &mut status).is_ok() && status.dwCurrentState != SERVICE_STOPPED {
                info!("🛑 Stopping service...");
                let _ = ControlService(service, SERVICE_CONTROL_STOP, &mut status);

                // Wait for stop (max 10 seconds)
                for _ in 0..20 {
                    std::thread::sleep(std::time::Duration::from_millis(500));
                    if QueryServiceStatus(service, &mut status).is_ok() && status.dwCurrentState == SERVICE_STOPPED {
                        break;
                    }
                }
            }

            // Delete service
            DeleteService(service).map_err(|e| format!("Failed to delete service: {}", e))?;

            // Cleanup
            let _ = CloseServiceHandle(service);
            let _ = CloseServiceHandle(scm);
        }

        info!("✅ FPS service uninstalled successfully");
        Ok(())
    }

    /// Start the FPS service
    pub fn start() -> Result<(), String> {
        info!("▶️ Starting FPS service...");

        unsafe {
            let scm =
                OpenSCManagerW(None, None, SC_MANAGER_CONNECT).map_err(|e| format!("Failed to open SCM: {}", e))?;

            let service_name = Self::to_wide(SERVICE_NAME);
            let service = OpenServiceW(
                scm,
                PCWSTR::from_raw(service_name.as_ptr()),
                SERVICE_START | SERVICE_QUERY_STATUS,
            )
            .map_err(|e| format!("Failed to open service: {}", e))?;

            // Check if already running
            let mut status = SERVICE_STATUS::default();
            if QueryServiceStatus(service, &mut status).is_ok() && status.dwCurrentState == SERVICE_RUNNING {
                let _ = CloseServiceHandle(service);
                let _ = CloseServiceHandle(scm);
                return Ok(()); // Already running
            }

            // Start service
            StartServiceW(service, None).map_err(|e| format!("Failed to start service: {}", e))?;

            let _ = CloseServiceHandle(service);
            let _ = CloseServiceHandle(scm);
        }

        info!("✅ FPS service started");
        Ok(())
    }

    /// Stop the FPS service
    pub fn stop() -> Result<(), String> {
        info!("⏹️ Stopping FPS service...");

        unsafe {
            let scm =
                OpenSCManagerW(None, None, SC_MANAGER_CONNECT).map_err(|e| format!("Failed to open SCM: {}", e))?;

            let service_name = Self::to_wide(SERVICE_NAME);
            let service = OpenServiceW(
                scm,
                PCWSTR::from_raw(service_name.as_ptr()),
                SERVICE_STOP | SERVICE_QUERY_STATUS,
            )
            .map_err(|e| format!("Failed to open service: {}", e))?;

            let mut status = SERVICE_STATUS::default();
            ControlService(service, SERVICE_CONTROL_STOP, &mut status)
                .map_err(|e| format!("Failed to stop service: {}", e))?;

            let _ = CloseServiceHandle(service);
            let _ = CloseServiceHandle(scm);
        }

        info!("✅ FPS service stopped");
        Ok(())
    }

    /// Check if service is installed
    #[must_use]
    pub fn is_installed() -> bool {
        unsafe {
            let Ok(scm) = OpenSCManagerW(None, None, SC_MANAGER_CONNECT) else {
                return false;
            };

            if scm.is_invalid() {
                return false;
            }

            let service_name = Self::to_wide(SERVICE_NAME);
            let service = OpenServiceW(scm, PCWSTR::from_raw(service_name.as_ptr()), SERVICE_QUERY_STATUS);

            let installed = service.is_ok();

            if let Ok(s) = service {
                let _ = CloseServiceHandle(s);
            }
            let _ = CloseServiceHandle(scm);

            installed
        }
    }

    /// Check if service is running
    #[must_use]
    pub fn is_running() -> bool {
        unsafe {
            let Ok(scm) = OpenSCManagerW(None, None, SC_MANAGER_CONNECT) else {
                return false;
            };

            if scm.is_invalid() {
                return false;
            }

            let service_name = Self::to_wide(SERVICE_NAME);
            let Ok(service) = OpenServiceW(scm, PCWSTR::from_raw(service_name.as_ptr()), SERVICE_QUERY_STATUS) else {
                let _ = CloseServiceHandle(scm);
                return false;
            };

            let mut status = SERVICE_STATUS::default();
            let running = QueryServiceStatus(service, &mut status).is_ok() && status.dwCurrentState == SERVICE_RUNNING;

            let _ = CloseServiceHandle(service);
            let _ = CloseServiceHandle(scm);

            running
        }
    }

    /// Convert string to wide (UTF-16) null-terminated
    fn to_wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(std::iter::once(0)).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_service_status_check() {
        // Should not panic even if service not installed
        let _ = FpsServiceInstaller::is_installed();
        let _ = FpsServiceInstaller::is_running();
    }
}
