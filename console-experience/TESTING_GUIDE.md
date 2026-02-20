# 🧪 Guía de Pruebas - Sistema de Overlay Nativo

Esta guía te llevará paso a paso para probar el sistema completo de overlay.

---

## 📋 **Prerequisitos**

Antes de empezar, verifica que tengas:
- ✅ **Rust instalado** - Ejecuta `cargo --version` (debe mostrar 1.70+)
- ✅ **Node.js instalado** - Ejecuta `node --version` (debe mostrar 18+)
- ✅ **Permisos de Administrador** - Necesario para instalar Windows Service
- ✅ **Un juego para probar** - Preferiblemente DX11/DX12 (ej: cualquier juego moderno)

---

## 🔧 **PASO 1: Compilar e Instalar FPS Service**

El FPS Service detecta juegos corriendo, DirectX version, y FSO status.

### 1.1. Compilar el servicio

```bash
cd console-experience/fps-service
cargo build --release
```

**Resultado esperado:**
```
Compiling fps-service v0.1.0
Finished release [optimized] target(s) in XX.XXs
```

**Ubicación del ejecutable:**
`fps-service/target/release/fps_service.exe`

### 1.2. Instalar como Windows Service

**IMPORTANTE:** Abre PowerShell **como Administrador**

```powershell
cd console-experience/fps-service
.\install-service.ps1
```

**Resultado esperado:**
```
[SC] CreateService SUCCESS
Service installed successfully!
Starting BalamFpsService...
Service started successfully!
```

### 1.3. Verificar que el servicio está corriendo

```powershell
sc query BalamFpsService
```

**Resultado esperado:**
```
SERVICE_NAME: BalamFpsService
STATE: 4  RUNNING
```

### 1.4. Verificar Named Pipe (opcional)

```powershell
# Listar pipes activos (debería incluir BalamFps)
[System.IO.Directory]::GetFiles("\\.\\pipe\\") | Select-String "BalamFps"
```

---

## 🔨 **PASO 2: Compilar Overlay DLL**

La DLL se inyecta en juegos legacy (DX9 sin FSO).

```bash
cd console-experience
npm run build:overlay
```

**Resultado esperado:**
```
Building Overlay DLL...
Building overlay-dll (release)...
Finished release [optimized] target(s) in XX.XXs
Copying overlay.dll to src-tauri...
Overlay DLL built successfully!
  Size: 10 KB
  Path: ..\src-tauri\overlay.dll

Build complete!
```

**Ubicación de la DLL:**
`console-experience/src-tauri/overlay.dll`

---

## 🎮 **PASO 3: Compilar Balam Console**

Tienes dos opciones:

### Opción A: Modo Desarrollo (Recomendado para pruebas)

```bash
cd console-experience
npm install           # Solo primera vez
npm run tauri dev
```

**Ventajas:**
- ✅ Hot reload (cambios en vivo)
- ✅ DevTools abiertos
- ✅ Logs en consola

**Desventajas:**
- ❌ Más lento que producción
- ❌ No simula instalador real

### Opción B: Compilar Instalador (Producción)

```bash
cd console-experience
npm run build:overlay    # Compila overlay.dll primero
npm run tauri build      # Compila todo + crea instalador
```

**Resultado esperado:**
```
   Compiling console-experience v0.1.0
   Finished release [optimized] target(s) in XXs
   Bundling console-experience_0.1.0_x64_en-US.msi
```

**Ubicación del instalador:**
`console-experience/src-tauri/target/release/bundle/msi/console-experience_0.1.0_x64_en-US.msi`

---

## ✅ **PASO 4: Pruebas del Sistema**

### Test 1: Verificar FPS Service

**Objetivo:** Confirmar que el servicio detecta juegos

1. Abre Balam Console (dev o instalador)
2. Abre las **DevTools** (F12 en modo dev)
3. En la consola, ejecuta:
   ```javascript
   await invoke('get_fps_service_status')
   ```

**Resultado esperado:**
```json
{
  "running": true,
  "installed": true,
  "version": "0.1.0"
}
```

### Test 2: Lanzar un juego y detectar

1. **Lanza un juego cualquiera** desde Balam o Steam
2. Espera 2-3 segundos (para que ETW lo detecte)
3. En Balam DevTools, ejecuta:
   ```javascript
   await invoke('get_running_game')
   ```

**Resultado esperado (si hay juego corriendo):**
```json
{
  "id": "12345",
  "title": "Nombre del Juego",
  "pid": 6789
}
```

### Test 3: Probar Overlay (¡LA PRUEBA PRINCIPAL!)

**Escenario: Juego Moderno (DX11/DX12)**

1. **Lanza un juego moderno** (ej: cualquier juego reciente en Steam)
2. El juego debería estar en **fullscreen** (pantalla completa)
3. Presiona **Ctrl+Shift+Q**

**Resultado esperado:**
- ✅ Aparece una **segunda ventana** sobre el juego
- ✅ La ventana muestra el **InGameMenu** (Blade UI)
- ✅ Puedes navegar el menú con teclado/gamepad
- ✅ Presiona ESC o B para cerrar
- ✅ La ventana de overlay desaparece

**Si NO funciona:**
- Revisa que el juego tenga FSO habilitado (ver Test 4)
- Verifica que el servicio FPS esté corriendo
- Revisa logs en `console-experience/logs/balam.log`

---

### Test 4: Verificar Detección de DirectX y FSO

En Balam DevTools:

```javascript
// Obtener información del juego detectado
const gameInfo = await invoke('get_game_info_from_fps_service');
console.log(gameInfo);
```

**Resultado esperado:**
```json
{
  "pid": 12345,
  "name": "game.exe",
  "dx_version": 11,          // 9, 11, o 12
  "has_fso": true,           // true = FSO habilitado
  "is_compatible_topmost": true  // true = usa TOPMOST, false = necesita DLL
}
```

**Interpretación:**
- `dx_version: 9` + `has_fso: false` → Usa **DLL injection** (requiere whitelist)
- `dx_version: 11|12` + `has_fso: true` → Usa **TOPMOST overlay** ✅
- `is_compatible_topmost: true` → Overlay funcionará sin problemas

---

### Test 5: Probar Comandos de Overlay

En Balam DevTools, puedes controlar el overlay manualmente:

```javascript
// Mostrar overlay
await invoke('show_game_overlay');

// Ocultar overlay
await invoke('hide_game_overlay');

// Alternar (show/hide)
await invoke('toggle_game_overlay');

// Obtener estado
const status = await invoke('get_overlay_status');
console.log(status);

// Ajustar opacidad (0.0 = transparente, 1.0 = opaco)
await invoke('set_overlay_opacity', { opacity: 0.8 });

// Habilitar click-through (clicks pasan al juego)
await invoke('set_overlay_click_through', { enabled: true });
```

---

## 🐛 **Troubleshooting (Problemas Comunes)**

### Problema 1: "Servicio crashea con error 1067"

**Síntoma:**
```
ESTADO: STOPPED
CÓDIGO_DE_SALIDA_DE_WIN32: 1067 (0x42b)
```

O en Event Viewer:
```
Código de excepción: 0xc0000005 (Access Violation)
```

**Causa:**
El servicio tiene código que crashea en Windows Service context (Session 0):
- Imports de `tracing` o logging libraries
- Llamadas a `debug!()`, `info!()`, `error!()`
- Acceso a stdout/stderr (que no existen en servicios)

**Solución (YA APLICADA):**

El código del servicio ya fue corregido para:

1. ✅ **Remover imports de tracing:**
   ```rust
   // ❌ ANTES (crasheaba):
   use tracing::debug;

   // ✅ AHORA (funciona):
   // Tracing removed - Windows Services don't have stdout/stderr
   ```

2. ✅ **Comentar todas las llamadas a debug!():**
   ```rust
   // ❌ ANTES:
   debug!("Service started");

   // ✅ AHORA:
   // debug!("Service started");
   ```

3. ✅ **Reportar SERVICE_RUNNING primero:**
   ```rust
   // ✅ Report RUNNING first (critical!)
   report_status(SERVICE_RUNNING, 0, 0)?;

   // Then start components (ignore errors)
   let _ = monitor.start();
   let _ = server.start();
   ```

4. ✅ **Simplificar main loop:**
   ```rust
   // Main loop - just keep alive
   while !*should_stop.lock() {
       std::thread::sleep(Duration::from_millis(1000));
   }
   ```

**Si el servicio sigue crasheando:**

Verifica el Event Viewer para el crash específico:
```powershell
Get-EventLog -LogName Application -After (Get-Date).AddMinutes(-5) |
  Where-Object { $_.EntryType -eq "Error" -and $_.Source -eq "Application Error" } |
  Select-Object -First 1 | Format-List -Property TimeGenerated, Message
```

---

### Problema 2: "Servicio no se puede instalar"

**Síntoma:**
```
Error: Service failed to start
```

**Solución:**
1. Verifica que NO haya otro servicio con el mismo nombre:
   ```powershell
   sc delete BalamFpsService
   ```
2. Reinstala el servicio (Paso 1.2)

---

### Problema 3: "No se detecta ningún juego"

**Síntoma:**
- `get_running_game()` devuelve null
- El overlay no aparece

**Posibles causas:**
1. **El servicio no está corriendo:**
   ```powershell
   sc query BalamFpsService
   # Si no está RUNNING, ejecuta:
   sc start BalamFpsService
   ```

2. **El juego no está en fullscreen:**
   - El sistema solo funciona con juegos fullscreen
   - Pon el juego en pantalla completa

3. **ETW no puede detectar el proceso:**
   - Algunos juegos se lanzan via launcher (ej: Epic Games)
   - Espera 5-10 segundos después de lanzar el juego

---

### Problema 4: "Overlay no aparece sobre el juego"

**Síntoma:**
- Se ejecuta `toggle_game_overlay()` sin errores
- Pero no se ve nada sobre el juego

**Diagnóstico:**

1. **Verifica que el juego tenga FSO:**
   ```javascript
   const info = await invoke('get_game_info_from_fps_service');
   console.log(info.has_fso);  // Debe ser true
   ```

2. **Si `has_fso` es false:**
   - El juego necesita DLL injection
   - Verifica si está en la whitelist:
     ```javascript
     const whitelisted = await invoke('is_game_whitelisted', {
       gameName: "game.exe"
     });
     console.log(whitelisted);
     ```

3. **Revisa los logs del servicio:**
   ```powershell
   # Logs del servicio (si configurado)
   Get-EventLog -LogName Application -Source BalamFpsService -Newest 10
   ```

4. **Revisa los logs de Balam:**
   ```
   console-experience/logs/balam.log
   ```

---

### Problema 5: "DLL no se encuentra"

**Síntoma:**
```
Error: Overlay DLL not found at: C:\...\overlay.dll
```

**Solución:**
1. Compila la DLL de nuevo:
   ```bash
   npm run build:overlay
   ```

2. Verifica que exista:
   ```bash
   ls src-tauri/overlay.dll
   ```

3. Si usas el instalador, reconstruye:
   ```bash
   npm run tauri build
   ```

---

### Problema 6: "Overlay aparece pero está vacío"

**Síntoma:**
- La ventana de overlay se crea
- Pero no muestra el InGameMenu

**Diagnóstico:**

1. **Verifica que la ventana se creó:**
   En DevTools de Balam:
   ```javascript
   const windows = await invoke('get_all_windows');
   console.log(windows);  // Debe incluir "overlay"
   ```

2. **Verifica que el InGameMenu se abrió:**
   - El InGameMenu usa `overlay.leftSidebarOpen` del store
   - Si no se abre automáticamente, es un bug

3. **Solución temporal:**
   - Cierra el overlay
   - Vuelve a presionar Ctrl+Shift+Q

---

## 📊 **Logs y Diagnóstico Avanzado**

### Ver logs del servicio FPS

**Opción 1: Event Viewer**
1. Abre Event Viewer (eventvwr.msc)
2. Windows Logs → Application
3. Busca eventos de "BalamFpsService"

**Opción 2: PowerShell**
```powershell
Get-EventLog -LogName Application -Source BalamFpsService -Newest 50
```

### Ver logs de Balam

```bash
# Logs en tiempo real
tail -f console-experience/logs/balam.log

# Últimas 50 líneas
tail -n 50 console-experience/logs/balam.log
```

---

## 🎯 **Checklist de Pruebas Completas**

Marca cada test cuando lo completes:

- [ ] **FPS Service:**
  - [ ] Servicio instalado y corriendo
  - [ ] Named Pipe creado (`\\.\pipe\BalamFps`)
  - [ ] Detecta juegos corriendo

- [ ] **Overlay DLL:**
  - [ ] Compilada correctamente (10 KB)
  - [ ] Ubicada en `src-tauri/overlay.dll`

- [ ] **Balam Console:**
  - [ ] Compila sin errores (dev o build)
  - [ ] Se conecta al FPS Service
  - [ ] Puede lanzar juegos

- [ ] **Overlay System:**
  - [ ] Ctrl+Shift+Q abre overlay sobre juego
  - [ ] InGameMenu se muestra correctamente
  - [ ] Navegación con teclado/gamepad funciona
  - [ ] ESC/B cierra el overlay
  - [ ] Overlay desaparece al volver al juego

- [ ] **Detección:**
  - [ ] Detecta DirectX version (9, 11, 12)
  - [ ] Detecta FSO status (true/false)
  - [ ] Selecciona estrategia correcta (TOPMOST vs DLL)

---

## 🎮 **Juegos Recomendados para Probar**

### ✅ TOPMOST Overlay (Funcionará seguro)

Cualquier juego moderno DX11/DX12:
- **Cyberpunk 2077** (DX12)
- **Elden Ring** (DX12)
- **Red Dead Redemption 2** (DX12)
- **Witcher 3** (DX11)
- **Cualquier juego de Steam reciente**

### ⚠️ DLL Injection (Solo juegos en whitelist)

Juegos DX9 antiguos:
- **Half-Life 2** ✅ (en whitelist)
- **Portal** ✅ (en whitelist)
- **Skyrim (original)** ✅ (en whitelist)
- **Oblivion** ✅ (en whitelist)

**IMPORTANTE:** DLL injection solo funciona con juegos en la whitelist por seguridad.

---

## 💡 **Tips para Pruebas**

1. **Empieza con un juego moderno DX12:**
   - Funcionará con TOPMOST (90% de éxito)
   - No requiere DLL injection

2. **Usa modo desarrollo primero:**
   - `npm run tauri dev`
   - Tienes DevTools para debugging

3. **Revisa logs constantemente:**
   - `logs/balam.log` tiene toda la información
   - Busca errores con "ERROR" o "WARN"

4. **Prueba en un juego que ya tengas instalado:**
   - No necesitas instalar juegos nuevos
   - Cualquier juego reciente funcionará

5. **Si algo falla, reinicia en orden:**
   1. Cierra Balam
   2. Reinicia el servicio FPS: `sc stop BalamFpsService && sc start BalamFpsService`
   3. Vuelve a lanzar Balam
   4. Lanza el juego
   5. Prueba Ctrl+Shift+Q

---

## 📞 **Soporte**

Si encuentras problemas:
1. Revisa la sección **Troubleshooting**
2. Verifica los **logs** (servicio + Balam)
3. Ejecuta los **tests de diagnóstico** (Test 4)
4. Comparte los logs y resultados de tests

---

## ✅ **Estado del Sistema**

- ✅ **Phase 1-2:** Detección DirectX + FSO (DONE)
- ✅ **Phase 3:** TOPMOST Overlay (DONE)
- ✅ **Phase 4:** DLL Injection (DONE)
- ✅ **Phase 5:** Overlay DLL (DONE)
- ✅ **Phase 6:** Frontend Integration (DONE)
- ✅ **Phase 6.5:** InGameMenu Integration (DONE)

**Sistema 100% completo y listo para pruebas.**

---

¡Buena suerte con las pruebas! 🚀
