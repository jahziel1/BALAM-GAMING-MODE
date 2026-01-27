# Console Experience (Shell Game)

Transforma tu PC con Windows en una experiencia de consola dedicada. Sin distracciones, control total con Gamepad y gestión inteligente de procesos.

## 🚀 Características Principales

### 🎮 Gestión de Juegos Universal
- **Steam:** Detección automática vía Registro y archivos `appmanifest`.
- **Epic Games:** Escaneo de manifiestos y ejecutables.
- **Xbox / UWP:** Soporte completo para juegos de la Microsoft Store (Game Pass).
- **Cache Inteligente:** Carga instantánea de la biblioteca tras el primer escaneo.

### ⚡ Lanzamiento y Control (Process Watchdog)
- **Lanzamiento Nativo:**
  - **Steam:** Protocolo `steam://`
  - **Epic/Nativo:** Ejecución directa `.exe`
  - **Xbox:** Activación nativa `IApplicationActivationManager` (PID Real).
- **Monitorización (Watchdog):** Detecta cuando un juego se cierra para restaurar el foco a la consola automáticamente.
- **Cierre Forzoso (Kill):** Capacidad de cerrar juegos rebeldes desde el menú (Overlay).

### 🕹️ Experiencia de Usuario (UX)
- **Navegación con Gamepad:** Soporte nativo para mandos (Xbox/PS) en toda la interfaz.
- **Overlay In-Game:** Menú superpuesto global (Ctrl+Shift+Q o Botón Guía) para salir o cambiar de juego sin Alt-Tab.
- **Modo Quiosco:** Diseñado para reemplazar `explorer.exe` (Shell Replacement).

## 🛠️ Arquitectura Técnica

### Backend (Rust + Tauri)
- **Hexagonal Architecture:** Separación clara entre Dominio, Puertos y Adaptadores.
- **Win32 API & COM:** Uso intensivo de `windows-rs` para control de procesos y ventanas.
- **Scanner Híbrido:**
  - `SteamScanner` / `EpicScanner`: Lectura de sistema de archivos (Rust puro).
  - `XboxScanner`: Integración PowerShell optimizada para máxima compatibilidad.
- **Process Launcher:** Gestión de PIDs y Job Objects para asegurar limpieza de recursos.

### Frontend (React + Vite)
- **Performance:** Virtualización de listas para bibliotecas grandes.
- **Diseño:** Interfaz minimalista "TV-First".

## 📦 Instalación y Desarrollo

### Requisitos
- Windows 10/11
- Rust (Cargo)
- Node.js (npm)
- WebView2 Runtime

### Comandos
```bash
# Instalar dependencias frontend
npm install

# Iniciar en modo desarrollo (Hot Reload)
npm run tauri dev

# Compilar para producción
npm run tauri build
```

## 📝 Estado del Proyecto
Consulta [CHECKLIST.md](./CHECKLIST.md) para ver el progreso detallado y el roadmap.
