# Gamepad Testing Guide - Phase 5.3

**Purpose:** Validate gamepad navigation across all controllers before redesign completion.

---

## Test Equipment

### Required Controllers

1. **Xbox Series X/S Controller** (or Xbox One)
2. **PlayStation 5 DualSense** (or PS4 DualShock)
3. **Nintendo Switch Pro Controller**
4. **Generic DirectInput Gamepad** (e.g., 8BitDo, Logitech)

### Test Environment

- **Windows 11** (primary target OS)
- **Display:** 1920×1080 or 1280×800 (Steam Deck resolution)
- **Input latency measurement tool:** (optional) High-speed camera or USB latency tester

---

## Test Scenarios

### 1. D-Pad Navigation (All 12 Overlays)

**Goal:** Verify D-Pad navigation works consistently across all overlays.

**Steps:**

1. Launch Balam Console Experience
2. For each overlay (list below), perform:
   - Press D-Pad Up/Down to navigate menu items
   - Press D-Pad Left/Right to adjust sliders/tabs
   - Verify focus state visible (2px border + glow + translateX(8px))
   - Verify no skipped items or stuck navigation

**Overlays to Test:**

| #   | Overlay           | Hotkey       | Test Focus                               |
| --- | ----------------- | ------------ | ---------------------------------------- |
| 1   | InGameMenu        | Home         | Menu items (Resume, Settings, Quit)      |
| 2   | QuickSettings     | F10          | Service cards, sliders                   |
| 3   | SettingsPanel     | F11          | Tab navigation, toggles                  |
| 4   | PowerModal        | Ctrl+Alt+Del | Power options (Shutdown, Restart, Sleep) |
| 5   | BluetoothPanel    | -            | Device list                              |
| 6   | WiFiPanel         | -            | Network list                             |
| 7   | VirtualKeyboard   | -            | Key focus                                |
| 8   | SystemOSD         | -            | Volume/brightness sliders                |
| 9   | NotificationPanel | -            | Notification list                        |
| 10  | PerformancePip    | F9           | Detail level cycling                     |
| 11  | GameLibrary       | -            | Game cards, filters                      |
| 12  | Sidebar           | -            | Navigation items                         |

**Pass Criteria:**

- [ ] D-Pad navigation works in all 12 overlays
- [ ] No stuck navigation or skipped items
- [ ] Focus state clearly visible (translateX animation smooth)

---

### 2. Button Mappings

**Goal:** Verify correct button mappings across controller types.

**Test Matrix:**

| Action          | Xbox       | PlayStation      | Switch    | Generic  |
| --------------- | ---------- | ---------------- | --------- | -------- |
| **Confirm**     | A (green)  | Cross (blue)     | B (green) | Button 0 |
| **Cancel**      | B (red)    | Circle (red)     | A (red)   | Button 1 |
| **Menu**        | X (blue)   | Square (pink)    | Y (green) | Button 2 |
| **Action**      | Y (yellow) | Triangle (green) | X (blue)  | Button 3 |
| **Prev Tab**    | LB         | L1               | L         | Button 4 |
| **Next Tab**    | RB         | R1               | R         | Button 5 |
| **Scroll Up**   | LT         | L2               | ZL        | Button 6 |
| **Scroll Down** | RT         | R2               | ZR        | Button 7 |
| **Home**        | Guide      | PS               | Home      | -        |
| **Back**        | View       | Share            | Minus     | Button 8 |
| **Start**       | Menu       | Options          | Plus      | Button 9 |

**Steps:**

1. Connect each controller
2. Open InGameMenu (Home button or F10)
3. Test each button action
4. Verify ButtonHint component shows correct colors:
   - Xbox A = Green, B = Red, X = Blue, Y = Yellow
   - PS Cross = Blue, Circle = Red, Square = Pink, Triangle = Green
   - Switch B = Green, A = Red, Y = Green, X = Blue

**Pass Criteria:**

- [ ] All button mappings work correctly
- [ ] ButtonHint displays correct button colors
- [ ] No incorrect button responses

---

### 3. Analog Stick Precision

**Goal:** Verify smooth scrolling with analog sticks.

**Steps:**

1. Open Game Library with 100+ games
2. Use **Left Stick** to scroll through library
3. Verify:
   - Smooth scrolling (60fps constant)
   - Proportional speed (faster push = faster scroll)
   - Dead zone responsive (no drift)
   - No jank or stuttering

4. Use **Right Stick** (if mapped) to adjust sliders
5. Verify precise control of Quick Settings sliders

**Pass Criteria:**

- [ ] Smooth 60fps scrolling
- [ ] Proportional analog input
- [ ] No drift or dead zone issues

---

### 4. Input Latency Measurements

**Goal:** Measure button press to UI response latency.

**Method 1: High-Speed Camera (240fps+)**

1. Record button press and screen change
2. Count frames between press and UI response
3. Calculate latency: `frames / 240fps * 1000ms`

**Method 2: Stopwatch + Manual Timing**

1. Press button 10 times, average response time
2. Use smartphone slow-motion camera if available

**Target Metrics:**

| Metric                      | Target                  | Acceptable       | Fail   |
| --------------------------- | ----------------------- | ---------------- | ------ |
| Button press to UI response | <50ms                   | <100ms           | ≥100ms |
| D-Pad navigation            | <30ms                   | <50ms            | ≥50ms  |
| Focus state visual feedback | <16ms (1 frame @ 60fps) | <33ms (2 frames) | ≥33ms  |

**Pass Criteria:**

- [ ] Button latency <50ms
- [ ] D-Pad latency <30ms
- [ ] Focus visual <16ms

---

### 5. Focus State Visibility (10-Foot UI Test)

**Goal:** Ensure focus states are visible from couch distance.

**Setup:**

1. Connect Windows PC to TV (55" or larger)
2. Sit 10 feet away from screen
3. Use gamepad to navigate

**Test:**

1. Navigate through Game Library
2. Navigate through InGameMenu
3. Navigate through Quick Settings

**Verify:**

- [ ] Focus border (2px blue) clearly visible
- [ ] Focus glow effect visible
- [ ] TranslateX(8px) animation noticeable
- [ ] Selected card scale(1.08) visible

**Pass Criteria:**

- [ ] All focus states visible at 10-foot distance
- [ ] No confusion about which item is focused

---

### 6. Rapid Input Handling

**Goal:** Test responsiveness under rapid input.

**Steps:**

1. Open Game Library
2. Rapidly press D-Pad Down 20 times
3. Verify:
   - No stuck focus
   - No skipped items
   - Focus moves smoothly
   - No UI freezing

4. Rapidly toggle Quick Settings sliders
5. Verify smooth updates, no lag

**Pass Criteria:**

- [ ] Rapid input handled smoothly
- [ ] No UI freezing or stuck states
- [ ] Focus updates correctly

---

### 7. Multi-Controller Switching

**Goal:** Verify controller hot-swapping works.

**Steps:**

1. Connect Xbox controller
2. Navigate menu, confirm working
3. Unplug Xbox controller, plug PlayStation controller
4. Continue navigation
5. Verify ButtonHint updates to show PlayStation buttons

**Pass Criteria:**

- [ ] Controller hot-swap works
- [ ] ButtonHint updates correctly
- [ ] No navigation interruption

---

## Test Results Template

```markdown
## Gamepad Testing Results

**Date:** [YYYY-MM-DD]
**Tester:** [Name]
**Build:** [Git commit hash]

### Test Results

| Controller       | D-Pad Nav | Button Map | Analog | Latency | Focus Visible | Rapid Input | Multi-Switch | Status    |
| ---------------- | --------- | ---------- | ------ | ------- | ------------- | ----------- | ------------ | --------- |
| Xbox Series      | ✅/❌     | ✅/❌      | ✅/❌  | ✅/❌   | ✅/❌         | ✅/❌       | ✅/❌        | Pass/Fail |
| PS5 DualSense    | ✅/❌     | ✅/❌      | ✅/❌  | ✅/❌   | ✅/❌         | ✅/❌       | ✅/❌        | Pass/Fail |
| Switch Pro       | ✅/❌     | ✅/❌      | ✅/❌  | ✅/❌   | ✅/❌         | ✅/❌       | ✅/❌        | Pass/Fail |
| Generic (8BitDo) | ✅/❌     | ✅/❌      | ✅/❌  | ✅/❌   | ✅/❌         | ✅/❌       | ✅/❌        | Pass/Fail |

### Latency Measurements

| Controller    | Button Press | D-Pad Nav | Focus Visual |
| ------------- | ------------ | --------- | ------------ |
| Xbox Series   | [X]ms        | [X]ms     | [X]ms        |
| PS5 DualSense | [X]ms        | [X]ms     | [X]ms        |
| Switch Pro    | [X]ms        | [X]ms     | [X]ms        |
| Generic       | [X]ms        | [X]ms     | [X]ms        |

### Issues Found

1. [Issue description]
   - **Severity:** Critical / High / Medium / Low
   - **Reproduction:** [Steps to reproduce]
   - **Expected:** [Expected behavior]
   - **Actual:** [Actual behavior]

### Overall Status

- [ ] **PASS** - All controllers work correctly
- [ ] **FAIL** - Critical issues found, requires fixes

**Recommendation:** [Proceed to Phase 5.4 / Fix issues before continuing]
```

---

## Known Issues & Workarounds

### Issue 1: Generic Controllers Not Detected

**Problem:** DirectInput controllers may not be recognized by Windows.

**Workaround:**

1. Install x360ce (Xbox 360 Controller Emulator)
2. Map DirectInput to XInput

### Issue 2: ButtonHint Colors Incorrect

**Problem:** Button colors don't match physical controller.

**Solution:**

- Check `ButtonHint.tsx` controller detection logic
- Verify `controllerType` state in global store

### Issue 3: Focus State Not Visible on OLED

**Problem:** Dark theme makes focus hard to see on OLED screens.

**Solution:**

- Increase focus glow opacity in design tokens
- Test on both LCD and OLED displays

---

## Conclusion

Complete all test scenarios with all 4 controller types before marking Phase 5.3 as complete. Document any issues in the test results template and file bug reports if needed.

**Next Phase:** Phase 5.4 (Accessibility Validation)
