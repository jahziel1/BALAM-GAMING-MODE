use crate::adapters::display::WindowsDisplayAdapter;
use crate::domain::display::DisplayInfo;
use crate::ports::display_port::DisplayPort;

/// Gets information about all active displays with HDR capabilities.
///
/// # Returns
/// Vector of `DisplayInfo` with HDR status for each display.
///
/// # Errors
/// Returns error message if DisplayConfig query fails.
///
/// # Examples
/// ```javascript
/// const displays = await invoke('get_displays');
/// console.log(`Found ${displays.length} displays`);
/// ```
#[tauri::command]
pub fn get_displays() -> Result<Vec<DisplayInfo>, String> {
    let adapter = WindowsDisplayAdapter::new();
    adapter.get_displays()
}

/// Gets the primary display information.
///
/// # Returns
/// Primary `DisplayInfo` or `null` if no displays found.
///
/// # Examples
/// ```javascript
/// const primary = await invoke('get_primary_display');
/// if (primary) {
///   console.log(`Primary: ${primary.name}`);
/// }
/// ```
#[must_use]
#[tauri::command]
pub fn get_primary_display() -> Option<DisplayInfo> {
    let adapter = WindowsDisplayAdapter::new();
    adapter.get_primary_display()
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
/// - `Err(...)` - Platform API error
///
/// # Examples
/// ```javascript
/// await invoke('set_hdr_enabled', { displayId: 0, enabled: true });
/// ```
#[tauri::command]
pub fn set_hdr_enabled(display_id: u32, enabled: bool) -> Result<(), String> {
    let adapter = WindowsDisplayAdapter::new();
    adapter.set_hdr_enabled(display_id, enabled)
}
