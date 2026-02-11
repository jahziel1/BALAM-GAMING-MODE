use crate::adapters::windows_system_adapter::WindowsSystemAdapter;
use crate::ports::system_port::{SystemPort, SystemStatus};
use tracing::info;

#[tauri::command]
pub fn log_message(message: String) {
    info!("[FRONTEND]: {}", message);
}

#[tauri::command]
#[must_use]
pub fn get_system_status() -> SystemStatus {
    WindowsSystemAdapter::new().get_status()
}

#[tauri::command]
pub fn set_volume(level: u32) -> Result<(), String> {
    WindowsSystemAdapter::new().set_volume(level)
}

#[tauri::command]
pub fn list_audio_devices() -> Result<Vec<crate::ports::system_port::AudioDevice>, String> {
    WindowsSystemAdapter::new().list_audio_devices()
}

#[tauri::command]
pub fn set_default_audio_device(device_id: String) -> Result<(), String> {
    WindowsSystemAdapter::new().set_default_audio_device(&device_id)
}

#[tauri::command]
pub fn shutdown_pc() -> Result<(), String> {
    WindowsSystemAdapter::new().shutdown()
}

#[tauri::command]
pub fn restart_pc() -> Result<(), String> {
    WindowsSystemAdapter::new().restart()
}

#[tauri::command]
pub fn logout_pc() -> Result<(), String> {
    WindowsSystemAdapter::new().logout()
}
