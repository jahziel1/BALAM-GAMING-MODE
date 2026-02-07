// Allow unwrap() in tests only (clippy pedantic)
#![cfg_attr(test, allow(clippy::unwrap_used))]

pub mod adapters;
pub mod application;
pub mod config;
pub mod domain;
mod heartbeat;
pub mod infrastructure;
pub mod ports;

use crate::application::commands::{
    add_game_manually, apply_performance_profile, close_current_game, connect_bluetooth_device, connect_wifi,
    disable_rtss_overlay, disconnect_bluetooth_device, disconnect_wifi, download_presentmon, enable_rtss_overlay,
    forget_wifi, get_brightness, get_connected_bluetooth_devices, get_current_wifi, get_fps_stats, get_games,
    get_paired_bluetooth_devices, get_performance_metrics, get_refresh_rate, get_rtss_version, get_running_game,
    get_saved_networks, get_supported_refresh_rates, get_system_drives, get_system_status, get_tdp_config,
    get_wifi_signal_strength, haptic_action, haptic_event, haptic_navigation, install_rtss_via_winget,
    is_bluetooth_available, is_fps_monitoring_active, is_haptic_supported, is_nvml_available, is_presentmon_available,
    is_rtss_available, is_rtss_installed_via_winget, is_using_rtss_overlay, is_winget_available, kill_game,
    launch_game, list_audio_devices, list_directory, log_message, logout_pc, pair_bluetooth_device, remove_game,
    restart_pc, scan_bluetooth_devices, scan_games, scan_wifi_networks, set_bluetooth_enabled, set_brightness,
    set_default_audio_device, set_refresh_rate, set_tdp, set_volume, shutdown_pc, start_fps_monitoring,
    stop_fps_monitoring, supports_brightness_control, supports_tdp_control, trigger_haptic, uninstall_rtss_via_winget,
    unpair_bluetooth_device, update_rtss_overlay,
};
use crate::application::DIContainer;
use tauri::{Emitter, Manager};
use tracing_appender::rolling::{RollingFileAppender, Rotation};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
#[allow(clippy::too_many_lines)]
pub fn run() {
    use std::io;
    use tracing_subscriber::fmt::writer::MakeWriterExt;

    // Initialize tracing with BOTH file AND terminal output
    let file_appender = RollingFileAppender::new(Rotation::DAILY, "logs", "balam.log");
    let (non_blocking_file, guard) = tracing_appender::non_blocking(file_appender);

    let file_writer = non_blocking_file;
    let stdout_writer = io::stdout;

    // Combine both writers
    tracing_subscriber::fmt()
        .with_writer(file_writer.and(stdout_writer))
        .with_target(false)
        .init();

    tracing::info!("🎮 Balam Console Experience starting...");

    // Important: Keep guard alive for the entire application lifetime
    // If dropped, logs will stop writing to file
    std::mem::forget(guard);

    // Initialize Dependency Injection Container
    let container = DIContainer::new();
    let container_clone = container.clone();

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(
                    "sqlite:balam.db",
                    vec![tauri_plugin_sql::Migration {
                        version: 1,
                        description: "initial schema",
                        sql: include_str!("../migrations/001_initial.sql"),
                        kind: tauri_plugin_sql::MigrationKind::Up,
                    }],
                )
                .build(),
        )
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
                                    // Window is visible (launcher open) - just ignore the hotkey
                                    // InGameMenu should only work during gameplay
                                    tracing::warn!("Ctrl+Shift+Q pressed but no game is running - ignoring");
                                } else {
                                    // Window is hidden (game is running) - show InGameMenu
                                    let _ = window.show();
                                    let _ = window.set_always_on_top(true);
                                    let _ = window.set_focus();
                                    // CRITICAL: Tell frontend to show the Blade immediately
                                    let _ = app.emit("toggle-overlay", true);
                                }
                            }
                        } else if shortcut.key == Code::KeyW && shortcut.mods.contains(Modifiers::CONTROL) {
                            // WiFi Panel toggle
                            let _ = app.emit("toggle-wifi-panel", true);
                        } else if shortcut.key == Code::KeyB && shortcut.mods.contains(Modifiers::CONTROL) {
                            // Bluetooth Panel toggle
                            let _ = app.emit("toggle-bluetooth-panel", true);
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
                let _ = app
                    .global_shortcut()
                    .register(Shortcut::new(Some(Modifiers::CONTROL), Code::KeyW)); // WiFi Panel
                let _ = app
                    .global_shortcut()
                    .register(Shortcut::new(Some(Modifiers::CONTROL), Code::KeyB)); // Bluetooth Panel
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

            // Start heartbeat thread for crash watchdog
            heartbeat::start_heartbeat_thread();
            tracing::info!("Heartbeat thread started for crash recovery");

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
            list_audio_devices,
            set_default_audio_device,
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
            supports_tdp_control,
            // WiFi commands
            scan_wifi_networks,
            get_current_wifi,
            connect_wifi,
            disconnect_wifi,
            forget_wifi,
            get_saved_networks,
            get_wifi_signal_strength,
            // Bluetooth commands
            is_bluetooth_available,
            set_bluetooth_enabled,
            get_paired_bluetooth_devices,
            scan_bluetooth_devices,
            get_connected_bluetooth_devices,
            pair_bluetooth_device,
            unpair_bluetooth_device,
            connect_bluetooth_device,
            disconnect_bluetooth_device,
            // Haptic feedback commands
            trigger_haptic,
            is_haptic_supported,
            haptic_navigation,
            haptic_action,
            haptic_event,
            // Game management commands
            get_running_game,
            close_current_game,
            // Performance monitoring commands
            get_fps_stats,
            get_performance_metrics,
            start_fps_monitoring,
            stop_fps_monitoring,
            is_fps_monitoring_active,
            is_nvml_available,
            download_presentmon,
            is_presentmon_available,
            // RTSS overlay commands
            is_rtss_available,
            enable_rtss_overlay,
            disable_rtss_overlay,
            is_using_rtss_overlay,
            update_rtss_overlay,
            // RTSS auto-installation commands
            is_winget_available,
            is_rtss_installed_via_winget,
            install_rtss_via_winget,
            uninstall_rtss_via_winget,
            get_rtss_version
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
