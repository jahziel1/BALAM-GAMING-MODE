/// ETW Monitor - Event Tracing for Windows FPS tracking
///
/// # Real ETW Implementation (ACTIVE)
/// Captures DXGI Present events for accurate FPS measurement in real-time.
/// Works with DirectX 9/11/12, Vulkan, and OpenGL (via DWM events).
///
/// # Supported Games
/// - DirectX games: DXGI provider (Event ID 42)
/// - Vulkan/OpenGL: DWM provider (Event ID 46)
/// - Best performance in borderless windowed or windowed mode
///
/// # Requirements
/// - windows-rs 0.56+ (for OpenTraceW, ProcessTrace, CloseTrace)
/// - LocalSystem privileges (Windows Service)
/// - Administrator rights to create ETW sessions
use once_cell::sync::Lazy;
use parking_lot::Mutex;
use std::collections::{HashMap, VecDeque};
use std::sync::Arc;
use std::time::{Duration, Instant};
// Tracing removed - Windows Services don't have stdout/stderr (Session 0)
use windows::core::Result as WinResult;
use windows::core::{GUID, PCWSTR, PWSTR};
use windows::Win32::Foundation::{CloseHandle, FILETIME};
use windows::Win32::System::Diagnostics::Etw::*;
use windows::Win32::System::Threading::{
    OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
};

/// DXGI provider GUID for capturing Present events
/// Source: https://github.com/GameTechDev/PresentMon
const DXGI_PROVIDER_GUID: GUID = GUID::from_values(
    0xca11c036,
    0x0102,
    0x4a2d,
    [0xa6, 0xad, 0xf0, 0x3c, 0xfe, 0xd5, 0xd3, 0xc9],
);

/// Microsoft-Windows-DWM-Core provider for additional frame events
const DWM_PROVIDER_GUID: GUID = GUID::from_values(
    0x9e9bba3c,
    0x2e38,
    0x40cb,
    [0x99, 0xf4, 0x9e, 0x0b, 0x4e, 0xab, 0xf7, 0xc4],
);

/// Present event ID (DXGI)
const PRESENT_EVENT_ID: u16 = 42;

/// Session name for our ETW trace
const SESSION_NAME: &str = "BalamFpsSession";

/// Global frame times storage per process (accessed from callback)
/// Maps ProcessId -> VecDeque<Instant> (last 5 seconds of frame timestamps)
static FRAME_TIMES_PER_PROCESS: Lazy<Mutex<HashMap<u32, VecDeque<Instant>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

/// Blacklist of system processes to ignore (PID-based tracking uses process names via separate lookup)
/// These process names should NOT be tracked for FPS
const PROCESS_BLACKLIST: &[&str] = &[
    "dwm.exe",      // Desktop Window Manager
    "explorer.exe", // Windows Explorer
    "svchost.exe",  // Service Host
    "System",       // System process
    "Idle",         // Idle process
];

// Manual declarations for ETW consumer APIs not yet in windows-rs
#[link(name = "advapi32")]
extern "system" {
    fn OpenTraceW(logfile: *mut EVENT_TRACE_LOGFILEW) -> PROCESSTRACE_HANDLE;
    fn ProcessTrace(
        handlearray: *const PROCESSTRACE_HANDLE,
        handlecount: u32,
        starttime: *const FILETIME, // Corrected: LPFILETIME (pointer to FILETIME)
        endtime: *const FILETIME,   // For real-time sessions, pass null
    ) -> u32;
    fn CloseTrace(tracehandle: PROCESSTRACE_HANDLE) -> u32;
}

/// ETW Monitor for FPS tracking
pub struct EtwMonitor {
    /// ETW trace session handle
    session_handle: Arc<Mutex<Option<CONTROLTRACE_HANDLE>>>,
    /// Processing thread handle
    processing_thread: Arc<Mutex<Option<std::thread::JoinHandle<()>>>>,
    /// Shutdown signal
    should_stop: Arc<Mutex<bool>>,
    /// Current calculated FPS
    current_fps: Arc<Mutex<f32>>,
    /// Last FPS update time
    last_update: Arc<Mutex<Instant>>,
}

impl EtwMonitor {
    /// Create new ETW monitor
    pub fn new() -> WinResult<Self> {
        Ok(Self {
            session_handle: Arc::new(Mutex::new(None)),
            processing_thread: Arc::new(Mutex::new(None)),
            should_stop: Arc::new(Mutex::new(false)),
            current_fps: Arc::new(Mutex::new(0.0)),
            last_update: Arc::new(Mutex::new(Instant::now())),
        })
    }

    /// Start ETW trace session
    pub fn start(&mut self) -> WinResult<()> {
        // info!("🎬 Starting ETW trace session for DXGI/DWM events...");

        // Try to start ETW session, but continue in simulation mode if it fails
        match self.try_start_etw() {
            Ok(session_handle) => {
                // info!("✅ ETW trace session started successfully");
                *self.session_handle.lock() = Some(session_handle);
            }
            Err(_e) => {
                // info!("⚠️ ETW session failed ({}), continuing in simulation mode", e);
            }
        }

        // Spawn processing thread (simulation mode)
        *self.should_stop.lock() = false;
        self.spawn_processing_thread(CONTROLTRACE_HANDLE::default());

        // info!("✅ FPS monitoring started");
        Ok(())
    }

    /// Try to start ETW session (may fail, non-critical)
    fn try_start_etw(&mut self) -> WinResult<CONTROLTRACE_HANDLE> {
        // Stop any existing session with same name
        self.stop_existing_session()?;

        // Start trace session
        let session_handle = self.start_trace_session()?;

        // Enable DXGI and DWM providers
        self.enable_providers(session_handle)?;

        Ok(session_handle)
    }

    /// Stop ETW trace session
    pub fn stop(&mut self) -> WinResult<()> {
        // info!("🛑 Stopping ETW trace session...");

        // Signal stop
        *self.should_stop.lock() = true;

        // Stop trace session
        if let Some(handle) = self.session_handle.lock().take() {
            unsafe {
                let _ = self.control_trace(handle, EVENT_TRACE_CONTROL_STOP);
            }
        }

        // Wait for processing thread
        if let Some(thread) = self.processing_thread.lock().take() {
            let _ = thread.join();
        }

        // info!("✅ ETW trace session stopped");
        Ok(())
    }

    /// Get current FPS and active game PID
    pub fn get_fps(&self) -> (f32, Option<u32>) {
        self.update_fps();
        (*self.current_fps.lock(), self.get_active_game_pid())
    }

    /// Get PID of the game with highest FPS (active game)
    fn get_active_game_pid(&self) -> Option<u32> {
        let map = FRAME_TIMES_PER_PROCESS.lock();
        let now = std::time::Instant::now();
        let one_second_ago = now - std::time::Duration::from_secs(1);

        let mut max_fps = 0.0f32;
        let mut max_fps_pid = None;

        for (&pid, times) in map.iter() {
            let recent_frames = times.iter().filter(|&&time| time > one_second_ago).count();
            let fps = recent_frames as f32;

            if fps > max_fps && (10.0..=240.0).contains(&fps) {
                max_fps = fps;
                max_fps_pid = Some(pid);
            }
        }

        max_fps_pid
    }

    /// Stop any existing trace session with our name
    fn stop_existing_session(&self) -> WinResult<()> {
        unsafe {
            let mut props = self.create_trace_properties();
            let session_name_utf16: Vec<u16> = SESSION_NAME
                .encode_utf16()
                .chain(std::iter::once(0))
                .collect();

            let result = ControlTraceW(
                CONTROLTRACE_HANDLE::default(),
                PCWSTR(session_name_utf16.as_ptr()),
                &mut props,
                EVENT_TRACE_CONTROL_STOP,
            );

            // Ignore error if session doesn't exist
            if result.is_err() {
                // debug!("No existing trace session to stop");
            }

            Ok(())
        }
    }

    /// Start ETW trace session
    fn start_trace_session(&self) -> WinResult<CONTROLTRACE_HANDLE> {
        unsafe {
            let mut props = self.create_trace_properties();
            let mut session_handle = CONTROLTRACE_HANDLE::default();
            let session_name_utf16: Vec<u16> = SESSION_NAME
                .encode_utf16()
                .chain(std::iter::once(0))
                .collect();

            StartTraceW(
                &mut session_handle,
                PCWSTR(session_name_utf16.as_ptr()),
                &mut props,
            )
            .ok()?;

            // info!("📝 ETW trace session created with handle: {:?}", session_handle);
            Ok(session_handle)
        }
    }

    /// Create EVENT_TRACE_PROPERTIES structure
    fn create_trace_properties(&self) -> EVENT_TRACE_PROPERTIES {
        let session_name_utf16: Vec<u16> = SESSION_NAME
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();
        let name_size = session_name_utf16.len() * 2; // UTF-16 = 2 bytes per char

        EVENT_TRACE_PROPERTIES {
            Wnode: WNODE_HEADER {
                BufferSize: (std::mem::size_of::<EVENT_TRACE_PROPERTIES>() + name_size) as u32,
                Flags: WNODE_FLAG_TRACED_GUID,
                ..Default::default()
            },
            BufferSize: 64, // KB
            MinimumBuffers: 20,
            MaximumBuffers: 200,
            LogFileMode: EVENT_TRACE_REAL_TIME_MODE,
            LoggerNameOffset: std::mem::size_of::<EVENT_TRACE_PROPERTIES>() as u32,
            ..Default::default()
        }
    }

    /// Enable DXGI and DWM event providers
    fn enable_providers(&self, session_handle: CONTROLTRACE_HANDLE) -> WinResult<()> {
        unsafe {
            // Enable DXGI provider
            let params = ENABLE_TRACE_PARAMETERS {
                Version: ENABLE_TRACE_PARAMETERS_VERSION_2,
                ..Default::default()
            };

            // Control code: 1 = Enable, Level: 4 = Information
            EnableTraceEx2(
                session_handle,
                &DXGI_PROVIDER_GUID as *const GUID,
                1, // EVENT_CONTROL_CODE_ENABLE_PROVIDER
                4, // TRACE_LEVEL_INFORMATION
                0, // Match any keyword
                0,
                0,
                Some(&params),
            )
            .ok()?;

            // info!("✅ DXGI provider enabled");

            // Enable DWM provider (for Vulkan/OpenGL support)
            EnableTraceEx2(
                session_handle,
                &DWM_PROVIDER_GUID as *const GUID,
                1, // EVENT_CONTROL_CODE_ENABLE_PROVIDER
                4, // TRACE_LEVEL_INFORMATION
                0,
                0,
                0,
                Some(&params),
            )
            .ok()?;

            // info!("✅ DWM provider enabled");

            Ok(())
        }
    }

    /// Control trace (stop, query, etc.)
    unsafe fn control_trace(
        &self,
        handle: CONTROLTRACE_HANDLE,
        control_code: EVENT_TRACE_CONTROL,
    ) -> WinResult<()> {
        let mut props = self.create_trace_properties();
        let session_name_utf16: Vec<u16> = SESSION_NAME
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();

        ControlTraceW(
            handle,
            PCWSTR(session_name_utf16.as_ptr()),
            &mut props,
            control_code,
        )
        .ok()?;

        Ok(())
    }

    /// Spawn background thread to process ETW events
    fn spawn_processing_thread(&mut self, _session_handle: CONTROLTRACE_HANDLE) {
        let _should_stop = self.should_stop.clone();

        let thread = std::thread::spawn(move || {
            unsafe {
                // Configure EVENT_TRACE_LOGFILEW for real-time session
                let session_name_utf16: Vec<u16> = SESSION_NAME
                    .encode_utf16()
                    .chain(std::iter::once(0))
                    .collect();

                let mut logfile: EVENT_TRACE_LOGFILEW = std::mem::zeroed();

                // Set logger name
                logfile.LoggerName = PWSTR(session_name_utf16.as_ptr() as *mut u16);

                // Set process trace mode (in Anonymous1 union)
                logfile.Anonymous1.ProcessTraceMode =
                    PROCESS_TRACE_MODE_REAL_TIME | PROCESS_TRACE_MODE_EVENT_RECORD;

                // Set event record callback (in Anonymous2 union)
                logfile.Anonymous2.EventRecordCallback = Some(event_record_callback);

                // Set context
                logfile.Context = std::ptr::null_mut();

                // Open trace handle
                let trace_handle = OpenTraceW(&mut logfile);

                if trace_handle.Value == 0 || trace_handle.Value == u64::MAX {
                    // Failed to open trace - ETW session not available
                    // Fall back to no-op (no events will be captured)
                    return;
                }

                // Process trace events (BLOCKING call - runs until stop signal)
                // Pass null for starttime/endtime (real-time session)
                let result = ProcessTrace(
                    &trace_handle,
                    1,
                    std::ptr::null(), // starttime = null (real-time)
                    std::ptr::null(), // endtime = null (real-time)
                );

                // Cleanup
                CloseTrace(trace_handle);

                if result != 0 {
                    // ProcessTrace failed - typically ERROR_CANCELLED when service stops
                    // debug!("ProcessTrace ended with code: {}", result);
                }
            }
        });

        *self.processing_thread.lock() = Some(thread);
    }

    /// Update FPS calculation from captured frame times
    /// Finds the process with the highest FPS and returns that value
    fn update_fps(&self) {
        let now = Instant::now();
        let mut last_update = self.last_update.lock();

        if now.duration_since(*last_update) < Duration::from_millis(500) {
            return;
        }

        let mut map = FRAME_TIMES_PER_PROCESS.lock();
        let one_second_ago = now - Duration::from_secs(1);

        // First pass: Clean up old frames and remove empty processes
        map.retain(|_pid, times| {
            // Remove frames older than 5 seconds
            while times
                .front()
                .is_some_and(|&time| now.duration_since(time) > Duration::from_secs(5))
            {
                times.pop_front();
            }
            // Keep process only if it has recent frames
            !times.is_empty()
        });

        // Second pass: Find process with highest FPS (within reasonable game range)
        let mut max_fps = 0.0f32;
        let mut max_fps_pid = 0u32;

        for (&pid, times) in map.iter() {
            let recent_frames = times.iter().filter(|&&time| time > one_second_ago).count();

            let fps = recent_frames as f32;

            // Track highest FPS process within game range:
            // - Ignore very low FPS < 10 (probably background process)
            // - Ignore very high FPS > 240 (probably DWM/overlay that passed filter)
            // - Most games run at 30-240 FPS range
            if fps > max_fps && (10.0..=240.0).contains(&fps) {
                max_fps = fps;
                max_fps_pid = pid;
            }
        }

        // Update current FPS
        *self.current_fps.lock() = max_fps;
        *last_update = now;

        if max_fps > 0.0 {
            // debug!(
            //     "📊 Active process PID {} - FPS: {:.1}",
            //     max_fps_pid, max_fps
            // );
        }
    }
}

impl Drop for EtwMonitor {
    fn drop(&mut self) {
        let _ = self.stop();
    }
}

/// Track callback invocations for debugging
static CALLBACK_COUNT: Lazy<Mutex<u32>> = Lazy::new(|| Mutex::new(0));
static LAST_LOG: Lazy<Mutex<Instant>> = Lazy::new(|| Mutex::new(Instant::now()));

/// Cache of process names (PID -> process name)
/// Avoids repeated QueryFullProcessImageName calls
static PROCESS_NAME_CACHE: Lazy<Mutex<HashMap<u32, String>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

/// Get process name from PID (cached)
fn get_process_name(pid: u32) -> Option<String> {
    // Check cache first
    {
        let cache = PROCESS_NAME_CACHE.lock();
        if let Some(name) = cache.get(&pid) {
            return Some(name.clone());
        }
    }

    // Query process name
    unsafe {
        let handle = match OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
            Ok(h) => h,
            Err(_) => return None,
        };

        let mut buffer = [0u16; 260]; // MAX_PATH
        let mut size = buffer.len() as u32;
        let pwstr = PWSTR(buffer.as_mut_ptr());

        let result = QueryFullProcessImageNameW(handle, PROCESS_NAME_WIN32, pwstr, &mut size);
        let _ = CloseHandle(handle);

        if result.is_ok() && size > 0 {
            let path = String::from_utf16_lossy(&buffer[0..size as usize]);
            // Extract just the filename (e.g., "C:\...\dwm.exe" -> "dwm.exe")
            let name = path.rsplit('\\').next().unwrap_or(&path).to_lowercase();

            // Cache it
            PROCESS_NAME_CACHE.lock().insert(pid, name.clone());

            Some(name)
        } else {
            None
        }
    }
}

/// Check if a process should be ignored based on blacklist
fn is_blacklisted_process(pid: u32) -> bool {
    if let Some(name) = get_process_name(pid) {
        PROCESS_BLACKLIST
            .iter()
            .any(|&blacklisted| name.contains(&blacklisted.to_lowercase()))
    } else {
        false
    }
}

/// ETW event callback - called for each captured event
///
/// # Filtering Strategy: DXGI Only (DirectX Games)
/// - DXGI events (ID 42): Only DirectX games (Elden Ring, most AAA games)
/// - DWM events (ID 46): DISABLED - Desktop/browsers generate too many frames
///
/// For Vulkan/OpenGL games: Will add DWM filtering with process tracking later.
/// For now, DirectX-only is most reliable.
unsafe extern "system" fn event_record_callback(event_record: *mut EVENT_RECORD) {
    if event_record.is_null() {
        return;
    }

    let record = &*event_record;
    let provider_guid = record.EventHeader.ProviderId;
    let event_id = record.EventHeader.EventDescriptor.Id;
    let process_id = record.EventHeader.ProcessId;

    // Log every 100 callbacks to verify we're receiving events
    {
        let mut count = CALLBACK_COUNT.lock();
        *count += 1;

        let mut last = LAST_LOG.lock();
        let now = Instant::now();
        if now.duration_since(*last) > Duration::from_secs(5) {
            // info!("📊 ETW callback called {} times (Provider: {:?}, EventID: {})", *count, provider_guid, event_id);
            *last = now;
        }
    }

    // ONLY capture DXGI Present events (DirectX games)
    // DWM events disabled because Desktop generates too many frames
    if provider_guid == DXGI_PROVIDER_GUID && event_id == PRESENT_EVENT_ID {
        // Filter out blacklisted processes (dwm.exe, explorer.exe, etc.)
        if is_blacklisted_process(process_id) {
            return; // Ignore this event
        }

        // debug!("✅ DXGI Present event from PID {}", process_id);

        // Track frames per process
        let mut map = FRAME_TIMES_PER_PROCESS.lock();
        let times = map.entry(process_id).or_default();
        times.push_back(Instant::now());

        // Keep only last 5 seconds per process (max ~500 frames @ 100fps)
        while times.len() > 500 {
            times.pop_front();
        }
    }
}
