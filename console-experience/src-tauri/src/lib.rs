pub mod adapters;
pub mod application;
pub mod config;
pub mod domain;
pub mod infrastructure;
pub mod ports;

use crate::application::commands::{
    add_game_manually, apply_performance_profile, get_brightness, get_games, get_refresh_rate,
    get_supported_refresh_rates, get_system_drives, get_system_status, get_tdp_config, kill_game, launch_game,
    list_directory, log_message, logout_pc, remove_game, restart_pc, scan_games, set_brightness, set_refresh_rate,
    set_tdp, set_volume, shutdown_pc, supports_brightness_control, supports_tdp_control,
};
use crate::application::DIContainer;
use tauri::{Emitter, Manager};
use tracing_appender::rolling::{RollingFileAppender, Rotation};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize tracing with file appender (logs rotate daily)
    let file_appender = RollingFileAppender::new(Rotation::DAILY, "logs", "balam.log");
    let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);

    tracing_subscriber::fmt()
        .with_writer(non_blocking)
        .with_target(false)
        .init();

    tracing::info!("🎮 Balam Console Experience starting...");

    // Important: Keep _guard alive for the entire application lifetime
    // If dropped, logs will stop writing to file
    std::mem::forget(_guard);

    // Initialize Dependency Injection Container
    let container = DIContainer::new();
    let container_clone = container.clone();

    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        // 1. Capture and handle volume keys manually using correct fields: mods, key
                        if shortcut.key == Code::AudioVolumeUp {
                            let adapter = crate::adapters::windows_system_adapter::WindowsSystemAdapter::new();
                            let status = crate::ports::system_port::SystemPort::get_status(&adapter);
                            let _ = crate::ports::system_port::SystemPort::set_volume(
                                &adapter,
                                (status.volume + 5).min(100),
                            );
                        } else if shortcut.key == Code::AudioVolumeDown {
                            let adapter = crate::adapters::windows_system_adapter::WindowsSystemAdapter::new();
                            let status = crate::ports::system_port::SystemPort::get_status(&adapter);
                            let _ = crate::ports::system_port::SystemPort::set_volume(
                                &adapter,
                                status.volume.saturating_sub(5),
                            );
                        } else if shortcut.key == Code::AudioVolumeMute {
                            let adapter = crate::adapters::windows_system_adapter::WindowsSystemAdapter::new();
                            let status = crate::ports::system_port::SystemPort::get_status(&adapter);
                            let next = if status.volume > 0 { 0 } else { 30 };
                            let _ = crate::ports::system_port::SystemPort::set_volume(&adapter, next);
                        } else if shortcut.key == Code::KeyQ
                            && shortcut.mods.contains(Modifiers::CONTROL | Modifiers::SHIFT)
                        {
                            if let Some(window) = app.get_webview_window("main") {
                                let is_visible = window.is_visible().unwrap_or(false);
                                if is_visible {
                                    let _ = window.set_always_on_top(false);
                                    let _ = window.hide();
                                    // Optional: Emit close event if needed
                                } else {
                                    let _ = window.show();
                                    let _ = window.set_always_on_top(true);
                                    let _ = window.set_focus();
                                    // CRITICAL: Tell frontend to show the Blade immediately
                                    let _ = app.emit("toggle-overlay", true);
                                }
                            }
                        }
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .manage(container)
        .setup(move |app| {
            #[cfg(desktop)]
            {
                use tauri_plugin_global_shortcut::GlobalShortcutExt;

                // Register shortcuts
                let _ = app
                    .global_shortcut()
                    .register(Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyQ));
                let _ = app.global_shortcut().register(Shortcut::new(None, Code::AudioVolumeUp));
                let _ = app
                    .global_shortcut()
                    .register(Shortcut::new(None, Code::AudioVolumeDown));
                let _ = app
                    .global_shortcut()
                    .register(Shortcut::new(None, Code::AudioVolumeMute));
            }

            // Native Gamepad: Windows.Gaming.Input Engine
            crate::adapters::gamepad_adapter::start_gamepad_listener(app.handle().clone());

            // Initialize Window Monitor for launcher dialog detection (Nivel 3)
            let mut window_monitor = crate::adapters::window_monitor::WindowMonitor::new(
                container_clone.active_games_tracker.clone(),
                app.handle().clone(),
            );

            if let Err(e) = window_monitor.start() {
                tracing::error!("Failed to start window monitor: {}", e);
            } else {
                tracing::info!("Window monitor started successfully (Level 3 Robustness)");
            }

            // Store monitor in app state to keep it alive
            app.manage(window_monitor);

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
            add_game_manually,
            remove_game,
            list_directory,
            get_system_drives,
            launch_game,
            kill_game,
            get_system_status,
            log_message,
            set_volume,
            shutdown_pc,
            restart_pc,
            logout_pc,
            // Display commands
            get_brightness,
            set_brightness,
            get_refresh_rate,
            set_refresh_rate,
            get_supported_refresh_rates,
            supports_brightness_control,
            // Performance commands
            get_tdp_config,
            set_tdp,
            apply_performance_profile,
            supports_tdp_control
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
