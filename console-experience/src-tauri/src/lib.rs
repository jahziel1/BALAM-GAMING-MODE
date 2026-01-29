pub mod domain;
pub mod ports;
pub mod adapters;
pub mod application;

use tauri::{Manager, Emitter};
use crate::application::commands::*;

// 1. Definir el estado global de la aplicación (Dependency Container)
pub struct AppState {
    // Future repositories can go here
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState, Shortcut};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    let state = AppState { };

    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().with_handler(move |app, shortcut, event| {
             if event.state == ShortcutState::Pressed {
                 // 1. Capture and handle volume keys manually using correct fields: mods, key
                 if shortcut.key == Code::AudioVolumeUp {
                    let adapter = crate::adapters::windows_system_adapter::WindowsSystemAdapter::new();
                    let status = crate::ports::system_port::SystemPort::get_status(&adapter);
                    let _ = crate::ports::system_port::SystemPort::set_volume(&adapter, (status.volume + 5).min(100));
                 } else if shortcut.key == Code::AudioVolumeDown {
                    let adapter = crate::adapters::windows_system_adapter::WindowsSystemAdapter::new();
                    let status = crate::ports::system_port::SystemPort::get_status(&adapter);
                    let _ = crate::ports::system_port::SystemPort::set_volume(&adapter, status.volume.saturating_sub(5));
                 } else if shortcut.key == Code::AudioVolumeMute {
                    let adapter = crate::adapters::windows_system_adapter::WindowsSystemAdapter::new();
                    let status = crate::ports::system_port::SystemPort::get_status(&adapter);
                    let next = if status.volume > 0 { 0 } else { 30 };
                    let _ = crate::ports::system_port::SystemPort::set_volume(&adapter, next);
                 } else if shortcut.key == Code::KeyQ && shortcut.mods.contains(Modifiers::CONTROL | Modifiers::SHIFT) {
                    if let Some(window) = app.get_webview_window("main") {
                        let is_visible = window.is_visible().unwrap_or(false);
                        if is_visible {
                            let _ = window.set_always_on_top(false);
                            let _ = window.hide();
                        } else {
                            let _ = window.show();
                            let _ = window.set_always_on_top(true);
                            let _ = window.set_focus();
                        }
                    }
                 }
             }
        }).build())
        .plugin(tauri_plugin_opener::init())
        .manage(state)
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri_plugin_global_shortcut::GlobalShortcutExt;
                
                // Register shortcuts
                let _ = app.global_shortcut().register(Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyQ));
                let _ = app.global_shortcut().register(Shortcut::new(None, Code::AudioVolumeUp));
                let _ = app.global_shortcut().register(Shortcut::new(None, Code::AudioVolumeDown));
                let _ = app.global_shortcut().register(Shortcut::new(None, Code::AudioVolumeMute));
            }

            // Native Gamepad: Windows.Gaming.Input Engine
            crate::adapters::gamepad_adapter::start_gamepad_listener(app.handle().clone());

            // Start System Monitor Thread (Volume, Battery, etc.)
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                let adapter = crate::adapters::windows_system_adapter::WindowsSystemAdapter::new();
                let mut last_vol = 0;
                
                loop {
                    // Update Status Check
                    let status = crate::ports::system_port::SystemPort::get_status(&adapter);
                    if status.volume != last_vol {
                        let _ = app_handle.emit("volume-changed", status.volume);
                        last_vol = status.volume;
                    }
                    
                    std::thread::sleep(std::time::Duration::from_millis(250));
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_games,
            scan_games,
            launch_game,
            kill_game,
            get_system_status,
            set_volume,
            shutdown_pc,
            restart_pc,
            logout_pc
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
