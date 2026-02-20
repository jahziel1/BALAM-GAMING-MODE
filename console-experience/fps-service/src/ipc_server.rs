/// IPC Server - Named Pipe server for sharing FPS data
///
/// Robust named pipe implementation for IPC between service and Tauri app.
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
// Tracing removed - Windows Services don't have stdout/stderr (Session 0)
use windows::core::Result as WinResult;
use windows::Win32::Foundation::*;
use windows::Win32::Storage::FileSystem::*;
use windows::Win32::System::Pipes::*;

/// Game state information
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GameState {
    pub pid: u32,
    pub name: String,
    pub dx_version: u32,
    pub has_fso: bool,
    pub is_compatible_topmost: bool,
}

/// FPS data structure (expanded with game info)
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FpsData {
    pub fps: f32,
    pub game_state: Option<GameState>, // None if no game running
}

/// IPC Server for FPS sharing
pub struct IpcServer {
    /// Current FPS value
    current_fps: Arc<Mutex<f32>>,
    /// Current active game PID (if any)
    active_game_pid: Arc<Mutex<Option<u32>>>,
    /// Server running flag
    running: Arc<Mutex<bool>>,
}

impl IpcServer {
    /// Create new IPC server
    pub fn new() -> WinResult<Self> {
        Ok(Self {
            current_fps: Arc::new(Mutex::new(0.0)),
            active_game_pid: Arc::new(Mutex::new(None)),
            running: Arc::new(Mutex::new(false)),
        })
    }

    /// Start IPC server
    pub fn start(&mut self) -> WinResult<()> {
        *self.running.lock() = true;
        let current_fps = self.current_fps.clone();
        let active_game_pid = self.active_game_pid.clone();
        let running = self.running.clone();

        // Spawn thread
        std::thread::Builder::new()
            .name("IPC Server".to_string())
            .spawn(move || {
                let _ = run_pipe_server(current_fps, active_game_pid, running);
            })
            .map_err(|_| windows::core::Error::from_win32())?;

        Ok(())
    }

    /// Stop IPC server
    pub fn stop(&mut self) -> WinResult<()> {
        // info!("🛑 Stopping IPC server...");
        *self.running.lock() = false;
        Ok(())
    }

    /// Update FPS value and active game PID
    pub fn update_fps(&mut self, fps: f32, active_pid: Option<u32>) {
        *self.current_fps.lock() = fps;
        *self.active_game_pid.lock() = active_pid;
    }
}

/// Run named pipe server loop
fn run_pipe_server(
    current_fps: Arc<Mutex<f32>>,
    active_game_pid: Arc<Mutex<Option<u32>>>,
    running: Arc<Mutex<bool>>,
) -> WinResult<()> {
    use crate::game_detector;
    use std::fs;
    use std::io::Write;

    let heartbeat = "C:\\Windows\\Temp\\balam-fps-heartbeat.txt";
    let _ = fs::OpenOptions::new()
        .append(true)
        .open(heartbeat)
        .and_then(|mut f| writeln!(f, "IPC: run_pipe_server started"));

    while *running.lock() {
        unsafe {
            let _ = fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(heartbeat)
                .and_then(|mut f| {
                    writeln!(f, "IPC: Creating SECURITY_DESCRIPTOR with NULL DACL...")
                });

            let _ = fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(heartbeat)
                .and_then(|mut f| {
                    writeln!(
                        f,
                        "IPC: Creating named pipe (outbound only, default security)..."
                    )
                });

            // Create named pipe with DEFAULT security (allows Everyone to READ)
            // PIPE_ACCESS_OUTBOUND = server can only write, clients can only read
            // FILE_FLAG_FIRST_PIPE_INSTANCE = fail if pipe already exists (prevents conflicts)
            let pipe_handle = CreateNamedPipeA(
                windows::core::s!(r"\\.\pipe\BalamFps"),
                PIPE_ACCESS_OUTBOUND | FILE_FLAG_FIRST_PIPE_INSTANCE,
                PIPE_TYPE_MESSAGE | PIPE_READMODE_MESSAGE | PIPE_WAIT,
                1,    // Only 1 instance (not unlimited) - prevents duplicate services
                512,  // Out buffer
                0,    // In buffer (not needed for outbound)
                0,    // Timeout
                None, // Use default security (allows Everyone to read)
            );

            if let Err(e) = &pipe_handle {
                // error!("❌ CreateNamedPipeA failed: {} (code: 0x{:08X})", e, e.code().0);
                // error!("   This usually means:");
                // error!("   1. Pipe already exists from crashed service - restart Windows");
                // error!("   2. Another instance is running - stop other services");
                // error!("   3. Permissions issue - verify LocalSystem can create pipes");

                let _ = fs::OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(heartbeat)
                    .and_then(|mut f| {
                        writeln!(
                            f,
                            "IPC: CreateNamedPipeA failed: {} (code: 0x{:08X})",
                            e,
                            e.code().0
                        )
                    });

                // Sleep before retrying to avoid tight loop
                std::thread::sleep(std::time::Duration::from_secs(5));
                continue; // Retry instead of crashing
            }

            let pipe_handle = pipe_handle?;
            let _ = fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(heartbeat)
                .and_then(|mut f| {
                    writeln!(f, "IPC: Named pipe created successfully (outbound only)")
                });

            if pipe_handle == INVALID_HANDLE_VALUE {
                // error!("❌ Failed to create pipe");
                std::thread::sleep(std::time::Duration::from_secs(1));
                continue;
            }

            // debug!("⏳ Waiting for client...");

            // Wait for client connection
            // ERROR_PIPE_CONNECTED means client was already connected, which is success
            let connected = match ConnectNamedPipe(pipe_handle, None) {
                Ok(_) => true,
                Err(e) => e.code() == ERROR_PIPE_CONNECTED.to_hresult(),
            };

            if !connected {
                let _ = CloseHandle(pipe_handle);
                continue;
            }

            // debug!("✅ Client connected");

            // No read needed - this is outbound only (server writes, client reads)

            // Prepare response with game info
            let fps = *current_fps.lock();
            let pid_opt = *active_game_pid.lock();

            // Get game info if there's an active game
            let game_state = pid_opt.and_then(|pid| {
                game_detector::get_game_info(pid).map(|info| GameState {
                    pid: info.pid,
                    name: info.name,
                    dx_version: info.dx_version,
                    has_fso: info.has_fso,
                    is_compatible_topmost: info.is_compatible_topmost,
                })
            });

            let data = FpsData { fps, game_state };
            let json = serde_json::to_string(&data).unwrap_or_default();
            let response = json.as_bytes();

            // Write response
            let mut bytes_written = 0u32;
            let write_result =
                WriteFile(pipe_handle, Some(response), Some(&mut bytes_written), None);

            if write_result.is_ok() {
                // debug!("📤 Sent FPS: {:.1}", fps);
            } else {
                // error!("❌ Failed to write to pipe");
            }

            // Cleanup
            let _ = FlushFileBuffers(pipe_handle);
            let _ = DisconnectNamedPipe(pipe_handle);
            let _ = CloseHandle(pipe_handle);

            // debug!("🔌 Client disconnected");
        }

        std::thread::sleep(std::time::Duration::from_millis(10));
    }

    Ok(())
}
