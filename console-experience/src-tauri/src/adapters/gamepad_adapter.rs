use tauri::{AppHandle, Manager, Runtime, Emitter};
use std::thread;
use std::time::Duration;
use windows::Win32::UI::Input::XboxController::*;
use gilrs::{Gilrs, Button};
use tracing::{info, error};

// Helper struct to track button state changes
struct ButtonState {
    pressed: bool,
}

impl ButtonState {
    fn new() -> Self { Self { pressed: false } }
    
    // Returns true only on the "rising edge" (moment of press)
    fn update(&mut self, is_down: bool) -> bool {
        if is_down && !self.pressed {
            self.pressed = true;
            true
        } else if !is_down {
            self.pressed = false;
            false
        } else {
            false
        }
    }
}

pub fn start_gamepad_listener<R: Runtime>(app: AppHandle<R>) {
    thread::spawn(move || {
        info!("--- BALAM ENGINE: DUAL-CHANNEL NAVIGATION (Web + Native Reliability) ---");
        
        // Trackers for debounce / edge detection
        let mut btn_a = ButtonState::new();
        let mut btn_b = ButtonState::new();
        let mut btn_up = ButtonState::new();
        let mut btn_down = ButtonState::new();
        let mut btn_left = ButtonState::new();
        let mut btn_right = ButtonState::new();
        let mut btn_menu = ButtonState::new(); // Start/Menu

        let mut gilrs = Gilrs::new().ok();
        
        loop {
            // Data holders
            let mut pressed_a = false;
            let mut pressed_b = false;
            let mut pressed_up = false;
            let mut pressed_down = false;
            let mut pressed_left = false;
            let mut pressed_right = false;
            let mut pressed_menu = false;
            
            let mut active_source = "NONE";

            // STRATEGY 1: XInput (Primary for Windows/Xbox)
            let mut xinput_state = unsafe { std::mem::zeroed() };
            if unsafe { XInputGetState(0, &mut xinput_state) } == 0 {
                active_source = "XINPUT";
                let b = xinput_state.Gamepad.wButtons.0;
                let s = &xinput_state.Gamepad;

                // Buttons
                if (b & XINPUT_GAMEPAD_A.0 as u16) != 0 { pressed_a = true; }
                if (b & XINPUT_GAMEPAD_B.0 as u16) != 0 { pressed_b = true; }
                if (b & XINPUT_GAMEPAD_START.0 as u16) != 0 { pressed_menu = true; }
                
                // D-Pad
                if (b & XINPUT_GAMEPAD_DPAD_UP.0 as u16) != 0 { pressed_up = true; }
                if (b & XINPUT_GAMEPAD_DPAD_DOWN.0 as u16) != 0 { pressed_down = true; }
                if (b & XINPUT_GAMEPAD_DPAD_LEFT.0 as u16) != 0 { pressed_left = true; }
                if (b & XINPUT_GAMEPAD_DPAD_RIGHT.0 as u16) != 0 { pressed_right = true; }

                // Analog Sticks (Deadzone > 10000)
                if s.sThumbLY > 10000 { pressed_up = true; }
                if s.sThumbLY < -10000 { pressed_down = true; }
                if s.sThumbLX > 10000 { pressed_right = true; }
                if s.sThumbLX < -10000 { pressed_left = true; }
                
                // Wake-up Combo (LB + RB + START)
                let lb = (b & XINPUT_GAMEPAD_LEFT_SHOULDER.0 as u16) != 0;
                let rb = (b & XINPUT_GAMEPAD_RIGHT_SHOULDER.0 as u16) != 0;
                let lt = s.bLeftTrigger > 128;
                let rt = s.bRightTrigger > 128;

                if (lb || lt) && (rb || rt) && pressed_menu {
                     handle_wakeup(&app);
                }
            } 
            // STRATEGY 2: Gilrs (Fallback)
             else if let Some(ref mut g) = gilrs {
                // Drain events to update state
                while let Some(_) = g.next_event() {} 
                
                for (_, gamepad) in g.gamepads() {
                    // active_source = "GILRS";
                    if gamepad.is_pressed(Button::South) { pressed_a = true; } // A / Cross
                    if gamepad.is_pressed(Button::East) { pressed_b = true; }  // B / Circle
                    if gamepad.is_pressed(Button::Start) { pressed_menu = true; }

                    if gamepad.is_pressed(Button::DPadUp) { pressed_up = true; }
                    if gamepad.is_pressed(Button::DPadDown) { pressed_down = true; }
                    if gamepad.is_pressed(Button::DPadLeft) { pressed_left = true; }
                    if gamepad.is_pressed(Button::DPadRight) { pressed_right = true; }
                    
                    // Sticks
                    let axis_y = gamepad.value(gilrs::Axis::LeftStickY);
                    let axis_x = gamepad.value(gilrs::Axis::LeftStickX);
                    if axis_y > 0.5 { pressed_up = true; }
                    if axis_y < -0.5 { pressed_down = true; }
                    if axis_x > 0.5 { pressed_right = true; }
                    if axis_x < -0.5 { pressed_left = true; }

                    // Wakeup
                    let l1 = gamepad.is_pressed(Button::LeftTrigger);
                    let l2 = gamepad.is_pressed(Button::LeftTrigger2);
                    let r1 = gamepad.is_pressed(Button::RightTrigger);
                    let r2 = gamepad.is_pressed(Button::RightTrigger2);
                    
                    if (l1 || l2) && (r1 || r2) && pressed_menu {
                        handle_wakeup(&app);
                    }
                }
            }

            // EMIT NAVIGATION EVENTS (Only on change/press)
            // This bypasses the browser focus issue completely
            if let Some(win) = app.get_webview_window("main") {
                // Only emit if window is potentially visible to avoid ghost inputs
                if win.is_visible().unwrap_or(false) {
                    if btn_a.update(pressed_a) { let _ = win.emit("nav", "CONFIRM"); }
                    if btn_b.update(pressed_b) { let _ = win.emit("nav", "BACK"); }
                    if btn_up.update(pressed_up) { let _ = win.emit("nav", "UP"); }
                    if btn_down.update(pressed_down) { let _ = win.emit("nav", "DOWN"); }
                    if btn_left.update(pressed_left) { let _ = win.emit("nav", "LEFT"); }
                    if btn_right.update(pressed_right) { let _ = win.emit("nav", "RIGHT"); }
                    if btn_menu.update(pressed_menu) { let _ = win.emit("nav", "MENU"); }
                }
            }
            
            // Polling rate 30Hz is enough for UI navigation
            thread::sleep(Duration::from_millis(33)); 
        }
    });
}

// Logic to wake up the window
fn handle_wakeup<R: Runtime>(app: &AppHandle<R>) {
    if let Some(win) = app.get_webview_window("main") {
        if !win.is_visible().unwrap_or(false) {
            info!("[NATIVE] Waking up Shell!");
            let _ = win.show();
            let _ = win.set_always_on_top(true);
            let _ = win.set_focus();
        }
    }
}
