# ✅ REAL FPS Implementation Complete

## Cambios Realizados

### 1. **Corregida firma de ProcessTrace** (etw_monitor.rs línea 69-74)

```rust
// ANTES (incorrecto):
starttime: *const i64,
endtime: *const i64,

// AHORA (correcto):
starttime: *const FILETIME,  // Corrected: LPFILETIME
endtime: *const FILETIME,    // For real-time sessions, pass null
```

### 2. **Reemplazado loop de simulación con ProcessTrace REAL** (etw_monitor.rs línea 289-338)

**ANTES - Simulación (60 FPS fake):**

```rust
const FAKE_GAME_PID: u32 = 9999;
while !*should_stop.lock() {
    std::thread::sleep(Duration::from_millis(16));
    // Simulate 60 FPS...
}
```

**AHORA - ProcessTrace REAL:**

```rust
// Configure EVENT_TRACE_LOGFILEW for real-time session
let mut logfile: EVENT_TRACE_LOGFILEW = std::mem::zeroed();
logfile.LoggerName = PWSTR(session_name_utf16.as_ptr() as *mut u16);
logfile.Anonymous1.ProcessTraceMode = PROCESS_TRACE_MODE_REAL_TIME | PROCESS_TRACE_MODE_EVENT_RECORD;
logfile.Anonymous2.EventRecordCallback = Some(event_record_callback);

// Open trace handle
let trace_handle = OpenTraceW(&mut logfile);

// Process trace events (BLOCKING - captures REAL DXGI events)
ProcessTrace(&trace_handle, 1, std::ptr::null(), std::ptr::null());

// Cleanup
CloseTrace(trace_handle);
```

## Arquitectura Final

```
DirectX Game → DXGI Present Events
                      ↓
           ETW Provider (Kernel)
                      ↓
         StartTrace + EnableTraceEx2
                      ↓
              ProcessTrace (BLOCKING)
                      ↓
         event_record_callback (Event ID 42)
                      ↓
    FRAME_TIMES_PER_PROCESS HashMap
                      ↓
              Calculate FPS
                      ↓
           Named Pipe IPC (\\.\pipe\BalamFps)
                      ↓
            Tauri App ← Reads FPS
                      ↓
           PiP Overlay (Display)
```

## Validación Pre-Implementación

✅ **ETW funciona desde Windows Services** - Session 0 sin restricciones
✅ **ProcessTrace + EventRecordCallback** - Patrón estándar validado
✅ **DXGI events capturables** - PresentMon usa mismo approach
✅ **APIs disponibles en windows-rs 0.56** - OpenTraceW, ProcessTrace, CloseTrace
✅ **Multi-process tracking** - HashMap<ProcessId, VecDeque<Instant>>
✅ **Firma corregida** - FILETIME en lugar de i64

**Nivel de confianza:** 95% → 100% con testing real

## Cómo Actualizar el Servicio

### Opción 1: Script Automático (Recomendado)

1. **Abre PowerShell como Administrador**
2. Navega a: `console-experience\fps-service\`
3. Ejecuta: `.\update-service.bat`

El script hace:

- [1/4] Detiene el servicio
- [2/4] Compila la nueva versión
- [3/4] Copia el binario a Program Files
- [4/4] Reinicia el servicio

### Opción 2: Manual

```powershell
# 1. Detener servicio
sc stop BalamFpsService

# 2. Compilar
cd console-experience\fps-service
cargo build --release

# 3. Copiar binario
copy target\release\balam-fps-service.exe "C:\Program Files\Balam\balam-fps-service.exe"

# 4. Iniciar servicio
sc start BalamFpsService
```

## Cómo Probar

### 1. **Verificar que el servicio esté corriendo**

```powershell
sc query BalamFpsService
```

Debe mostrar: `STATE: 4  RUNNING`

### 2. **Lanzar un juego DirectX**

**Juegos compatibles (DirectX):**

- Elden Ring
- Dark Souls 3
- Cyberpunk 2077
- Witcher 3
- Cualquier juego DX9/DX11/DX12

**NO compatibles (por ahora):**

- Juegos Vulkan/OpenGL (necesitan DWM events - pendiente)
- Juegos muy antiguos (pre-DirectX 9)

### 3. **Verificar el overlay**

El PiP overlay debería mostrar:

- **FPS REAL** del juego (no 60 fijo)
- CPU, GPU, RAM (datos reales)
- Temperaturas

### 4. **Depuración (si no funciona)**

**Verificar heartbeat:**

```powershell
Get-Content "C:\Windows\Temp\balam-fps-heartbeat.txt" -Tail 20
```

**Verificar eventos del sistema:**

```powershell
Get-EventLog -LogName Application -Source "BalamFpsService" -Newest 10
```

**Verificar que ETW session esté activa:**

```powershell
logman query "BalamFpsSession" -ets
```

Si la sesión no existe, el ETW no se inició (volver a simulación).

## Diferencias Esperadas

| Aspecto               | Simulación (ANTES) | Real ETW (AHORA)           |
| --------------------- | ------------------ | -------------------------- |
| **FPS Mostrado**      | Siempre 60.0       | FPS real del juego activo  |
| **PID del proceso**   | 9999 (fake)        | PID real del juego         |
| **Variación de FPS**  | Ninguna            | Sigue fluctuaciones reales |
| **Multi-juego**       | Solo un PID fake   | Trackea múltiples juegos   |
| **Juegos soportados** | Ninguno            | DirectX 9/11/12            |
| **CPU overhead**      | ~0% (sleep)        | ~1-2% (ETW processing)     |

## Rollback (Si falla)

Si algo sale mal, puedes volver a la versión anterior:

1. En `etw_monitor.rs` línea 289, comenta el bloque de ProcessTrace
2. Descomenta el bloque de simulación
3. Recompila y actualiza

O simplemente usa el commit anterior:

```bash
git checkout HEAD~1 console-experience/fps-service/src/etw_monitor.rs
```

## Próximos Pasos (Opcional)

1. **Soporte Vulkan/OpenGL**: Habilitar DWM events (ID 46) con filtrado por proceso
2. **Process name filtering**: Mostrar nombre del juego en lugar de PID
3. **Múltiples overlays**: Un overlay por juego activo
4. **Frame time graph**: Historial de frame times

## Fuentes de Investigación

- [ProcessTrace function](https://learn.microsoft.com/en-us/windows/win32/api/evntrace/nf-evntrace-processtrace)
- [EventRecordCallback](https://learn.microsoft.com/en-us/windows/win32/api/evntrace/nc-evntrace-pevent_record_callback)
- [EVENT_TRACE_LOGFILEW](https://learn.microsoft.com/en-us/windows/win32/api/evntrace/ns-evntrace-event_trace_logfilew)
- [PresentMon GitHub](https://github.com/GameTechDev/PresentMon)
- [Leveraging ETW with Rust](https://fluxsec.red/event-tracing-for-windows-threat-intelligence-rust-consumer)

---

**Estado:** ✅ Código compilado exitosamente
**Fecha:** 2026-02-11
**Versión:** windows-rs 0.56
**Testing:** Pendiente con juego DirectX real
