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

#[allow(clippy::too_many_lines)]
pub fn start_gamepad_listener<R: Runtime>(app: AppHandle<R>) {
    thread::spawn(move || {
        info!("--- BALAM ENGINE: DUAL-CHANNEL NAVIGATION (Rust-Native v3) ---");

        let mut btn_a = ButtonState::new();
        let mut btn_b = ButtonState::new();
        let mut btn_up = ButtonState::new();
        let mut btn_down = ButtonState::new();
        let mut btn_left = ButtonState::new();
        let mut btn_right = ButtonState::new();
        let mut btn_menu = ButtonState::new();
        let mut btn_toggle_overlay = ButtonState::new();

        let mut current_controller = ControllerType::Keyboard;
        let mut gilrs = Gilrs::new().ok();
        let mut keepalive_counter: u32 = 0;

        // Overlay navigation state — tracked entirely in Rust so critical actions
        // (Resume, Back) work even if the WebView renderer is throttled/suspended.
        let mut overlay_focus_idx: i32 = 0; // 0=Resume, 1=QuickSettings, 2=CloseGame
        let mut overlay_confirm_pending = false; // Close Game confirm dialog is open
        let mut overlay_was_visible = false;

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

                // LB+RB+Start: Toggle game overlay (native overlay system)
                // Uses ButtonState to only fire ONCE on press (not every 8ms poll cycle)
                let is_toggle_combo = lb && rb && pressed_menu;
                if btn_toggle_overlay.update(is_toggle_combo) {
                    if let Some(win) = app.get_webview_window("main") {
                        let _ = win.emit("nav", "TOGGLE_OVERLAY");
                    }
                }
                if is_toggle_combo {
                    pressed_menu = false; // Consume to prevent MENU event firing simultaneously
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

            // ── Overlay or Main Window Navigation ────────────────────────────────
            let overlay_win_opt = app.get_webview_window("overlay");
            let overlay_is_visible = overlay_win_opt
                .as_ref()
                .map(|w| w.is_visible().unwrap_or(false))
                .unwrap_or(false);

            // Reset overlay state each time the overlay becomes visible.
            // This ensures focus always starts on Resume when the overlay opens.
            if overlay_is_visible && !overlay_was_visible {
                overlay_focus_idx = 0;
                overlay_confirm_pending = false;
                if let Some(ref ov) = overlay_win_opt {
                    let _ = ov.emit("overlay-focus-changed", 0i32);
                }
            }
            overlay_was_visible = overlay_is_visible;

            if overlay_is_visible {
                // ─── OVERLAY: Rust-Native Navigation ─────────────────────────────
                // Critical actions (Resume, Back) are executed directly from Rust,
                // bypassing WebView JS. This keeps the overlay navigable even when
                // Chromium throttles the renderer due to Windows Occlusion Tracking.
                //
                // Non-critical actions (Quick Settings, Close Game confirmation)
                // still emit events to JS as fallback — they work when JS is alive.
                if let Some(ref ov) = overlay_win_opt {
                    const OVERLAY_ITEMS: i32 = 3; // Resume | QuickSettings | CloseGame

                    // UP: cycle focus upward
                    if btn_up.update(pressed_up) {
                        overlay_focus_idx = if overlay_focus_idx == 0 {
                            OVERLAY_ITEMS - 1
                        } else {
                            overlay_focus_idx - 1
                        };
                        let _ = ov.emit("overlay-focus-changed", overlay_focus_idx);
                    }

                    // DOWN: cycle focus downward
                    if btn_down.update(pressed_down) {
                        overlay_focus_idx = (overlay_focus_idx + 1) % OVERLAY_ITEMS;
                        let _ = ov.emit("overlay-focus-changed", overlay_focus_idx);
                    }

                    // LEFT/RIGHT: forward to JS (confirm dialog & slider navigation)
                    if btn_left.update(pressed_left) {
                        let _ = ov.emit("nav", "LEFT");
                    }
                    if btn_right.update(pressed_right) {
                        let _ = ov.emit("nav", "RIGHT");
                    }

                    // A (CONFIRM)
                    if btn_a.update(pressed_a) {
                        if overlay_confirm_pending {
                            // Confirm dialog is open: forward CONFIRM to JS so the
                            // focused button (Cancel or Close Game) gets .click()ed
                            let _ = ov.emit("nav", "CONFIRM");
                        } else {
                            match overlay_focus_idx {
                                0 => {
                                    // Resume: hide overlay DIRECTLY — no JS needed.
                                    // Critical path: works even when WebView is suspended.
                                    let _ = ov.hide();
                                },
                                1 => {
                                    // Quick Settings: emit to JS (non-critical)
                                    let _ = ov.emit("overlay-action", "OPEN_QUICK_SETTINGS");
                                },
                                2 => {
                                    // Close Game: open confirm dialog via JS (non-critical)
                                    overlay_confirm_pending = true;
                                    let _ = ov.emit("overlay-action", "CLOSE_GAME_REQUEST");
                                },
                                _ => {},
                            }
                        }
                    }

                    // B (BACK): cancel confirm dialog OR hide overlay
                    if btn_b.update(pressed_b) {
                        if overlay_confirm_pending {
                            // Cancel confirm via JS so dialog closes cleanly
                            overlay_confirm_pending = false;
                            let _ = ov.emit("nav", "BACK");
                        } else {
                            // Hide overlay DIRECTLY — critical path, no JS needed.
                            let _ = ov.hide();
                        }
                    }

                    // MENU: same behaviour as B
                    if btn_menu.update(pressed_menu) {
                        if overlay_confirm_pending {
                            overlay_confirm_pending = false;
                            let _ = ov.emit("nav", "BACK");
                        } else {
                            let _ = ov.hide();
                        }
                    }
                }
            } else {
                // ─── MAIN WINDOW: JS-based Navigation ───────────────────────────
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
            }

            // Keepalive: every 5 seconds, execute a no-op in the overlay WebView.
            // WebView2 can suspend JS execution when it detects the window is occluded
            // by a fullscreen game. eval() bypasses that suspension and keeps the
            // event loop alive so Tauri nav events continue to be processed.
            keepalive_counter += 1;
            if keepalive_counter >= 625 {
                keepalive_counter = 0;
                if let Some(overlay) = app.get_webview_window("overlay") {
                    if overlay.is_visible().unwrap_or(false) {
                        let _ = overlay.eval("void 0");
                    }
                }
            }

            thread::sleep(Duration::from_millis(8));
        }
    });
}
