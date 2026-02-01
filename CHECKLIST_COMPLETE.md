# 📋 BALAM CONSOLE EXPERIENCE - MASTER CHECKLIST

## 🎯 Objetivo del Proyecto
**Reemplazar `explorer.exe` con un Shell nativo para Gaming en Windows**, ofreciendo una experiencia de consola moderna (Steam Deck / Xbox / PlayStation) con control total del hardware y rendimiento nativo.

---

## ✅ FASE 0: FUNDACIÓN (COMPLETADO)

### 🕹️ Input & Control (Universal)
- [x] **Arquitectura Input Inmortal (Dual-Channel)** — Rust (XInput/Gilrs) + Web (Gamepad API)
- [x] **Soporte Multi-Plataforma:** Xbox, PlayStation, Switch
- [x] **Global Wake-Up:** Combo `LB + RB + START` funcional en segundo plano
- [x] **Detección Dinámica de Hardware:** Identificación de Xbox, PlayStation y Switch con layouts específicos
- [x] **Conmutación Híbrida Inteligente:** Cambio automático entre mando y teclado/ratón en tiempo real
- [x] **Paridad UX de Consola:** Navegación intuitiva, indicadores visuales sincronizados
- [ ] **Feedback Háptico (Vibración):** Confirmaciones táctiles al lanzar/cerrar juegos — *Rust (Gilrs)*

### 🎮 Balam Discovery System (Gestión de Juegos)
- [x] **Capa 1: Red de Pesca (Autodetección)**
  - [x] Steam Multi-Librería (escaneo de todos los discos vía `libraryfolders.vdf`)
  - [x] Epic Games (detección nativa vía manifiestos)
  - [x] Xbox/UWP (detección de paquetes nativos de Windows)
  - [x] Registry Scanner (GOG, Ubisoft, Riot, EA)
- [x] **Capa 2: Motor de Identidad (Deduplicación)**
  - [x] IdentityEngine (identificación vía PE Headers)
  - [x] Canonical Mapping (normalización de rutas)
  - [x] Jerarquía de Autoridad (Steam > Epic > Xbox > Registry)
- [x] **Capa 3: Modo Experto (Gestión Manual)**
  - [x] Balam Explorer (explorador de archivos navegable con Gamepad)
  - [x] Manual Add (.exe selection con registro permanente)

### 🖼️ Metadatos Ricos (Zero-Config)
- [x] **Balam Grid Engine:** Cache local de imágenes en AppData
- [x] **SteamGridDB/CDN:** Descarga automática de portadas (600x900)
- [x] **Hero Art Dinámico:** Fondos que cambian según juego seleccionado
- [x] **Secure Asset Protocol:** Carga de imágenes locales vía Tauri Asset Protocol

### 🏗️ Arquitectura Backend
- [x] **Hexagonal (Rust):** `adapters/`, `ports/`, `domain/`
- [x] **Tauri v2:** Build moderno (~50MB RAM)
- [x] **Logging estructurado:** `tracing` crate
- [x] **CSP y Asset Protocol:** Habilitados en `tauri.conf.json`

### 🔐 Gestión de Procesos (Single Instance)
- [x] **Auto-Kill Protocol:** Cierre automático del juego anterior al lanzar uno nuevo
- [x] **Confirmation Modal:** Diálogo nativo para confirmar cambio de juego
- [x] **Button Intelligence:** "PLAY" → "RESUME" → "SWITCH" según contexto
- [x] **Failsafe Logic:** Si botón falla, detectar duplicado y tratar como Resume

### 🎨 Side Blade (Overlay In-Game)
- [x] **Global Shortcut:** `Ctrl+Shift+Q` funcional (toggle overlay)
- [x] **Window Management:** `hide()/show()` nativo de Tauri
- [x] **Stable Rendering:** Dashboard siempre en DOM (no unmount)
- [x] **Resume Button:** Ocultar ventana sin relanzar juego

---

## 🔴 FASE 1: TIER 0 - SHELL SURVIVAL (CRÍTICO)
**Sin estas funciones, Balam NO puede reemplazar Explorer.exe**

### 🌐 Network Management (Sistema Operativo)
- [ ] **WiFi Controller (Native API)**
  - [ ] Backend: Wrapper de `WlanAPI` con `windows` crate
    - [ ] `scan_networks()` - Escanear redes disponibles (`WlanGetAvailableNetworkList`)
    - [ ] `connect_to_wifi(ssid, password)` - Conectar a red (`WlanConnect`)
    - [ ] `disconnect_wifi()` - Desconectar (`WlanDisconnect`)
    - [ ] `get_connected_network()` - Obtener red actual
  - [ ] Frontend UI:
    - [ ] Panel en Sidebar con lista de redes disponibles
    - [ ] Iconos de señal WiFi (fuerte/media/débil)
    - [ ] Input de contraseña (integrar con Virtual Keyboard)
    - [ ] Toast notification al conectar/desconectar

### 📡 Bluetooth Manager (Periféricos)
- [ ] **BT Pairing System**
  - [ ] Backend: `btleplug` (BLE) + `windows::Devices::Bluetooth` (Classic)
    - [ ] `scan_bluetooth_devices()` - Escanear dispositivos cercanos
    - [ ] `pair_device(address)` - Emparejar dispositivo
    - [ ] `unpair_device(address)` - Desemparejar
    - [ ] `get_paired_devices()` - Listar dispositivos emparejados
  - [ ] Frontend UI:
    - [ ] Panel BT con lista de dispositivos detectados
    - [ ] Iconos contextuales (mando/auricular/teclado detectados)
    - [ ] Estado de batería (si disponible vía BLE)
    - [ ] Toast al conectar/desconectar exitosamente

### ⌨️ Virtual Keyboard (Input Esencial)
- [ ] **On-Screen Keyboard (TabTip.exe)**
  - [ ] Backend:
    - [ ] `invoke_virtual_keyboard()` - Lanzar TabTip.exe
    - [ ] `hide_virtual_keyboard()` - Cerrar TabTip
    - [ ] Detección de touchscreen (solo mostrar en dispositivos táctiles)
  - [ ] Frontend:
    - [ ] Auto-trigger en focus de `<input type="password">` o `type="text"`
    - [ ] Posicionamiento inteligente (no cubrir input activo)
    - [ ] Integración con navegación de mando (D-Pad como cursor virtual)

### 🔊 Audio Management (Quick Settings)
- [ ] **Output Device Switcher**
  - [ ] Backend: Core Audio API (`IMMDeviceEnumerator`)
    - [ ] `list_audio_devices()` - Listar dispositivos de reproducción
    - [ ] `set_default_device(id)` - Cambiar dispositivo predeterminado
    - [ ] `get_volume(device_id)` - Obtener volumen por dispositivo
    - [ ] `set_volume(device_id, level)` - Ajustar volumen
  - [ ] Frontend UI:
    - [ ] Dropdown en Blade Quick Settings
    - [ ] Icono dinámico: 🔊 Altavoz / 🎧 Auriculares según dispositivo activo
    - [ ] Slider de volumen independiente por dispositivo
    - [ ] Indicador visual de dispositivo activo

### ⚡ Power Management (Sistema)
- [ ] **System Power Controls**
  - [ ] Backend: `ExitWindowsEx` API
    - [ ] `shutdown()` - Apagar sistema (`EWX_SHUTDOWN`)
    - [ ] `restart()` - Reiniciar (`EWX_REBOOT`)
    - [ ] `sleep()` - Suspender (`SetSuspendState`)
    - [ ] `lock_screen()` - Bloquear sesión
  - [ ] Frontend UI:
    - [ ] Modal de confirmación: "¿Apagar?" con timeout 5s
    - [ ] Integración con Sidebar existente
    - [ ] Icono de batería con % (laptops/handhelds)

### 🛡️ Crash Recovery (Estabilidad)
- [ ] **Watchdog Process**
  - [ ] Implementación:
    - [ ] Crear `balam-watchdog.exe` (Rust standalone binary)
    - [ ] Monitoreo: Check cada 5s si `balam.exe` está vivo
    - [ ] Auto-restart: Si crashea, relanzar inmediatamente
    - [ ] Logging: Escribir stack trace a `%AppData%/Balam/crashes/crash_YYYYMMDD_HHMMSS.log`
  - [ ] Safe Mode:
    - [ ] Si crashea 3 veces en 5 minutos → lanzar `explorer.exe` como fallback
    - [ ] Notificación en próximo inicio: "Balam crasheó repetidamente. Verifique logs."
  - [ ] Instalador:
    - [ ] Agregar Watchdog a Windows startup (`HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`)

---

## 🟠 FASE 2: TIER 1 - PERFORMANCE CORE
**Sin esto, Balam se siente lento y no escala con muchos juegos**

### 🎮 Game Library Optimization (Virtualización)
- [ ] **List Virtualization**
  - [ ] Frontend: Integrar `@tanstack/react-virtual` o `react-window`
    - [ ] Configuración: Renderizar solo 15 cards visibles + 5 buffer superior/inferior
    - [ ] Reciclaje de componentes DOM (virtual scrolling)
    - [ ] Smooth scroll con gamepad (incrementos de 1 item)
  - [ ] Testing:
    - [ ] Validar con biblioteca de 500+ juegos
    - [ ] Medir frame time (debe ser <16ms, 60fps estable)
    - [ ] Verificar sin memory leaks (usar Chrome DevTools Heap Profiler)

### 💾 Metadata Persistence (Cache SQLite)
- [ ] **SQLite Cache System**
  - [ ] Backend: `rusqlite` crate + `serde` para serialización
    - [ ] Schema:
      ```sql
      CREATE TABLE games (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        path TEXT NOT NULL,
        source TEXT, -- 'steam', 'epic', 'xbox', etc.
        image_path TEXT,
        hero_path TEXT,
        last_played INTEGER, -- Unix timestamp
        play_time INTEGER, -- Segundos totales
        favorite INTEGER DEFAULT 0,
        metadata_json TEXT -- JSON para campos extensibles
      );
      CREATE INDEX idx_title ON games(title COLLATE NOCASE);
      CREATE INDEX idx_source ON games(source);
      CREATE INDEX idx_last_played ON games(last_played DESC);
      ```
    - [ ] Optimizaciones:
      - [ ] WAL mode: `PRAGMA journal_mode=WAL`
      - [ ] Batch inserts: Usar transacciones para 50+ inserts
      - [ ] Prepared statements: Cachear queries frecuentes
      - [ ] Background thread: Escrituras en Tokio task separado
  - [ ] Comandos:
    - [ ] `cache_game_metadata(game)` - Guardar juego en DB
    - [ ] `get_cached_games()` - Cargar todos los juegos desde DB
    - [ ] `update_play_time(id, seconds)` - Actualizar tiempo jugado
    - [ ] `invalidate_cache()` - Limpiar caché (force re-scan)
  - [ ] Migración automática:
    - [ ] Detectar cambios de schema al actualizar Balam
    - [ ] Aplicar migraciones SQL automáticamente

### 🖼️ Image Optimization (Lazy Loading)
- [ ] **Viewport-based Loading + WebP Thumbnails**
  - [ ] Frontend: `IntersectionObserver` API
    - [ ] Cargar imagen solo cuando `<Card>` entra en viewport (+ 200px margen)
    - [ ] Placeholder blur-up effect mientras carga (base64 inline de 10x15px)
    - [ ] Unload de imágenes fuera de viewport si total > 50 (LRU cache)
  - [ ] Backend: Pre-generación de thumbnails
    - [ ] Convertir covers a WebP 300x400px en `%AppData%/Balam/thumbs/`
    - [ ] Calidad: 85% (balance tamaño/calidad)
    - [ ] Comando `generate_thumbnail(source_path)` al descargar imagen

### 🔍 Async Game Scanning (Non-blocking)
- [ ] **Background Game Discovery**
  - [ ] Backend: `tokio::spawn_blocking` para escaneo
    - [ ] Escanear Steam/Epic/GOG/Xbox en thread separado
    - [ ] Emitir evento `game-found` por cada juego descubierto
    - [ ] Emitir `scan-progress` cada 10 juegos (para progress bar)
    - [ ] Emitir `scan-complete` al finalizar
  - [ ] Frontend UI:
    - [ ] Progress bar: "Escaneando biblioteca... 45/120"
    - [ ] No bloquear navegación durante scan
    - [ ] Mostrar juegos incrementalmente conforme se encuentran
  - [ ] Incremental Update:
    - [ ] File watcher: Detectar cambios en carpetas de instalación
    - [ ] Solo re-escanear carpetas modificadas (comparar timestamps)

### 🚀 Boot Optimization (Startup Performance)
- [ ] **Fast Startup (<2 segundos)**
  - [ ] Splash Screen:
    - [ ] HTML estática mostrando logo de Balam (<500ms desde `main()`)
    - [ ] Sin JS/React en splash (puro HTML+CSS inline)
  - [ ] Code Splitting:
    - [ ] Lazy load componentes pesados: `const Blade = React.lazy(() => import('./Blade'))`
    - [ ] Lazy load File Explorer solo al invocar
  - [ ] Bundle Optimization:
    - [ ] Minify JS/CSS (Vite production build)
    - [ ] Tree-shaking: Eliminar código muerto
    - [ ] Comprimir assets con gzip/brotli
    - [ ] Precompile: SQLite queries en constantes
  - [ ] Testing:
    - [ ] Medir con `console.time()` desde `window.onload` hasta render completo
    - [ ] Target: <2s en SSD, <3s en HDD

### 📊 System Metrics (Background Monitoring)
- [ ] **Non-blocking Performance Monitor**
  - [ ] Backend: `sysinfo` crate + Tokio async loop
    - [ ] Implementación:
      ```rust
      tokio::spawn(async move {
          let mut sys = System::new_all();
          loop {
              sys.refresh_all();
              let stats = SystemStats {
                  cpu_usage: sys.global_cpu_info().cpu_usage(),
                  ram_used: sys.used_memory(),
                  ram_total: sys.total_memory(),
                  gpu_usage: get_gpu_usage(), // Via NVML/ADL
                  temps: get_temps(), // CPU/GPU
              };
              app.emit_all("system-stats", stats);
              tokio::time::sleep(Duration::from_secs(1)).await; // 1Hz
          }
      });
      ```
  - [ ] Smart Throttling:
    - [ ] Solo enviar eventos si Blade está abierto (check frontend state)
    - [ ] Pausar loop si ventana está oculta (`window.hidden`)
  - [ ] Frontend UI:
    - [ ] Mini widget en Blade con barras de progreso
    - [ ] Colores: Verde (<70%) / Amarillo (70-85%) / Rojo (>85%)

---

## 🟢 FASE 3: TIER 2 - BALAM BLADE EXPERIENCE
**Features de consola moderna: Performance tuning, captura, controles rápid
os**

### 🎨 Blade UX Polish (Inmersión)
- [ ] **Visual Refinement**
  - [ ] Reducir ancho del Blade a 30-35% de pantalla (menos intrusivo)
  - [ ] Glassmorphism real: `backdrop-filter: blur(20px)` con tintado oscuro dinámico
  - [ ] Spring animations (<200ms): Usar `cubic-bezier(0.34, 1.56, 0.64, 1)` para entrada/salida rápida
  - [ ] Sonidos UI: Whoosh al abrir, Click suave al navegar (Web Audio API)

### ⚡ Performance Control Universal (TDP/GPU)
- [ ] **Backend: RyzenAdj Integration (AMD Universal)**
  - [ ] Empaquetado:
    - [ ] Incluir `ryzenadj.exe` + `WinRing0x64.sys` en `tools/ryzenadj/`
    - [ ] Licencia MIT (verificar redistribución legal)
  - [ ] Auto-instalación de driver:
    - [ ] Primer uso: Detectar si `WinRing0` está cargado
    - [ ] Si no → Solicitar permisos admin (UAC)
    - [ ] Instalar driver silenciosamente
    - [ ] UI: Modal "Balam Performance Control" explicando necesidad
  - [ ] Comandos:
    - [ ] `set_tdp(watts)` - Configurar TDP (STAPM/Fast/Slow limits)
    - [ ] `set_gpu_clock(mhz_min, mhz_max)` - Frecuencias GPU
    - [ ] `set_temp_limit(celsius)` - Temperatura máxima CPU
    - [ ] Wrapper: `Command::new("ryzenadj.exe").args([...]).output()?`
  - [ ] Conflict Detection:
    - [ ] Detectar Armoury Crate / Legion Space corriendo
    - [ ] Modal: "Software OEM detectado. ¿Desactivar para usar Balam?" → Opciones: [Desactivar OEM] [Mantener OEM]
- [ ] **Frontend UI:**
  - [ ] **TDP Control:**
    - [ ] Slider 5W - 30W (steps de 1W)
    - [ ] Presets: 🍃 Eco (8W) | ⚖️ Balanced (15W) | 🚀 Turbo (25W)
    - [ ] Indicador de consumo estimado en Watts real-time
  - [ ] **GPU Boost:**
    - [ ] Toggle "GPU Overclock" (+200MHz en max_gfxclk)
    - [ ] Warning: "Aumenta temperatura y consumo"
  - [ ] **Thermal:**
    - [ ] Slider objetivo temperatura: 70-95°C
    - [ ] Iconos: ❄️ Silencioso (70°C) → 🔥 Performance (90°C)

### 🖥️ Display Controls (Quick Settings)
- [ ] **Backend: Windows Display API**
  - [ ] `set_brightness(percentage)` - Ajustar brillo monitor/laptop
    - [ ] Win32: `SetMonitorBrightness` (requiere DDC/CI support)
    - [ ] Fallback: WMI `WmiSetBrightness` para laptops
  - [ ] `toggle_hdr(enabled)` - Activar/desactivar HDR
    - [ ] Win32: `SetHdrState` via DXGI
  - [ ] `change_resolution(width, height)` - Cambiar resolución
    - [ ] Win32: `ChangeDisplaySettings`
- [ ] **Frontend UI:**
  - [ ] Slider de brillo (0-100%, solo si hardware soporta)
  - [ ] Toggle HDR On/Off
  - [ ] Quick resolution: Buttons [1080p] [720p] (para boost FPS en handhelds)

### 📸 Screenshot System (Captura)
- [ ] **Backend: Framebuffer Capture**
  - [ ] `capture_screenshot()` - Capturar pantalla actual
    - [ ] Win32: `BitBlt` para captura de framebuffer
    - [ ] Guardar en `%USERPROFILE%\Pictures\Balam\screenshot_YYYYMMDD_HHMMSS.png`
    - [ ] Comprimir con PNG optimizado (oxipng)
  - [ ] Auto-hide Blade:
    - [ ] Delay de 100ms antes de captura (para que Blade se oculte)
    - [ ] Re-mostrar Blade después de captura
- [ ] **Frontend UI:**
  - [ ] Botón dedicado en Blade: 📸 "Captura"
  - [ ] Feedback:
    - [ ] Sonido de obturador (shutter.wav)
    - [ ] Toast notification: "Guardado en Galería Balam"
    - [ ] Thumbnail preview (fade-out después de 2s)
  - [ ] **(Futuro) Galería:**
    - [ ] Ver últimas 20 capturas
    - [ ] Botones: Ver / Borrar / Compartir (copy to clipboard)

### 🎮 FPS Limiter (Smart Adaptive)
- [ ] **Backend: Multi-Layer System**
  - [ ] **Layer 1: RTSS Integration (Primaria)**
    - [ ] `detect_rtss()` - Buscar RTSS instalado en rutas comunes
    - [ ] `set_rtss_fps_limit(fps)` - Control via shared memory
      - [ ] Shared memory segment: "RTSSSharedMemoryV2"
      - [ ] Escribir estructura con FPS limit
    - [ ] Fallback: Si no está instalado, ofrecer instalación guiada
    - [ ] Optional: Empaquetar RTSS con Balam (verificar licencia freeware)
  - [ ] **Layer 2: In-Game Config Modifier (Secundaria)**
    - [ ] `detect_game_engine(path)` - Identificar engine (UE4/5, Unity, Source)
    - [ ] Modificar config files:
      - [ ] Unreal Engine: `GameUserSettings.ini` → `FrameRateLimit=60`
      - [ ] Unity: Launch parameter `-refreshrate 60`
      - [ ] Source: Console command `fps_max 60`
  - [ ] **Layer 3: Power Throttle (Fallback Universal)**
    - [ ] Auto-TDP basado en FPS real:
      ```rust
      if current_fps > target * 1.1 { reduce_tdp_by(2); }
      else if current_fps < target * 0.95 { increase_tdp_by(2); }
      ```
    - [ ] Loop de monitoring: 0.5Hz check
    - [ ] Requiere `get_current_fps()` via PresentMon o similar
- [ ] **Frontend UI:**
  - [ ] Slider FPS: 30 / 40 / 60 / 90 / 120 / 144 / Uncapped
  - [ ] Indicador de método activo:
    - [ ] 🎯 "RTSS - High Precision"
    - [ ] 🎮 "In-Game Config"
    - [ ] ⚡ "Power Throttle Mode"
  - [ ] Toggle "Match Refresh Rate" (ajustar Hz del monitor al FPS limit)
- [ ] **Testing:**
  - [ ] Validar con juegos pesados: Cyberpunk 2077, Elden Ring, RDR2
  - [ ] Validar anti-cheats: Valorant, Fortnite, Apex Legends (verificar no bans)

---

## 🔵 FASE 4: REACT PERFORMANCE TUNING
**Optimizaciones micro para UI fluida (60fps garantizado)**

### ⚛️ React Re-render Prevention
- [ ] `React.memo()` en componentes pesados:
  - [ ] `<Card>` (renderizado 100+ veces)
  - [ ] `<InGameMenu>` (Blade overlay)
  - [ ] `<Sidebar>` (menú lateral)
- [ ] `useCallback` para event handlers que se pasan como props
- [ ] `useMemo` para cálculos costosos (ej: filtrado de juegos)
- [ ] Context API dividido:
  - [ ] Separar `GameContext` en: `GameDataContext` + `GameUIContext`
  - [ ] Evitar re-renders de toda la app cuando solo cambia UI state

### 🎨 GPU Acceleration CSS
- [ ] `will-change: transform` en elementos animados (Blade slide, Card hover)
- [ ] `transform: translateZ(0)` para forzar GPU layer en elementos críticos
- [ ] Evitar `box-shadow` animados (muy pesados):
  - [ ] Usar `filter: drop-shadow()` en su lugar
  - [ ] O pre-renderizar sombra en imagen PNG

### 🧠 Memory Management
- [ ] **Image Pool con LRU Cache:**
  - [ ] Max 50 imágenes en memoria simultáneamente
  - [ ] Eviction policy: Least Recently Used
  - [ ] `useEffect` cleanup: Revocar `ObjectURL` al desmontar `<Card>`
- [ ] **Unload Inactive Views:**
  - [ ] Cuando usuario está jugando (window hidden), liberar memoria de Dashboard
  - [ ] Re-cargar al mostrar ventana (`visibilitychange` event)

---

## 🟣 FASE 5: ADVANCED FEATURES (Post-Launch)
**Features avanzadas que requieren R&D o partnerships**

### 🎵 Media Controls (Sistema)
- [ ] Integración con SMTC (System Media Transport Controls)
  - [ ] Mostrar canción actual (Spotify/YouTube/Sistema)
  - [ ] Botones: Play/Pause, Next, Previous
  - [ ] Artwork del álbum en Blade

### 🏆 Achievements Tracking (Steam/Xbox)
- [ ] Integración Steam API:
  - [ ] Mostrar logros del juego actual
  - [ ] Progreso: "80% - Falta 1 logro para Platino"
- [ ] Integración Xbox Live:
  - [ ] Gamerscore tracking
  - [ ] Sincronización de logros

### 🌬️ Fan Curves (Hardware Control)
- [ ] Integración con NBFC (NoteBook Fan Control):
  - [ ] Curvas personalizadas de ventiladores
  - [ ] Perfiles: Silent / Balanced / Performance

### 🎬 Replay Buffer (30s Clip)
- [ ] Investigar APIs:
  - [ ] OBS Studio API (si está instalado)
  - [ ] Windows Game DVR (`Windows.Media.AppRecording`)
- [ ] Guardar últimos 30s de gameplay al pulsar hotkey

---

## 🧹 DEUDA TÉCNICA (Continuous)
- [x] Migrar `println!` a `tracing` (logs estructurados)
- [x] Habilitar CSP y Asset Protocol en `tauri.conf.json`
- [x] Deduplicación de juegos por PE Headers
- [ ] **Eliminar Debug Visual:** Quitar texto amarillo de IDs en `App.tsx`
- [ ] **Cleanup Código:** Remover funciones/imports no usados
- [ ] **Unit Tests:** Rust (críticos: TDP control, game launch, crash recovery)
- [ ] **Integration Tests:** UI (Playwright para flujos de usuario)

---

## 📊 LEYENDA DE ARQUITECTURA

| Símbolo | Significado |
|---------|-------------|
| *Rust* | Implementación 100% nativa en backend (Tauri) |
| *Frontend* | Implementación 100% en React/TypeScript |
| *Híbrido* | Rust para lógica/datos, React para UI |
| ✅ | Comprobado y verificado funcionando |
| ⚠️ | Funcionalidad con limitaciones conocidas |
| ❌ | Bloqueado técnicamente o fuera de scope |

---

## 🎯 ROADMAP DE PRIORIDADES

**Mes 1:** TIER 0 (Shell Survival) - WiFi, BT, Virtual Keyboard, Power, Watchdog
**Mes 2:** TIER 1 (Performance Core) - Virtualización, SQLite, Lazy Loading, Fast Boot
**Mes 3:** TIER 2 (Blade Experience) - TDP, GPU, Display, Screenshots, FPS Limiter
**Mes 4:** TIER 3 (Polish) - React Tuning, UI Animations, Sounds
**Mes 5+:** Advanced Features (Media, Achievements, Fans, Replay)

---

## 📈 MÉTRICAS DE ÉXITO

- **Boot Time:** <2s desde Windows startup hasta UI visible
- **FPS UI:** 60fps constante en navegación (max 16ms frame time)
- **Memory:** <200MB RAM en idle, <500MB con 500 juegos cargados
- **Game Launch:** <1s desde click hasta `hide()` de ventana
- **Blade Toggle:** <100ms desde hotkey hasta visible
- **WiFi Connect:** <3s desde click hasta conexión establecida
- **Crash Rate:** <0.1% (1 crash por 1000 sesiones)

---

**Última actualización:** 2026-01-29  
**Versión Target:** Balam v1.0 "Phoenix"
