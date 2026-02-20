/// Windows Service implementation
///
/// Handles service lifecycle (start, stop, pause) and coordinates
/// ETW monitoring and IPC server.
use crate::{etw_monitor::EtwMonitor, ipc_server::IpcServer};
use parking_lot::Mutex;
use std::sync::Arc;
use std::time::Duration;
// Tracing removed - Windows Services don't have stdout/stderr (Session 0)
use windows::core::Result as WinResult;
use windows::core::PCWSTR;
use windows::Win32::System::Services::*;

static mut SERVICE_STATUS_HANDLE: SERVICE_STATUS_HANDLE = unsafe { std::mem::zeroed() };
static SERVICE_STATE: Mutex<Option<Arc<ServiceState>>> = Mutex::new(None);

/// Service state shared between control handler and main loop
#[allow(dead_code)]
struct ServiceState {
    etw_monitor: Arc<Mutex<EtwMonitor>>,
    ipc_server: Arc<Mutex<IpcServer>>,
    should_stop: Arc<Mutex<bool>>,
}

/// Main service entry point
pub fn run() -> WinResult<()> {
    unsafe {
        let service_name = to_wide("BalamFpsService");

        let service_table = [
            SERVICE_TABLE_ENTRYW {
                lpServiceName: windows::core::PWSTR::from_raw(service_name.as_ptr() as *mut _),
                lpServiceProc: Some(service_main),
            },
            SERVICE_TABLE_ENTRYW {
                lpServiceName: windows::core::PWSTR::null(),
                lpServiceProc: None,
            },
        ];

        StartServiceCtrlDispatcherW(service_table.as_ptr())?;
    }

    Ok(())
}

/// Service main function
unsafe extern "system" fn service_main(_argc: u32, _argv: *mut windows::core::PWSTR) {
    if let Err(_e) = service_main_impl() {
        // error!("Service main failed: {}", e);
        // CRITICAL: Report service stopped on error
        let _ = report_status(SERVICE_STOPPED, 1, 0);
    }
}

fn service_main_impl() -> WinResult<()> {
    // Register control handler
    unsafe {
        let service_name = to_wide("BalamFpsService");
        SERVICE_STATUS_HANDLE = RegisterServiceCtrlHandlerW(
            PCWSTR::from_raw(service_name.as_ptr()),
            Some(service_control_handler),
        )?;
    }

    // Report starting
    report_status(SERVICE_START_PENDING, 0, 3000)?;

    // Initialize components
    let etw_monitor = Arc::new(Mutex::new(EtwMonitor::new()?));
    let ipc_server = Arc::new(Mutex::new(IpcServer::new()?));
    let should_stop = Arc::new(Mutex::new(false));

    let state = Arc::new(ServiceState {
        etw_monitor: etw_monitor.clone(),
        ipc_server: ipc_server.clone(),
        should_stop: should_stop.clone(),
    });

    *SERVICE_STATE.lock() = Some(state);

    // Start ETW
    {
        let mut monitor = etw_monitor.lock();
        monitor.start()?;
    }

    // Start IPC
    {
        let mut server = ipc_server.lock();
        server.start()?;
    }

    // Report running ASAP to avoid timeout
    report_status(SERVICE_RUNNING, 0, 0)?;

    // Main loop
    while !*should_stop.lock() {
        // Get FPS and active game PID
        let (fps, active_pid) = {
            let monitor = etw_monitor.lock();
            monitor.get_fps()
        };

        // Update IPC with FPS and game info
        {
            let mut server = ipc_server.lock();
            server.update_fps(fps, active_pid);
        }

        std::thread::sleep(Duration::from_millis(100));
    }

    // Cleanup
    {
        let mut monitor = etw_monitor.lock();
        let _ = monitor.stop();
    }
    {
        let mut server = ipc_server.lock();
        let _ = server.stop();
    }

    report_status(SERVICE_STOPPED, 0, 0)?;

    Ok(())
}

/// Service control handler
unsafe extern "system" fn service_control_handler(control: u32) {
    match control {
        1 => {
            // SERVICE_CONTROL_STOP
            // info!("🛑 Received STOP signal");
            if let Some(state) = SERVICE_STATE.lock().as_ref() {
                *state.should_stop.lock() = true;
            }
            let _ = report_status(SERVICE_STOP_PENDING, 0, 3000);
        }
        2 => { // SERVICE_CONTROL_PAUSE
        }
        3 => { // SERVICE_CONTROL_CONTINUE
        }
        4 => { // SERVICE_CONTROL_INTERROGATE
        }
        _ => {
            // warn!("⚠️ Unhandled control code: {}", control);
        }
    }
}

/// Report service status to Windows
fn report_status(
    current_state: SERVICE_STATUS_CURRENT_STATE,
    exit_code: u32,
    wait_hint: u32,
) -> WinResult<()> {
    static mut CHECKPOINT: u32 = 1;

    unsafe {
        let status = SERVICE_STATUS {
            dwServiceType: SERVICE_WIN32_OWN_PROCESS,
            dwCurrentState: current_state,
            dwControlsAccepted: if current_state == SERVICE_START_PENDING {
                Default::default()
            } else {
                SERVICE_ACCEPT_STOP
            },
            dwWin32ExitCode: exit_code,
            dwServiceSpecificExitCode: 0,
            dwCheckPoint: if current_state == SERVICE_RUNNING || current_state == SERVICE_STOPPED {
                0
            } else {
                CHECKPOINT += 1;
                CHECKPOINT
            },
            dwWaitHint: wait_hint,
        };

        SetServiceStatus(SERVICE_STATUS_HANDLE, &status)?;
    }

    Ok(())
}

/// Convert string to wide (UTF-16) null-terminated
fn to_wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}
