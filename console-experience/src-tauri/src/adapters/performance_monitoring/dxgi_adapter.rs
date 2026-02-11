/// DXGI (DirectX Graphics Infrastructure) Adapter
///
/// Provides universal GPU monitoring using Windows DirectX APIs.
/// Works with ALL GPUs (NVIDIA, AMD, Intel, any vendor) on Windows.
///
/// # Features
/// - VRAM usage (current / budget)
/// - GPU adapter information
/// - Works without vendor-specific drivers
///
/// # Use Cases
/// - Fallback when vendor-specific APIs (NVML, ADL) not available
/// - Intel integrated graphics
/// - Unknown/unsupported GPU vendors
///
/// # Limitations
/// - Does NOT provide GPU usage percentage
/// - Does NOT provide temperature
/// - Does NOT provide power draw
/// - These require vendor-specific APIs
use tracing::{error, info};
use windows::core::ComInterface;
use windows::Win32::Graphics::Dxgi::{
    CreateDXGIFactory2, IDXGIAdapter1, IDXGIAdapter3, IDXGIFactory4, DXGI_ADAPTER_DESC1,
    DXGI_MEMORY_SEGMENT_GROUP_LOCAL, DXGI_QUERY_VIDEO_MEMORY_INFO,
};

/// DXGI Adapter for universal GPU monitoring
pub struct DXGIAdapter {
    /// DXGI adapter handle (None if initialization failed)
    adapter: Option<IDXGIAdapter3>,
    /// Adapter description
    desc: Option<DXGI_ADAPTER_DESC1>,
}

impl DXGIAdapter {
    /// Creates a new DXGI adapter instance.
    ///
    /// Attempts to create a DXGI factory and enumerate the first (primary) GPU adapter.
    /// This works with any GPU vendor on Windows.
    #[must_use]
    pub fn new() -> Self {
        info!("🔍 Initializing DXGI adapter for universal GPU monitoring");

        let (adapter, desc) = match Self::initialize_dxgi() {
            Ok((adp, dsc)) => {
                info!("✅ DXGI adapter initialized successfully");
                (Some(adp), Some(dsc))
            },
            Err(e) => {
                error!("❌ Failed to initialize DXGI: {}", e);
                (None, None)
            },
        };

        Self { adapter, desc }
    }

    /// Initializes DXGI and returns primary adapter + description
    fn initialize_dxgi() -> Result<(IDXGIAdapter3, DXGI_ADAPTER_DESC1), String> {
        unsafe {
            // Create DXGI factory
            let factory: IDXGIFactory4 =
                CreateDXGIFactory2(0).map_err(|e| format!("Failed to create DXGI factory: {e}"))?;

            info!("✅ DXGI Factory created");

            // Enumerate first adapter (primary GPU)
            let adapter1: IDXGIAdapter1 = factory
                .EnumAdapters1(0)
                .map_err(|e| format!("Failed to enumerate adapter: {e}"))?;

            // Get adapter description
            let mut desc = DXGI_ADAPTER_DESC1::default();
            adapter1
                .GetDesc1(&mut desc)
                .map_err(|e| format!("Failed to get adapter description: {e}"))?;

            // Convert description to string for logging
            let adapter_name = String::from_utf16_lossy(&desc.Description);
            let adapter_name = adapter_name.trim_end_matches('\0');

            info!("✅ DXGI Adapter found: {}", adapter_name);
            info!("   Dedicated VRAM: {} MB", desc.DedicatedVideoMemory / 1024 / 1024);
            info!(
                "   Dedicated System RAM: {} MB",
                desc.DedicatedSystemMemory / 1024 / 1024
            );
            info!("   Shared System RAM: {} MB", desc.SharedSystemMemory / 1024 / 1024);

            // Cast to IDXGIAdapter3 (needed for QueryVideoMemoryInfo)
            let adapter3: IDXGIAdapter3 = adapter1
                .cast::<IDXGIAdapter3>()
                .map_err(|e| format!("Failed to cast to IDXGIAdapter3: {e}"))?;

            Ok((adapter3, desc))
        }
    }

    /// Checks if DXGI is available and initialized
    #[must_use]
    pub fn is_available(&self) -> bool {
        self.adapter.is_some()
    }

    /// Gets adapter name (GPU model)
    #[must_use]
    pub fn get_adapter_name(&self) -> Option<String> {
        self.desc.as_ref().map(|desc| {
            let name = String::from_utf16_lossy(&desc.Description);
            name.trim_end_matches('\0').to_string()
        })
    }

    /// Gets VRAM usage in bytes (current usage, total budget).
    ///
    /// Returns (current_usage, budget) in bytes.
    ///
    /// # Returns
    /// - `Ok((used, total))` - VRAM usage in bytes
    /// - `Err(...)` - Query failed
    ///
    /// # Example
    /// ```ignore
    /// let (used, total) = adapter.get_vram_usage()?;
    /// let used_gb = used as f32 / 1_073_741_824.0;
    /// let total_gb = total as f32 / 1_073_741_824.0;
    /// ```
    pub fn get_vram_usage(&self) -> Result<(u64, u64), String> {
        let adapter = self.adapter.as_ref().ok_or("DXGI not initialized")?;

        unsafe {
            let mut info = DXGI_QUERY_VIDEO_MEMORY_INFO::default();

            adapter
                .QueryVideoMemoryInfo(
                    0,                               // Node index (0 = primary GPU)
                    DXGI_MEMORY_SEGMENT_GROUP_LOCAL, // Local VRAM (dedicated GPU memory)
                    &mut info,
                )
                .map_err(|e| format!("QueryVideoMemoryInfo failed: {e}"))?;

            Ok((info.CurrentUsage, info.Budget))
        }
    }

    /// Gets dedicated VRAM size in bytes (from adapter description).
    ///
    /// This is the total dedicated VRAM, not current usage.
    #[must_use]
    pub fn get_dedicated_vram_size(&self) -> Option<u64> {
        self.desc.as_ref().map(|desc| desc.DedicatedVideoMemory as u64)
    }

    /// Gets shared system memory size in bytes (from adapter description).
    #[must_use]
    pub fn get_shared_memory_size(&self) -> Option<u64> {
        self.desc.as_ref().map(|desc| desc.SharedSystemMemory as u64)
    }
}

impl Default for DXGIAdapter {
    fn default() -> Self {
        Self::new()
    }
}

// DXGI is thread-safe (COM objects with proper synchronization)
unsafe impl Send for DXGIAdapter {}
unsafe impl Sync for DXGIAdapter {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dxgi_creation() {
        let adapter = DXGIAdapter::new();
        // Should not panic even if no GPU
        let _available = adapter.is_available();
    }

    #[test]
    fn test_dxgi_adapter_name() {
        let adapter = DXGIAdapter::new();
        if adapter.is_available() {
            let name = adapter.get_adapter_name();
            assert!(name.is_some());
            println!("GPU: {:?}", name);
        }
    }

    #[test]
    fn test_dxgi_vram_usage() {
        let adapter = DXGIAdapter::new();
        if adapter.is_available() {
            let result = adapter.get_vram_usage();
            assert!(result.is_ok());

            if let Ok((used, budget)) = result {
                println!("VRAM: {} MB / {} MB", used / 1024 / 1024, budget / 1024 / 1024);
                assert!(used <= budget);
            }
        }
    }

    #[test]
    fn test_dxgi_dedicated_vram() {
        let adapter = DXGIAdapter::new();
        if adapter.is_available() {
            let vram = adapter.get_dedicated_vram_size();
            assert!(vram.is_some());
            if let Some(v) = vram {
                println!("Dedicated VRAM: {} MB", v / 1024 / 1024);
                assert!(v > 0);
            }
        }
    }
}
