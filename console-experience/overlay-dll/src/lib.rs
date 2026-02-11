// Allow unsupported calling conventions from hudhook macro (phased out compiler warning)
#![allow(unsupported_calling_conventions)]

/// Balam Performance Overlay DLL
///
/// DirectX 11 overlay for FPS monitoring using hudhook.
/// Injects into games to capture frame timings and send via IPC to main app.
use hudhook::*;
use std::time::{Duration, Instant};
use tracing::{error, info};

mod ipc;
use ipc::IPCWriter;

/// Maximum FPS history samples
const FPS_HISTORY_SIZE: usize = 60;

/// Update interval for FPS calculation
const FPS_UPDATE_INTERVAL_MS: u64 = 100;

/// Balam Performance Overlay
struct BalamOverlay {
    ipc: Option<IPCWriter>,
    frame_times: Vec<Duration>,
    last_frame: Instant,
    last_fps_update: Instant,
    current_fps: f32,
    avg_fps_1s: f32,
    fps_1_percent_low: f32,
    frame_time_ms: f32,
}

impl BalamOverlay {
    fn new() -> Self {
        info!("🎮 Initializing Balam Overlay");

        let ipc = match IPCWriter::new() {
            Ok(writer) => {
                info!("✅ IPC writer initialized");
                Some(writer)
            }
            Err(e) => {
                error!("❌ Failed to initialize IPC: {}", e);
                None
            }
        };

        Self {
            ipc,
            frame_times: Vec::with_capacity(FPS_HISTORY_SIZE),
            last_frame: Instant::now(),
            last_fps_update: Instant::now(),
            current_fps: 0.0,
            avg_fps_1s: 0.0,
            fps_1_percent_low: 0.0,
            frame_time_ms: 0.0,
        }
    }

    fn on_frame(&mut self) {
        let now = Instant::now();
        let frame_time = now.duration_since(self.last_frame);
        self.last_frame = now;

        self.frame_times.push(frame_time);
        if self.frame_times.len() > FPS_HISTORY_SIZE {
            self.frame_times.remove(0);
        }

        let time_since_update = now.duration_since(self.last_fps_update);
        if time_since_update >= Duration::from_millis(FPS_UPDATE_INTERVAL_MS) {
            self.calculate_fps_metrics();
            self.send_fps_to_backend();
            self.last_fps_update = now;
        }
    }

    fn calculate_fps_metrics(&mut self) {
        if self.frame_times.is_empty() {
            return;
        }

        if let Some(last_frame_time) = self.frame_times.last() {
            let frame_time_secs = last_frame_time.as_secs_f32();
            if frame_time_secs > 0.0 {
                self.current_fps = 1.0 / frame_time_secs;
                self.frame_time_ms = frame_time_secs * 1000.0;
            }
        }

        let total_time: Duration = self.frame_times.iter().sum();
        let avg_frame_time = total_time.as_secs_f32() / self.frame_times.len() as f32;
        if avg_frame_time > 0.0 {
            self.avg_fps_1s = 1.0 / avg_frame_time;
        }

        let mut sorted_times = self.frame_times.clone();
        sorted_times.sort();
        let percentile_99_idx = (sorted_times.len() as f32 * 0.99) as usize;
        if let Some(worst_time) = sorted_times.get(percentile_99_idx) {
            let worst_time_secs = worst_time.as_secs_f32();
            if worst_time_secs > 0.0 {
                self.fps_1_percent_low = 1.0 / worst_time_secs;
            }
        }
    }

    fn send_fps_to_backend(&mut self) {
        if let Some(ipc) = self.ipc.as_mut() {
            if let Err(e) = ipc.write_fps(
                self.current_fps,
                self.avg_fps_1s,
                self.fps_1_percent_low,
                self.frame_time_ms,
            ) {
                error!("Failed to write FPS to IPC: {}", e);
            }
        }
    }
}

impl ImguiRenderLoop for BalamOverlay {
    fn render(&mut self, _ui: &mut imgui::Ui) {
        // Track frame timing on every render call
        self.on_frame();

        // Optional: Draw debug UI (disabled for production)
        // _ui.window("Balam FPS Monitor")
        //     .size([200.0, 100.0], imgui::Condition::FirstUseEver)
        //     .build(|| {
        //         _ui.text(format!("FPS: {:.1}", self.current_fps));
        //         _ui.text(format!("Frame: {:.2}ms", self.frame_time_ms));
        //     });
    }
}

// Use hudhook macro to register DirectX 11 hooks
use hudhook::hooks::dx11::ImguiDx11Hooks;
hudhook!(ImguiDx11Hooks, BalamOverlay::new());
