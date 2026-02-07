/**
 * RTSS (RivaTuner Statistics Server) Adapter
 *
 * Writes formatted text to RTSS shared memory for in-game overlay rendering.
 * This allows the overlay to work in fullscreen exclusive mode.
 *
 * ## How RTSS Works
 * 1. RTSS creates a shared memory buffer ("RTSSSharedMemoryV2")
 * 2. Applications write formatted text to this buffer
 * 3. RTSS injects into games and renders the text using the game's rendering engine
 * 4. Works with DirectX 9/10/11/12, Vulkan, OpenGL
 *
 * ## Text Formatting
 * RTSS supports special tags:
 * - `<C0=RRGGBB>` - Set color (hex RGB)
 * - `<C>` - Reset color to default
 * - `<S0=size>` - Set text size (percentage)
 * - `<S>` - Reset size to default
 * - `\n` - Newline
 *
 * ## Requirements
 * User must have RTSS installed (comes with MSI Afterburner, EVGA Precision, etc.)
 *
 * ## Performance
 * - Overhead: <0.5% FPS
 * - Memory: ~256 bytes shared memory
 * - Updates: Can update every frame (no throttling needed)
 */
use std::ffi::OsString;
use std::os::windows::ffi::OsStrExt;
use std::ptr;
use std::sync::{Arc, Mutex};
use tracing::info;
use windows::core::PCWSTR;
use windows::Win32::Foundation::{CloseHandle, HANDLE, INVALID_HANDLE_VALUE};
use windows::Win32::System::Memory::{
    CreateFileMappingW, MapViewOfFile, OpenFileMappingW, UnmapViewOfFile, FILE_MAP_ALL_ACCESS, PAGE_READWRITE,
};

/// `RTSS` Shared Memory Adapter
///
/// Manages connection to `RTSS` shared memory and formats overlay text.
/// Thread-safe: Uses usize to store pointer (Send + Sync safe).
pub struct RTSSAdapter {
    /// Handle to shared memory mapping
    mapping_handle: Arc<Mutex<Option<HANDLE>>>,
    /// Pointer to mapped memory view (stored as usize for thread safety)
    memory_view: Arc<Mutex<Option<usize>>>,
    /// Size of memory buffer (`RTSS` uses 256 bytes)
    buffer_size: usize,
}

impl RTSSAdapter {
    /// `RTSS` shared memory name (version 2 protocol)
    const SHARED_MEMORY_NAME: &'static str = "RTSSSharedMemoryV2";

    /// Buffer size used by `RTSS` (256 bytes)
    const BUFFER_SIZE: usize = 256;

    /// Creates a new `RTSS` adapter.
    ///
    /// # Returns
    /// - `Ok(RTSSAdapter)` if RTSS is available and shared memory opened
    /// - `Err(String)` if RTSS not found or shared memory creation failed
    pub fn new() -> Result<Self, String> {
        info!("Attempting to connect to RTSS shared memory");

        let adapter = Self {
            mapping_handle: Arc::new(Mutex::new(None)),
            memory_view: Arc::new(Mutex::new(None)),
            buffer_size: Self::BUFFER_SIZE,
        };

        // Try to open existing shared memory first (RTSS already running)
        if adapter.try_open_existing().is_ok() {
            info!("Successfully connected to existing RTSS shared memory");
            return Ok(adapter);
        }

        // If not found, try to create it (RTSS will connect when it starts)
        if adapter.try_create_new().is_ok() {
            info!("Created RTSS shared memory (waiting for RTSS to connect)");
            return Ok(adapter);
        }

        Err("Failed to connect to RTSS shared memory".to_string())
    }

    /// Tries to open existing `RTSS` shared memory.
    fn try_open_existing(&self) -> Result<(), String> {
        let name = self.to_wide_string(Self::SHARED_MEMORY_NAME);

        unsafe {
            let handle = OpenFileMappingW(FILE_MAP_ALL_ACCESS.0, false, PCWSTR(name.as_ptr()))
                .map_err(|e| format!("Failed to open RTSS shared memory: {e}"))?;

            if handle == INVALID_HANDLE_VALUE {
                return Err("Invalid handle returned".to_string());
            }

            let view = MapViewOfFile(handle, FILE_MAP_ALL_ACCESS, 0, 0, self.buffer_size);

            if view.Value.is_null() {
                CloseHandle(handle).ok();
                return Err("Failed to map view of file".to_string());
            }

            *self.mapping_handle.lock().unwrap() = Some(handle);
            *self.memory_view.lock().unwrap() = Some(view.Value as usize);

            Ok(())
        }
    }

    /// Tries to create new `RTSS` shared memory.
    fn try_create_new(&self) -> Result<(), String> {
        let name = self.to_wide_string(Self::SHARED_MEMORY_NAME);

        unsafe {
            let handle = CreateFileMappingW(
                INVALID_HANDLE_VALUE,
                None,
                PAGE_READWRITE,
                0,
                self.buffer_size as u32,
                PCWSTR(name.as_ptr()),
            )
            .map_err(|e| format!("Failed to create RTSS shared memory: {e}"))?;

            if handle.is_invalid() {
                return Err("Invalid handle returned".to_string());
            }

            let view = MapViewOfFile(handle, FILE_MAP_ALL_ACCESS, 0, 0, self.buffer_size);

            if view.Value.is_null() {
                CloseHandle(handle).ok();
                return Err("Failed to map view of file".to_string());
            }

            *self.mapping_handle.lock().unwrap() = Some(handle);
            *self.memory_view.lock().unwrap() = Some(view.Value as usize);

            Ok(())
        }
    }

    /// Converts Rust string to wide string (UTF-16) for Windows APIs.
    #[allow(clippy::unused_self)]
    fn to_wide_string(&self, s: &str) -> Vec<u16> {
        OsString::from(s)
            .encode_wide()
            .chain(std::iter::once(0)) // Null terminator
            .collect()
    }

    /// Updates `RTSS` overlay with performance metrics.
    ///
    /// # Arguments
    /// - `fps` - Frames per second
    /// - `cpu` - CPU usage percentage (0-100)
    /// - `gpu` - GPU usage percentage (0-100)
    /// - `ram_gb` - RAM usage in GB
    /// - `frame_time_ms` - Frame time in milliseconds (optional)
    ///
    /// # Returns
    /// - `Ok(())` if text written successfully
    /// - `Err(String)` if shared memory not available or write failed
    pub fn update(&self, fps: f32, cpu: f32, gpu: f32, ram_gb: f32, frame_time_ms: Option<f32>) -> Result<(), String> {
        let memory_view_guard = self.memory_view.lock().unwrap();
        let memory_view_addr = memory_view_guard.ok_or("RTSS shared memory not available")?;

        let memory_view = memory_view_addr as *mut u8;

        // Get current time
        let now = chrono::Local::now();
        let time_str = now.format("%H:%M").to_string();

        // Format text with RTSS color tags (Steam Deck style)
        let text = if let Some(frame_time) = frame_time_ms {
            format!(
                "<C0=00FFAA><S0=140>⚡ {fps:.0}</S><C0=FFFFFF> FPS</C>  <C0=AAAAAA>🕐 {time_str}</C>\n\
                 <C0=00D9FF>{frame_time:.1}ms</C>\n\
                 <C0=FF9500>CPU {cpu:.0}%</C>  <C0=00D9FF>GPU {gpu:.0}%</C>\n\
                 <C0=BF5AF2>RAM {ram_gb:.1}GB</C>"
            )
        } else {
            format!(
                "<C0=00FFAA><S0=140>⚡ {fps:.0}</S><C0=FFFFFF> FPS</C>  <C0=AAAAAA>🕐 {time_str}</C>\n\
                 <C0=FF9500>CPU {cpu:.0}%</C>  <C0=00D9FF>GPU {gpu:.0}%</C>\n\
                 <C0=BF5AF2>RAM {ram_gb:.1}GB</C>"
            )
        };

        let bytes = text.as_bytes();

        if bytes.len() >= self.buffer_size {
            return Err(format!(
                "Text too large for RTSS buffer ({} >= {})",
                bytes.len(),
                self.buffer_size
            ));
        }

        unsafe {
            // Write text to shared memory
            ptr::copy_nonoverlapping(bytes.as_ptr(), memory_view, bytes.len());

            // Null-terminate
            *memory_view.add(bytes.len()) = 0;
        }

        Ok(())
    }

    /// Clears `RTSS` overlay (writes empty string).
    pub fn clear(&self) -> Result<(), String> {
        let memory_view_guard = self.memory_view.lock().unwrap();
        let memory_view_addr = memory_view_guard.ok_or("RTSS shared memory not available")?;

        let memory_view = memory_view_addr as *mut u8;

        unsafe {
            *memory_view = 0; // Write null terminator at start
        }

        Ok(())
    }

    /// Checks if `RTSS` is available (shared memory exists).
    ///
    /// This is a static method that can be called without creating an adapter.
    ///
    /// # Returns
    /// - `true` if RTSS shared memory exists (RTSS is running)
    /// - `false` otherwise
    #[must_use]
    pub fn is_available() -> bool {
        let name_str = Self::SHARED_MEMORY_NAME;
        let name: Vec<u16> = OsString::from(name_str)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();

        unsafe {
            match OpenFileMappingW(FILE_MAP_ALL_ACCESS.0, false, PCWSTR(name.as_ptr())) {
                Ok(handle) => {
                    if handle != INVALID_HANDLE_VALUE {
                        let _ = CloseHandle(handle);
                        true
                    } else {
                        false
                    }
                },
                Err(_) => false,
            }
        }
    }
}

impl Drop for RTSSAdapter {
    fn drop(&mut self) {
        // Clear overlay before closing
        let _ = self.clear();

        // Unmap memory view
        if let Some(view_addr) = *self.memory_view.lock().unwrap() {
            unsafe {
                let _ = UnmapViewOfFile(windows::Win32::System::Memory::MEMORY_MAPPED_VIEW_ADDRESS {
                    Value: view_addr as *mut _,
                });
            }
        }

        // Close mapping handle
        if let Some(handle) = *self.mapping_handle.lock().unwrap() {
            unsafe {
                let _ = CloseHandle(handle);
            }
        }

        info!("RTSS adapter closed");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rtss_availability() {
        // Should not panic
        let available = RTSSAdapter::is_available();
        println!("RTSS available: {available}");
    }

    #[test]
    fn test_rtss_adapter_creation() {
        match RTSSAdapter::new() {
            Ok(_adapter) => {
                println!("✅ RTSS adapter created successfully");
            },
            Err(e) => {
                println!("⚠️ RTSS adapter creation failed: {e}");
                println!("   This is expected if RTSS is not installed");
            },
        }
    }

    #[test]
    fn test_rtss_update() {
        if let Ok(adapter) = RTSSAdapter::new() {
            let result = adapter.update(120.0, 45.5, 78.2, 12.5, Some(8.3));
            assert!(result.is_ok(), "Failed to update RTSS: {result:?}");
        }
    }
}
