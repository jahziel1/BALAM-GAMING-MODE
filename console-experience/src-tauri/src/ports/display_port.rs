use crate::domain::display::{BrightnessConfig, DisplayInfo, RefreshRateConfig};

/// Port defining display control capabilities.
///
/// This trait provides a hardware abstraction layer for display settings
/// including brightness control and refresh rate management.
///
/// # Hardware Support
/// - **Brightness**: Requires WMI (laptops) or DDC/CI (monitors with I2C support)
/// - **Refresh Rate**: Requires DXGI (Windows) or equivalent platform API
///
/// # Thread Safety
/// All implementations must be `Send + Sync`.
///
/// # Examples
/// ```rust
/// use console_experience::ports::display_port::DisplayPort;
/// use console_experience::adapters::display::WindowsDisplayAdapter;
/// use console_experience::domain::display::BrightnessConfig;
///
/// let adapter = WindowsDisplayAdapter::new();
/// if adapter.supports_brightness_control() {
///     let config = BrightnessConfig::new(80)?;
///     adapter.set_brightness(config)?;
/// }
/// # Ok::<(), String>(())
/// ```
pub trait DisplayPort {
    /// Gets the current brightness level (0-100).
    ///
    /// # Returns
    /// - `Ok(`Some`(level))` - Current brightness percentage
    /// - `Ok(`None`)` - Brightness control not supported (desktop monitors without DDC/CI)
    /// - `Err(...)` - Hardware access error
    ///
    /// # Platform Support
    /// - **Laptops**: Usually supported via WMI
    /// - **External Monitors**: Only if DDC/CI enabled
    /// - **Desktop PCs**: Usually not supported
    ///
    /// # Performance
    /// Should complete within 100ms for WMI, 200ms for DDC/CI.
    fn get_brightness(&self) -> Result<Option<u32>, String>;

    /// Sets the brightness level (0-100).
    ///
    /// # Arguments
    /// * `config` - Validated brightness configuration (automatically clamped to 0-100)
    ///
    /// # Errors
    /// - `Err("Not supported")` - Hardware lacks brightness control
    /// - `Err("Access denied")` - Insufficient permissions
    /// - `Err(...)` - Platform API error
    ///
    /// # Examples
    /// ```rust
    /// # use console_experience::ports::display_port::DisplayPort;
    /// # use console_experience::domain::display::BrightnessConfig;
    /// # use console_experience::adapters::display::WindowsDisplayAdapter;
    /// let adapter = WindowsDisplayAdapter::new();
    /// let config = BrightnessConfig::new(50)?; // 50% brightness
    /// adapter.set_brightness(config)?;
    /// # Ok::<(), String>(())
    /// ```
    fn set_brightness(&self, config: BrightnessConfig) -> Result<(), String>;

    /// Gets the current display refresh rate in Hz.
    ///
    /// # Returns
    /// Current refresh rate (e.g., 60, 120, 144)
    ///
    /// # Errors
    /// Returns `Err` if display enumeration fails.
    fn get_refresh_rate(&self) -> Result<u32, String>;

    /// Sets the display refresh rate.
    ///
    /// # Arguments
    /// * `config` - Validated refresh rate configuration
    ///
    /// # Errors
    /// - `Err("Unsupported refresh rate")` - Hardware doesn't support requested Hz
    /// - `Err(...)` - Platform API error (DXGI failure, etc.)
    ///
    /// # Important
    /// Always query `get_supported_refresh_rates()` first to validate input.
    ///
    /// # Platform Notes
    /// - **Windows**: Uses `ChangeDisplaySettings` (immediate mode change)
    /// - **VRR/FreeSync**: May override fixed refresh rates dynamically
    ///
    /// # Examples
    /// ```rust
    /// # use console_experience::ports::display_port::DisplayPort;
    /// # use console_experience::domain::display::RefreshRateConfig;
    /// # use console_experience::adapters::display::WindowsDisplayAdapter;
    /// let adapter = WindowsDisplayAdapter::new();
    /// let supported = adapter.get_supported_refresh_rates()?;
    /// if supported.contains(&120) {
    ///     let config = RefreshRateConfig::new(120)?;
    ///     adapter.set_refresh_rate(config)?;
    /// }
    /// # Ok::<(), String>(())
    /// ```
    fn set_refresh_rate(&self, config: RefreshRateConfig) -> Result<(), String>;

    /// Lists all supported refresh rates for the current display.
    ///
    /// # Returns
    /// Vector of supported Hz values (e.g., `[40, 60, 120, 144]`)
    ///
    /// # Errors
    /// Returns `Err` if display mode enumeration fails.
    ///
    /// # Performance
    /// Caches results internally. Safe to call frequently.
    fn get_supported_refresh_rates(&self) -> Result<Vec<u32>, String>;

    /// Checks if brightness control is available on this hardware.
    ///
    /// # Returns
    /// - `true` - Brightness control supported (laptop or DDC/CI monitor)
    /// - `false` - Not supported (desktop monitor without DDC/CI)
    ///
    /// # Performance
    /// Fast check (<10ms). Call before attempting brightness changes.
    fn supports_brightness_control(&self) -> bool;

    /// Gets information about all active displays with HDR capabilities.
    ///
    /// # Returns
    /// Vector of `DisplayInfo` with HDR capabilities for each display.
    ///
    /// # Errors
    /// Returns `Err` if display enumeration fails.
    ///
    /// # Performance
    /// ~10ms on first call (initializes DisplayConfig), <5ms thereafter (cached).
    fn get_displays(&self) -> Result<Vec<DisplayInfo>, String>;

    /// Gets the primary display information.
    ///
    /// # Returns
    /// `Some(DisplayInfo)` if a primary display exists, `None` otherwise.
    fn get_primary_display(&self) -> Option<DisplayInfo>;

    /// Checks if HDR is supported on a specific display.
    ///
    /// # Arguments
    /// * `display_id` - Display ID from `DisplayInfo`
    ///
    /// # Returns
    /// `true` if HDR is supported, `false` otherwise.
    fn is_hdr_supported(&self, display_id: u32) -> bool;

    /// Checks if HDR is currently enabled on a specific display.
    ///
    /// # Arguments
    /// * `display_id` - Display ID from `DisplayInfo`
    ///
    /// # Returns
    /// `true` if HDR is enabled, `false` otherwise.
    fn is_hdr_enabled(&self, display_id: u32) -> bool;

    /// Enables or disables HDR on a specific display.
    ///
    /// # Arguments
    /// * `display_id` - Display ID from `DisplayInfo`
    /// * `enabled` - Whether to enable or disable HDR
    ///
    /// # Returns
    /// `Ok(())` if HDR state was set successfully.
    ///
    /// # Errors
    /// - `Err("Display not found")` - Invalid display ID
    /// - `Err("HDR not supported")` - Display doesn't support HDR
    /// - `Err(...)` - Platform API error
    ///
    /// # Performance
    /// ~10-20ms (immediate application, no restart required)
    fn set_hdr_enabled(&self, display_id: u32, enabled: bool) -> Result<(), String>;
}
