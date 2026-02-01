# 🧪 GUÍA DE PRUEBAS: Sistema de Invocación de Juegos

## 📋 CHECKLIST DE VERIFICACIÓN

### ✅ Compilación
- [ ] Backend compila sin errores (`cargo check`)
- [ ] Frontend compila sin errores (`npm run build`)
- [ ] Build completo exitoso (`npm run tauri build`)

---

## 🎮 PRUEBAS POR TIPO DE JUEGO

### 1️⃣ JUEGO DE STEAM

**Juego recomendado**: Counter-Strike 2, Dota 2, o cualquier juego de Steam instalado

#### Pasos:
1. **Lanzar desde UI**
   - [ ] Click en el juego en la biblioteca
   - [ ] Verificar que se abre Steam
   - [ ] Verificar que el juego se inicia
   - [ ] Verificar que la UI de BALAM se oculta

2. **Verificar Estado**
   - [ ] Abrir overlay (Ctrl+Shift+Q)
   - [ ] Verificar que aparece el menú in-game
   - [ ] Verificar que muestra el nombre del juego
   - [ ] **IMPORTANTE**: El PID debe ser `0` (es normal para Steam)

3. **Cerrar desde BALAM**
   - [ ] Click en "Quit Game" del overlay
   - [ ] Verificar que el juego se cierra
   - [ ] Verificar que la UI de BALAM vuelve a aparecer
   - [ ] Verificar que ya no hay juego activo

4. **Cerrar Manualmente (Watchdog Test)**
   - [ ] Lanzar juego nuevamente
   - [ ] Cerrar el juego desde Steam o cerrando la ventana
   - [ ] **CRÍTICO**: Verificar que la UI de BALAM se restaura automáticamente (max 2 segundos)

**Logs esperados** (ver en `logs/balam.log`):
```
🎮 Launch request for game: steam_123
Found game: Counter-Strike 2 at path: C:\Program Files\Steam\...
>>> Steam Registry Watchdog STARTED for AppID: 730 <<<
Steam reported game running! Monitoring...
✅ Game launched successfully: Counter-Strike 2 (PID: None)
🎮 Active game registered: steam_730 (PID: None)
```

---

### 2️⃣ JUEGO DE XBOX/UWP

**Juego recomendado**: Minecraft (UWP), cualquier juego de Xbox Game Pass

#### Pasos:
1. **Lanzar desde UI**
   - [ ] Click en el juego Xbox en la biblioteca
   - [ ] Verificar que se inicia (puede tardar unos segundos)
   - [ ] Verificar que la UI de BALAM se oculta

2. **Verificar Estado**
   - [ ] Abrir overlay (Ctrl+Shift+Q)
   - [ ] Verificar que aparece el menú in-game
   - [ ] **NOTA**: El PID puede ser `> 0` (COM activation exitosa) o `0` (fallback a explorer)

3. **Cerrar desde BALAM**
   - [ ] Click en "Quit Game"
   - [ ] Verificar que el juego se cierra (puede tardar 1-2 segundos)
   - [ ] Verificar que la UI vuelve

4. **Cerrar Manualmente**
   - [ ] Lanzar juego nuevamente
   - [ ] Cerrar desde la ventana del juego
   - [ ] Verificar que UI se restaura automáticamente

**Logs esperados**:
```
🎮 Launch request for game: xbox_456
Attempting native UWP activation for: Microsoft.MinecraftUWP!App
Xbox game launched natively with PID: 12345
✅ Game launched successfully: Minecraft (PID: Some(12345))
```

O si usa fallback:
```
Failed native Xbox launch: ... Falling back to explorer...
✅ Game launched successfully: Minecraft (PID: None)
```

---

### 3️⃣ JUEGO NATIVO (.EXE)

**Juego recomendado**: Cualquier juego agregado manualmente

#### Pasos:
1. **Agregar Juego Manual** (si no hay ninguno)
   - [ ] Click en "Add Game" en el sidebar
   - [ ] Navegar a un .exe de juego
   - [ ] Darle un nombre
   - [ ] Verificar que aparece en la biblioteca

2. **Lanzar desde UI**
   - [ ] Click en el juego
   - [ ] Verificar que se inicia
   - [ ] Verificar que la UI se oculta

3. **Verificar Estado**
   - [ ] Abrir overlay (Ctrl+Shift+Q)
   - [ ] **CRÍTICO**: El PID debe ser `> 0` (número real)

4. **Cerrar desde BALAM**
   - [ ] Click en "Quit Game"
   - [ ] Verificar que el juego se cierra inmediatamente
   - [ ] Verificar que la UI vuelve

5. **Cerrar Manualmente**
   - [ ] Lanzar juego
   - [ ] Cerrar desde Task Manager o ventana
   - [ ] Verificar restauración automática de UI

**Logs esperados**:
```
🎮 Launch request for game: manual_123
Found game: My Game at path: C:\Games\game.exe
Game launched with PID: 4567
✅ Game launched successfully: My Game (PID: Some(4567))
🎮 Active game registered: manual_123 (PID: Some(4567))
```

---

## 🔍 PRUEBAS DE ROBUSTEZ

### Cambio Rápido de Juegos
1. [ ] Lanzar Juego A
2. [ ] Intentar lanzar Juego B (debe preguntar confirmación)
3. [ ] Confirmar
4. [ ] Verificar que Juego A se cierra y Juego B se inicia

### Juego Ya Corriendo
1. [ ] Lanzar un juego
2. [ ] Intentar lanzarlo de nuevo (click en el mismo juego)
3. [ ] Verificar que solo cierra el overlay y vuelve al juego (no lo reinicia)

### Kill Robusto
1. [ ] Lanzar juego nativo
2. [ ] Desde Task Manager, cambiar el nombre del proceso (renombrar .exe)
3. [ ] Intentar cerrar desde BALAM
4. [ ] Verificar que aún así lo cierra (gracias al fallback por path)

---

## 📊 VERIFICACIÓN DE LOGS

### Ubicación de logs:
```
console-experience/logs/balam.log
```

### Logs a buscar:

**Launch exitoso**:
```
✅ Game launched successfully: [nombre] (PID: [pid o None])
🎮 Active game registered: [game_id] (PID: [pid])
```

**Kill exitoso**:
```
🎯 Kill request for PID: [pid]
Found game in tracker: [game_id] - killing by path and PID
✅ Game killed successfully: [game_id]
🎮 Active game unregistered: [game_id]
```

**Watchdog funcionando**:
```
PID Watchdog started for: [pid] (game: [game_id])
Process [pid] ended. Restoring window.
```

O para Steam:
```
>>> Steam Registry Watchdog STARTED for AppID: [id] <<<
Steam reported game running! Monitoring...
Steam reported game stopped. Restoring window.
```

---

## ⚠️ PROBLEMAS COMUNES Y SOLUCIONES

### ❌ "Game not found: steam_123"
**Causa**: El juego no está en la lista de juegos escaneados
**Solución**:
1. Verificar que Steam está instalado
2. Re-escanear juegos (botón refresh)
3. Verificar logs de scanner

### ❌ "Invalid path"
**Causa**: El path del juego no existe
**Solución**:
1. Para UWP: Verificar que el AppID es correcto
2. Para nativos: Verificar que el .exe existe
3. Eliminar y re-agregar el juego

### ❌ Watchdog no restaura ventana
**Causa**: Watchdog crash o timeout
**Solución**:
1. Verificar logs para ver si watchdog inició
2. Para Steam: Verificar que la entrada de registro existe
3. Para Native: Verificar que el PID es correcto

### ❌ "Failed to launch Steam command"
**Causa**: Steam no está instalado o no responde
**Solución**:
1. Verificar que Steam está corriendo
2. Abrir Steam manualmente primero
3. Intentar el protocolo `steam://` en el navegador

### ❌ Kill no cierra el juego
**Causa**: Múltiples procesos o launcher
**Solución**:
1. Verificar en Task Manager qué procesos están corriendo
2. El sistema ya tiene 3 niveles de fallback
3. Verificar logs para ver qué método usó

---

## ✅ CHECKLIST FINAL

### Funcionalidad Básica
- [ ] Todos los juegos se pueden lanzar
- [ ] Todos los juegos se pueden cerrar con "Quit"
- [ ] UI se oculta al lanzar
- [ ] UI se restaura al cerrar

### Watchdog
- [ ] Cerrar juego manualmente restaura UI
- [ ] Logs muestran watchdog iniciando
- [ ] Logs muestran watchdog detectando cierre

### Tracking
- [ ] Solo un juego activo a la vez
- [ ] PID correcto según tipo de juego:
  - Steam: `0`
  - Xbox COM: `> 0`
  - Xbox fallback: `0`
  - Native: `> 0`

### Edge Cases
- [ ] Cambiar entre juegos funciona
- [ ] Re-lanzar juego activo solo cierra overlay
- [ ] Kill robusto funciona aunque proceso cambie

---

## 🎯 CRITERIOS DE ÉXITO

La implementación es exitosa si:

1. ✅ **Steam games** se lanzan y cierran correctamente
2. ✅ **Xbox/UWP games** funcionan (con o sin PID)
3. ✅ **Native games** tienen PID real y se cierran instantáneamente
4. ✅ **Watchdog** restaura UI cuando juego cierra manualmente
5. ✅ **No hay crashes** en ningún escenario
6. ✅ **Logs** muestran tracking correcto

---

**Última actualización**: 2026-01-31
**Versión**: 1.0 - Sistema de Tracking Centralizado
