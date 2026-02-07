use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::io::AsyncWriteExt;
use tokio::net::windows::named_pipe::ClientOptions;
use tracing::{error, info};

const PIPE_NAME: &str = r"\\.\pipe\balam_heartbeat";
const HEARTBEAT_INTERVAL_MS: u64 = 2000; // 2 seconds (2x faster than 10s timeout)

/// Starts the heartbeat thread that communicates with the watchdog via Named Pipe.
///
/// Architecture:
/// - Balam (this process) = Named Pipe Client (writes heartbeat)
/// - Watchdog = Named Pipe Server (reads heartbeat with timeout)
///
/// Benefits over file I/O:
/// - Automatic disconnect detection when Balam crashes (OS closes pipe)
/// - <100ms latency vs 2-10s with files
/// - Zero disk I/O (all in RAM)
/// - Tokio async (non-blocking)
pub fn start_heartbeat_thread() {
    // Use Tauri's async runtime instead of tokio::spawn directly
    tauri::async_runtime::spawn(async {
        info!("🔄 Starting Named Pipe heartbeat client...");

        loop {
            match connect_and_heartbeat().await {
                Ok(_) => {
                    info!("Heartbeat loop ended gracefully");
                },
                Err(e) => {
                    error!("Heartbeat error: {}. Retrying in 5s...", e);
                    tokio::time::sleep(Duration::from_secs(5)).await;
                },
            }
        }
    });
}

async fn connect_and_heartbeat() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Connect to watchdog's Named Pipe server
    let mut client = ClientOptions::new()
        .open(PIPE_NAME)
        .map_err(|e| format!("Failed to connect to watchdog pipe: {e}"))?;

    info!("✅ Connected to watchdog via Named Pipe");

    loop {
        // Sleep first to avoid spamming on startup
        tokio::time::sleep(Duration::from_millis(HEARTBEAT_INTERVAL_MS)).await;

        // Get current timestamp
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|e| format!("System time error: {e}"))?
            .as_secs();

        // Write 8-byte timestamp to pipe
        if let Err(e) = client.write_u64(timestamp).await {
            error!("Failed to write heartbeat: {}", e);
            return Err(Box::new(e));
        }

        // Flush to ensure data is sent immediately
        if let Err(e) = client.flush().await {
            error!("Failed to flush heartbeat: {}", e);
            return Err(Box::new(e));
        }
    }
}
