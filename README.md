# Console Experience (Balam Shell)

Transforma tu PC con Windows en una experiencia de consola dedicada. Sin distracciones, control total con Gamepad (blindado) y gestión inteligente de procesos.

## 🚀 Características Principales

### 🎮 Gestión de Juegos Universal (Scanner Engine)
- **Steam:** Detección precisa vía Registro de Windows + análisis de `libraryfolders.vdf`.
- **Epic Games:** Escaneo directo de manifiestos `.item` y validación de ejecutables.
- **Xbox / UWP:** Soporte nativo para juegos de la Microsoft Store (Game Pass) vía PowerShell bridge.
- **Cache Inteligente:** Sistema de cache persistente (`games_cache.json`) para carga instantánea (<1s).

### 🕹️ Control Universal (Immortal Input Architecture)
- **Arquitectura Híbrida Blindada:**
  - **Frontend (Web):** Navegación fluida de alta precisión para UI (Menús, Biblioteca).
  - **Backend (Rust/XInput/Gilrs):** Motor de monitoreo en **segundo plano** que nunca pierde el foco.
- **Soporte Multi-Dispositivo:** 
  - ✅ **Xbox One / Series:** Protocolo nativo XInput.
  - ✅ **PlayStation 4/5:** Detección universal vía Gilrs.
  - ✅ **Nintendo Switch:** Soporte para Pro Controller.
- **Despertador Global:** Combinación **`LB + RB + START`** (o gatillos + start) invoca el Shell instantáneamente desde dentro de cualquier juego.

### ⚡ Lanzamiento y Gestión (Process Watchdog)
- **Activación Real de PID:** 
  - Lanzamiento de aplicaciones UWP obteniendo su PID real (crítico para monitoreo).
  - Protocolo `steam://` optimizado.
- **In-Game Overlay:** 
  - Menú de pausa nativo con opciones de **Resume**, **Library** y **Quit**.
  - Detección inteligente de "Juego en Curso" con navegación intuitiva (botón Back regresa al menú de pausa).
- **Task Killer:** Capacidad de cerrar forzosamente juegos congelados o rebeldes desde el mando.

## 🛠️ Arquitectura Técnica

### Backend (Rust + Tauri v2)
- **Principios SOLID:** Código modular con adaptadores específicos (`gamepad_adapter`, `windows_system_adapter`).
- **Resiliencia (Fault Tolerance):** 
  - El monitor de Gamepad corre en un hilo dedicado con recuperación automática.
  - Uso de `COINIT_APARTMENTTHREADED` para máxima compatibilidad con drivers de Windows.
- **Dual-Channel Input:** Sistema redundante que mezcla señales Web y Nativas con *debounce* inteligente para evitar inputs fantasma.

### Frontend (React + Vite + TypeScript)
- **Diseño TV-First:** UI escalable, legible a distancia y controlable 100% sin ratón.
- **Estado Inmutable:** Gestión de foco visual y navegación mediante un Dispatcher centralizado.
- **Feedback Visual:** Indicadores de estado de mando, insignias de "Playing Now" y efectos de brillo.

## 📦 Instalación y Desarrollo

### Requisitos
- Windows 10/11 (x64)
- Rust (Cargo)
- Node.js (npm/pnpm)
- Mando Compatible (Recomendado: Xbox)

### Comandos
```bash
# Instalar dependencias
cd console-experience
npm install

# Iniciar en modo desarrollo con Hot Reload (Frontend + Rust)
npm run tauri dev

# Compilar release optimizada
npm run tauri build
```

## 📝 Estado del Proyecto
Consulta [CHECKLIST.md](./CHECKLIST.md) para ver el progreso detallado y el roadmap.
