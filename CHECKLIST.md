# Estado del Proyecto y Checklist

## 🟢 Implementado y Robusto (Stable)

### 🕹️ Input & Control (Universal)
- [x] **Arquitectura Input Inmortal (Dual-Channel)** — Rust (XInput/Gilrs) + Web (Gamepad API)
- [x] **Soporte Multi-Plataforma:** Xbox, PlayStation, Switch
- [x] **Global Wake-Up:** Combo `LB + RB + START` funcional en segundo plano
- [x] **Paridad UX de Consola:** Navegación intuitiva, indicadores visuales sincronizados
- [ ] **Feedback Háptico (Vibración):** Confirmaciones táctiles al lanzar/cerrar juegos — *Rust (Gilrs)*

### 🎮 Gestión de Juegos (Backend Nativo)
- [x] **Scanner Universal (Básico):** Steam (Solo ruta default) + Epic + Xbox/UWP — *Rust*
  - *Nota: Actualmente ignora bibliotecas en discos secundarios.*
- [ ] **Scanner Multi-Librería (Steam):** Soporte para discos externos (D:, E:) leyendo `libraryfolders.vdf` — *Rust*
- [x] **Registry Watchdog (Steam):** Detección de ruta de instalación — *Rust (winreg)*
- [x] **Process Watchdog (Genérico):** Detección por PID — *Rust (sysinfo)*
- [x] **UWP Native Launch:** Activación COM con PID real — *Rust (IApplicationActivationManager)*
- [x] **Task Killer Universal:** Steam/Epic/UWP — *Rust*
- [x] **Cache Persistente (Básico):** Carga instantánea JSON — *Rust (serde_json)*
  - *Nota: Falta validación de esquema y recuperación ante corrupción de archivo.*
- [ ] **Validación de Integridad de Cache:** Versionado de esquema para evitar crashes tras updates — *Rust*

### 🖥️ Frontend (React UI)
- [x] **CSS Fluido:** Variables con `clamp()` para escalado TV/Handheld
- [x] **Memoización:** Componente Card optimizado con `React.memo()`
- [x] **Mode Selector:** Biblioteca ↔ In-Game Menu
- [ ] **Launch Feedback (Juice):** Spinner/Animación visual inmediata al pulsar "Jugar" para confirmar acción


### 🏗️ Arquitectura
- [x] **Hexagonal (Rust):** `adapters/`, `ports/`, `domain/`
- [x] **Tauri v2:** Build moderno y ligero (~50MB RAM)

---

## 🟡 Fase 1: MVP Premium (Prioridad Alta)

### 🖼️ Metadatos Ricos — *Híbrido*
- [ ] **SteamGridDB/IGDB Integration** — Backend descarga, Frontend muestra
  - [ ] `metadata_fetcher.rs`: HTTP client + cache de imágenes — *Rust (reqwest)*
  - [ ] Portadas HD (600x900) guardadas en `AppData/Local/Balam/covers/`
  - [ ] Fondos dinámicos (hero art) por juego
  - [ ] Fallback a icono local si no hay conexión

### 🔊 Audio Feedback (SFX) — *Web (v1) → Rust (v2)*
- [ ] **Sonidos de Navegación** — Web Audio API
  - [ ] `nav.wav` (mover), `select.wav` (confirmar), `back.wav` (regresar)
  - [ ] Volumen sincronizado con volumen del sistema
  - [ ] *Futuro:* Migrar a `rodio` (Rust) si hay latencia

### ⌨️ Teclado Virtual — *100% Frontend*
- [ ] **On-Screen Keyboard** — React Component
  - [ ] Grid QWERTY navegable con D-Pad
  - [ ] Soporte para búsqueda y futuros inputs
  - [ ] Animaciones suaves

### 🔍 Buscador / Filtros — *100% Frontend*
- [ ] **Búsqueda por Nombre** — React + fuse.js
- [ ] **Filtros Rápidos:** Instalado, Steam, Epic, Xbox, Favoritos
- [ ] Resultados en tiempo real (<16ms)

### 🔔 Notificaciones Toast — *Híbrido*
- [ ] **Sistema de Toasts** — Rust emite, React renderiza
  - [ ] "Juego cerrado", "Nuevo juego detectado", "Error de lanzamiento"
  - [ ] Animaciones CSS (slide-in, fade-out)

### ⏰ Reloj Visible — *100% Frontend*
- [ ] **Mostrar Hora** — Componente en TopBar
  - [ ] Formato 12h/24h según preferencia
  - [ ] Fecha opcional al hacer hover/focus

### 🎨 Fondos Dinámicos — *Híbrido*
- [ ] **Hero Art por Juego** — Cambiar fondo al seleccionar juego
  - [ ] Imágenes de SteamGridDB (hero/background)
  - [ ] Transición suave con fade
  - [ ] Fallback a gradiente si no hay imagen

### 🖥️ Panel de Performance — *Rust (sysinfo) + Frontend*
- [ ] **Métricas del Sistema** — Mostrar en overlay o Settings
  - [ ] CPU % uso
  - [ ] RAM usada / total
  - [ ] GPU % (si disponible vía WMI)
  - [ ] Temperaturas (si disponible)

### 🖼️ Screensaver / Modo Inactivo — *100% Frontend*
- [ ] **Activar tras X minutos sin input**
  - [ ] Slideshow de carátulas de juegos
  - [ ] Despertar con cualquier botón
  - [ ] Tiempo configurable en Settings

### 🎵 Música Ambiental (Opcional) — *Web Audio API*
- [ ] **Música de fondo en el Shell**
  - [ ] Toggle on/off en Settings
  - [ ] Volumen independiente
  - [ ] Loop suave sin cortes

---

## 🟠 Fase 2: Feature Parity con Steam Big Picture

### ⚙️ Configuración de Sistema — *100% Backend Nativo (Win32/WinRT)*

#### 🔊 Audio
- [ ] **Volumen Master** — *Rust (IAudioEndpointVolume)*
- [ ] **Mute/Unmute** — *Rust (IAudioEndpointVolume)*
- [ ] **Seleccionar Dispositivo de Salida** — *Rust (IMMDeviceEnumerator)*
  - [ ] Listar: Altavoces, Auriculares, HDMI, etc.
  - [ ] Cambiar dispositivo activo

#### 🖥️ Pantalla
- [ ] **Brillo** — *Rust (SetMonitorBrightness / WMI)*
  - [ ] Solo monitores con DDC/CI (la mayoría de externos)
- [ ] **Resolución + Refresh Rate** — *Rust (ChangeDisplaySettingsEx)*
  - [ ] Listar modos disponibles (1080p@60, 1440p@144, etc.)
  - [ ] Aplicar sin reinicio
- [ ] **Modo Noche (Night Light)** — *Rust (Registry: BlueLightReductionState)*
  - [ ] Toggle on/off del filtro de luz azul

#### 🌐 Conectividad
- [ ] **WiFi: Ver Redes** — *Rust (WlanScan + WlanGetAvailableNetworkList)*
- [ ] **WiFi: Conectar/Desconectar** — *Rust (WlanConnect / WlanDisconnect)*
- [ ] **WiFi: Estado Actual** — *Rust (WlanQueryInterface)*
  - [ ] SSID conectado, señal, velocidad
- [ ] **Bluetooth: Toggle On/Off** — *Rust (bthserv service + WinRT Radio)*
- [ ] **Modo Avión** — *Rust (WinRT RadioAccessStatus)*

#### ⚡ Energía
- [ ] **Apagar / Reiniciar / Suspender** — Ya implementado ✅
- [ ] **Plan de Energía** — *Rust (PowerSetActiveScheme)*
  - [ ] Cambiar entre: Balanced, High Performance, Power Saver
- [ ] **Batería: Nivel + Estado** — *Rust (GetSystemPowerStatus)*
  - [ ] Mostrar % y si está cargando/descargando
  - [ ] Tiempo restante estimado

#### 🎮 Controladores
- [ ] **Ver Gamepads Conectados** — Ya implementado ✅
- [ ] **Vibración: Toggle On/Off** — *Rust (XInputSetState)*
- [ ] **Intensidad de Vibración** — *Rust (XInputSetState)*
  - [ ] Slider 0-100%

#### 💾 Almacenamiento
- [ ] **Espacio en Disco** — *Rust (GetDiskFreeSpaceEx)*
  - [ ] Mostrar: "C: 245 GB libres de 500 GB"
  - [ ] Barra visual de uso

#### 🔒 Sistema
- [ ] **Bloquear PC (Lock)** — *Rust (LockWorkStation)*
- [ ] **No Molestar (Focus Assist)** — *Rust (Registry: FocusAssistState)*
  - [ ] Silenciar notificaciones de Windows

- [ ] UI de Settings navegable con gamepad — *Frontend*

### 🎨 Personalización — *Híbrido*
- [ ] **Temas de Color:** Dark, Light, OLED Black, Xbox Green, PS Blue
  - [ ] CSS Variables dinámicas — *Frontend*
  - [ ] Persistencia en `config.json` — *Rust*

### 📊 Estadísticas de Juego — *100% Local (Offline-First)*
- [ ] **Tracking Universal** — *Rust (Watchdog ya existente)*
  - [ ] Guardar timestamp inicio/fin de cada sesión en SQLite
  - [ ] Calcular tiempo total jugado por juego
  - [ ] Sin APIs externas, sin configuración del usuario
- [ ] **Base de Datos:** SQLite local en `AppData/Local/Balam/stats.db` — *Rust (rusqlite)*
- [ ] **Mostrar en Tarjeta:** "Jugado 12.5 horas" — *Frontend*
- [ ] **Historial de Sesiones:** Última sesión, fecha, duración — *Frontend*

### 🔄 Auto-Inicio — *100% Backend Nativo*
- [ ] **Registro de Windows** — *Rust (winreg)*
  - [ ] Escribir en `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
  - [ ] Toggle en Settings UI

### 📱 Detección de Dispositivo — *Rust (WMI + Win32)*
- [ ] **Detectar Tipo de Dispositivo:**
  - [ ] Desktop (sin batería, chassis tipo 3/6)
  - [ ] Laptop (con batería, chassis tipo 9/10)
  - [ ] Tablet (pantalla táctil, chassis tipo 30/31)
  - [ ] Handheld (Steam Deck, ROG Ally, Legion Go, GPD Win)
- [ ] **WMI Queries:** `Win32_SystemEnclosure.ChassisTypes`, `Win32_ComputerSystem.Model`
- [ ] **Adaptar UI:**
  - [ ] Ocultar sección batería en Desktop
  - [ ] Fuentes más grandes en Handheld
  - [ ] Tips específicos por dispositivo

### 🎮 Ajustes de Controlador (Solo Shell) — *Híbrido*
- [ ] **Deadzone Personalizado** — Slider por usuario (solo afecta navegación del Shell)
- [ ] **Personalizar combo Wake-Up** — Cambiar LB+RB+START a otra combinación

> **Nota:** El remapeo de botones a nivel de sistema y la calibración de joystick requieren drivers externos (ViGEmBus, DS4Windows) o la UI nativa de Windows. Estos quedan **fuera del scope** para mantener una experiencia zero-config.

---

## 🔴 Fase 3: Superar Steam Big Picture

### 🎮 Scanners Adicionales — *100% Backend Nativo*
- [ ] **GOG Scanner** — *Rust*
  - [ ] Leer registro de GOG Galaxy
  - [ ] Parsear database de instalación
- [ ] **Emulator Scanner** — *Rust*
  - [ ] Detectar RetroArch, Dolphin, RPCS3, PCSX2, Yuzu/Ryujinx
  - [ ] Configurar rutas de ROMs
- [ ] **Itch.io Scanner** — *Rust*
  - [ ] Leer SQLite de la app itch
- [ ] **Epic Watchdog Mejorado** — *Rust*
  - [ ] Fallback a monitoreo por directorio si PID cambia

### 🖥️ Modo Shell Puro (Kiosk) — *100% Backend Nativo*
- [ ] **Shell Replacement** — *Rust*
  - [ ] `taskkill /F /IM explorer.exe` al activar
  - [ ] Restaurar explorer al salir o crashear
  - [ ] Manejo de errores robusto
- [ ] **Bloqueo de Alt+Tab** — *Rust (SetWindowsHookEx)*

### 👤 Perfil de Usuario — *Híbrido*
- [ ] **Sistema de Perfiles** — Rust (SQLite) + React (UI)
  - [ ] Múltiples usuarios
  - [ ] Estadísticas y favoritos por perfil
  - [ ] Avatar personalizable

### 🌐 Navegador Integrado — *WebView Nativo*
- [ ] **Abrir URLs in-app** — Tauri WebView
- [ ] Navegación con gamepad (experimental)

---

## 🔮 Fase 4: Red Social P2P (Muy Futuro - Experimental)

> ⚠️ **Nota:** Esta fase es experimental y de muy largo plazo. No es necesaria para igualar Steam Big Picture. Se incluye como visión a futuro.

### 💬 Balam Network — *Rust (libp2p + Kademlia DHT)*
- [ ] **Integrar libp2p** — Cada Shell es un nodo de la red P2P
- [ ] **Conectar a red DHT existente (IPFS)** — Sin servidor propio, $0 de infraestructura
- [ ] **Identidad Descentralizada** — Cada usuario tiene un PeerId único (keypair local)
- [ ] **Sistema de Amigos** — Agregar amigos por ID o código QR
- [ ] **Estado "Now Playing"** — Publicar qué juego estás jugando a tus amigos
- [ ] **Chat P2P Encriptado** — Mensajes directos sin servidor central
- [ ] **Invitar a Juego** — Notificación P2P para unirse a partida

> **Arquitectura:** Cada usuario con Balam Shell instalado ES parte de la infraestructura. No hay costos de servidor porque la red es los usuarios mismos.

## 🧹 Deuda Técnica (Tech Debt)

### Limpieza de Código
- [ ] Eliminar `greet()` de `lib.rs` — Template sin usar
- [ ] Eliminar `useGamepad.ts` — Hook obsoleto
- [ ] Migrar `println!` a `tracing` — Logs estructurados

### Seguridad
- [ ] Habilitar CSP en `tauri.conf.json`
- [ ] Validar rutas en `launch_game` y `kill_game`
- [ ] Sanitizar inputs de usuario

### Performance
- [ ] Optimizar `sysinfo`: usar `refresh_process(pid)` en vez de `new_all()`
- [ ] Scan Asíncrono: no bloquear UI durante escaneo inicial

### Build & Distribución
- [ ] Instalador MSI (Tauri WiX)
- [ ] Auto-Update (tauri-plugin-updater)
- [ ] Modo Portable (.exe standalone)
- [ ] Firma de Código (certificado)

---

## 🐛 Bugs Conocidos
- [ ] Mouse requiere clic inicial tras minimizar (mitigado por canal nativo)

---

## 📊 Leyenda de Arquitectura

| Símbolo | Significado |
|---------|-------------|
| *Rust* | Implementación 100% nativa en backend |
| *Frontend* | Implementación 100% en React/Web |
| *Híbrido* | Rust para lógica/datos, React para UI |
| *WebView Nativo* | Usa el WebView de Tauri directamente |
