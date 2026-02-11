use crate::adapters::haptic::GilrsHapticAdapter;
use crate::domain::{HapticFeedback, HapticIntensity};
use crate::ports::haptic_port::HapticPort;

#[tauri::command]
pub async fn trigger_haptic(intensity: String, duration_ms: u64) -> Result<(), String> {
    let intensity_enum = match intensity.to_lowercase().as_str() {
        "weak" => HapticIntensity::Weak,
        "medium" => HapticIntensity::Medium,
        "strong" => HapticIntensity::Strong,
        _ => return Err(format!("Invalid intensity: {intensity}")),
    };

    let feedback = HapticFeedback::new(intensity_enum, duration_ms);
    let adapter = GilrsHapticAdapter::new().map_err(|e| format!("Failed to initialize haptic adapter: {e}"))?;
    HapticPort::trigger(&adapter, feedback).await
}

#[tauri::command]
pub fn is_haptic_supported() -> Result<bool, String> {
    let adapter = GilrsHapticAdapter::new().map_err(|e| format!("Failed to initialize haptic adapter: {e}"))?;
    Ok(HapticPort::is_supported(&adapter))
}

#[tauri::command]
pub async fn haptic_navigation() -> Result<(), String> {
    trigger_haptic("weak".to_string(), 200).await
}

#[tauri::command]
pub async fn haptic_action() -> Result<(), String> {
    trigger_haptic("medium".to_string(), 300).await
}

#[tauri::command]
pub async fn haptic_event() -> Result<(), String> {
    trigger_haptic("strong".to_string(), 500).await
}
