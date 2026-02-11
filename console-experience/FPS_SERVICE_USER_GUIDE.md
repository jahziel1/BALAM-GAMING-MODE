# 🎮 FPS Service - Guía de Usuario Final

## 📋 Tabla de Contenidos

1. [Overview](#overview)
2. [Cómo Funciona](#cómo-funciona)
3. [Instalación Automática](#instalación-automática)
4. [Uso para el Usuario Final](#uso-para-el-usuario-final)
5. [Arquitectura Técnica](#arquitectura-técnica)
6. [Resolución de Problemas](#resolución-de-problemas)

---

## Overview

El servicio de FPS de Balam proporciona monitoreo en tiempo real de FPS usando Event Tracing for Windows (ETW) para capturar eventos DXGI Present directamente desde juegos DirectX.

### ✨ Características

- ✅ **FPS Real Preciso** - Captura eventos DXGI directamente del kernel
- ✅ **Filtrado Inteligente** - Ignora DWM, Explorer y otros procesos del sistema
- ✅ **Multi-Proceso** - Trackea múltiples juegos simultáneamente
- ✅ **Rango Razonable** - Solo muestra FPS de 10-240 (filtra valores irreales)
- ✅ **DirectX 9/11/12** - Compatible con la mayoría de juegos AAA
- ✅ **Bajo Overhead** - ~1-2% CPU, imperceptible en juegos

---

## Cómo Funciona

### Flujo de Datos

```
Juego DirectX
    ↓ (Present calls)
DXGI Provider (Kernel)
    ↓ (ETW events)
Balam FPS Service (Windows Service)
    ↓ (procesa eventos, filtra procesos)
Named Pipe IPC
    ↓ (FPS data)
Balam App (Tauri)
    ↓ (muestra en UI)
PiP Overlay
```

### Filtrado Inteligente

El servicio filtra automáticamente:

- ❌ **dwm.exe** (Desktop Window Manager) - Genera >100 FPS
- ❌ **explorer.exe** - Procesos del sistema
- ❌ **svchost.exe** - Servicios de Windows
- ❌ Procesos con >240 FPS (probablemente overlays)
- ❌ Procesos con <10 FPS (background apps)
- ✅ Solo muestra el juego activo con FPS en rango normal

---

## Instalación Automática

### Bundling con Tauri

El servicio se incluye automáticamente en el instalador de Balam:

**`tauri.conf.json`:**

```json
{
  "build": {
    "beforeBuildCommand": "npm run build:fps-service && npm run build:e2e"
  },
  "bundle": {
    "resources": ["../fps-service/target/release/balam-fps-service.exe"]
  }
}
```

### Script de Build

**`package.json`:**

```json
{
  "scripts": {
    "build:fps-service": "cd fps-service && cargo build --release"
  }
}
```

### Compilación en Release

Cuando compilas Balam para distribución:

```bash
npm run tauri build
```

Esto automáticamente:

1. Compila el servicio FPS en modo release
2. Incluye el binario en el instalador
3. Lo coloca en el directorio de recursos de la app

---

## Uso para el Usuario Final

### Primera Instalación

1. **Usuario descarga e instala Balam**
   - Ejecuta `Balam-Setup.exe`
   - Instalador típico de Windows (Next → Next → Install)
   - NO requiere admin en esta etapa

2. **Usuario abre Balam por primera vez**
   - La app se inicia normalmente
   - El servicio FPS **NO está activo** por defecto
   - No hay impacto en performance

### Habilitar FPS Monitoring

1. **Usuario va a Settings → Performance**

   ```
   Settings
     └─ Performance Tab
         └─ FPS Monitoring Section
             └─ "Real-Time FPS Tracking" Toggle
   ```

2. **Usuario activa el toggle**
   - Clic en el toggle para activar
   - Windows UAC prompt: "¿Permitir que Balam instale servicio de monitoreo?"
   - Usuario hace clic en "Sí"

3. **Instalación automática**
   - Balam copia el binario a una ubicación del sistema
   - Instala el servicio de Windows
   - Inicia el servicio
   - Toggle queda en ON
   - **Mensaje:** "FPS monitoring enabled successfully"

4. **Uso inmediato**
   - Usuario lanza un juego DirectX
   - El overlay PiP muestra FPS real del juego
   - FPS preciso, sin DWM interference

### Deshabilitar FPS Monitoring

1. **Usuario desactiva el toggle**
   - El servicio se detiene (pero queda instalado)
   - No requiere UAC
   - **Mensaje:** "FPS monitoring disabled"

2. **El servicio queda instalado**
   - No consume recursos cuando está detenido
   - Próxima activación es instantánea (sin UAC)

### Desinstalación

Cuando el usuario desinstala Balam:

- El uninstaller detecta y desinstala el servicio FPS
- Limpia todos los archivos
- Windows queda limpio

---

## Arquitectura Técnica

### Componentes

#### 1. Backend (Rust/Tauri)

**`fps_service_manager.rs`:**

- `get_fps_service_status()` - Obtiene estado
- `toggle_fps_service(enabled)` - On/off simple
- `install_fps_service()` - Instalación con admin check
- `uninstall_fps_service()` - Limpieza completa
- `update_fps_service()` - Actualización de binario

#### 2. Hook (React)

**`useFpsService.ts`:**

```typescript
const { status, toggle, requiresAdmin } = useFpsService();

// Toggle simple
await toggle(true); // Enable → UAC prompt si es primera vez
await toggle(false); // Disable → sin UAC
```

#### 3. UI Component

**`FpsServiceToggle.tsx`:**

- Toggle switch profesional
- Indicadores de estado (installed/running)
- Warning de admin cuando necesario
- Lista de features
- Loading states

#### 4. Windows Service

**`balam-fps-service.exe`:**

- Corre como LocalSystem
- Captura eventos ETW de DXGI
- Filtra procesos del sistema
- Expone FPS vía Named Pipe

---

## Resolución de Problemas

### "Administrator privileges required"

**Causa:** Primera activación del servicio

**Solución:**

1. Cerrar Balam
2. Clic derecho en Balam → "Ejecutar como administrador"
3. Ir a Settings → Performance
4. Activar toggle
5. Cerrar y reabrir Balam normalmente

Después de la primera instalación, ya no requiere admin.

---

### "Service not responding"

**Causa:** El servicio crasheó o no se inició

**Solución:**

1. Abrir PowerShell como Administrador
2. Ejecutar:
   ```powershell
   sc query BalamFpsService
   sc start BalamFpsService
   ```
3. Si falla, verificar Event Viewer:
   ```
   Event Viewer → Windows Logs → Application
   Buscar: BalamFpsService
   ```

---

### "FPS shows 0 or not updating"

**Causas posibles:**

1. Juego no es DirectX (Vulkan/OpenGL no soportado aún)
2. Juego en fullscreen exclusivo (ETW limitado)
3. Servicio detenido

**Solución:**

1. Verificar que el toggle esté ON
2. Cambiar juego a borderless windowed
3. Verificar en Settings que el status sea "Active"

---

### "Shows wrong FPS (too high)"

**Causa:** Overlay/DWM no está siendo filtrado correctamente

**Solución:**

1. Actualizar a la última versión de Balam
2. Reportar el nombre del juego para agregar filtrado específico

---

## Para Desarrolladores

### Agregar al Build Pipeline

**GitHub Actions / CI:**

```yaml
- name: Build FPS Service
  run: |
    cd fps-service
    cargo build --release

- name: Build Tauri App
  run: npm run tauri build
```

### Testing Local

```bash
# Compilar servicio
cd fps-service
cargo build --release

# Instalar manualmente para testing
cd ..
npm run tauri dev

# En la app: Settings → Performance → Toggle ON
```

### Actualizar el Servicio

Si haces cambios al servicio FPS:

1. Compilar nueva versión
2. En Balam, el comando `update_fps_service()` automáticamente:
   - Detiene el servicio
   - Reemplaza el binario
   - Reinicia el servicio

---

## Roadmap

### v1.0 (Actual)

- ✅ DirectX 9/11/12 support
- ✅ DWM filtering
- ✅ Multi-process tracking
- ✅ Named Pipe IPC
- ✅ UI Toggle in Settings

### v1.1 (Próximo)

- ⏳ Vulkan/OpenGL support (via DWM events)
- ⏳ Process name display (en lugar de PID)
- ⏳ Frame time graph
- ⏳ Per-game FPS caps

### v2.0 (Futuro)

- ⏳ Multiple overlays (uno por juego)
- ⏳ Frame pacing analysis
- ⏳ Recording de FPS sessions
- ⏳ Cloud sync de stats

---

## Licencia y Créditos

**Tecnologías:**

- Rust + Tauri
- Windows ETW (Event Tracing for Windows)
- React + TypeScript

**Referencias:**

- [PresentMon](https://github.com/GameTechDev/PresentMon) - Inspiración para ETW implementation
- [windows-rs](https://github.com/microsoft/windows-rs) - Windows API bindings

---

**Última actualización:** 2026-02-11
**Versión:** 1.0.0
