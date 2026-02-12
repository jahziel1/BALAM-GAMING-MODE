# Manual Testing Checklist - Quick Reference

**Purpose:** Practical checklist for manual QA testing
**Time Required:** ~10-15 hours total

---

## Quick Start

1. **Build & Run:**

   ```bash
   npm run dev
   ```

2. **Recommended Setup:**
   - Browser: Chrome/Firefox fullscreen (1920×1080)
   - Controller: Xbox Series X/S (primary)
   - Screen reader: NVDA (optional, for accessibility)

3. **Testing Order:**
   - ✅ Visual Regression (verify design consistency)
   - ✅ Gamepad Navigation (core feature)
   - ✅ Functionality (no regressions)
   - ⚠️ Performance (optional but recommended)
   - ⚠️ Accessibility (WCAG AA compliance)

---

## 1. Visual Regression (~2-3 hours)

### Home/Library

- [ ] Favorite badges are ORANGE (not yellow)
- [ ] Card hover: lifts up + scales + blue glow
- [ ] No hardcoded spacing visible
- [ ] Layout looks professional, not amateur

### InGameMenu (Guide Button)

- [ ] Opens with smooth slide-in
- [ ] Background has glass effect (blurred)
- [ ] Play/Settings/Close buttons have ICONS (not ▶⚙✕ symbols)
- [ ] Hover on buttons: icon scales up, pulses on Play
- [ ] Footer shows ButtonHints (B: Close, A: Select)

### QuickSettings (from InGameMenu)

- [ ] Icons are SVG (Volume2, Sun, Zap, RotateCw - not emojis)
- [ ] Active devices highlighted in ORANGE
- [ ] Glass background effect visible
- [ ] Footer shows ButtonHints

### SettingsPanel (from Sidebar)

- [ ] Active category tab: ORANGE accent (not blue)
- [ ] Icon changes to ORANGE when active
- [ ] All subsections have proper headers (not raw text)
- [ ] Spacing looks consistent throughout

### PowerModal (Power button)

- [ ] Heavy glass background (darker than InGameMenu)
- [ ] Icons size 24px (Lucide, not Unicode)
- [ ] Shutdown: red, Restart: blue, Logout: gray
- [ ] Close button is "X" icon (not ✕ symbol)
- [ ] Centered layout maintained

### WiFiPanel & BluetoothPanel

- [ ] Loading state: gray shimmer placeholders (not spinning icon)
- [ ] Connected items: ORANGE badge
- [ ] Footer shows ButtonHints (R: Refresh)
- [ ] Signal bars color-coded (green/yellow/red)

### SearchOverlay

- [ ] Icons are SVG (Lightbulb, Clock, Search - not emojis 💡🕐🔍)
- [ ] Footer shows ButtonHints
- [ ] No hardcoded spacing

### TopBar

- [ ] Ethernet icon is Lucide Plug (not 🔌 emoji)
- [ ] All icons same size (20px)
- [ ] Notification badge structure exists (even if commented)

### Sidebar

- [ ] Active item: ORANGE accent
- [ ] Username has proper header (not raw h2)

### ErrorBoundary (trigger by breaking code)

- [ ] AlertTriangle icon visible
- [ ] Staggered fade-in animation (icon → title → message → button)
- [ ] Title: "Oops! Something went wrong" (friendly tone)
- [ ] Reload button works

### PerformancePip (if enabled)

- [ ] FPS text is ORANGE
- [ ] Top-right positioning
- [ ] Loading state shows "Connecting..."

---

## 2. Gamepad Navigation (~3-4 hours)

**Controller:** Xbox Series X/S (primary test)

### Core Screens (CRITICAL)

#### Home/Library

- [ ] D-Pad Left/Right: navigate cards smoothly
- [ ] Focus visible: blue glow around card
- [ ] Card auto-scrolls into view
- [ ] A button: launch game
- [ ] No stuck navigation (can loop through)

#### InGameMenu

- [ ] Guide button: opens menu
- [ ] D-Pad Up/Down: navigate buttons
- [ ] Focus visible: blue highlight
- [ ] A button: activates (Resume/Settings/Close)
- [ ] B button: closes menu
- [ ] Icon hover effect on focus

#### QuickSettings

- [ ] D-Pad Up/Down: navigate sections
- [ ] A button: toggle/activate
- [ ] B button: close
- [ ] Sliders: Left/Right adjust values
- [ ] Focus visible throughout

#### SettingsPanel

- [ ] D-Pad Up/Down: navigate categories
- [ ] A button: select category
- [ ] Focus changes tab to ORANGE
- [ ] Within tab: navigate settings
- [ ] B button: close panel

### Secondary Screens (MEDIUM PRIORITY)

#### WiFiPanel

- [ ] D-Pad Up/Down: navigate networks
- [ ] A button: connect
- [ ] R button: refresh scan
- [ ] Focus visible
- [ ] Auto-scroll works

#### BluetoothPanel

- [ ] D-Pad Up/Down: navigate devices
- [ ] A button: pair/connect
- [ ] R button: refresh scan
- [ ] Focus visible

#### PowerModal

- [ ] D-Pad Up/Down: navigate options
- [ ] A button: select action
- [ ] Shows confirmation countdown
- [ ] B button: cancel

#### SearchOverlay

- [ ] D-Pad Up/Down: navigate results
- [ ] A button: launch game
- [ ] Focus visible

### Performance Check

- [ ] All animations run at 60fps (smooth, no stuttering)
- [ ] No input lag (<50ms response)
- [ ] Focus transitions instant (<16ms)

---

## 3. Functionality Regression (~2 hours)

**Goal:** Verify redesign didn't break features

### Game Management

- [ ] Add game manually (FileExplorer)
- [ ] Game card displays correct image/title
- [ ] Toggle favorite (star icon appears ORANGE)
- [ ] Launch game (Play button works)
- [ ] Close game (InGameMenu → Close Game)
- [ ] Game state persists (last played, playtime)

### System Controls

- [ ] Volume slider changes volume (QuickSettings)
- [ ] SystemOSD shows volume indicator
- [ ] Brightness slider changes brightness (QuickSettings)
- [ ] SystemOSD shows brightness indicator
- [ ] TDP slider changes TDP (QuickSettings - if supported)
- [ ] Refresh rate selector works (QuickSettings)

### Network

- [ ] WiFi scan finds networks (WiFiPanel)
- [ ] WiFi connect works (open network)
- [ ] WiFi shows "Connected" badge (ORANGE)
- [ ] Bluetooth scan finds devices (BluetoothPanel)
- [ ] Bluetooth pair works (if device available)
- [ ] Bluetooth shows "Connected" badge (ORANGE)

### Settings

- [ ] Settings categories switch correctly
- [ ] Display tab shows monitor info
- [ ] Performance tab shows metrics (if service running)
- [ ] About tab shows version info
- [ ] Settings persist on restart

### Overlays

- [ ] InGameMenu opens/closes smoothly
- [ ] QuickSettings opens/closes smoothly
- [ ] PowerModal opens/closes smoothly
- [ ] SearchOverlay finds games (fuzzy search)
- [ ] VirtualKeyboard accepts input (if triggered)
- [ ] FileExplorer browses directories

---

## 4. Performance Validation (~1 hour)

**Optional but recommended**

### Setup

1. Open Chrome DevTools (F12)
2. Go to Performance tab
3. Start recording

### Test Scenarios

- [ ] Open/close InGameMenu (5 times) - check FPS stays 60
- [ ] Navigate carousel (20+ cards) - check for dropped frames
- [ ] Open/close QuickSettings (5 times) - check smooth transitions
- [ ] Hover over 10 cards rapidly - check smooth scale animation
- [ ] Open/close PowerModal (5 times) - check glassmorphism performance
- [ ] Scroll WiFi networks (if 10+ networks) - check smooth scroll

### Analyze

- [ ] Frame rate graph flat at 60fps (green line)
- [ ] No red bars (dropped frames)
- [ ] Interaction latency <50ms
- [ ] GPU usage reasonable (<50% on integrated)

---

## 5. Accessibility (~1-2 hours)

**Optional - WCAG AA compliance**

### Screen Reader (NVDA - free download)

- [ ] Install NVDA from https://www.nvaccess.org/
- [ ] Start NVDA (Ctrl+Alt+N)
- [ ] Navigate app with Tab key only
- [ ] OverlayPanel announces title when opened
- [ ] Buttons announce accessible names
- [ ] StatusIndicator announces status + text
- [ ] Focus order makes sense (logical flow)

### Color Contrast

- [ ] Use WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- [ ] Test Blue (#2d73ff) on dark background - should be ≥4.5:1
- [ ] Test Orange (#ff6b35) on dark background - should be ≥4.5:1
- [ ] Test white text on orange buttons - should be ≥4.5:1
- [ ] Test gray text (#888) on dark - may need adjustment if <4.5:1

### Keyboard-Only

- [ ] Tab navigates all interactive elements
- [ ] Enter/Space activates buttons
- [ ] Escape closes overlays
- [ ] Arrow keys navigate lists
- [ ] No keyboard traps (can exit everything)
- [ ] Focus visible on all elements (never invisible)

---

## Quick Acceptance Criteria

### Visual

- ✅ Feels like "one product" (not fragmented)
- ✅ Orange accent visible where expected (favorites, active states, notifications)
- ✅ Blue for primary actions (Play, OK, Confirm)
- ✅ No emojis visible (all replaced with Lucide icons)
- ✅ No Unicode symbols (▶⚙✕ replaced with SVG icons)
- ✅ Glassmorphism on InGameMenu and PowerModal
- ✅ Spacing looks consistent (no cramped/uneven areas)
- ✅ Professional and polished (not amateur)

### Gamepad

- ✅ Xbox controller works perfectly (primary)
- ✅ Focus always visible (blue/orange glow)
- ✅ Navigation smooth and predictable
- ✅ No stuck navigation or focus traps
- ✅ 60fps during all interactions

### Functionality

- ✅ All features work as before redesign
- ✅ No crashes or errors
- ✅ Game launch/close works
- ✅ Settings persist
- ✅ Network panels functional

---

## Issue Reporting Template

If you find issues, document them like this:

```markdown
## Issue: [Brief description]

**Screen:** [Home/InGameMenu/QuickSettings/etc.]
**Priority:** [High/Medium/Low]
**Type:** [Visual/Functional/Performance/Accessibility]

**Steps to Reproduce:**

1. Open [screen]
2. Do [action]
3. Observe [issue]

**Expected:**
[What should happen]

**Actual:**
[What actually happens]

**Screenshot/Video:**
[If applicable]
```

---

## Completion Checklist

- [ ] Visual Regression (14 screens)
- [ ] Gamepad Navigation (Xbox controller minimum)
- [ ] Functionality Regression (core features)
- [ ] Performance Validation (optional)
- [ ] Accessibility (optional but recommended)

**Time Spent:** **\_** hours
**Issues Found:** **\_** (document separately)
**Overall Impression:** Professional / Good / Needs Work

---

**Happy Testing!** 🎮✨
