use gilrs::{Button, Gilrs};
use serde::Serialize;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, Runtime};
use tracing::info;
use windows::Win32::UI::Input::XboxController::{
    XInputGetState, XINPUT_GAMEPAD_A, XINPUT_GAMEPAD_B, XINPUT_GAMEPAD_DPAD_DOWN, XINPUT_GAMEPAD_DPAD_LEFT,
    XINPUT_GAMEPAD_DPAD_RIGHT, XINPUT_GAMEPAD_DPAD_UP, XINPUT_GAMEPAD_LEFT_SHOULDER, XINPUT_GAMEPAD_RIGHT_SHOULDER,
    XINPUT_GAMEPAD_START,
};

#[derive(Serialize, Clone, Copy, PartialEq)]
pub enum ControllerType {
    Xbox,
    PlayStation,
    Switch,
    Generic,
    Keyboard,
}

struct ButtonState {
    pressed: bool,
}

impl ButtonState {
    fn new() -> Self {
        Self { pressed: false }
    }
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
        info!("--- BALAM ENGINE: DUAL-CHANNEL NAVIGATION (Sync-Active v2) ---");

        let mut btn_a = ButtonState::new();
        let mut btn_b = ButtonState::new();
        let mut btn_up = ButtonState::new();
        let mut btn_down = ButtonState::new();
        let mut btn_left = ButtonState::new();
        let mut btn_right = ButtonState::new();
        let mut btn_menu = ButtonState::new();

        let mut current_controller = ControllerType::Keyboard;
        let mut gilrs = Gilrs::new().ok();

        loop {
            let mut pressed_a = false;
            let mut pressed_b = false;
            let mut pressed_up = false;
            let mut pressed_down = false;
            let mut pressed_left = false;
            let mut pressed_right = false;
            let mut pressed_menu = false;

            // Detect current connected type (Not just active press)
            let mut detected_type = ControllerType::Keyboard;

            // XInput Check (Xbox)
            let mut xinput_state = unsafe { std::mem::zeroed() };
            if unsafe { XInputGetState(0, &raw mut xinput_state) } == 0 {
                detected_type = ControllerType::Xbox;
                let b = xinput_state.Gamepad.wButtons.0;
                let s = &xinput_state.Gamepad;

                if (b & XINPUT_GAMEPAD_A.0) != 0 {
                    pressed_a = true;
                }
                if (b & XINPUT_GAMEPAD_B.0) != 0 {
                    pressed_b = true;
                }
                if (b & XINPUT_GAMEPAD_START.0) != 0 {
                    pressed_menu = true;
                }
                if (b & XINPUT_GAMEPAD_DPAD_UP.0) != 0 {
                    pressed_up = true;
                }
                if (b & XINPUT_GAMEPAD_DPAD_DOWN.0) != 0 {
                    pressed_down = true;
                }
                if (b & XINPUT_GAMEPAD_DPAD_LEFT.0) != 0 {
                    pressed_left = true;
                }
                if (b & XINPUT_GAMEPAD_DPAD_RIGHT.0) != 0 {
                    pressed_right = true;
                }

                if s.sThumbLY > 10000 {
                    pressed_up = true;
                }
                if s.sThumbLY < -10000 {
                    pressed_down = true;
                }
                if s.sThumbLX > 10000 {
                    pressed_right = true;
                }
                if s.sThumbLX < -10000 {
                    pressed_left = true;
                }

                let lb = (b & XINPUT_GAMEPAD_LEFT_SHOULDER.0) != 0;
                let rb = (b & XINPUT_GAMEPAD_RIGHT_SHOULDER.0) != 0;
                if lb && rb && pressed_menu {
                    handle_wakeup(&app);
                }
            } else if let Some(ref mut g) = gilrs {
                while g.next_event().is_some() {}
                if let Some((_, gamepad)) = g.gamepads().next() {
                    let name = gamepad.name().to_lowercase();
                    detected_type = if name.contains("playstation") || name.contains("dual") {
                        ControllerType::PlayStation
                    } else if name.contains("switch") || name.contains("nintendo") {
                        ControllerType::Switch
                    } else {
                        ControllerType::Xbox
                    };

                    if gamepad.is_pressed(Button::South) {
                        pressed_a = true;
                    }
                    if gamepad.is_pressed(Button::East) {
                        pressed_b = true;
                    }
                    if gamepad.is_pressed(Button::Start) {
                        pressed_menu = true;
                    }
                    if gamepad.is_pressed(Button::DPadUp) {
                        pressed_up = true;
                    }
                    if gamepad.is_pressed(Button::DPadDown) {
                        pressed_down = true;
                    }
                }
            }

            let any_button_pressed =
                pressed_a || pressed_b || pressed_up || pressed_down || pressed_left || pressed_right || pressed_menu;

            // Emit Type if changed OR on every button press (to ensure frontend sync)
            if detected_type != current_controller || (any_button_pressed && detected_type != ControllerType::Keyboard)
            {
                current_controller = detected_type;
                let type_str = match current_controller {
                    ControllerType::Xbox => "XBOX",
                    ControllerType::PlayStation => "PLAYSTATION",
                    ControllerType::Switch => "SWITCH",
                    ControllerType::Generic => "GENERIC",
                    ControllerType::Keyboard => "KEYBOARD",
                };
                let _ = app.emit("controller-type-changed", type_str);
            }

            if let Some(win) = app.get_webview_window("main") {
                if win.is_visible().unwrap_or(false) {
                    if btn_a.update(pressed_a) {
                        let _ = win.emit("nav", "CONFIRM");
                    }
                    if btn_b.update(pressed_b) {
                        let _ = win.emit("nav", "BACK");
                    }
                    if btn_up.update(pressed_up) {
                        let _ = win.emit("nav", "UP");
                    }
                    if btn_down.update(pressed_down) {
                        let _ = win.emit("nav", "DOWN");
                    }
                    if btn_left.update(pressed_left) {
                        let _ = win.emit("nav", "LEFT");
                    }
                    if btn_right.update(pressed_right) {
                        let _ = win.emit("nav", "RIGHT");
                    }
                    if btn_menu.update(pressed_menu) {
                        let _ = win.emit("nav", "MENU");
                    }
                }
            }

            thread::sleep(Duration::from_millis(33));
        }
    });
}

fn handle_wakeup<R: Runtime>(app: &AppHandle<R>) {
    if let Some(win) = app.get_webview_window("main") {
        if !win.is_visible().unwrap_or(false) {
            let _ = win.show();
            let _ = win.set_always_on_top(true);
            let _ = win.set_focus();
        }
    }
}
