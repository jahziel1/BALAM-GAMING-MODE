# Balam Design System

**Version:** 2.0
**Last Updated:** 2026-02-12
**Status:** Foundation Complete

## Overview

This document defines the unified visual language for the Balam Console Experience. All components must follow these standards to ensure consistency and cohesiveness across the entire application.

---

## 1. Layout Grid System

### Container Widths (Overlays)

```css
/* Standard overlay sizes */
--overlay-width-small: 450px; /* WiFi, Bluetooth */
--overlay-width-medium: 500px; /* QuickSettings */
--overlay-width-large: 900px; /* Settings */
--overlay-width-full: 100vw; /* Search, Keyboard, Power Modal */
```

### Layout Patterns

#### Pattern A: Standard Overlay (OverlayPanel)

```
┌─────────────────────┐
│ Header + Close [×]  │ ← 60px height, var(--space-8) padding
├─────────────────────┤
│                     │
│   Content Area      │ ← var(--space-8) padding
│   (scrollable)      │
│                     │
├─────────────────────┤
│ Footer (ButtonHint) │ ← 50px height
└─────────────────────┘
```

**Used by:** QuickSettings, SettingsPanel, WiFi, Bluetooth
**Spacing:** Consistent `--space-8` (32px) padding

**Implementation:**

```tsx
<OverlayPanel isOpen={isOpen} onClose={onClose} title="Panel Title" width="medium">
  <section>
    <SectionHeader level={3}>Section Title</SectionHeader>
    {content}
  </section>
</OverlayPanel>
```

#### Pattern B: Hero Layout (Home)

```
┌─────────────────────────────────┐
│                                 │
│        Hero Section             │ ← 45vh, large padding
│    (Game Title + Actions)       │
│                                 │
├─────────────────────────────────┤
│   Game Cards (Horizontal)       │ ← 40vh, carousel
└─────────────────────────────────┘
```

**Unique for:** Home screen only
**Spacing:** Custom large padding (48/64px)

#### Pattern C: Mini Overlays

Fixed position, small size, minimal content:

- **SystemOSD:** Volume/Brightness indicator
- **PerformancePip:** FPS counter

**Spacing:** Minimal, component-specific

### Estandarización Reglas:

- ✅ All overlays use Pattern A (OverlayPanel)
- ✅ Hero maintains Pattern B (unique)
- ✅ Mini overlays standardize positioning

---

## 2. Icon System

### Sizes (Standardized)

```typescript
export const ICON_SIZES = {
  xs: 12, // Micro labels (rarely used)
  sm: 16, // Badges, chips
  md: 20, // Standard UI, status bar
  lg: 24, // Buttons, actions, overlays
  xl: 32, // Large components, empty states
  xxl: 64, // Hero displays, about page
};
```

### Usage Guidelines

| Element           | Size       | Example                      |
| ----------------- | ---------- | ---------------------------- |
| Status bar icons  | md (20px)  | TopBar WiFi, Battery, Volume |
| Button icons      | lg (24px)  | Play, Settings, Close        |
| Badge icons       | sm (16px)  | Favorite star in card corner |
| Empty state icons | xl (32px)  | "No devices found"           |
| Hero logos        | xxl (64px) | Settings About page          |

### Icon Replacements (Emoji → Lucide)

**DO NOT use emojis. Use Lucide icons instead:**

| Old Emoji | New Lucide Icon | Component          |
| --------- | --------------- | ------------------ |
| 🔊        | `Volume2`       | QuickSettings      |
| ☀️        | `Sun`           | QuickSettings      |
| ⚡        | `Zap`           | QuickSettings, TDP |
| 🔄        | `RotateCw`      | Refresh actions    |
| 🕐        | `Clock`         | Recent items       |
| 💡        | `Lightbulb`     | Hints              |
| 🔍        | `Search`        | Search overlay     |
| 🔌        | `Plug`          | Ethernet           |

### Icon Wrapper Component

**ALWAYS use IconWrapper when rendering icons:**

```tsx
import { IconWrapper } from '@/components/core/IconWrapper';
import { Settings } from 'lucide-react';

// Standard usage
<IconWrapper size="md">
  <Settings />
</IconWrapper>

// With color
<IconWrapper size="lg" color="accent">
  <Volume2 />
</IconWrapper>
```

---

## 3. Spacing Scale (8-Point Grid)

### Base Scale

```css
--space-0: 0 /* No spacing */ --space-1: 4px /* Extra-tight, borders */ --space-2: 8px
  /* Tight, small UI */ --space-3: 12px /* Small gaps */ --space-4: 16px /* Standard (DEFAULT) */
  --space-5: 20px /* Medium */ --space-6: 24px /* Medium-large */ --space-8: 32px
  /* Large, panel padding */ --space-10: 40px /* Extra-large */ --space-12: 48px
  /* Huge, hero spacing */;
```

### Component Defaults

```css
--button-padding: var(--space-3) var(--space-4) /* 12px 16px */ --card-padding: var(--space-4)
  /* 16px all sides */ --panel-padding: var(--space-8) /* 32px for overlays */
  --section-gap: var(--space-6) /* 24px between sections */ --item-gap: var(--space-4)
  /* 16px between items */ --small-gap: var(--space-2) /* 8px for tight groups */;
```

### RULES:

- ❌ **NEVER** use: `5px`, `6px`, `10px`, `15px`, `30px` directly
- ✅ **ALWAYS** use tokens: `var(--space-X)`
- ✅ If you need 2×: `calc(2 * var(--space-4))` = 32px
- ✅ If you need 3×: `calc(3 * var(--space-2))` = 24px

### Migration Examples:

```css
/* BEFORE - Bad */
padding: 10px;
gap: 15px;
margin: 30px;

/* AFTER - Good */
padding: var(--space-2);
gap: var(--space-4);
margin: var(--space-8);
```

---

## 4. Color Palette

### Brand Colors

```css
--color-primary: #2d73ff /* Blue - Primary actions */ --color-accent: #ff6b35
  /* Orange - Secondary/Active */;
```

### Color Usage Guidelines

| Element               | Color            | Rationale             | Example                     |
| --------------------- | ---------------- | --------------------- | --------------------------- |
| **PRIMARY ACTIONS**   | Blue (#2d73ff)   | Main CTAs             | Play, Resume, OK            |
| **SECONDARY ACTIONS** | Orange (#ff6b35) | Options, settings     | Settings, Options           |
| **ACTIVE STATES**     | Orange           | Currently selected    | Active tabs, selected items |
| **FAVORITES**         | Orange           | User-marked favorites | Star badge on cards         |
| **NOTIFICATIONS**     | Orange           | Attention-grabbing    | Unread badge                |
| **FPS DISPLAY**       | Orange           | Performance metric    | PerformancePip FPS          |
| **WARNINGS**          | Orange/Yellow    | Caution states        | Warning toasts              |

### Decision Matrix: Blue vs Orange

**Use Blue when:**

- Primary call-to-action (Play, Resume, Confirm)
- Primary focus states (gamepad navigation)
- System metrics (CPU/GPU in PiP)
- Progress bars, sliders

**Use Orange when:**

- Secondary actions (Settings, Options, Info)
- Active/selected states (tabs, items)
- Favorites and bookmarks
- Notifications and badges
- FPS/performance displays
- Warning states (not errors - those are red)

**Mental Model:**

```
Blue = "DO THIS" (primary action)
Orange = "LOOK HERE" (active, important, secondary)
```

---

## 5. Typography Hierarchy

### Heading Sizes

```css
--font-4xl: 2.25rem (36px) /* Hero titles */ --font-3xl: 1.875rem (30px) /* Page titles */
  --font-2xl: 1.5rem (24px) /* Panel titles */ --font-xl: 1.25rem (20px) /* Section headers */
  --font-lg: 1.125rem (18px) /* Emphasized text */ --font-base: 1rem (16px) /* Body */
  --font-sm: 0.875rem (14px) /* Small text */ --font-xs: 0.75rem (12px) /* Captions, badges */;
```

### Component Usage

| Element              | Font Size            | Weight   | Example                 |
| -------------------- | -------------------- | -------- | ----------------------- |
| Panel titles (h2)    | `--font-2xl` (24px)  | Bold     | Settings, QuickSettings |
| Section headers (h3) | `--font-xl` (20px)   | Bold     | Performance, Display    |
| Subsections (h4)     | `--font-lg` (18px)   | Semibold | Frame Rate, Resolution  |
| Body text            | `--font-base` (16px) | Regular  | Descriptions, labels    |
| Badges/labels        | `--font-xs` (12px)   | Semibold | Tags, status            |

### Font Families

```css
--font-body: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
--font-heading: 'Rajdhani', sans-serif;
--font-mono: 'Consolas', 'Monaco', monospace;
```

---

## 6. Component Standards

### Button Placement Rules

```
┌─────────────────────────┐
│ Header                  │
├─────────────────────────┤
│                         │
│ Content                 │
│   ┌─────────────────┐   │ ← Inline secondary
│   │ Quick Action    │   │    actions
│   └─────────────────┘   │
│                         │
├─────────────────────────┤
│ ┌─────┐  ┌─────────┐   │ ← Primary actions
│ │ OK  │  │ Cancel  │   │    in footer
│ └─────┘  └─────────┘   │
└─────────────────────────┘
```

**Rules:**

- **Primary actions** → Panel footer (bottom)
- **Secondary actions** → Inline with content
- **Tertiary actions** → Context menus
- **Close button** → Panel header (top-right, auto by OverlayPanel)

### Header Usage

**DO:**

```tsx
// Use OverlayPanel title prop
<OverlayPanel title="Settings" />

// Use SectionHeader for subsections
<section>
  <SectionHeader level={3}>Performance</SectionHeader>
  {content}
</section>
```

**DON'T:**

```tsx
// ❌ Raw h1/h2/h3 tags
<h2>Settings</h2>
<h3>Performance</h3>
```

### Modal/Overlay Structure

```tsx
<OverlayPanel
  isOpen={isOpen}
  onClose={onClose}
  title="Panel Title" // ← Always present
  width="medium" // ← small | medium | large
  showFooter={true} // ← Optional footer
>
  <section>
    {' '}
    // ← Use sections
    <SectionHeader level={3}>Section Title</SectionHeader>
    {content}
  </section>

  <section>
    <SectionHeader level={3}>Another Section</SectionHeader>
    {content}
  </section>
</OverlayPanel>
```

---

## 7. Focus & Interaction States

### Focus States

**Primary Focus (Blue):**

```css
.element:focus {
  background: var(--focus-bg);
  border: var(--focus-border);
  box-shadow: var(--focus-shadow), var(--focus-glow);
}
```

**Accent Focus (Orange) - NEW:**

```css
.element.accent:focus {
  background: var(--focus-bg-accent);
  border: var(--focus-border-accent);
  box-shadow: var(--focus-shadow-accent), var(--focus-glow-accent);
}
```

### Hover States

```css
.interactive:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.interactive.accent:hover {
  background: var(--color-accent-light);
  box-shadow:
    var(--shadow-lg),
    0 0 20px rgba(var(--color-accent-rgb), 0.3);
}
```

---

## 8. Glassmorphism System

### Variants

```css
/* Light glass (QuickSettings) */
--glass-bg-light: rgba(20, 22, 28, 0.6);

/* Standard glass (InGameMenu) */
--glass-bg: rgba(15, 17, 21, 0.85);

/* Heavy glass (PowerModal) */
--glass-bg-heavy: rgba(10, 12, 16, 0.95);

/* Accent border */
--glass-border-accent: 1px solid rgba(var(--color-accent-rgb), 0.2);
```

### Usage

```css
.overlay-light {
  background: var(--glass-bg-light);
  backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
}

.overlay-heavy {
  background: var(--glass-bg-heavy);
  backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
}
```

---

## 9. Implementation Checklist

### For Each Component:

- [ ] Uses OverlayPanel (if it's an overlay)
- [ ] Header uses `title` prop or SectionHeader
- [ ] All icons use IconWrapper
- [ ] All spacing uses `--space-X` tokens (no hardcoded px)
- [ ] Colors use semantic tokens (--color-primary, --color-accent)
- [ ] Buttons placed according to rules (footer for primary)
- [ ] Focus states defined (primary blue or accent orange)
- [ ] No emojis (replaced with Lucide icons)

### For Each Screen:

- [ ] Follows a defined layout pattern (A, B, or C)
- [ ] Typography uses defined scale
- [ ] Spacing consistent with 8px grid
- [ ] Color usage follows blue/orange guidelines
- [ ] Gamepad navigation works correctly
- [ ] Visual consistency with rest of app

---

## 10. Migration Guide

### Quick Reference

**Old → New:**

```css
/* Spacing */
padding: 10px → padding: var(--space-2)
padding: 15px → padding: var(--space-4)
padding: 30px → padding: var(--space-8)
gap: 10px → gap: var(--space-2)

/* Headers */
<h2>Title</h2> → <OverlayPanel title="Title" />
<h3>Section</h3> → <SectionHeader level={3}>Section</SectionHeader>

/* Icons */
<span>🔊</span> → <IconWrapper size="lg"><Volume2 /></IconWrapper>

/* Colors */
color: #ff6b35 → color: var(--color-accent)
background: #2d73ff → background: var(--color-primary)
```

---

## 11. Visual Examples

### Correct Implementation:

```tsx
// ✅ Good - Follows all standards
<OverlayPanel isOpen={isOpen} onClose={onClose} title="Quick Settings" width="medium">
  <section style={{ marginBottom: 'var(--section-gap)' }}>
    <SectionHeader level={3}>Volume</SectionHeader>
    <div style={{ display: 'flex', gap: 'var(--item-gap)' }}>
      <IconWrapper size="lg" color="accent">
        <Volume2 />
      </IconWrapper>
      <Slider value={volume} />
    </div>
  </section>
</OverlayPanel>
```

### Incorrect Implementation:

```tsx
// ❌ Bad - Violates standards
<div className="modal">
  <h2>Quick Settings</h2> {/* Raw h2 */}
  <div style={{ marginBottom: '20px' }}>
    {' '}
    {/* Hardcoded px */}
    <h3>Volume</h3> {/* Raw h3 */}
    <div style={{ display: 'flex', gap: '15px' }}>
      {' '}
      {/* Hardcoded px */}
      <span>🔊</span> {/* Emoji */}
      <Slider value={volume} />
    </div>
  </div>
</div>
```

---

## 12. Testing Standards

### Visual Consistency Check:

- [ ] All overlays have consistent padding (--space-8)
- [ ] All headers use same typography system
- [ ] All icons same size per context (status bar = md, buttons = lg)
- [ ] All spacing follows 8px grid
- [ ] Blue/orange usage is strategic and consistent

### Functionality Check:

- [ ] Gamepad navigation works (all 4 controller types)
- [ ] Focus states visible and consistent
- [ ] Hover effects smooth and predictable
- [ ] 60fps performance maintained
- [ ] No visual regressions

---

## Appendix: Token Reference

### Complete Spacing Scale:

```css
--space-0: 0 --space-1: 4px --space-2: 8px --space-3: 12px --space-4: 16px --space-5: 20px
  --space-6: 24px --space-8: 32px --space-10: 40px --space-12: 48px;
```

### Complete Color Palette:

```css
/* Blue System */
--color-primary: #2d73ff --color-primary-light: #4a90ff --color-primary-dark: #1a5fe5
  /* Orange System */ --color-accent: #ff6b35 --color-accent-light: #ff8c61
  --color-accent-dark: #e55527 /* State Colors */ --color-success: #4ade80 --color-warning: #fbbf24
  --color-error: #ef4444 --color-info: #14b8a6;
```

### Complete Typography Scale:

```css
--font-xs: 0.75rem (12px) --font-sm: 0.875rem (14px) --font-base: 1rem (16px) --font-lg: 1.125rem
  (18px) --font-xl: 1.25rem (20px) --font-2xl: 1.5rem (24px) --font-3xl: 1.875rem (30px)
  --font-4xl: 2.25rem (36px);
```

---

**End of Design System Documentation**

For implementation details, see:

- `src/styles/tokens.css` - Primitive & semantic tokens
- `src/styles/component-tokens.css` - Component-specific tokens
- `src/components/core/IconWrapper/` - Icon system implementation
- `src/components/core/SectionHeader/` - Header system implementation
