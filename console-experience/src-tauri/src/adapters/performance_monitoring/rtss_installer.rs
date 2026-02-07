/**
 * RTSS Auto-Installer via Windows Package Manager (winget)
 *
 * Provides automatic installation of RivaTuner Statistics Server (RTSS)
 * using winget, eliminating the need for users to manually download and
 * install MSI Afterburner.
 *
 * ## Legal Compliance
 * - ✅ Uses official distribution channel (Guru3D via winget)
 * - ✅ Does NOT bundle RTSS.exe (which would violate license)
 * - ✅ Downloads from authorized source only
 *
 * ## Requirements
 * - Windows 10 1809+ or Windows 11 (winget availability)
 * - Administrator privileges (UAC prompt for installation)
 *
 * ## Usage
 * ```rust
 * if !RTSSInstaller::is_rtss_installed() {
 *     RTSSInstaller::install_rtss_silent()?;
 * }
 * ```
 */
use std::process::Command;
use tracing::{error, info, warn};

/// Winget package ID for `RTSS`
const RTSS_PACKAGE_ID: &str = "Guru3D.RTSS";

pub struct RTSSInstaller;

impl RTSSInstaller {
    /// Checks if Windows Package Manager (winget) is available on the system.
    ///
    /// Winget is included by default in Windows 11 and Windows 10 1809+.
    /// Older systems may need to install it via Microsoft Store (App Installer).
    ///
    /// # Returns
    /// - `true` if winget is available and functional
    /// - `false` if winget not found or not working
    ///
    /// # Examples
    /// ```
    /// if RTSSInstaller::is_winget_available() {
    ///     println!("Can auto-install `RTSS`");
    /// } else {
    ///     println!("Manual installation required");
    /// }
    /// ```
    pub fn is_winget_available() -> bool {
        match Command::new("winget").arg("--version").output() {
            Ok(output) => {
                let available = output.status.success();
                if available {
                    let version = String::from_utf8_lossy(&output.stdout);
                    info!("Winget available: {}", version.trim());
                } else {
                    warn!("Winget command failed");
                }
                available
            },
            Err(e) => {
                warn!("Winget not found: {}", e);
                false
            },
        }
    }

    /// Checks if `RTSS` is installed on the system via winget.
    ///
    /// This queries winget's package database to see if Guru3D.`RTSS` is installed.
    /// Note: This only detects `RTSS` installed via winget, not manual installations
    /// or MSI Afterburner bundles.
    ///
    /// # Returns
    /// - `true` if RTSS is installed (detected by winget)
    /// - `false` if RTSS not found or winget unavailable
    ///
    /// # Examples
    /// ```
    /// if RTSSInstaller::is_rtss_installed() {
    ///     println!("`RTSS` already installed");
    /// } else {
    ///     println!("`RTSS` not detected");
    /// }
    /// ```
    pub fn is_rtss_installed() -> bool {
        if !Self::is_winget_available() {
            return false;
        }

        match Command::new("winget")
            .args(["list", "--id", RTSS_PACKAGE_ID, "--exact"])
            .output()
        {
            Ok(output) => {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    let installed = stdout.contains(RTSS_PACKAGE_ID);

                    if installed {
                        info!("RTSS detected via winget");
                    } else {
                        info!("RTSS not found in winget list");
                    }

                    installed
                } else {
                    warn!("Winget list command failed");
                    false
                }
            },
            Err(e) => {
                error!("Failed to check RTSS installation: {}", e);
                false
            },
        }
    }

    /// Installs `RTSS` silently via winget.
    ///
    /// This downloads and installs `RTSS` from the official Guru3D source
    /// via winget, with minimal user interaction (silent install).
    ///
    /// ## Process
    /// 1. Verifies winget is available
    /// 2. Triggers UAC prompt for admin privileges
    /// 3. Downloads `RTSS` from official source
    /// 4. Installs silently in background (~30 seconds)
    /// 5. Auto-accepts license agreements
    ///
    /// ## Requirements
    /// - Winget available (Windows 10 1809+ or Windows 11)
    /// - User grants UAC admin prompt
    /// - Internet connection for download
    ///
    /// # Returns
    /// - `Ok(())` if installation succeeded
    /// - `Err(...)` if installation failed (winget unavailable, user denied UAC, etc.)
    ///
    /// # Examples
    /// ```
    /// match RTSSInstaller::install_rtss_silent() {
    ///     `Ok`(()) => println!("RTSS installed successfully"),
    ///     `Err`(e) => eprintln!("Installation failed: {}", e),
    /// }
    /// ```
    pub fn install_rtss_silent() -> Result<(), String> {
        // Verify winget is available
        if !Self::is_winget_available() {
            return Err("Windows Package Manager (winget) not available. \
                 Please install from Microsoft Store (App Installer) \
                 or update Windows to version 1809 or later."
                .to_string());
        }

        info!("Starting RTSS installation via winget...");

        // Execute winget install with silent flags
        let output = Command::new("winget")
            .args([
                "install",
                RTSS_PACKAGE_ID,
                "--silent",
                "--accept-source-agreements",
                "--accept-package-agreements",
            ])
            .output()
            .map_err(|e| format!("Failed to execute winget install: {e}"))?;

        if output.status.success() {
            info!("RTSS installed successfully via winget");
            Ok(())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);

            error!("Winget install failed:");
            error!("  stdout: {}", stdout);
            error!("  stderr: {}", stderr);

            // Parse common error messages
            if stderr.contains("requires administrator") || stdout.contains("requires administrator") {
                Err("Installation requires administrator privileges. \
                     Please grant permission when UAC prompt appears."
                    .to_string())
            } else if stderr.contains("network") || stderr.contains("download") {
                Err("Failed to download RTSS. Please check your internet connection.".to_string())
            } else if stderr.contains("already installed") {
                // Not actually an error
                info!("RTSS already installed");
                Ok(())
            } else {
                Err(format!("Winget install failed: {stderr}\nOutput: {stdout}"))
            }
        }
    }

    /// Uninstalls `RTSS` via winget (for cleanup/testing).
    ///
    /// This is primarily useful for testing or if the user wants to
    /// remove `RTSS` without manually uninstalling via Control Panel.
    ///
    /// # Returns
    /// - `Ok(())` if uninstallation succeeded
    /// - `Err(...)` if uninstallation failed
    ///
    /// # Examples
    /// ```
    /// RTSSInstaller::uninstall_rtss()?;
    /// ```
    pub fn uninstall_rtss() -> Result<(), String> {
        if !Self::is_winget_available() {
            return Err("Winget not available".to_string());
        }

        info!("Uninstalling RTSS via winget...");

        let output = Command::new("winget")
            .args(["uninstall", RTSS_PACKAGE_ID, "--silent"])
            .output()
            .map_err(|e| format!("Failed to execute winget uninstall: {e}"))?;

        if output.status.success() {
            info!("RTSS uninstalled successfully");
            Ok(())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(format!("Winget uninstall failed: {stderr}"))
        }
    }

    /// Gets the installed version of `RTSS` (if available).
    ///
    /// # Returns
    /// - `Some(version)` if RTSS is installed (e.g., "7.3.7")
    /// - `None` if RTSS not installed or version not detected
    #[must_use]
    pub fn get_rtss_version() -> Option<String> {
        if !Self::is_rtss_installed() {
            return None;
        }

        match Command::new("winget")
            .args(["list", "--id", RTSS_PACKAGE_ID, "--exact"])
            .output()
        {
            Ok(output) => {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);

                    // Parse version from winget output
                    // Example line: "Guru3D.RTSS    7.3.7    7.3.7"
                    for line in stdout.lines() {
                        if line.contains(RTSS_PACKAGE_ID) {
                            // Extract version (second field after package ID)
                            let parts: Vec<&str> = line.split_whitespace().collect();
                            if parts.len() >= 2 {
                                return Some(parts[1].to_string());
                            }
                        }
                    }
                }
                None
            },
            Err(_) => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_winget_available() {
        // This test may fail on systems without winget
        let available = RTSSInstaller::is_winget_available();
        println!("Winget available: {available}");
    }

    #[test]
    fn test_rtss_installed() {
        // This test may fail if RTSS not installed
        let installed = RTSSInstaller::is_rtss_installed();
        println!("RTSS installed: {installed}");

        if installed {
            if let Some(version) = RTSSInstaller::get_rtss_version() {
                println!("RTSS version: {version}");
            }
        }
    }

    #[test]
    #[ignore = "manual only - avoid accidental system installs"]
    fn test_install_rtss() {
        if RTSSInstaller::is_winget_available() {
            match RTSSInstaller::install_rtss_silent() {
                Ok(()) => println!("Installation succeeded"),
                Err(e) => println!("Installation failed: {}", e),
            }
        }
    }
}
