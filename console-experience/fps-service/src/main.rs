/// Balam FPS Service - Windows Service for ETW-based FPS monitoring
///
/// This service runs as LocalSystem and:
/// 1. Creates ETW trace session for DXGI/D3D events
/// 2. Processes frame present events
/// 3. Calculates FPS from event timing
/// 4. Exposes FPS via named pipe IPC
///
/// # Architecture
/// ```
/// ETW Providers (DXGI/D3D) → Trace Session → Event Processing
///                                                    ↓
///                                            Calculate FPS
///                                                    ↓
///                                          Named Pipe Server
///                                                    ↓
///                                            Balam App reads
/// ```
mod etw_monitor;
mod ipc_server;
mod service;

// Tracing removed - Windows Services don't have stdout/stderr (Session 0)

fn main() {
    // NO LOGGING for Windows Service - stdout/stderr don't exist!
    // Use heartbeat file instead for debugging

    // Run as Windows Service
    if let Err(_e) = service::run() {
        // Can't log errors - service has no console
        std::process::exit(1);
    }
}
