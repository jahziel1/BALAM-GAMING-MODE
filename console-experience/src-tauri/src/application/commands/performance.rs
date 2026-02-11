use crate::adapters::display::WindowsDisplayAdapter;
use crate::adapters::performance::RyzenAdjAdapter;
use crate::adapters::performance_monitoring::WindowsPerfMonitor;
use crate::domain::performance::{FPSStats, PerformanceMetrics};
use crate::domain::{BrightnessConfig, PerformanceProfile, RefreshRateConfig, TDPConfig};
use crate::ports::display_port::DisplayPort;
use crate::ports::performance_port::PerformancePort;
use std::sync::LazyLock;
use tracing::info;

// ============================================================================
// DISPLAY COMMANDS (Brightness, Refresh Rate)
// ============================================================================

#[tauri::command]
pub fn get_brightness() -> Result<Option<u32>, String> {
    DisplayPort::get_brightness(&WindowsDisplayAdapter::new())
}

#[tauri::command]
pub fn set_brightness(level: u32) -> Result<(), String> {
    let config = BrightnessConfig::new(level).map_err(|e| format!("Invalid brightness level: {e}"))?;
    DisplayPort::set_brightness(&WindowsDisplayAdapter::new(), config)
}

#[tauri::command]
pub fn get_refresh_rate() -> Result<u32, String> {
    DisplayPort::get_refresh_rate(&WindowsDisplayAdapter::new())
}

#[tauri::command]
pub fn set_refresh_rate(hz: u32) -> Result<(), String> {
    let config = RefreshRateConfig::new(hz).map_err(|e| format!("Invalid refresh rate: {e}"))?;
    DisplayPort::set_refresh_rate(&WindowsDisplayAdapter::new(), config)
}

#[tauri::command]
pub fn get_supported_refresh_rates() -> Result<Vec<u32>, String> {
    DisplayPort::get_supported_refresh_rates(&WindowsDisplayAdapter::new())
}

#[tauri::command]
#[must_use]
pub fn supports_brightness_control() -> bool {
    DisplayPort::supports_brightness_control(&WindowsDisplayAdapter::new())
}

// ============================================================================
// PERFORMANCE COMMANDS (TDP Control)
// ============================================================================

#[tauri::command]
pub fn get_tdp_config() -> Result<TDPConfig, String> {
    PerformancePort::get_tdp_config(&RyzenAdjAdapter::new())
}

#[tauri::command]
pub fn set_tdp(watts: u32) -> Result<(), String> {
    info!("Frontend requested TDP change to {}W", watts);
    PerformancePort::set_tdp(&RyzenAdjAdapter::new(), watts)
}

#[tauri::command]
pub fn apply_performance_profile(profile: String) -> Result<(), String> {
    let profile_enum = match profile.as_str() {
        "eco" => PerformanceProfile::Eco,
        "balanced" => PerformanceProfile::Balanced,
        "performance" => PerformanceProfile::Performance,
        _ => return Err(format!("Unknown profile: {profile}")),
    };

    info!("Applying performance profile: {:?}", profile_enum);
    PerformancePort::apply_profile(&RyzenAdjAdapter::new(), profile_enum)
}

#[tauri::command]
#[must_use]
pub fn supports_tdp_control() -> bool {
    PerformancePort::supports_tdp_control(&RyzenAdjAdapter::new())
}

// ============================================================================
// Performance Monitoring Commands
// ============================================================================

/// Global performance monitor instance (singleton).
pub(crate) static PERF_MONITOR: LazyLock<WindowsPerfMonitor> = LazyLock::new(WindowsPerfMonitor::new);

#[tauri::command]
pub fn get_fps_stats() -> Result<Option<FPSStats>, String> {
    let metrics = PERF_MONITOR.get_metrics();
    Ok(metrics.fps)
}

#[tauri::command]
pub fn get_performance_metrics() -> Result<PerformanceMetrics, String> {
    Ok(PERF_MONITOR.get_metrics())
}

#[tauri::command]
pub fn is_nvml_available() -> bool {
    PERF_MONITOR.is_nvml_available()
}
