use crate::adapters::performance_monitoring::{NVMLAdapter, PresentMonAdapter, RTSSAdapter};
use crate::domain::performance::PerformanceMetrics;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use sysinfo::{CpuRefreshKind, MemoryRefreshKind, RefreshKind, System};
use tracing::{info, warn};

/// Windows performance monitoring adapter - orchestrates all performance metrics.
///
/// # Features
/// - **CPU/RAM:** sysinfo (fast, cross-platform)
/// - **GPU (NVIDIA):** `NVML` adapter (official API)
/// - **FPS:** `PresentMon` adapter (`ETW` events)
/// - **Fallback Chain:** If `NVML` fails, GPU shows 0% (graceful degradation)
///
/// # Performance
/// - CPU/RAM: <10ms per query
/// - GPU (`NVML`): <5ms per query
/// - FPS (`PresentMon`): Background thread, no blocking
/// - Total overhead: <2% CPU
///
/// # Architecture
/// This is the main orchestrator that aggregates metrics from multiple adapters:
/// - sysinfo for CPU/RAM
/// - `NVML` for NVIDIA GPU
/// - `PresentMon` for FPS
///
/// All adapters are lazy-initialized and handle errors gracefully.
///
/// # Important Note on CPU Usage
/// sysinfo requires TWO snapshots with a delay to calculate CPU usage correctly.
/// This struct maintains a background refresh mechanism to ensure accurate readings.
pub struct WindowsPerfMonitor {
    /// System information instance (cached for performance)
    system: Arc<Mutex<System>>,
    /// `NVML` adapter for NVIDIA GPU metrics (lazy initialized)
    nvml: Arc<NVMLAdapter>,
    /// `PresentMon` adapter for FPS monitoring (lazy initialized)
    presentmon: Arc<PresentMonAdapter>,
    /// `RTSS` adapter for fullscreen overlay (lazy initialized)
    rtss: Arc<Mutex<Option<RTSSAdapter>>>,
    /// FPS monitoring active flag
    fps_monitoring_active: Arc<Mutex<bool>>,
    /// Last time system metrics were refreshed (for rate limiting)
    #[allow(dead_code)]
    last_refresh: Arc<Mutex<Instant>>,
    /// Whether to use `RTSS` for overlay (fullscreen mode)
    use_rtss_overlay: Arc<Mutex<bool>>,
}

impl WindowsPerfMonitor {
    /// Creates a new Windows performance monitor.
    ///
    /// Initializes sysinfo System and creates adapter instances (lazy initialization).
    /// `NVML` and `PresentMon` are not initialized until first use.
    ///
    /// # Important
    /// This also starts a background thread that refreshes sysinfo metrics every 500ms.
    /// This is required for accurate CPU usage readings (sysinfo needs two snapshots).
    #[must_use]
    pub fn new() -> Self {
        info!("Initializing WindowsPerfMonitor");

        // Create System with optimized refresh settings
        let refresh_kind = RefreshKind::new()
            .with_cpu(CpuRefreshKind::everything())
            .with_memory(MemoryRefreshKind::everything());

        let mut system = System::new_with_specifics(refresh_kind);
        system.refresh_all();

        let system_arc = Arc::new(Mutex::new(system));
        let last_refresh = Arc::new(Mutex::new(Instant::now()));

        // Start background refresh thread for sysinfo
        // This ensures CPU usage is calculated correctly (needs two snapshots)
        let system_clone = system_arc.clone();
        let last_refresh_clone = last_refresh.clone();
        thread::spawn(move || {
            info!("Performance monitor background refresh thread started");
            loop {
                thread::sleep(Duration::from_millis(500));

                if let Ok(mut system_guard) = system_clone.lock() {
                    system_guard.refresh_cpu();
                    system_guard.refresh_memory();

                    if let Ok(mut last_refresh_guard) = last_refresh_clone.lock() {
                        *last_refresh_guard = Instant::now();
                    }
                }
            }
        });

        // Wait for first refresh to complete (ensure we have baseline)
        thread::sleep(Duration::from_millis(600));

        // Try to initialize RTSS (lazy, will be None if not available)
        let rtss = if RTSSAdapter::is_available() {
            info!("RTSS detected, fullscreen overlay support enabled");
            match RTSSAdapter::new() {
                Ok(adapter) => Some(adapter),
                Err(e) => {
                    warn!("RTSS detected but failed to initialize: {}", e);
                    None
                },
            }
        } else {
            info!("RTSS not detected, overlay limited to borderless windowed mode");
            None
        };

        Self {
            system: system_arc,
            nvml: Arc::new(NVMLAdapter::new()),
            presentmon: Arc::new(PresentMonAdapter::new()),
            rtss: Arc::new(Mutex::new(rtss)),
            fps_monitoring_active: Arc::new(Mutex::new(false)),
            last_refresh,
            use_rtss_overlay: Arc::new(Mutex::new(false)),
        }
    }

    /// Starts FPS monitoring for a specific process.
    ///
    /// # Arguments
    /// * `pid` - Process ID to monitor (0 = all processes)
    ///
    /// # Returns
    /// - `Ok(())` - FPS monitoring started
    /// - `Err(...)` - Failed to start (PresentMon not found, etc.)
    pub fn start_fps_monitoring(&self, pid: u32) -> Result<(), String> {
        info!("Starting FPS monitoring for PID {}", pid);

        match self.presentmon.start_monitoring(pid) {
            Ok(_) => {
                if let Ok(mut active) = self.fps_monitoring_active.lock() {
                    *active = true;
                }
                info!("FPS monitoring started successfully");
                Ok(())
            },
            Err(e) => {
                warn!("Failed to start FPS monitoring: {}", e);
                Err(e)
            },
        }
    }

    /// Stops FPS monitoring.
    pub fn stop_fps_monitoring(&self) -> Result<(), String> {
        info!("Stopping FPS monitoring");

        match self.presentmon.stop_monitoring() {
            Ok(_) => {
                if let Ok(mut active) = self.fps_monitoring_active.lock() {
                    *active = false;
                }
                info!("FPS monitoring stopped successfully");
                Ok(())
            },
            Err(e) => {
                warn!("Failed to stop FPS monitoring: {}", e);
                Err(e)
            },
        }
    }

    /// Checks if FPS monitoring is active.
    #[must_use]
    pub fn is_fps_monitoring_active(&self) -> bool {
        self.fps_monitoring_active.lock().map(|active| *active).unwrap_or(false)
    }

    /// Gets CPU usage percentage (average across all cores).
    ///
    /// # Returns
    /// CPU usage as percentage (0-100).
    ///
    /// # Implementation Note
    /// This reads the cached value that is refreshed by the background thread.
    /// The background thread ensures accurate readings by maintaining proper
    /// time deltas between sysinfo refreshes.
    fn get_cpu_usage(&self) -> f32 {
        let system_guard = match self.system.lock() {
            Ok(guard) => guard,
            Err(_) => {
                warn!("Failed to lock system mutex for CPU usage");
                return 0.0;
            },
        };

        // Get global CPU usage (average across all cores)
        // Background thread handles refresh_cpu() every 500ms
        system_guard.global_cpu_info().cpu_usage()
    }

    /// Gets RAM usage in GB.
    ///
    /// # Returns
    /// Tuple of (used_gb, total_gb).
    ///
    /// # Implementation Note
    /// This reads the cached value that is refreshed by the background thread.
    fn get_ram_usage(&self) -> (f32, f32) {
        let system_guard = match self.system.lock() {
            Ok(guard) => guard,
            Err(_) => {
                warn!("Failed to lock system mutex for RAM usage");
                return (0.0, 0.0);
            },
        };

        // Background thread handles refresh_memory() every 500ms
        let used_bytes = system_guard.used_memory();
        let total_bytes = system_guard.total_memory();

        // Convert from bytes to GB (1 GB = 1073741824 bytes)
        let used_gb = used_bytes as f32 / 1_073_741_824.0;
        let total_gb = total_bytes as f32 / 1_073_741_824.0;

        (used_gb, total_gb)
    }

    /// Gets GPU usage percentage (0-100).
    ///
    /// Uses `NVML` for NVIDIA GPUs. Returns 0.0 if not available.
    ///
    /// # Returns
    /// GPU usage percentage (0-100), or 0.0 if `NVML` not available.
    fn get_gpu_usage(&self) -> f32 {
        match self.nvml.get_gpu_usage() {
            Ok(Some(usage)) => usage,
            Ok(None) => {
                // GPU metric not supported
                0.0
            },
            Err(_) => {
                // NVML not available (not NVIDIA GPU, drivers missing, etc.)
                0.0
            },
        }
    }

    /// Gets GPU temperature in Celsius.
    ///
    /// Uses NVML for NVIDIA GPUs. Returns `None` if not available.
    fn get_gpu_temp(&self) -> Option<f32> {
        match self.nvml.get_gpu_temperature() {
            Ok(temp) => temp,
            Err(_) => None,
        }
    }

    /// Gets GPU power draw in Watts.
    ///
    /// Uses NVML for NVIDIA GPUs. Returns `None` if not available.
    fn get_gpu_power(&self) -> Option<f32> {
        match self.nvml.get_gpu_power() {
            Ok(power) => power,
            Err(_) => None,
        }
    }

    /// Gets complete performance metrics.
    ///
    /// # Returns
    /// PerformanceMetrics with CPU, RAM, GPU, FPS data.
    ///
    /// # Error Handling
    /// All metrics use graceful fallbacks:
    /// - CPU/RAM: Always available (sysinfo)
    /// - GPU: 0% if `NVML` not available
    /// - FPS: `None` if PresentMon not running
    pub fn get_metrics(&self) -> PerformanceMetrics {
        let cpu_usage = self.get_cpu_usage();
        let (ram_used_gb, ram_total_gb) = self.get_ram_usage();
        let gpu_usage = self.get_gpu_usage();
        let gpu_temp_c = self.get_gpu_temp();
        let gpu_power_w = self.get_gpu_power();

        // Get FPS from PresentMon
        let fps = match self.presentmon.get_fps_stats() {
            Ok(stats) => stats,
            Err(e) => {
                warn!("Failed to get FPS stats: {}", e);
                None
            },
        };

        PerformanceMetrics {
            cpu_usage,
            gpu_usage,
            ram_used_gb,
            ram_total_gb,
            gpu_temp_c,
            cpu_temp_c: None, // CPU temp not available via sysinfo on Windows
            gpu_power_w,
            fps,
        }
    }

    /// Checks if `NVML` (NVIDIA GPU) is available.
    #[must_use]
    pub fn is_nvml_available(&self) -> bool {
        self.nvml.is_available()
    }

    /// Checks if `RTSS` is available for fullscreen overlay.
    #[must_use]
    pub fn is_rtss_available(&self) -> bool {
        self.rtss.lock().unwrap().is_some()
    }

    /// Enables `RTSS` overlay mode (for fullscreen games).
    ///
    /// When enabled, metrics are written to `RTSS` instead of the window overlay.
    pub fn enable_rtss_overlay(&self) -> Result<(), String> {
        if !self.is_rtss_available() {
            return Err("RTSS not available".to_string());
        }

        *self.use_rtss_overlay.lock().unwrap() = true;
        info!("RTSS overlay mode enabled");
        Ok(())
    }

    /// Disables `RTSS` overlay mode (back to window overlay).
    pub fn disable_rtss_overlay(&self) -> Result<(), String> {
        *self.use_rtss_overlay.lock().unwrap() = false;

        // Clear RTSS overlay
        if let Some(rtss) = self.rtss.lock().unwrap().as_ref() {
            rtss.clear()?;
        }

        info!("RTSS overlay mode disabled");
        Ok(())
    }

    /// Checks if `RTSS` overlay mode is currently active.
    #[must_use]
    pub fn is_using_rtss_overlay(&self) -> bool {
        *self.use_rtss_overlay.lock().unwrap()
    }

    /// Updates `RTSS` overlay with current metrics.
    ///
    /// This should be called periodically when `RTSS` mode is enabled.
    pub fn update_rtss_overlay(&self) -> Result<(), String> {
        let metrics = self.get_metrics();

        let rtss_guard = self.rtss.lock().unwrap();
        let rtss = rtss_guard.as_ref().ok_or("RTSS not available")?;

        let fps = metrics.fps.as_ref().map(|f| f.current_fps).unwrap_or(0.0);

        let frame_time = metrics.fps.as_ref().map(|f| f.frame_time_ms);

        rtss.update(
            fps,
            metrics.cpu_usage,
            metrics.gpu_usage,
            metrics.ram_used_gb,
            frame_time,
        )
    }
}

impl Default for WindowsPerfMonitor {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_monitor_creation() {
        let monitor = WindowsPerfMonitor::new();
        let metrics = monitor.get_metrics();

        // CPU should be a valid percentage
        assert!(metrics.cpu_usage >= 0.0 && metrics.cpu_usage <= 100.0);

        // RAM total should be > 0
        assert!(metrics.ram_total_gb > 0.0);

        // Used RAM should be less than total
        assert!(metrics.ram_used_gb <= metrics.ram_total_gb);
    }

    #[test]
    fn test_nvml_availability() {
        let monitor = WindowsPerfMonitor::new();
        // Should not panic
        let _available = monitor.is_nvml_available();
    }

    #[test]
    fn test_gpu_metrics_graceful_fallback() {
        let monitor = WindowsPerfMonitor::new();
        let metrics = monitor.get_metrics();

        // GPU should be 0 or valid percentage (not panic)
        assert!(metrics.gpu_usage >= 0.0 && metrics.gpu_usage <= 100.0);
    }
}
