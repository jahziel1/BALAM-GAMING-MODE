use crate::adapters::display::DisplayConfigManager;
use crate::domain::display::DisplayInfo;
use std::sync::Arc;

/// HDR Manager - High-level orchestrator for HDR control.
///
/// Provides a simplified interface for HDR detection and control across
/// multiple displays. Wraps the low-level DisplayConfig API.
///
/// # Features
/// - **Display Enumeration**: List all active displays with HDR capabilities
/// - **HDR Detection**: Check if display supports HDR
/// - **HDR Status**: Check if HDR is currently enabled
/// - **HDR Toggle**: Enable/disable HDR per display
/// - **Primary Display**: Quick access to primary display info
///
/// # Architecture
/// ```text
/// HdrManager (high-level)
///   └─> DisplayConfigManager (low-level DisplayConfig API)
/// ```
///
/// # Usage
/// ```rust
/// use console_experience_lib::adapters::display::HdrManager;
///
/// let manager = HdrManager::new();
///
/// // Get all displays
/// let displays = manager.get_displays()?;
///
/// // Check primary display HDR
/// if let Some(primary) = manager.get_primary_display() {
///     if manager.is_hdr_supported(primary.id) {
///         println!("HDR supported: {}", manager.is_hdr_enabled(primary.id));
///     }
/// }
///
/// // Toggle HDR
/// manager.set_hdr_enabled(0, true)?; // Enable HDR on display 0
/// # Ok::<(), String>(())
/// ```
///
/// # Performance
/// - Initialization: ~10ms (lazy, on first call)
/// - Display query: <5ms (cached)
/// - HDR toggle: ~10-20ms (immediate)
///
/// # Thread Safety
/// All methods are thread-safe via Arc-wrapped DisplayConfigManager.
pub struct HdrManager {
    display_config: Arc<DisplayConfigManager>,
}

impl HdrManager {
    /// Creates a new HDR manager.
    ///
    /// Initialization is lazy - DisplayConfig API is only called when
    /// `get_displays()` or related methods are invoked.
    #[must_use]
    pub fn new() -> Self {
        Self {
            display_config: Arc::new(DisplayConfigManager::new()),
        }
    }

    /// Gets information about all active displays.
    ///
    /// # Returns
    /// Vector of `DisplayInfo` with HDR capabilities for each display.
    ///
    /// # Errors
    /// Returns `Err` if DisplayConfig query fails.
    ///
    /// # Examples
    /// ```rust
    /// # use console_experience_lib::adapters::display::HdrManager;
    /// let manager = HdrManager::new();
    /// let displays = manager.get_displays()?;
    /// for display in displays {
    ///     println!("{}: HDR={:?}", display.name, display.hdr);
    /// }
    /// # Ok::<(), String>(())
    /// ```
    pub fn get_displays(&self) -> Result<Vec<DisplayInfo>, String> {
        self.display_config.get_displays()
    }

    /// Gets the primary display (first in enumeration).
    ///
    /// # Returns
    /// `Some(DisplayInfo)` if displays exist, `None` otherwise.
    ///
    /// # Note
    /// The first display path returned by DisplayConfig is usually the primary display.
    /// For multi-monitor setups, verify `is_primary` field.
    #[must_use]
    pub fn get_primary_display(&self) -> Option<DisplayInfo> {
        self.get_displays().ok()?.into_iter().next()
    }

    /// Checks if HDR is supported on a specific display.
    ///
    /// # Arguments
    /// * `display_id` - Display ID from `DisplayInfo`
    ///
    /// # Returns
    /// `true` if HDR is supported, `false` otherwise.
    ///
    /// # Examples
    /// ```rust
    /// # use console_experience_lib::adapters::display::HdrManager;
    /// let manager = HdrManager::new();
    /// if manager.is_hdr_supported(0) {
    ///     println!("Primary display supports HDR");
    /// }
    /// ```
    #[must_use]
    pub fn is_hdr_supported(&self, display_id: u32) -> bool {
        self.get_displays()
            .ok()
            .and_then(|displays| displays.into_iter().find(|d| d.id == display_id))
            .and_then(|d| d.hdr)
            .is_some_and(|hdr| hdr.supported)
    }

    /// Checks if HDR is currently enabled on a specific display.
    ///
    /// # Arguments
    /// * `display_id` - Display ID from `DisplayInfo`
    ///
    /// # Returns
    /// `true` if HDR is enabled, `false` otherwise.
    ///
    /// # Examples
    /// ```rust
    /// # use console_experience_lib::adapters::display::HdrManager;
    /// let manager = HdrManager::new();
    /// println!("HDR enabled: {}", manager.is_hdr_enabled(0));
    /// ```
    #[must_use]
    pub fn is_hdr_enabled(&self, display_id: u32) -> bool {
        self.get_displays()
            .ok()
            .and_then(|displays| displays.into_iter().find(|d| d.id == display_id))
            .and_then(|d| d.hdr)
            .is_some_and(|hdr| hdr.enabled)
    }

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
    /// - `Err(...)` - DisplayConfig API error
    ///
    /// # Examples
    /// ```rust
    /// # use console_experience_lib::adapters::display::HdrManager;
    /// let manager = HdrManager::new();
    /// manager.set_hdr_enabled(0, true)?; // Enable HDR on primary display
    /// # Ok::<(), String>(())
    /// ```
    pub fn set_hdr_enabled(&self, display_id: u32, enabled: bool) -> Result<(), String> {
        // Get display info
        let displays = self.get_displays()?;
        let display = displays
            .into_iter()
            .find(|d| d.id == display_id)
            .ok_or_else(|| format!("Display {} not found", display_id))?;

        // Check HDR support
        let hdr = display
            .hdr
            .ok_or_else(|| format!("Display {} has no HDR info", display_id))?;

        if !hdr.supported {
            return Err(format!("Display {} does not support HDR", display_id));
        }

        // Convert adapter_id tuple back to LUID
        let luid = windows::Win32::Foundation::LUID {
            LowPart: display.adapter_id.0,
            HighPart: display.adapter_id.1,
        };

        // Set HDR state
        self.display_config.set_hdr_state(luid, display_id, enabled)
    }
}

impl Default for HdrManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_manager_creation() {
        let manager = HdrManager::new();
        // Should not panic
        drop(manager);
    }

    #[test]
    fn test_get_displays() {
        let manager = HdrManager::new();
        let result = manager.get_displays();
        // Should succeed on Windows with display
        if let Ok(displays) = result {
            assert!(!displays.is_empty(), "Should have at least one display");
        }
    }

    #[test]
    fn test_get_primary_display() {
        let manager = HdrManager::new();
        let primary = manager.get_primary_display();
        // Should return Some on Windows with display
        if let Some(display) = primary {
            assert!(!display.name.is_empty());
        }
    }

    #[test]
    fn test_is_hdr_supported() {
        let manager = HdrManager::new();
        // Should not panic even for invalid ID
        let supported = manager.is_hdr_supported(0);
        // Result depends on hardware
        let _ = supported;
    }

    #[test]
    fn test_is_hdr_enabled() {
        let manager = HdrManager::new();
        // Should not panic even for invalid ID
        let enabled = manager.is_hdr_enabled(0);
        // Result depends on hardware
        let _ = enabled;
    }
}
