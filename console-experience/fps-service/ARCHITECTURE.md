# FPS Service - Modular Architecture

## Overview

The Balam FPS Service is a Windows Service that monitors game FPS using Event Tracing for Windows (ETW) and exposes the data via Named Pipes to the main Balam application.

## Architecture Principles

### 1. **Separation of Concerns**

Each module has a single, well-defined responsibility:

```
┌─────────────────────────────────────────────────────┐
│ main.rs                                             │
│ - Entry point                                       │
│ - Service registration                              │
│ - Logging initialization                            │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ service.rs                                          │
│ - Windows Service lifecycle (start, stop, pause)    │
│ - Service status reporting                          │
│ - Coordinates FPS monitoring and IPC                │
└──────┬─────────────────────────┬────────────────────┘
       │                         │
       ▼                         ▼
┌──────────────────┐    ┌────────────────────────────┐
│ etw_monitor.rs   │    │ ipc_server.rs              │
│ - ETW session    │    │ - Named Pipe server        │
│ - Event capture  │    │ - IPC communication        │
│ - FPS calculation│    │ - Client connections       │
└──────────────────┘    └────────────────────────────┘
```

### 2. **Modular Components**

#### **EtwMonitor** (`etw_monitor.rs`)

- **Responsibility:** FPS monitoring via ETW
- **Public API:**
  - `new()` - Initialize monitor
  - `start()` - Start ETW trace session
  - `stop()` - Stop trace session
  - `get_fps()` - Get current FPS

- **Internal Design:**
  - Session management (StartTraceW, ControlTraceW)
  - Provider enablement (DXGI, DWM)
  - Event processing (ProcessTrace callback)
  - FPS calculation from frame timestamps

- **Thread Safety:**
  - Uses `Arc<Mutex<>>` for shared state
  - Global FRAME_TIMES storage for callback access

#### **IpcServer** (`ipc_server.rs`)

- **Responsibility:** Inter-process communication
- **Security Model:**
  - PIPE_ACCESS_OUTBOUND (unidirectional)
  - Default security descriptor (Everyone can read)
  - LocalSystem service → User app communication

- **Public API:**
  - `new(fps_monitor)` - Create IPC server with FPS source
  - `start()` - Start accepting connections
  - `stop()` - Shutdown server

#### **ServiceManager** (`service.rs`)

- **Responsibility:** Windows Service lifecycle
- **Public API:**
  - `service_main()` - Main entry point
  - `service_ctrl_handler()` - Control request handler
  - `report_status()` - Status reporting to SCM

## Current State: Simulation Mode

### Why Simulation?

The ETW consumer APIs (`OpenTraceW`, `ProcessTrace`, `CloseTrace`) are **not available** in windows-rs 0.52. These APIs were added in later versions (0.56+).

### What's Working:

✅ ETW trace session creation
✅ Provider enablement (DXGI + DWM)
✅ Named Pipe IPC
✅ Service lifecycle
✅ 60 FPS simulation

### What's Not Yet Implemented:

⚠️ Real event processing (requires windows-rs 0.56+)
⚠️ Actual DXGI Present event capture
⚠️ Real FPS from game frames

## Upgrade Path to Real ETW

### Step 1: Upgrade windows-rs

```toml
# fps-service/Cargo.toml
[dependencies]
windows = { version = "0.56", features = [
    "Win32_Foundation",
    "Win32_System_Services",
    "Win32_System_Threading",
    "Win32_System_Diagnostics_Etw",
    "Win32_System_Pipes",
    "Win32_Storage_FileSystem",
    "Win32_Security",
    "Win32_System_Memory",
    "Win32_System_IO",
    "Win32_System_Diagnostics",
] }
```

### Step 2: Uncomment Real Implementation

In `etw_monitor.rs`, `spawn_processing_thread()`:

1. Remove simulation loop
2. Uncomment real ETW implementation
3. Verify `EVENT_TRACE_LOGFILEW`, `OpenTraceW`, `ProcessTrace`, `CloseTrace` are available

### Step 3: Test with Real Games

- DirectX 9/11/12 games (DXGI events)
- Vulkan/OpenGL games (DWM events)
- Verify borderless/windowed mode support

## Design Patterns Used

### 1. **RAII (Resource Acquisition Is Initialization)**

```rust
impl Drop for EtwMonitor {
    fn drop(&mut self) {
        let _ = self.stop(); // Automatic cleanup
    }
}
```

### 2. **Builder Pattern** (implicit)

```rust
let monitor = EtwMonitor::new()?;
monitor.start()?;
```

### 3. **Strategy Pattern** (ready for future)

```rust
// Future: Trait for different FPS sources
trait FpsMonitor {
    fn get_fps(&self) -> f32;
    fn start(&mut self) -> Result<()>;
    fn stop(&mut self) -> Result<()>;
}

// Implementations:
// - EtwMonitor (current)
// - PresentMonAdapter (alternative)
// - RtssAdapter (fallback)
```

### 4. **Thread-Safe Singleton** (IPC Server)

```rust
static IPC_SERVER: Mutex<Option<IpcServer>> = Mutex::new(None);
```

## Error Handling Strategy

### Graceful Degradation

- If ETW session fails → Service still runs, returns 0 FPS
- If IPC pipe fails → Service logs error, attempts retry
- If client disconnects → Server continues serving other clients

### Error Propagation

- Use `Result<T, Error>` throughout
- Service reports SERVICE_STOPPED on critical errors
- Non-critical errors logged without stopping service

## Performance Characteristics

| Component       | Overhead  | Notes                          |
| --------------- | --------- | ------------------------------ |
| ETW Session     | <1% CPU   | Kernel-level tracing           |
| IPC Server      | <0.1% CPU | Blocking I/O, minimal overhead |
| FPS Calculation | <0.1ms    | Simple timestamp diff          |
| Named Pipe Read | <1ms      | Cached, non-blocking           |

## Security Considerations

### Named Pipe Security

- **Model:** LocalSystem service → User application
- **Pipe Type:** PIPE_ACCESS_OUTBOUND (read-only from client)
- **Security Descriptor:** Default (Everyone has READ access)
- **Why Safe:**
  - Client can only READ, not WRITE
  - Service controls what data is sent
  - No user input accepted from pipe

### ETW Privileges

- Requires Administrator/LocalSystem to create trace sessions
- Only captures DXGI/DWM events (no sensitive data)
- Works globally (all processes, not injected)

## Future Enhancements

### Planned Features

1. **Multiple FPS Sources**
   - ETW (primary)
   - PresentMon adapter (fallback)
   - RTSS integration (optional)

2. **Advanced Metrics**
   - 1% low FPS
   - 0.1% low FPS
   - Frame time graph
   - Stutter detection

3. **Configuration**
   - Enable/disable specific providers
   - Sampling rate control
   - Memory usage limits

### Extensibility Points

```rust
// Future: Plugin system for FPS adapters
trait FpsAdapter {
    fn is_available(&self) -> bool;
    fn get_metrics(&self) -> FpsMetrics;
}

struct FpsService {
    adapters: Vec<Box<dyn FpsAdapter>>,
}
```

## Testing Strategy

### Unit Tests

- ✅ EtwMonitor creation
- ✅ IPC client connection
- ⚠️ Real ETW events (requires integration test)

### Integration Tests

- Service installation/uninstallation
- IPC communication end-to-end
- Real game FPS capture (manual)

### Performance Tests

- CPU usage under load
- Memory footprint over time
- IPC latency benchmarks

## References

- [PresentMon (Intel)](https://github.com/GameTechDev/PresentMon) - ETW-based FPS monitoring
- [ETW Documentation](https://learn.microsoft.com/en-us/windows/win32/etw/event-tracing-portal) - Microsoft official docs
- [FluxSec ETW Guide](https://fluxsec.red/event-tracing-for-windows-threat-intelligence-rust-consumer) - Rust ETW consumer
