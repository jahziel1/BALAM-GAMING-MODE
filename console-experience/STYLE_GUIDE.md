# Style Guide Visual - Balam Console Experience

**Date:** 2026-02-12
**Purpose:** Define unified visual language for ALL components

---

## Design Principles

1. **Homogeneity:** Every component feels like part of the same product
2. **Dramatic Effects:** Changes must be OBVIOUS, not subtle
3. **Consistency:** Same rules apply everywhere
4. **Professional:** No emojis, no hardcoded values

---

## 1. Iconography System

### Rule: 100% Lucide SVG

**NO emojis. NO Unicode symbols. ONLY Lucide React icons.**

### Standard Sizes by Context

```tsx
// Sidebar/Menu items
<Home size={24} />  // lg

// TopBar status icons
<Wifi size={20} />  // md

// Card badges
<Star size={16} />  // sm

// Empty states
<Search size={32} />  // xl
```

### Complete Emoji → Lucide Mapping

**SIDEBAR (7 replacements needed):**

- 🏠 → `<Home size={24} />`
- 📚 → `<Library size={24} />`
- ➕ → `<Plus size={24} />`
- 🔍 → `<Search size={24} />`
- ⚙️ → `<Settings size={24} />`
- 💻 → `<Monitor size={24} />`
- ⭕ → `<Power size={24} />`

**All other components already use Lucide** ✅

---

## 2. Color System

### Primary Colors

#### Blue (#2d73ff) - Navigation & Focus

**Use for:**

- Primary buttons (Play, Resume, OK)
- Focus states during gamepad navigation
- Hover effects (not active)
- Borders on non-active items

**RGB:** 45, 115, 255
**Token:** `var(--color-primary)`

#### Orange (#ff6b35) - Active States & Highlights

**Use for:**

- **Active items** (Sidebar selected item, Settings tab)
- **Favorite badges** (Cards)
- **FPS display** (PerformancePip, InGameMenu)
- **Notification badges** (TopBar)
- **All active state indicators**

**RGB:** 255, 107, 53
**Token:** `var(--color-accent)`

#### Red (#ef4444) - Danger & Destructive

**Use for:**

- Danger buttons (Power off, Close game)
- Error states
- Destructive confirmations
- Warning indicators (battery low)

**RGB:** 239, 68, 68
**Token:** `var(--color-error)`

### Usage Matrix

| Element            | Not Active  | Hovered            | Active/Selected               |
| ------------------ | ----------- | ------------------ | ----------------------------- |
| **Sidebar Item**   | Gray text   | Blue border + glow | **Orange** bg + border + glow |
| **Settings Tab**   | Gray text   | Blue border        | **Orange** bg + border + icon |
| **Card**           | Gray border | Blue border + glow | **Orange** badge if favorite  |
| **Button Primary** | Blue bg     | Blue bright        | Blue + glow                   |
| **Button Danger**  | Red bg      | Red bright         | Red + glow                    |

**CRITICAL RULE:** Active/selected states = Orange. Focused/hover = Blue.

---

## 3. Glassmorphism System

### Standard Glassmorphism (Overlays)

**Use for:** Sidebar, InGameMenu, SettingsPanel, QuickSettings

```css
background: rgba(15, 17, 21, 0.65); /* 65% opacity - BLUR VISIBLE */
backdrop-filter: blur(60px) saturate(180%);
border: 1px solid rgba(255, 255, 255, 0.1);
box-shadow:
  0 0 100px rgba(0, 0, 0, 0.8),
  inset 0 1px 0 rgba(255, 255, 255, 0.1);
```

**Key:** 65% opacity ensures blur is VISIBLE and dramatic.

### Heavy Glassmorphism (Modals)

**Use for:** PowerModal, ConfirmDialog, critical overlays

```css
background: rgba(10, 12, 16, 0.95); /* 95% opacity - almost opaque */
backdrop-filter: blur(40px);
border: 1px solid rgba(255, 255, 255, 0.2);
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
```

### Light Glassmorphism (PiP)

**Use for:** PerformancePip, floating elements

```css
background: rgba(20, 22, 28, 0.25); /* 25% opacity - minimal */
backdrop-filter: blur(20px) saturate(150%);
border: 1px solid rgba(255, 255, 255, 0.15);
```

---

## 4. Glow Effects System

### Orange Glow (Active State)

```css
.item.active {
  background: rgba(255, 107, 53, 0.15);
  border: 2px solid #ff6b35;
  box-shadow: 0 0 20px rgba(255, 107, 53, 0.4);
  color: #ff6b35;
}

.item.active .icon {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}
```

**Apply to:** Sidebar focused item, Settings active tab, FPS display

### Blue Glow (Hover/Focus)

```css
.item:hover:not(.active),
.item.focused:not(.active) {
  border-color: #2d73ff;
  box-shadow: 0 0 15px rgba(45, 115, 255, 0.3);
}
```

**Apply to:** Sidebar hover, Card hover, Button hover

### Primary Button Glow

```css
.btn-primary {
  background: linear-gradient(135deg, #2d73ff, #1e5bdb);
  box-shadow: 0 4px 16px rgba(45, 115, 255, 0.4);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-primary:hover {
  box-shadow: 0 8px 32px rgba(45, 115, 255, 0.6);
  transform: translateY(-2px);
}
```

### Danger Button Glow

```css
.btn-danger {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4);
}

.btn-danger:hover {
  box-shadow: 0 8px 32px rgba(239, 68, 68, 0.6);
  transform: translateY(-2px);
}
```

---

## 5. Animations System

### Overlay Entrance

```css
@keyframes slideInLeft {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.overlay-left {
  animation: slideInLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
```

**Duration:** 0.4s (smooth but noticeable)
**Easing:** cubic-bezier(0.16, 1, 0.3, 1) (bounce)

### Icon Hover Scale

```css
.icon {
  transition: transform 0.2s ease;
}

.icon:hover {
  transform: scale(1.15);
}
```

### Active Item Pulse

```css
.item.active .icon {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
}
```

### Badge Pop

```css
@keyframes badge-pop {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.badge {
  animation: badge-pop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

---

## 6. Component-Specific Guidelines

### Sidebar Items

**Structure:**

```tsx
<div className="menu-item focused">
  <div className="icon">
    <Home size={24} />
  </div>
  <div className="label">INICIO</div>
</div>
```

**Styles:**

```css
/* Active state - ORANGE */
.menu-item.focused {
  background: rgba(255, 107, 53, 0.15);
  border-left: 4px solid var(--color-accent);
  box-shadow: 0 0 20px rgba(255, 107, 53, 0.4);
  color: var(--color-accent);
}

.menu-item.focused .icon {
  color: var(--color-accent);
  filter: drop-shadow(0 0 8px rgba(255, 107, 53, 0.6));
  animation: pulse 2s ease-in-out infinite;
}

/* Hover state - BLUE */
.menu-item:hover:not(.focused) {
  border-left-color: var(--color-primary);
  box-shadow: 0 0 15px rgba(45, 115, 255, 0.3);
}

/* Danger variant - RED (Power button) */
.menu-item.danger {
  color: var(--color-error);
}

.menu-item.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  box-shadow: 0 0 15px rgba(239, 68, 68, 0.3);
}
```

### Settings Tabs

**Structure:**

```tsx
<button className="settings-category active">
  <span className="settings-category-icon">
    <Globe size={20} />
  </span>
  <span className="settings-category-label">General</span>
</button>
```

**Styles:**

```css
.settings-category.active {
  background: rgba(255, 107, 53, 0.15);
  border: 2px solid var(--color-accent);
  color: var(--color-text-primary);
}

.settings-category.active .settings-category-icon {
  color: var(--color-accent);
}

.settings-category.active:hover {
  background: rgba(255, 107, 53, 0.2);
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
}
```

### Game Cards

**Structure:**

```tsx
<div className="card focused">
  <div className="card-image-container">
    <img src={cover} alt={title} />
    {isFavorite && (
      <div className="card-favorite-badge">
        <Star size={16} fill="currentColor" />
      </div>
    )}
  </div>
</div>
```

**Styles:**

```css
/* Favorite badge - ORANGE */
.card-favorite-badge {
  background: var(--color-accent);
  box-shadow: 0 2px 8px rgba(255, 107, 53, 0.4);
  animation: favorite-pop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* Focus state - BLUE (gamepad navigation) */
.card.focused {
  transform: scale(1.08) translateY(-10px);
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.6),
    0 0 0 3px var(--color-primary),
    0 0 30px rgba(45, 115, 255, 0.4);
  border-color: var(--color-primary);
}

/* Hover - BLUE */
.card:hover:not(.focused) {
  box-shadow:
    0 20px 40px rgba(0, 0, 0, 0.4),
    0 0 0 2px var(--color-primary),
    0 0 20px rgba(45, 115, 255, 0.3);
  transform: translateY(-10px) scale(1.05);
}
```

### InGameMenu Stats

**Structure:**

```tsx
<div className="game-stats">
  <span className="stat-item fps-value">60 FPS</span>
  <span className="stat-divider">•</span>
  <span className="stat-item gpu-temp">GPU 65°C</span>
</div>
```

**Styles:**

```css
/* FPS - ORANGE highlight */
.fps-value {
  color: var(--color-accent);
  font-weight: 700;
  text-shadow: 0 0 20px rgba(255, 107, 53, 0.6);
}

/* GPU Temp - color by temperature */
.gpu-temp {
  color: var(--color-success); /* Green < 70°C */
}

.gpu-temp.warm {
  color: var(--color-warning); /* Yellow 70-80°C */
}

.gpu-temp.hot {
  color: var(--color-error); /* Red > 80°C */
}
```

---

## 7. Anti-Patterns (What NOT to Do)

### ❌ NO Emojis

```tsx
// WRONG
icon: '🏠';

// CORRECT
icon: <Home size={24} />;
```

### ❌ NO Inline Styles

```tsx
// WRONG
style={{ color: '#ef4444' }}

// CORRECT
className="danger"
// CSS: .danger { color: var(--color-error); }
```

### ❌ NO Hardcoded Colors

```css
/* WRONG */
border-color: #ff6b35;

/* CORRECT */
border-color: var(--color-accent);
```

### ❌ NO Opaque Glassmorphism

```css
/* WRONG - blur invisible */
background: rgba(15, 17, 21, 0.85);

/* CORRECT - blur visible */
background: rgba(15, 17, 21, 0.65);
```

### ❌ NO calc() Without calc()

```css
/* WRONG */
width: 3var (--space-5);

/* CORRECT Option 1: Use calc() */
width: calc(3 * var(--space-5));

/* CORRECT Option 2: Use fixed value */
width: 3.75rem; /* 3 * 1.25rem */
```

---

## 8. Reference Components (Models to Follow)

### ✅ PerformancePip - PERFECT FPS Display

- Orange FPS with dramatic glow
- Blue CPU/GPU metrics
- Text shadows for readability
- **File:** `src/components/overlay/PerformancePip/PerformancePip.css` lines 45-55

### ✅ Card - PERFECT Favorite Badge

- Orange badge with pop animation
- Dramatic hover (lift + triple glow)
- Blue focus for gamepad
- **File:** `src/components/ui/Card/Card.css` lines 165-181, 107-126

### ✅ SettingsPanel - PERFECT Active Tabs

- Orange active tab
- Orange icon when active
- Glow on hover
- **File:** `src/components/overlay/SettingsPanel/SettingsPanel.css` lines 48-67

### ✅ Button Component - PERFECT Variants

- All variants use tokens
- Glow effects on focus
- Pulse animation on primary
- **File:** `src/components/core/Button/Button.css`

---

## 9. Implementation Checklist

Before committing a component change, verify:

- [ ] All icons are Lucide SVG (no emojis)
- [ ] Active states use orange (`var(--color-accent)`)
- [ ] Hover/Focus states use blue (`var(--color-primary)`)
- [ ] Glassmorphism is 65% opacity for overlays
- [ ] Glow effects are visible (min 0.3 opacity)
- [ ] No inline styles
- [ ] Uses design tokens only
- [ ] Spacing uses 8px grid (`var(--space-*)`)
- [ ] No `calc()` syntax errors
- [ ] Animations use standard durations/easings

---

## Summary

### Core Rules

1. **Icons:** 100% Lucide, sizes 16/20/24/32
2. **Active States:** Always orange (#ff6b35)
3. **Focus/Hover:** Always blue (#2d73ff)
4. **Glassmorphism:** 65% opacity for visible blur
5. **Glow:** 0.3-0.4 opacity minimum (dramatic, visible)
6. **Spacing:** 8px grid system
7. **NO:** Emojis, inline styles, hardcoded colors

### Visual Impact Goals

Every component should feel:

- **Professional:** No amateur emojis
- **Cohesive:** Same visual language everywhere
- **Dramatic:** Effects are obvious, not subtle
- **Polished:** Smooth animations, visible glows

---

**Style Guide Complete** ✅
**Next Step:** Create VISUAL_REDESIGN.md with BEFORE → AFTER proposals for each component
