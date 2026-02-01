use crate::domain::performance::{PerformanceProfile, TDPConfig};

/// Hardware vendor for TDP control.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum HardwareVendor {
    AMD,
    Intel,
    Unknown,
}

/// Port defining performance control capabilities (TDP, CPU governor, etc.).
///
/// This trait provides a hardware abstraction layer for power management
/// and performance tuning, primarily targeting handheld gaming devices.
///
/// # Hardware Support
/// - **AMD (Ryzen)**: Via `RyzenAdj` FFI (ROG Ally, Legion Go, Steam Deck)
/// - **Intel**: Via MSR access (experimental)
/// - **ARM/Other**: Not supported (returns `HardwareVendor::Unknown`)
///
/// # Thread Safety
/// All implementations must be `Send + Sync`.
///
/// # Examples
/// ```rust
/// use console_experience::ports::performance_port::PerformancePort;
/// use console_experience::adapters::performance::RyzenAdjAdapter;
/// use console_experience::domain::performance::PerformanceProfile;
///
/// let adapter = RyzenAdjAdapter::new();
/// if adapter.supports_tdp_control() {
///     adapter.apply_profile(PerformanceProfile::Balanced)?;
/// }
/// # Ok::<(), String>(())
/// ```
pub trait PerformancePort {
    /// Detects the hardware vendor and TDP capabilities.
    ///
    /// # Returns
    /// - `Ok(HardwareVendor::AMD)` - Ryzen CPU detected
    /// - `Ok(HardwareVendor::Intel)` - Intel CPU detected
    /// - `Ok(HardwareVendor::Unknown)` - No supported CPU found
    /// - `Err(...)` - Detection error
    ///
    /// # Performance
    /// Cached after first call. Safe to call frequently.
    fn detect_hardware(&self) -> Result<HardwareVendor, String>;

    /// Gets the current TDP configuration including hardware limits.
    ///
    /// # Returns
    /// A `TDPConfig` struct containing:
    /// - **`current_watts`**: Current TDP setting
    /// - **`min_watts`**: Hardware minimum (usually 3-5W)
    /// - **`max_watts`**: Hardware maximum (usually 25-30W)
    ///
    /// # Errors
    /// - `Err("Not supported")` - Hardware lacks TDP control
    /// - `Err("Driver not found")` - RyzenAdj/WinRing0 not installed
    /// - `Err(...)` - FFI error
    ///
    /// # Examples
    /// ```rust
    /// # use console_experience::ports::performance_port::PerformancePort;
    /// # use console_experience::adapters::performance::RyzenAdjAdapter;
    /// let adapter = RyzenAdjAdapter::new();
    /// let config = adapter.get_tdp_config()?;
    /// println!("Current: {}W (Range: {}-{}W)",
    ///     config.current_watts, config.min_watts, config.max_watts);
    /// # Ok::<(), String>(())
    /// ```
    fn get_tdp_config(&self) -> Result<TDPConfig, String>;

    /// Sets the TDP to a specific wattage.
    ///
    /// # Arguments
    /// * `watts` - Target TDP in watts (automatically clamped to hardware min/max)
    ///
    /// # Errors
    /// - `Err("Not supported")` - Hardware lacks TDP control
    /// - `Err("Access denied")` - Insufficient privileges (needs admin/root)
    /// - `Err(...)` - FFI or driver error
    ///
    /// # Safety
    /// Setting TDP too low (<5W) may cause system instability.
    /// Setting TDP too high (>30W) may trigger thermal throttling.
    ///
    /// # Platform Notes
    /// - **`RyzenAdj`**: Requires WinRing0x64.sys driver (auto-installed)
    /// - **Conflict Detection**: May conflict with Armoury Crate, Legion Space
    ///
    /// # Examples
    /// ```rust
    /// # use console_experience::ports::performance_port::PerformancePort;
    /// # use console_experience::adapters::performance::RyzenAdjAdapter;
    /// let adapter = RyzenAdjAdapter::new();
    /// adapter.set_tdp(15)?; // Set to 15W (Balanced mode)
    /// # Ok::<(), String>(())
    /// ```
    fn set_tdp(&self, watts: u32) -> Result<(), String>;

    /// Applies a predefined performance profile.
    ///
    /// # Arguments
    /// * `profile` - One of `Eco`, `Balanced`, or `Performance`
    ///
    /// # Profile Mapping
    /// - **Eco**: 40% of max TDP (e.g., 10W on 25W device)
    /// - **Balanced**: 60% of max TDP (e.g., 15W on 25W device)
    /// - **Performance**: 100% of max TDP (e.g., 25W on 25W device)
    ///
    /// # Errors
    /// Returns `Err` if underlying `set_tdp()` fails.
    ///
    /// # Examples
    /// ```rust
    /// # use console_experience::ports::performance_port::PerformancePort;
    /// # use console_experience::domain::performance::PerformanceProfile;
    /// # use console_experience::adapters::performance::RyzenAdjAdapter;
    /// let adapter = RyzenAdjAdapter::new();
    /// adapter.apply_profile(PerformanceProfile::Eco)?; // Power saving
    /// # Ok::<(), String>(())
    /// ```
    fn apply_profile(&self, profile: PerformanceProfile) -> Result<(), String> {
        let config = self.get_tdp_config()?;
        let watts = profile.to_watts(&config);
        self.set_tdp(watts)
    }

    /// Checks if TDP control is supported on this hardware.
    ///
    /// # Returns
    /// - `true` - TDP control available (AMD Ryzen handheld detected)
    /// - `false` - Not supported (desktop PC, Intel, ARM, etc.)
    ///
    /// # Performance
    /// Fast check (<5ms). Call before attempting TDP changes.
    ///
    /// # Examples
    /// ```rust
    /// # use console_experience::ports::performance_port::PerformancePort;
    /// # use console_experience::adapters::performance::RyzenAdjAdapter;
    /// let adapter = RyzenAdjAdapter::new();
    /// if !adapter.supports_tdp_control() {
    ///     println!("TDP control not available on this device");
    /// }
    /// ```
    fn supports_tdp_control(&self) -> bool;
}
