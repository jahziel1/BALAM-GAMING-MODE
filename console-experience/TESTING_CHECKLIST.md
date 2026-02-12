# Testing Checklist - Visual Redesign Complete Validation

**Fase 5 - Testing y Validación**
**Fecha:** 2026-02-12

## Objetivo

Validar que el rediseño visual completo funcione correctamente en todos los componentes, con todos los inputs (mouse, teclado, gamepad), y mantenga performance de 60fps.

---

## Pre-requisitos

- [ ] App compilada: `npm run build` exitoso
- [ ] Dev server corriendo: `npm run dev`
- [ ] Gamepad Xbox/PlayStation conectado (opcional pero recomendado)
- [ ] Monitor performance (Chrome DevTools abierto)

---

## 1. Testing Visual - Homogeneidad (30 componentes)

### 1.1 Layouts Principales ✅

#### Sidebar (Hover izquierdo)

- [ ] Mouse hover en borde izquierdo → Sidebar se abre con **animación slide-in**
- [ ] Iconos son **Lucide SVG** (no emojis 🏠📚)
- [ ] Fondo **glassmorphism visible** (semi-transparente + blur)
- [ ] Item activo (actual página) → **Naranja con glow**
- [ ] Hover en otros items → **Border azul con glow sutil**
- [ ] Mouse fuera del sidebar → Se cierra automáticamente

#### TopBar

- [ ] Iconos son **Lucide** (no emoji 🔌)
- [ ] Notification badges **naranja** (si hay notificaciones)
- [ ] Icons con **glow sutil** en hover
- [ ] Hora actualizada en tiempo real

#### Footer

- [ ] Botones Xbox/PlayStation/Nintendo con **colores correctos**
  - Xbox: Verde #107c10 ✅
  - PlayStation: Azul #8da9e4 ✅
  - Nintendo: Rojo #d93025 ✅
- [ ] Indicadores de input activo (gamepad/keyboard)

---

### 1.2 Pantallas Principales ✅

#### HeroSection (Juego destacado)

- [ ] Cover grande visible
- [ ] Botón "Play" con **glow azul**
- [ ] Gradiente de fondo suave
- [ ] Badges (género, plataforma) visibles
- [ ] FPS badge **naranja** si disponible

#### GameLibrary (Grid de juegos)

- [ ] Cards con hover **lift + glow triple** (azul + naranja + blanco)
- [ ] Favorite badge **naranja** (no amarillo)
- [ ] Cover images cargadas
- [ ] Skeleton loader mientras carga (si aplica)
- [ ] Scroll suave (virtualizado)

---

### 1.3 Overlays/Modals (15+ componentes) ✅

#### InGameMenu (Guide button)

- [ ] Glassmorphism **VISIBLE** (se ve el juego atrás borroso, 65% opacidad)
- [ ] FPS display **naranja** destacado
- [ ] Game cover más grande (120px) con **glow azul**
- [ ] CPU/GPU/RAM stats visibles
- [ ] Botones con **gradiente + glow** en hover
- [ ] Animación **slide-in** al abrir
- [ ] Confirmation dialog con **red glow** (Close Game)

#### SettingsPanel (Configuración)

- [ ] **Sidebar visible** (200px, no colapsado)
- [ ] **Textos NO encimados** (espaciado correcto)
- [ ] Tab activo **naranja** con **glow effect**
- [ ] Tab hover **azul** con glow
- [ ] Glassmorphism en panel principal
- [ ] Toggles funcionan correctamente
- [ ] Sliders se arrastran suavemente

#### SettingsPanel > Performance Tab

- [ ] FPS Service Toggle **verde** cuando ON
- [ ] FPS Service Toggle **gris** cuando OFF
- [ ] Error text **rojo** si hay error
- [ ] Status badges (Installed/Active) con colores correctos

#### SettingsPanel > Overlay Tab

- [ ] Toggle checkbox con **gradiente azul→morado** cuando ON
- [ ] Warning banner **amarillo brillante** (#ffd43b)
- [ ] Position grid (4 botones) con preview visual
- [ ] Active position con **glow azul pulsante**

#### QuickSettings

- [ ] Glassmorphism heavy (95% opacidad)
- [ ] Brightness/Volume sliders funcionan
- [ ] Network/Bluetooth icons **Lucide**
- [ ] Toggle switches con animación

#### PowerModal

- [ ] Centrado en pantalla
- [ ] Glassmorphism heavy
- [ ] Botones: Shutdown, Restart, Sleep, Desktop
- [ ] Countdown timer si se selecciona acción
- [ ] Botón Cancel funciona

#### WiFiPanel

- [ ] Lista de redes visible
- [ ] Signal bars con **glow azul/verde**
  - Connected network: **glow verde**
  - Hover network: **glow azul más fuerte**
- [ ] Connect/Disconnect funciona
- [ ] Password input (si aplica)

#### BluetoothPanel

- [ ] Lista de dispositivos
- [ ] Paired devices destacados
- [ ] Connect/Disconnect funciona

#### SearchOverlay

- [ ] Input search con focus visible
- [ ] Resultados en tiempo real
- [ ] Glassmorphism visible
- [ ] Virtual keyboard se abre (gamepad)

#### VirtualKeyboard

- [ ] Animación **slide-up** al abrir
- [ ] Animación **slide-down** al cerrar (Fix #5)
- [ ] CAPS badge **naranja** (#ff8c00) cuando activo
- [ ] Layout badge **azul claro** (#64c8ff)
- [ ] Counter limit **rojo** cuando excede
- [ ] Input preview con **scroll horizontal** (Fix #14)
- [ ] Touch targets mínimo **44px** en mobile (Fix #15)

#### FileExplorer

- [ ] Breadcrumb navigation funciona
- [ ] Folders/Files listados
- [ ] Icons por tipo de archivo
- [ ] Double-click abre archivo/folder

---

### 1.4 Mini Componentes ✅

#### SystemOSD (Overlay pequeño)

- [ ] Volume/Brightness cambios → OSD aparece
- [ ] Glassmorphism heavy
- [ ] Auto-hide después de 2 segundos
- [ ] Icono + barra de progreso

#### PerformancePip (Performance Overlay)

- [ ] **Siempre visible** en esquina superior derecha
- [ ] **FPS naranja** grande y destacado
- [ ] CPU/GPU stats **azul**
- [ ] Temperatura **cyan** (#a5f3fc)
- [ ] Error state **rojo claro** (#fecaca) si falla
- [ ] Fondo semi-transparente (25% negro)

#### Toast Notifications

- [ ] Success toast **verde** con icon
- [ ] Error toast **rojo** con icon
- [ ] Warning toast **naranja** con icon
- [ ] Info toast **azul** con icon
- [ ] Progress bar animada (si aplica)
- [ ] Auto-dismiss después de 3-5 segundos

---

## 2. Testing de Navegación (Gamepad/Keyboard)

### 2.1 Gamepad Navigation (Xbox/PlayStation/Switch)

#### Controles básicos

- [ ] **D-Pad/Stick izquierdo:** Navega entre items
- [ ] **A/Cross:** Confirma selección
- [ ] **B/Circle:** Cancela/Regresa
- [ ] **X/Square:** Acción secundaria (favorito, etc.)
- [ ] **Y/Triangle:** Buscar
- [ ] **Guide/PS:** Abre InGameMenu
- [ ] **Start:** Abre QuickSettings
- [ ] **Select/Share:** (Configurar según sea necesario)

#### Focus States

- [ ] Item focused tiene **border azul + glow**
- [ ] Item focused en tab activo tiene **border naranja + glow**
- [ ] Focus se mueve suavemente (animación)
- [ ] Focus visible en TODOS los componentes interactivos
- [ ] No hay "focus trap" (siempre se puede navegar)

#### GameLibrary con Gamepad

- [ ] D-Pad navega en grid (arriba/abajo/izquierda/derecha)
- [ ] Scroll automático cuando focus cerca del borde
- [ ] A lanza juego
- [ ] X añade/quita favorito
- [ ] Y abre búsqueda

#### Settings con Gamepad

- [ ] D-Pad arriba/abajo navega tabs en sidebar
- [ ] D-Pad derecha entra al contenido
- [ ] D-Pad navega entre toggles/sliders
- [ ] A activa toggle
- [ ] Stick izquierdo ajusta sliders
- [ ] B regresa al sidebar

### 2.2 Keyboard Navigation

- [ ] **Tab:** Navega entre items
- [ ] **Shift+Tab:** Navega atrás
- [ ] **Enter:** Confirma
- [ ] **Escape:** Cancela/Cierra overlay
- [ ] **Arrow keys:** Navega en grids/listas
- [ ] **Ctrl+F:** Buscar
- [ ] Focus visible en TODOS los elementos

---

## 3. Testing de Performance

### 3.1 Frame Rate (60fps target)

#### Chrome DevTools → Performance Tab

**Grabar durante:**

- [ ] Abrir/cerrar Sidebar 5 veces
- [ ] Abrir/cerrar InGameMenu 5 veces
- [ ] Navegar GameLibrary (scroll 20+ cards)
- [ ] Abrir/cerrar Settings 5 veces
- [ ] Hover rápido sobre 10 cards

**Verificar:**

- [ ] Frame rate: **60fps constante** (no caídas a <55fps)
- [ ] No dropped frames (barras rojas en timeline)
- [ ] Interaction latency: **<50ms**
- [ ] Paint time: **<16ms por frame**
- [ ] Layout shifts: **0** (no CLS)

### 3.2 Bundle Size

```bash
npm run build
ls -lh dist/assets/
```

**Límites:**

- [ ] CSS total: **≤105 kB** (actualmente 100.80 kB ✅)
- [ ] JS total: **≤500 kB** (actualmente 397.36 kB ✅)
- [ ] Fonts: **≤300 kB** (actualmente ~280 kB ✅)

### 3.3 Memory Usage

**Chrome DevTools → Memory Tab**

**Acciones:**

- [ ] Abrir/cerrar Sidebar 50 veces
- [ ] Tomar Heap Snapshot
- [ ] Verificar: No memory leaks (memoria se libera al cerrar)

**Límites:**

- [ ] Heap size: **<200 MB** en idle
- [ ] No retained detached DOM nodes

---

## 4. Testing Responsive (Diferentes resoluciones)

### 4.1 Desktop (1920x1080)

- [ ] Layout completo visible
- [ ] Sidebar funciona
- [ ] GameLibrary grid: 4-5 columns
- [ ] Todos los textos legibles

### 4.2 Laptop (1366x768)

- [ ] Layout ajustado
- [ ] GameLibrary grid: 3-4 columns
- [ ] Settings panel no cortado
- [ ] Textos legibles

### 4.3 Tablet (1024x768)

- [ ] Breakpoint activado
- [ ] VirtualKeyboard height: 48vh (Fix #16)
- [ ] Touch targets: mínimo 44px (Fix #15)
- [ ] Sidebar colapsa a full-width en Settings

### 4.4 Mobile (768x600)

- [ ] VirtualKeyboard height: 50vh
- [ ] Settings sidebar horizontal (tabs arriba)
- [ ] GameLibrary grid: 2 columns
- [ ] Touch-friendly (todos los botones >44px)

---

## 5. Testing de Funcionalidad (Clicks/Hovers)

### 5.1 Mouse Interactions

#### Hover Effects

- [ ] Cards: Lift + triple glow
- [ ] Botones: Background change + glow
- [ ] Sidebar items: Border azul + glow
- [ ] Icons: Scale 1.15
- [ ] Sliders: Thumb scale 1.2

#### Click Actions

- [ ] Card click → Lanza juego
- [ ] Favorite badge → Toggle favorito
- [ ] Play button → Lanza juego
- [ ] Settings toggle → Cambia estado
- [ ] Modal close → Cierra modal
- [ ] Overlay backdrop click → Cierra overlay

### 5.2 Form Controls

#### Toggles (Switches)

- [ ] Click cambia estado ON/OFF
- [ ] Animación suave (0.3s transition)
- [ ] Color verde (#4caf50) cuando ON
- [ ] Color gris cuando OFF

#### Sliders

- [ ] Drag funciona
- [ ] Click en track salta al valor
- [ ] Value display actualizado en tiempo real
- [ ] Limits respetados (min/max)

#### Dropdowns/Selects

- [ ] Click abre opciones
- [ ] Click en opción selecciona
- [ ] Valor seleccionado mostrado
- [ ] Hover en opciones destacado

---

## 6. Testing de Accesibilidad

### 6.1 Screen Reader Support (Opcional)

- [ ] ARIA labels presentes en botones críticos
- [ ] Role attributes correctos
- [ ] Focus order lógico

### 6.2 High Contrast Mode

- [ ] Borders aumentan a 3px
- [ ] Focus border aumenta a 4px
- [ ] Colores suficientemente contrastados

### 6.3 Reduced Motion

- [ ] Animaciones deshabilitadas si `prefers-reduced-motion: reduce`
- [ ] Overlays aparecen sin animación (solo fade)
- [ ] Pulse animations deshabilitadas

### 6.4 Keyboard Only (Sin Mouse)

- [ ] Toda la app navegable con Tab/Arrows
- [ ] Focus siempre visible
- [ ] Escape cierra modales
- [ ] Enter activa botones

---

## 7. Testing de Glassmorphism

**Todos los overlays deben tener glassmorphism VISIBLE:**

- [ ] **Sidebar:** 65% opacidad + blur(60px)
- [ ] **InGameMenu:** 65% opacidad + blur(60px) - **CRÍTICO**
- [ ] **SettingsPanel:** 65% opacidad + blur(60px)
- [ ] **QuickSettings:** 95% opacidad + blur(60px) (heavy)
- [ ] **PowerModal:** 95% opacidad + blur(60px) (heavy)
- [ ] **WiFiPanel:** 65% opacidad + blur(60px)
- [ ] **BluetoothPanel:** 65% opacidad + blur(60px)
- [ ] **SearchOverlay:** 65% opacidad + blur(60px)
- [ ] **VirtualKeyboard:** Glass effect en preview
- [ ] **FileExplorer:** 85% opacidad + blur(60px)

**Verificar:**

- [ ] Se ve contenido atrás **borroso** (no negro sólido)
- [ ] Border sutil blanco/naranja visible
- [ ] Shadow dramática (0 0 100px rgba(0,0,0,0.8))

---

## 8. Testing de Glow Effects

### 8.1 Active States (Naranja)

- [ ] Sidebar item activo: `box-shadow: 0 0 20px rgba(255, 107, 53, 0.4)`
- [ ] Settings tab activo: `box-shadow: 0 0 20px rgba(255, 107, 53, 0.4)`
- [ ] Favorite badge: Glow naranja
- [ ] FPS display: Glow naranja
- [ ] Icon activo con **pulse animation**

### 8.2 Hover States (Azul)

- [ ] Sidebar item hover: `box-shadow: 0 0 15px rgba(45, 115, 255, 0.3)`
- [ ] Card hover: Triple glow (azul + naranja + blanco)
- [ ] Button hover: `box-shadow: 0 8px 32px rgba(45, 115, 255, 0.6)`
- [ ] Icon hover: Scale 1.15 + glow sutil

### 8.3 Success States (Verde)

- [ ] WiFi connected signal: `box-shadow: 0 0 10px rgba(74, 222, 128, 0.4)`
- [ ] Toggle ON: Glow verde
- [ ] Success toast: Border + glow verde

---

## 9. Testing de Iconografía (Lucide Only)

**TODOS los iconos deben ser Lucide SVG, NO emojis:**

### Verificar NO hay emojis:

- [ ] **Sidebar:** 🏠📚➕🔍⚙️💻⭕ ❌ → Home, Library, Plus, Search, Settings, Monitor, Power ✅
- [ ] **TopBar:** 🔌 ❌ → Plug ✅
- [ ] **InGameMenu:** Usa Lucide ✅
- [ ] **WiFiPanel:** Usa Lucide ✅
- [ ] **BluetoothPanel:** Usa Lucide ✅

### Tamaños consistentes:

- [ ] Sidebar/Menus: **24px** (lg)
- [ ] TopBar status: **20px** (md)
- [ ] Cards badges: **16px** (sm)
- [ ] Empty states: **32px** (xl)

---

## 10. Testing de Colores Justificados

**Brand colors que NO deben cambiar:**

### Footer Gamepad Buttons

- [ ] Xbox button: **#107c10** (verde) ✅
- [ ] PlayStation button: **#8da9e4** (azul) ✅
- [ ] Nintendo button: **#d93025** (rojo) ✅
- [ ] Comentario en código explicando por qué ✅

### Overlay Toggle (OverlayTab.css)

- [ ] Toggle gradient: **#4a9eff → #8a2be2** (azul→morado) ✅
- [ ] NO debe ser azul→azul (var(--color-primary))
- [ ] Comentario en código: "brand identity" ✅

### Warning Banner (OverlayTab.css)

- [ ] Warning color: **#ffd43b** (amarillo brillante) ✅
- [ ] NO debe ser #fbbf24 (naranja)
- [ ] Comentario en código: "high visibility" ✅

---

## 11. Regression Testing (Bugs Previamente Arreglados)

### Fix #5 - VirtualKeyboard Exit Animation

- [ ] Al cerrar VirtualKeyboard → Animación **slide-down** visible
- [ ] NO desaparece instantáneamente
- [ ] Timing: 0.2s cubic-bezier(0.4, 0, 1, 1)

### Fix #14 - Horizontal Scroll Input Preview

- [ ] Input largo (>50 chars) → Scroll horizontal funciona
- [ ] Scrollbar thin visible
- [ ] No text wrapping (nowrap)

### Fix #15 - Touch Targets Mobile

- [ ] TODOS los botones/keys en mobile: **mínimo 44px**
- [ ] VirtualKeyboard keys: 44px x 44px
- [ ] Cards touch area: >44px

### Fix #16 - Overlay Heights Optimized

- [ ] VirtualKeyboard: **NO cubre 60-65% de pantalla**
- [ ] Desktop: 45vh
- [ ] Tablet (1024px): 48vh
- [ ] Mobile (768px): 50vh
- [ ] Mobile small (600px): 55vh

### Fix Batch 4.6 - Calc() Errors

- [ ] NO hay errores de calc() en CSS (era 60+ errores)
- [ ] Todos los `Nvar (--space-X)` corregidos a `calc(N * var(--space-X))`
- [ ] Media queries con valores fijos (768px, 1024px)

### Fix Layout - SettingsPanel Encimado

- [ ] Sidebar Settings: **200px width** (NO 40px)
- [ ] Content padding: **32px** (NO 8px)
- [ ] Item gap: **16px** (NO 8px)
- [ ] Textos NO encimados

---

## 12. Build Validation (Automatizado)

```bash
cd console-experience
npm run validate
npm run build
```

**Debe pasar:**

- [ ] Prettier: ✅ "All matched files use Prettier code style!"
- [ ] ESLint: ✅ 0 errors (42 warnings console.log OK)
- [ ] TypeScript: ✅ tsc --noEmit sin errores
- [ ] Vite build: ✅ "built in <10s"
- [ ] Clippy (Rust): ✅ 0 warnings
- [ ] Rustfmt: ✅ Formatted

---

## 13. Critical User Journeys

### Journey 1: Lanzar un Juego

1. [ ] Abrir app → HeroSection visible
2. [ ] Click "Play" en hero game
3. [ ] Juego se lanza sin errores
4. [ ] FPS Pip aparece (si servicio activo)

### Journey 2: Buscar y Lanzar Juego

1. [ ] Presionar Y (gamepad) o Ctrl+F
2. [ ] SearchOverlay se abre
3. [ ] Escribir nombre de juego
4. [ ] Resultados aparecen
5. [ ] Click en resultado → Juego se lanza

### Journey 3: Configurar Settings

1. [ ] Abrir Settings (⚙️ sidebar)
2. [ ] Navegar entre tabs (Performance, Overlay, etc.)
3. [ ] Cambiar toggles/sliders
4. [ ] Verificar cambios se guardan
5. [ ] Cerrar Settings → Cambios persisten

### Journey 4: Gestionar WiFi

1. [ ] Abrir QuickSettings (Start button)
2. [ ] Click en WiFi panel
3. [ ] Ver lista de redes
4. [ ] Conectar a red (si disponible)
5. [ ] Verificar conexión exitosa

### Journey 5: InGameMenu Durante Juego

1. [ ] Lanzar juego
2. [ ] Presionar Guide button
3. [ ] InGameMenu se abre sobre juego
4. [ ] Glassmorphism visible (juego borroso atrás)
5. [ ] FPS/stats actualizados
6. [ ] Close Game → Confirmation dialog
7. [ ] Cancelar o confirmar

---

## 14. Known Issues / Expected Behavior

### Comportamiento Esperado (NO es bug):

1. **PerformancePip siempre visible:** Es intencional (Steam Deck style)
2. **Sidebar auto-cierra:** Cuando mouse sale, es el diseño
3. **Glassmorphism no funciona en capturas:** Es limitación del compositor de Windows
4. **FPS Service requiere Admin:** Es por diseño (LocalSystem service)
5. **Brand colors hardcoded:** Xbox/PS/Nintendo colores están justificados
6. **Warning banner amarillo brillante:** Es para alta visibilidad, no cambiar a naranja

### Issues Conocidos Aceptables:

1. **Console.log warnings (42):** Aceptable para debugging
2. **React refresh warnings (3):** StoreProvider exports, no crítico
3. **TanStack Virtual warning (1):** useVirtualizer API, expected
4. **Rustfmt warnings (nightly features):** Solo warnings, no errors

---

## 15. Sign-Off Final

### Criterios de Aprobación Total:

- [ ] **Visual:** 95%+ de checklist visual pasado
- [ ] **Navegación:** Gamepad + Keyboard 100% funcional
- [ ] **Performance:** 60fps constante en todas las acciones
- [ ] **Funcionalidad:** Todos los clicks/hovers/toggles funcionan
- [ ] **Responsive:** 3+ resoluciones testeadas sin problemas
- [ ] **Build:** 0 errores (warnings console.log OK)
- [ ] **Critical Journeys:** 5/5 journeys completados exitosamente

### Firma de Aprobación:

```
Testeado por: _________________________
Fecha: _________________________
Versión: _________________________
Notas adicionales:
_________________________________________________
_________________________________________________
```

---

## Apéndice: Comandos Útiles

```bash
# Build production
npm run build

# Dev server
npm run dev

# Linting
npm run lint
npm run format:check
npm run type-check

# Full validation
npm run validate

# Visual regression tests (si configurado)
npm run test:visual

# Performance profiling
npm run build && npx serve dist
# Luego Chrome DevTools → Lighthouse
```

---

**Total Items:** ~350+ checks
**Tiempo Estimado:** 3-4 horas testing completo
**Prioridad:** CRÍTICO para validar rediseño completo

**Status:** ⏳ Pendiente ejecución por usuario
