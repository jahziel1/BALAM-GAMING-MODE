/// IPC Module - Shared Memory Communication
///
/// Uses Windows shared memory (memory-mapped file) to send FPS data
/// from overlay DLL to the main backend process.
///
/// # Architecture
/// - DLL (writer): Writes FPS data every 100ms
/// - Backend (reader): Reads FPS data every 1000ms
/// - Lock-free: Uses volatile writes for performance
/// - Named memory: "Global\\BalamFPSData"
use std::ptr;
use tracing::info;
use windows::Win32::Foundation::*;
use windows::Win32::System::Memory::*;

/// Shared memory name (Local namespace - no admin required)
const SHARED_MEMORY_NAME: &str = "Local\\BalamFPSData";

/// Size of shared memory (must match backend)
const SHARED_MEMORY_SIZE: usize = std::mem::size_of::<FPSData>();

/// FPS data structure (must match backend's PerformanceMetrics.fps)
#[repr(C)]
#[derive(Debug, Clone, Copy)]
pub struct FPSData {
    pub current_fps: f32,
    pub avg_fps_1s: f32,
    pub fps_1_percent_low: f32,
    pub frame_time_ms: f32,
    pub timestamp_ms: u64,
    pub magic: u32, // Magic number for validation (0xFEEDC0DE)
}

impl FPSData {
    const MAGIC: u32 = 0xFEED_C0DE;

    fn new(current_fps: f32, avg_fps_1s: f32, fps_1_percent_low: f32, frame_time_ms: f32) -> Self {
        Self {
            current_fps,
            avg_fps_1s,
            fps_1_percent_low,
            frame_time_ms,
            timestamp_ms: Self::get_timestamp_ms(),
            magic: Self::MAGIC,
        }
    }

    fn get_timestamp_ms() -> u64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64
    }
}

/// IPC Writer (DLL side)
///
/// Writes FPS data to shared memory.
pub struct IPCWriter {
    /// Shared memory handle
    mapping_handle: HANDLE,
    /// Pointer to shared memory
    view_ptr: *mut FPSData,
}

impl IPCWriter {
    /// Creates a new IPC writer by opening existing shared memory.
    ///
    /// The backend must have already created the shared memory.
    pub fn new() -> Result<Self, String> {
        info!("🔗 Opening shared memory for IPC...");

        unsafe {
            // Try to open existing shared memory (backend should have created it)
            let name_wide: Vec<u16> = SHARED_MEMORY_NAME
                .encode_utf16()
                .chain(std::iter::once(0))
                .collect();

            // Open existing file mapping
            let mapping_handle = OpenFileMappingW(
                FILE_MAP_ALL_ACCESS.0,
                false,
                windows::core::PCWSTR(name_wide.as_ptr()),
            )
            .map_err(|e| format!("Failed to open shared memory: {e}"))?;

            if mapping_handle.is_invalid() {
                return Err("Shared memory handle is invalid (backend not running?)".to_string());
            }

            info!("✅ Shared memory handle obtained");

            // Map view of file
            let view_ptr = MapViewOfFile(
                mapping_handle,
                FILE_MAP_ALL_ACCESS,
                0,
                0,
                SHARED_MEMORY_SIZE,
            );

            if view_ptr.Value.is_null() {
                CloseHandle(mapping_handle).ok();
                return Err("Failed to map view of shared memory".to_string());
            }

            info!("✅ Shared memory mapped successfully");

            Ok(Self {
                mapping_handle,
                view_ptr: view_ptr.Value as *mut FPSData,
            })
        }
    }

    /// Writes FPS data to shared memory.
    ///
    /// Uses volatile write for lock-free communication.
    pub fn write_fps(
        &mut self,
        current_fps: f32,
        avg_fps_1s: f32,
        fps_1_percent_low: f32,
        frame_time_ms: f32,
    ) -> Result<(), String> {
        if self.view_ptr.is_null() {
            return Err("Shared memory not initialized".to_string());
        }

        let data = FPSData::new(current_fps, avg_fps_1s, fps_1_percent_low, frame_time_ms);

        unsafe {
            // Volatile write (no caching, immediate visibility to other processes)
            ptr::write_volatile(self.view_ptr, data);
        }

        Ok(())
    }
}

impl Drop for IPCWriter {
    fn drop(&mut self) {
        unsafe {
            if !self.view_ptr.is_null() {
                UnmapViewOfFile(MEMORY_MAPPED_VIEW_ADDRESS {
                    Value: self.view_ptr as *mut _,
                })
                .ok();
            }

            if !self.mapping_handle.is_invalid() {
                CloseHandle(self.mapping_handle).ok();
            }
        }

        info!("👋 IPC writer cleaned up");
    }
}

// IPCWriter is NOT Send/Sync by default (contains raw pointers)
// But it's only used within the overlay thread, so this is fine
unsafe impl Send for IPCWriter {}
unsafe impl Sync for IPCWriter {}
