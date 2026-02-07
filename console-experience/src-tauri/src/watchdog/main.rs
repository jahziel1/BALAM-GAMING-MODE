use std::path::PathBuf;
use std::process::Command;
use std::time::{Duration, SystemTime};
use tokio::io::AsyncReadExt;
use tokio::net::windows::named_pipe::ServerOptions;
use tokio::time::timeout;
use tracing::{error, info, warn};

const PIPE_NAME: &str = r"\\.\pipe\balam_heartbeat";
const HEARTBEAT_TIMEOUT_SECS: u64 = 10; // Timeout after 10 seconds without heartbeat
const MAX_CRASHES_BEFORE_SAFE_MODE: u32 = 3;
const CRASH_WINDOW_SECONDS: u64 = 300; // 5 minutes

struct WatchdogState {
    crash_history: Vec<SystemTime>,
    safe_mode_triggered: bool,
}

impl WatchdogState {
    fn new() -> Self {
        Self {
            crash_history: Vec::new(),
            safe_mode_triggered: false,
        }
    }

    fn record_crash(&mut self) {
        let now = SystemTime::now();
        self.crash_history.push(now);

        // Clean old crashes outside 5-minute window
        self.crash_history.retain(|&crash_time| {
            now.duration_since(crash_time)
                .unwrap_or(Duration::from_secs(0))
                .as_secs()
                < CRASH_WINDOW_SECONDS
        });

        info!("📊 Crashes in last 5 min: {}", self.crash_history.len());

        if self.crash_history.len() >= MAX_CRASHES_BEFORE_SAFE_MODE as usize {
            warn!("🚨 Too many crashes detected. Entering safe mode!");
            self.safe_mode_triggered = true;
        }
    }
}

/// Balam Crash Watchdog with Named Pipes
///
/// Architecture:
/// - Watchdog (this process) = Named Pipe Server (reads heartbeat)
/// - Balam = Named Pipe Client (writes heartbeat every 2s)
///
/// Crash Detection:
/// 1. Timeout (10s without heartbeat) → Balam frozen/hung
/// 2. Pipe disconnect → Balam crashed (OS closed pipe automatically)
///
/// Recovery:
/// - First 2 crashes → Auto-restart Balam
/// - 3rd crash in 5min → Safe mode (launch explorer.exe)
///
/// Benefits over file I/O:
/// - Automatic disconnect detection (no manual timeout logic needed)
/// - <100ms crash detection latency
/// - Zero disk I/O
#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::fmt::init();

    info!("🛡️ Balam Watchdog started (Named Pipes mode)");
    info!("📡 Pipe: {}", PIPE_NAME);
    info!("⏱️ Timeout: {}s", HEARTBEAT_TIMEOUT_SECS);

    let mut state = WatchdogState::new();

    loop {
        // Create Named Pipe server (blocks until client connects)
        info!("🔄 Creating Named Pipe server...");
        let mut server = match ServerOptions::new().first_pipe_instance(true).create(PIPE_NAME) {
            Ok(s) => s,
            Err(e) => {
                error!("Failed to create Named Pipe: {}", e);
                tokio::time::sleep(Duration::from_secs(5)).await;
                continue;
            },
        };

        // Wait for Balam to connect
        info!("⏳ Waiting for Balam to connect...");
        if let Err(e) = server.connect().await {
            error!("Failed to connect to Balam: {}", e);
            tokio::time::sleep(Duration::from_secs(5)).await;
            continue;
        }

        info!("✅ Balam connected! Monitoring heartbeat...");

        // Monitor heartbeat loop
        let crash_detected = monitor_heartbeat(&mut server).await;

        if crash_detected {
            error!("❌ Balam crash detected!");

            // Record crash in history
            state.record_crash();

            if state.safe_mode_triggered {
                // Too many crashes - launch explorer.exe as fallback
                warn!("🚨 Safe mode triggered. Launching explorer.exe as fallback.");
                launch_explorer();
                break; // Exit watchdog
            }

            // Restart Balam
            info!("🔄 Restarting Balam...");
            restart_balam();

            // Wait a bit before accepting new connection
            tokio::time::sleep(Duration::from_secs(2)).await;
        }
    }

    info!("🛑 Watchdog shutting down");
}

/// Monitors heartbeat from Balam via Named Pipe.
///
/// Returns true if crash detected, false if graceful shutdown.
async fn monitor_heartbeat(server: &mut tokio::net::windows::named_pipe::NamedPipeServer) -> bool {
    loop {
        // Read u64 timestamp with timeout
        match timeout(Duration::from_secs(HEARTBEAT_TIMEOUT_SECS), server.read_u64()).await {
            Ok(Ok(_timestamp)) => {
                // Heartbeat received successfully
                // (Optional: Could log timestamp for debugging)
            },
            Ok(Err(e)) => {
                // Pipe error (likely disconnect = crash)
                error!("❌ Pipe disconnect detected: {}", e);
                error!("   Reason: Balam process terminated (crash or forced exit)");
                return true; // Crash detected
            },
            Err(_) => {
                // Timeout - no heartbeat for 10+ seconds
                error!("❌ Heartbeat timeout ({}s elapsed)", HEARTBEAT_TIMEOUT_SECS);
                error!("   Reason: Balam frozen/hung or crashed");
                return true; // Crash detected
            },
        }
    }
}

fn restart_balam() {
    info!("🔄 Attempting to restart Balam...");

    // Find Balam executable (same directory as watchdog)
    let exe_path = std::env::current_exe().ok();
    let balam_path = exe_path
        .and_then(|p| p.parent().map(|dir| dir.join("console-experience.exe")))
        .unwrap_or_else(|| PathBuf::from("console-experience.exe"));

    info!("📂 Balam path: {}", balam_path.display());

    match Command::new(&balam_path).spawn() {
        Ok(child) => {
            info!("✅ Balam restarted with PID: {}", child.id());
        },
        Err(e) => {
            error!("❌ Failed to restart Balam: {}", e);
            error!("   Path attempted: {}", balam_path.display());
        },
    }
}

fn launch_explorer() {
    info!("🔄 Launching explorer.exe as fallback shell...");

    match Command::new("explorer.exe").spawn() {
        Ok(_) => {
            info!("✅ Explorer.exe launched successfully");
        },
        Err(e) => {
            error!("❌ Failed to launch explorer.exe: {}", e);
        },
    }
}
