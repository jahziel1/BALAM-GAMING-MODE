# Accessibility Validation Guide - Phase 5.4

**Purpose:** Ensure WCAG 2.1 Level AA compliance before redesign completion.

**Target:** WCAG 2.1 AA compliance (≥95% Lighthouse Accessibility score)

---

## Automated Testing

### 1. Lighthouse Audit

**Goal:** Baseline accessibility score ≥95.

**Steps:**

1. **Build production version:**

   ```bash
   cd console-experience
   npm run build
   ```

2. **Serve production build:**

   ```bash
   npx serve dist -p 5000
   ```

3. **Run Lighthouse audit:**
   - Open Chrome DevTools (F12)
   - Go to Lighthouse tab
   - Select "Accessibility" only
   - Click "Generate report"

**Target Scores:**

| Category          | Target | Minimum | Notes                               |
| ----------------- | ------ | ------- | ----------------------------------- |
| **Accessibility** | ≥95    | ≥90     | WCAG 2.1 AA baseline                |
| Performance       | ≥90    | ≥85     | Bonus (already tested in Phase 5.2) |
| Best Practices    | ≥90    | ≥85     | Bonus                               |

**Common Issues to Fix:**

- Missing `aria-labels` on buttons
- Missing `alt` text on images
- Color contrast < 4.5:1
- Missing focus indicators
- Incorrect heading hierarchy

**Pass Criteria:**

- [ ] Lighthouse Accessibility score ≥95
- [ ] All critical issues resolved
- [ ] No high-severity warnings

---

### 2. Axe DevTools (Browser Extension)

**Installation:**

```bash
# Chrome/Edge
# Install from: https://www.deque.com/axe/devtools/
```

**Steps:**

1. Install Axe DevTools browser extension
2. Launch Balam Console Experience
3. Open DevTools → Axe tab
4. Click "Scan All of My Page"
5. Review and fix all "Critical" and "Serious" issues

**Issue Categories:**

| Severity     | Action Required                |
| ------------ | ------------------------------ |
| **Critical** | Must fix before release        |
| **Serious**  | Should fix before release      |
| **Moderate** | Consider fixing (nice-to-have) |
| **Minor**    | Optional (cosmetic)            |

**Pass Criteria:**

- [ ] Zero critical issues
- [ ] Zero serious issues
- [ ] Moderate issues documented (if any)

---

## Screen Reader Testing

### 3. NVDA (Windows)

**Installation:**

```bash
# Download from: https://www.nvaccess.org/download/
```

**Test Scenarios:**

#### 3.1 Navigation Announcement

**Goal:** All focusable elements announce correctly.

**Steps:**

1. Launch NVDA (Ctrl+Alt+N)
2. Launch Balam Console Experience
3. Tab through Game Library
4. Verify announcements:
   - "Game title, button, 1 of 100"
   - "Settings, button"
   - "Quick Settings, button, expanded/collapsed"

**Pass Criteria:**

- [ ] All buttons announce role and label
- [ ] List items announce position (1 of N)
- [ ] Toggles announce state (on/off, checked/unchecked)
- [ ] Overlays announce modal state

#### 3.2 Overlay Navigation

**Steps:**

1. Open InGameMenu (Home or F10)
2. Tab through menu items
3. Verify announcements:
   - "Resume Game, button"
   - "Settings, button"
   - "Quit to Desktop, button"

4. Press Escape to close
5. Verify: "Closed InGameMenu dialog"

**Pass Criteria:**

- [ ] Overlay role announced ("dialog", "modal")
- [ ] Focus trapped correctly (Tab cycles within overlay)
- [ ] Escape closes overlay and announces closure

#### 3.3 Form Controls

**Steps:**

1. Open Quick Settings
2. Navigate to Volume slider
3. Verify announcement: "Volume, slider, 50%"
4. Press Right Arrow to adjust
5. Verify: "Volume, slider, 55%"

**Pass Criteria:**

- [ ] Sliders announce current value
- [ ] Value updates announced on change
- [ ] Min/max values announced
- [ ] Toggles announce checked/unchecked state

---

### 4. Narrator (Windows Built-in)

**Activation:**

```bash
# Press: Windows + Ctrl + Enter
```

**Goal:** Verify Narrator compatibility (alternative to NVDA).

**Test:**

1. Enable Narrator
2. Navigate Game Library with Tab
3. Verify similar announcements to NVDA

**Pass Criteria:**

- [ ] Narrator announces elements correctly
- [ ] No missing labels
- [ ] No redundant announcements

---

## Keyboard Navigation

### 5. Keyboard-Only Navigation

**Goal:** All features accessible without mouse/gamepad.

**Test Scenarios:**

#### 5.1 Tab Order

**Steps:**

1. Launch app
2. Press Tab repeatedly
3. Verify logical tab order:
   - Sidebar → Game Library → Quick Actions → Overlays
4. Press Shift+Tab to reverse
5. Verify reverse order correct

**Pass Criteria:**

- [ ] Tab order logical (left-to-right, top-to-bottom)
- [ ] No tab traps (except modal dialogs)
- [ ] All interactive elements reachable

#### 5.2 Arrow Key Navigation

**Steps:**

1. Open Game Library
2. Tab to first game card
3. Use Arrow keys to navigate:
   - Down Arrow → Next game
   - Up Arrow → Previous game
   - Right Arrow → Next column (if grid)
   - Left Arrow → Previous column

**Pass Criteria:**

- [ ] Arrow keys navigate lists/grids
- [ ] Focus visible at all times
- [ ] Wrapping behavior correct (end → start)

#### 5.3 Modal Dialogs

**Steps:**

1. Open InGameMenu (F10)
2. Verify:
   - Focus trapped inside modal
   - Tab cycles through modal items only
   - Escape closes modal
   - Focus returns to trigger element

**Pass Criteria:**

- [ ] Focus trapped correctly
- [ ] Escape closes modal
- [ ] Focus restoration works

---

## Color Contrast Validation

### 6. Color Contrast Checker

**Tool:** [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

**Test Cases:**

| Element            | Foreground            | Background        | Ratio | Target            | Pass? |
| ------------------ | --------------------- | ----------------- | ----- | ----------------- | ----- |
| **Primary Text**   | #ffffff               | #0f0f0f           | ?     | ≥4.5:1            | ✅/❌ |
| **Secondary Text** | rgba(255,255,255,0.8) | #0f0f0f           | ?     | ≥4.5:1            | ✅/❌ |
| **Primary Button** | #ffffff               | #2d73ff           | ?     | ≥4.5:1            | ✅/❌ |
| **Accent Text**    | #ff6b35               | #0f0f0f           | ?     | ≥3:1 (large text) | ✅/❌ |
| **Focus Border**   | #2d73ff               | #0f0f0f           | ?     | ≥3:1              | ✅/❌ |
| **Badge Text**     | #ffffff               | #4ade80 (success) | ?     | ≥4.5:1            | ✅/❌ |

**Pass Criteria:**

- [ ] All normal text ≥4.5:1 contrast
- [ ] Large text (18px+ or 14px+ bold) ≥3:1 contrast
- [ ] UI components ≥3:1 contrast

---

## Semantic HTML Validation

### 7. HTML Structure Audit

**Goal:** Verify proper use of semantic HTML.

**Checklist:**

#### 7.1 Heading Hierarchy

- [ ] Only one `<h1>` per page (or none)
- [ ] No skipped heading levels (h1 → h3)
- [ ] Headings used for structure, not styling
- [ ] SectionHeader component uses correct levels

**Example Hierarchy:**

```
<main>
  <h2>Game Library</h2>          <!-- SectionHeader level={2} -->
    <h3>Recently Played</h3>      <!-- SectionHeader level={3} -->
    <h3>Favorites</h3>            <!-- SectionHeader level={3} -->
  <h2>Settings</h2>               <!-- SectionHeader level={2} -->
    <h3>Performance</h3>          <!-- SectionHeader level={3} -->
    <h3>Display</h3>              <!-- SectionHeader level={3} -->
</main>
```

#### 7.2 ARIA Roles

- [ ] Overlays have `role="dialog"` + `aria-modal="true"`
- [ ] Buttons have `aria-label` if no visible text
- [ ] Lists use `<ul>`, `<ol>`, or `role="list"`
- [ ] Tabs use `role="tablist"`, `role="tab"`, `role="tabpanel"`

#### 7.3 Form Labels

- [ ] All inputs have associated `<label>` or `aria-label`
- [ ] Sliders have `aria-valuemin`, `aria-valuemax`, `aria-valuenow`
- [ ] Checkboxes/radios use `<input>` + `<label>` correctly
- [ ] Required fields have `aria-required="true"`

---

## Focus Management

### 8. Focus States

**Goal:** Verify visible and consistent focus indicators.

**Test:**

1. Tab through all interactive elements
2. Verify focus visible:
   - 2px solid border (--color-primary)
   - Box shadow glow (focus-glow)
   - Transform translateX(8px) on SelectableItem
   - Scale(1.08) + translateY(-10px) on Cards

**Pass Criteria:**

- [ ] All focusable elements have visible focus
- [ ] Focus indicator ≥2px thick
- [ ] Focus color contrasts with background (≥3:1)
- [ ] Focus states consistent across components

---

## Reduced Motion Support

### 9. prefers-reduced-motion

**Goal:** Respect user motion preferences.

**Test:**

1. **Enable reduced motion:**
   - Windows: Settings → Accessibility → Visual Effects → Animation effects OFF
   - Or: Chrome DevTools → Rendering → Emulate prefers-reduced-motion: reduce

2. **Verify:**
   - Card focus animations disabled/simplified
   - Overlay slide-in instant or fade only
   - No translateX animations
   - No scale/rotate animations

**Pass Criteria:**

- [ ] `prefers-reduced-motion: reduce` media query implemented
- [ ] All decorative animations disabled
- [ ] Essential animations (focus) simplified
- [ ] No motion sickness triggers

---

## Test Results Template

```markdown
## Accessibility Validation Results

**Date:** [YYYY-MM-DD]
**Tester:** [Name]
**Build:** [Git commit hash]

### Automated Testing

| Tool                     | Score   | Issues                    | Status    |
| ------------------------ | ------- | ------------------------- | --------- |
| Lighthouse Accessibility | [X]/100 | [N] critical, [N] serious | Pass/Fail |
| Axe DevTools             | -       | [N] critical, [N] serious | Pass/Fail |

### Screen Reader Testing

| Screen Reader | Navigation | Overlays | Forms | Status    |
| ------------- | ---------- | -------- | ----- | --------- |
| NVDA          | ✅/❌      | ✅/❌    | ✅/❌ | Pass/Fail |
| Narrator      | ✅/❌      | ✅/❌    | ✅/❌ | Pass/Fail |

### Keyboard Navigation

| Test              | Result | Issues        |
| ----------------- | ------ | ------------- |
| Tab Order         | ✅/❌  | [Description] |
| Arrow Navigation  | ✅/❌  | [Description] |
| Modal Focus Trap  | ✅/❌  | [Description] |
| Focus Restoration | ✅/❌  | [Description] |

### Color Contrast

| Element        | Ratio | Target | Pass? |
| -------------- | ----- | ------ | ----- |
| Primary Text   | [X]:1 | 4.5:1  | ✅/❌ |
| Secondary Text | [X]:1 | 4.5:1  | ✅/❌ |
| Button Text    | [X]:1 | 4.5:1  | ✅/❌ |
| Focus Border   | [X]:1 | 3:1    | ✅/❌ |

### Semantic HTML

- [ ] Heading hierarchy correct
- [ ] ARIA roles appropriate
- [ ] Form labels present
- [ ] Landmarks used (`<main>`, `<nav>`, etc.)

### Focus Management

- [ ] All focusable elements have visible focus
- [ ] Focus indicator ≥2px thick
- [ ] Focus color contrast ≥3:1
- [ ] Consistent focus styles

### Reduced Motion

- [ ] `prefers-reduced-motion` media query implemented
- [ ] Animations disabled/simplified correctly

### Issues Found

1. [Issue description]
   - **WCAG Criterion:** [1.4.3 Contrast, 2.1.1 Keyboard, etc.]
   - **Severity:** Critical / High / Medium / Low
   - **Reproduction:** [Steps]
   - **Fix:** [Solution]

### Overall Status

- [ ] **PASS** - WCAG 2.1 AA compliant (≥95% score)
- [ ] **FAIL** - Critical issues found, requires fixes

**Lighthouse Score:** [X]/100
**Recommendation:** [Release / Fix issues before release]
```

---

## Common Fixes

### Fix 1: Missing aria-label

**Problem:** Buttons without visible text lack labels.

**Solution:**

```tsx
<button aria-label="Close settings">
  <X size={20} />
</button>
```

### Fix 2: Low Color Contrast

**Problem:** Text color contrast < 4.5:1.

**Solution:**

- Increase text opacity
- Darken/lighten background
- Use design tokens with correct contrast

### Fix 3: Missing Focus State

**Problem:** Custom elements don't show focus.

**Solution:**

```css
.custom-button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  box-shadow: var(--focus-glow);
}
```

### Fix 4: Incorrect Heading Order

**Problem:** Skipped heading levels (h1 → h3).

**Solution:**

- Use SectionHeader with correct `level` prop
- Audit heading hierarchy in components

---

## Conclusion

Complete all validation steps and achieve ≥95% Lighthouse Accessibility score before marking Phase 5.4 as complete. Document any issues and file bug reports if needed.

**Final Phase:** Once Phases 5.3 and 5.4 pass, the frontend redesign is complete!

**Next Steps:**

1. User acceptance testing
2. Beta release
3. Production deployment
