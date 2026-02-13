# UX/UI Improvements - Balam Console Experience

**Fecha:** 2026-02-12
**Basado en:** UX_AUDIT.md
**Mejoras Propuestas:** 20+ mejoras específicas
**Tiempo Total Estimado:** 31-41 horas

---

## Categorización por ROI (Return on Investment)

### 🚀 Quick Wins (Alto impacto, Bajo esfuerzo - 4-6h)

1. Toast notifications para errores ocultos (5 componentes)
2. Loading spinners en estados unclear
3. Save feedback animations
4. Entrance animations (OverlayPanel)

### ⚡ Necessary (Alto impacto, Medio esfuerzo - 19-25h)

5. WiFi password input modal (BLOCKER - 8-10h)
6. Confirmaciones para acciones destructivas (6-8h)
7. Error messages user-friendly (5-7h)

### 🎨 Nice-to-Have (Medio impacto, Medio esfuerzo - 8-10h)

8. Tooltips globales
9. Keyboard shortcuts panel
10. Advanced settings modals

---

## BATCH 1: QUICK WINS (4-6h)

### Objetivo

Mejoras rápidas con alto impacto visual, aprovechando infraestructura existente (Toast ya funciona).

---

### 1.1 OverlayPanel Entrance Animation ⚡ 30min

**Categoría:** Quick Win
**Impacto:** ALTO (mejora UX en 12 componentes que usan OverlayPanel)
**Esfuerzo:** 30 minutos

**Problema:**
OverlayPanel aparece abruptamente, sin animación de entrada/salida.

**Solución:**

#### Archivo: `src/components/overlay/OverlayPanel/OverlayPanel.css`

**ANTES:**

```css
.overlay-panel {
  /* Sin animación */
  position: fixed;
  /* ... */
}
```

**DESPUÉS:**

```css
@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

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

@keyframes slideOut {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

.overlay-panel {
  position: fixed;
  /* ... */
  animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.overlay-panel[data-side='left'] {
  animation: slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.overlay-panel.closing {
  animation: slideOut 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
```

#### Tests:

- [ ] OverlayPanel (right) se anima con slideInRight
- [ ] OverlayPanel (left) se anima con slideInLeft
- [ ] Closing animation funciona (slideOut)
- [ ] 60fps durante animación

---

### 1.2 InGameMenu FPS Loading Spinner ⚡ 30min

**Categoría:** Quick Win
**Impacto:** ALTO (usuarios piensan que FPS está "roto" cuando muestra "N/A")
**Esfuerzo:** 30 minutos

**Problema:**
FPS muestra "N/A" inmediatamente, sin indicar que está cargando.

**Solución:**

#### Archivo: `src/components/overlay/InGameMenuOptimized.tsx`

**ANTES (Línea 233):**

```tsx
<span className="stat-item">
  {metrics?.fps?.current_fps ? `${Math.round(metrics.fps.current_fps)} FPS` : 'FPS N/A'}
</span>
```

**DESPUÉS:**

```tsx
// Agregar imports
import { Loader2 } from 'lucide-react';

// Agregar state (después de línea 60)
const [isFpsLoading, setIsFpsLoading] = useState(true);

// Agregar useEffect para timeout
useEffect(() => {
  if (isOpen) {
    setIsFpsLoading(true);
    const timer = setTimeout(() => setIsFpsLoading(false), 2000);
    return () => clearTimeout(timer);
  }
}, [isOpen]);

// Cambiar línea 233
<span className="stat-item">
  {isFpsLoading ? (
    <>
      <Loader2 size={16} className="animate-spin" style={{ marginRight: '4px' }} />
      Loading FPS...
    </>
  ) : metrics?.fps?.current_fps ? (
    `${Math.round(metrics.fps.current_fps)} FPS`
  ) : (
    'FPS N/A'
  )}
</span>;
```

#### CSS: `src/components/overlay/InGameMenu.css`

```css
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
```

#### Tests:

- [ ] FPS muestra "Loading FPS..." con spinner durante 2s
- [ ] Después de 2s, muestra FPS real o "N/A"
- [ ] Spinner rota suavemente (60fps)

---

### 1.3 SettingsPanel Save Feedback ⚡ 1h

**Categoría:** Quick Win
**Impacto:** ALTO (usuario no sabe si configuración se guardó)
**Esfuerzo:** 1 hora

**Problema:**
Usuario cambia settings, pero no hay feedback de que se guardaron exitosamente.

**Solución:**

#### Archivo: `src/components/overlay/SettingsPanel/SettingsPanel.tsx`

**ANTES:**

```tsx
// No existe handleSave() global
// Cada tab guarda por su cuenta sin feedback
```

**DESPUÉS:**

```tsx
// Agregar imports
import { useToast } from '@/hooks/useToast';

// Agregar en el component (línea ~75)
const { success, error } = useToast();
const [isSaving, setIsSaving] = useState(false);

// Agregar handler global
const handleSaveSettings = async () => {
  setIsSaving(true);
  try {
    // Guardar settings (esto podría ser un invoke a backend)
    await new Promise((resolve) => setTimeout(resolve, 500)); // Simular save
    success('Settings saved successfully', 'Your changes have been applied');
  } catch (err) {
    error('Failed to save settings', String(err));
  } finally {
    setIsSaving(false);
  }
};

// Agregar botón "Save" en footer
const footer = (
  <div className="settings-footer">
    <ButtonHint action="BACK" type={controllerType} label="Close" />
    <button className="settings-save-button" onClick={handleSaveSettings} disabled={isSaving}>
      {isSaving ? 'Saving...' : 'Save Changes'}
    </button>
  </div>
);
```

#### CSS: `src/components/overlay/SettingsPanel/SettingsPanel.css`

```css
.settings-save-button {
  padding: var(--space-3) var(--space-5);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.settings-save-button:hover {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
}

.settings-save-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
```

#### Tests:

- [ ] Botón "Save Changes" visible en footer
- [ ] Click → muestra "Saving..." durante 500ms
- [ ] Toast verde "Settings saved successfully"
- [ ] Si falla, toast rojo con error message

---

### 1.4 Toast Notifications para Errores ⚡ 2-3h

**Categoría:** Quick Win
**Impacto:** CRÍTICO (5 componentes con errores invisibles)
**Esfuerzo:** 2-3 horas

**Problema:**
Errores solo en console.log/console.error, usuario NO LOS VE.

**Componentes Afectados:**

1. WiFiPanel (4 toast calls)
2. BluetoothPanel (3 toast calls)
3. QuickSettings (6 toast calls)
4. FileExplorer (2 toast calls)
5. GameLibrary (2 toast calls)

---

#### 1.4.1 WiFiPanel Toast Integration

**Archivo:** `src/components/overlay/WiFiPanel/WiFiPanel.tsx`

**ANTES (Líneas 44-62):**

```tsx
const loadNetworks = useCallback(async () => {
  try {
    setIsScanning(true);
    setErrorMessage(null);
    const nets = await invoke<WiFiNetwork[]>('scan_wifi_networks');
    setNetworks(nets);
    setSelectedIndex((current) => {
      if (nets.length > 0 && current >= nets.length) {
        return 0;
      }
      return current;
    });
  } catch (error) {
    console.error('Failed to scan WiFi:', error); // ❌ INVISIBLE
    setErrorMessage(String(error));
  } finally {
    setIsScanning(false);
  }
}, []);
```

**DESPUÉS:**

```tsx
// Agregar import
import { useToast } from '@/hooks/useToast';

// Agregar en component
const { error: showErrorToast, success } = useToast();

const loadNetworks = useCallback(async () => {
  try {
    setIsScanning(true);
    setErrorMessage(null);
    const nets = await invoke<WiFiNetwork[]>('scan_wifi_networks');
    setNetworks(nets);
    setSelectedIndex((current) => {
      if (nets.length > 0 && current >= nets.length) {
        return 0;
      }
      return current;
    });
  } catch (error) {
    console.error('Failed to scan WiFi:', error); // Keep for debugging
    const errorMsg = 'Failed to scan WiFi networks';
    const hint = 'Make sure WiFi adapter is enabled and working';
    showErrorToast(errorMsg, hint); // ✅ VISIBLE
    setErrorMessage(errorMsg);
  } finally {
    setIsScanning(false);
  }
}, [showErrorToast]);
```

**ANTES (Líneas 87-96):**

```tsx
if (network.security === 'Open') {
  try {
    setIsConnecting(true);
    setErrorMessage(null);
    await invoke('connect_wifi', { ssid: network.ssid, password: '' });
    await loadNetworks();
  } catch (error) {
    setErrorMessage(`Connection failed: ${String(error)}`); // ❌ Técnico
  } finally {
    setIsConnecting(false);
  }
}
```

**DESPUÉS:**

```tsx
if (network.security === 'Open') {
  try {
    setIsConnecting(true);
    setErrorMessage(null);
    await invoke('connect_wifi', { ssid: network.ssid, password: '' });
    success('Connected successfully', `Connected to ${network.ssid}`); // ✅ Success feedback
    await loadNetworks();
  } catch (error) {
    console.error('Connection failed:', error);
    const errorMsg = `Failed to connect to ${network.ssid}`;
    const hint = 'The network may be out of range or have connection issues';
    showErrorToast(errorMsg, hint); // ✅ User-friendly
    setErrorMessage(errorMsg);
  } finally {
    setIsConnecting(false);
  }
}
```

**Total WiFiPanel Toast Calls:** 4

1. Scan WiFi error
2. Connect success
3. Connect error
4. Password required (cuando se implemente)

---

#### 1.4.2 BluetoothPanel Toast Integration

**Archivo:** `src/components/overlay/BluetoothPanel/BluetoothPanel.tsx`

**ANTES (Líneas 59-67):**

```tsx
const checkBluetoothStatus = useCallback(async () => {
  try {
    const available = await invoke<boolean>('is_bluetooth_available');
    setBluetoothEnabled(available);
  } catch (error) {
    console.error('Failed to check Bluetooth status:', error); // ❌ INVISIBLE
    setBluetoothEnabled(false);
  }
}, []);
```

**DESPUÉS:**

```tsx
// Agregar import
import { useToast } from '@/hooks/useToast';

// Agregar en component
const { error: showErrorToast, success, warning } = useToast();

const checkBluetoothStatus = useCallback(async () => {
  try {
    const available = await invoke<boolean>('is_bluetooth_available');
    setBluetoothEnabled(available);
    if (!available) {
      warning('Bluetooth unavailable', 'Your device may not have Bluetooth support'); // ✅ VISIBLE
    }
  } catch (error) {
    console.error('Failed to check Bluetooth status:', error);
    showErrorToast('Bluetooth check failed', 'Could not detect Bluetooth adapter');
    setBluetoothEnabled(false);
  }
}, [showErrorToast, warning]);
```

**ANTES (Líneas 83-88):**

```tsx
} catch (error) {
  console.error('Failed to scan Bluetooth devices:', error); // ❌ INVISIBLE
  setErrorMessage(String(error));
} finally {
  setIsScanning(false);
}
```

**DESPUÉS:**

```tsx
} catch (error) {
  console.error('Failed to scan Bluetooth devices:', error);
  const errorMsg = 'Failed to scan Bluetooth devices';
  const hint = 'Make sure Bluetooth is enabled and in range';
  showErrorToast(errorMsg, hint); // ✅ User-friendly
  setErrorMessage(errorMsg);
} finally {
  setIsScanning(false);
}
```

**ANTES (Líneas 140-144):**

```tsx
} catch (error) {
  setErrorMessage(`Operation failed: ${String(error)}`); // ❌ Técnico
} finally {
  setIsOperating(false);
}
```

**DESPUÉS:**

```tsx
} catch (error) {
  console.error('Bluetooth operation failed:', error);
  let errorMsg = 'Operation failed';
  let hint = '';

  if (device.pairing_state === 'Unpaired') {
    errorMsg = `Failed to pair with ${device.name}`;
    hint = 'Make sure the device is in pairing mode and nearby';
  } else if (device.is_connected) {
    errorMsg = `Failed to disconnect from ${device.name}`;
    hint = 'Try turning the device off and on again';
  } else {
    errorMsg = `Failed to connect to ${device.name}`;
    hint = 'The device may be out of range or already connected to another device';
  }

  showErrorToast(errorMsg, hint); // ✅ Context-aware errors
  setErrorMessage(errorMsg);
} finally {
  setIsOperating(false);
}
```

**Total BluetoothPanel Toast Calls:** 5

1. Bluetooth unavailable warning
2. Status check error
3. Scan error
4. Pair error (context-aware)
5. Connect/disconnect error (context-aware)

---

#### 1.4.3 QuickSettings Toast Integration

**Archivo:** `src/components/overlay/QuickSettings.tsx`

**ANTES (Líneas 149-156):**

```tsx
const handleVolumeChange = useCallback(async (value: number) => {
  setVolume(value);
  try {
    await invoke('set_volume', { level: value });
  } catch (error) {
    console.error('Failed to set volume:', error); // ❌ INVISIBLE
  }
}, []);
```

**DESPUÉS:**

```tsx
// Agregar import
import { useToast } from '@/hooks/useToast';

// Agregar en component
const { error: showErrorToast, success } = useToast();

const handleVolumeChange = useCallback(
  async (value: number) => {
    setVolume(value);
    try {
      await invoke('set_volume', { level: value });
      // Success feedback silencioso (solo en caso de error se notifica)
    } catch (error) {
      console.error('Failed to set volume:', error);
      showErrorToast('Volume change failed', 'Could not adjust system volume'); // ✅ VISIBLE
      // Revert UI to previous value
      const status = await invoke<{ volume: number }>('get_system_status');
      setVolume(status.volume);
    }
  },
  [showErrorToast]
);
```

**Similar para:**

- `handleBrightnessChange` (línea 158-165)
- `handleRefreshRateChange` (línea 167-174)
- `handleTDPChange` (línea 176-183)
- `handleAudioDeviceChange` (línea 185-194)
- `loadCurrentValues` error handling (línea 134-136)

**Total QuickSettings Toast Calls:** 6

1. Volume error
2. Brightness error
3. Refresh rate error
4. TDP error
5. Audio device error
6. Load settings error

---

#### 1.4.4 FileExplorer Toast Integration

**Archivo:** `src/components/overlay/FileExplorer.tsx`

**Placeholder (implementar cuando se audite FileExplorer completo):**

```tsx
// Toast calls para:
// 1. Failed to read directory
// 2. Permission denied
```

---

#### 1.4.5 GameLibrary Toast Integration

**Archivo:** `src/components/GameLibrary/GameLibraryVirtualized.tsx`

**ANTES (Línea 191):**

```tsx
const handleCardClick = useCallback(
  (game: Game, gameIndex: number) => {
    onSetActiveIndex(gameIndex);
    onSetFocusArea('LIBRARY');
    onLaunchGame(game, gameIndex); // Sin error handling
  },
  [onSetActiveIndex, onSetFocusArea, onLaunchGame]
);
```

**DESPUÉS:**

```tsx
// Agregar import
import { useToast } from '@/hooks/useToast';

// Agregar en component
const { error: showErrorToast, success } = useToast();

const handleCardClick = useCallback(
  async (game: Game, gameIndex: number) => {
    onSetActiveIndex(gameIndex);
    onSetFocusArea('LIBRARY');

    try {
      await onLaunchGame(game, gameIndex); // Hacer async
      success('Launching game', `Starting ${game.title}...`); // ✅ Success feedback
    } catch (error) {
      console.error('Failed to launch game:', error);
      const errorMsg = `Failed to launch ${game.title}`;
      const hint = 'Make sure the game executable exists and is not corrupted';
      showErrorToast(errorMsg, hint); // ✅ Error feedback
    }
  },
  [onSetActiveIndex, onSetFocusArea, onLaunchGame, success, showErrorToast]
);
```

**Total GameLibrary Toast Calls:** 2

1. Launch success
2. Launch error

---

### BATCH 1 SUMMARY

**Archivos a Modificar:** 6

1. `src/components/overlay/OverlayPanel/OverlayPanel.css` - Entrance animation
2. `src/components/overlay/InGameMenuOptimized.tsx` - FPS loading spinner
3. `src/components/overlay/InGameMenu.css` - Spin animation
4. `src/components/overlay/SettingsPanel/SettingsPanel.tsx` - Save feedback
5. `src/components/overlay/WiFiPanel/WiFiPanel.tsx` - 4 toast calls
6. `src/components/overlay/BluetoothPanel/BluetoothPanel.tsx` - 5 toast calls
7. `src/components/overlay/QuickSettings.tsx` - 6 toast calls
8. `src/components/GameLibrary/GameLibraryVirtualized.tsx` - 2 toast calls

**Total Toast Calls Agregados:** 17

**Tests de Verificación:**

- [ ] OverlayPanel se anima al abrir (slide + fade)
- [ ] InGameMenu muestra spinner durante carga de FPS (2s)
- [ ] SettingsPanel muestra "Saving..." y toast de éxito
- [ ] WiFiPanel: Errores muestran toast rojo con hint
- [ ] BluetoothPanel: Errores muestran toast rojo con hint context-aware
- [ ] QuickSettings: Errores muestran toast rojo
- [ ] GameLibrary: Launch success muestra toast verde
- [ ] Todos los toasts auto-dismiss (3-5s)

**Commit Message:**

```bash
git commit -m "feat(ux): BATCH 1 - quick wins (animations, loading states, toast notifications)

MEJORAS:
- OverlayPanel: Entrance animation (slideInRight/Left, slideOut)
- InGameMenu: FPS loading spinner (2s initial state)
- SettingsPanel: Save feedback con toast + disabled button
- Toast notifications: 17 toast calls en 4 componentes

COMPONENTES:
- WiFiPanel: 4 toast calls (scan error, connect success/error)
- BluetoothPanel: 5 toast calls (status, scan, pair/connect errors)
- QuickSettings: 6 toast calls (volume, brightness, TDP, etc.)
- GameLibrary: 2 toast calls (launch success/error)

IMPACTO:
- Errores ahora VISIBLES para usuario (no solo console.log)
- Loading states claros (spinners, "Saving...")
- Feedback inmediato en acciones (success/error toasts)
- Experiencia pulida (animaciones 60fps)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## BATCH 2: ERROR VISIBILITY (5-7h)

### Objetivo

Mejorar mensajes de error user-friendly, agregar hints contextuales.

---

### 2.1 Error Message Mapping Table - QuickSettings

**Categoría:** Necessary
**Impacto:** ALTO (6 puntos de fallo sin feedback)
**Esfuerzo:** 2 horas

**Problema:**
Errores técnicos incomprensibles para usuarios.

**Solución:**

#### Archivo: `src/components/overlay/QuickSettings.tsx`

**Agregar al inicio del archivo:**

```tsx
/**
 * Error message mapping: Technical errors → User-friendly messages
 */
const ERROR_MESSAGES = {
  // Volume errors
  set_volume: {
    title: 'Volume adjustment failed',
    hint: 'Check your audio drivers and make sure no other app is controlling volume',
  },

  // Brightness errors
  set_brightness: {
    title: 'Brightness adjustment failed',
    hint: 'Your device may not support brightness control or drivers may be missing',
  },

  // Refresh rate errors
  set_refresh_rate: {
    title: 'Refresh rate change failed',
    hint: 'Make sure your monitor supports this refresh rate',
  },

  // TDP errors
  set_tdp: {
    title: 'TDP adjustment failed',
    hint: 'TDP control may require administrator privileges or special drivers',
  },

  // Audio device errors
  set_default_audio_device: {
    title: 'Audio device switch failed',
    hint: 'The device may be disconnected or in use by another application',
  },

  // Generic fallback
  default: {
    title: 'Settings adjustment failed',
    hint: 'Please try again or restart the application',
  },
} as const;

/**
 * Get user-friendly error message
 */
function getErrorMessage(
  operation: string,
  technicalError: unknown
): { title: string; hint: string } {
  console.error(`[QuickSettings] ${operation} failed:`, technicalError);

  const errorKey = operation as keyof typeof ERROR_MESSAGES;
  return ERROR_MESSAGES[errorKey] || ERROR_MESSAGES.default;
}
```

**Uso en handlers:**

```tsx
const handleVolumeChange = useCallback(
  async (value: number) => {
    setVolume(value);
    try {
      await invoke('set_volume', { level: value });
    } catch (error) {
      const { title, hint } = getErrorMessage('set_volume', error);
      showErrorToast(title, hint); // ✅ User-friendly
      // Revert UI
      const status = await invoke<{ volume: number }>('get_system_status');
      setVolume(status.volume);
    }
  },
  [showErrorToast]
);
```

---

### 2.2 Context-Aware Error Hints - BluetoothPanel

**Categoría:** Necessary
**Impacto:** ALTO (errores de pairing frustrantes)
**Esfuerzo:** 2 horas

**Problema:**
Usuario no sabe POR QUÉ falló el pairing/connection.

**Solución:**

#### Archivo: `src/components/overlay/BluetoothPanel/BluetoothPanel.tsx`

**Agregar error mapping:**

```tsx
/**
 * Bluetooth error hints based on device type and operation
 */
const BLUETOOTH_ERROR_HINTS = {
  // Pairing errors
  pairing: {
    AudioVideo: 'Make sure the headphones/speaker is in pairing mode (usually hold power button)',
    Computer: 'Check if Bluetooth is enabled on both devices',
    Phone: 'Make sure the phone is discoverable and not connected to another device',
    Peripheral: 'Press the pairing button on the device (usually flashes blue)',
    Wearable: 'Check the device manual for pairing instructions',
    Unknown: 'Make sure the device is in pairing mode and nearby (within 10 meters)',
  },

  // Connection errors
  connection: {
    AudioVideo: 'The device may be connected to another device. Try turning it off and on.',
    Computer: "Check if the computer's Bluetooth is enabled",
    Phone: 'The phone may be out of range or in airplane mode',
    Peripheral: 'Make sure the device is charged and turned on',
    Wearable: 'Check if the device battery is charged',
    Unknown: 'The device may be out of range or already connected elsewhere',
  },

  // Generic
  scan: 'Make sure Bluetooth is enabled and devices are nearby',
  timeout: 'Operation timed out. The device may be too far or turned off.',
} as const;

/**
 * Get context-aware error message
 */
function getBluetoothErrorHint(
  operation: 'pairing' | 'connection' | 'scan' | 'timeout',
  deviceType?: BluetoothDevice['device_type']
): string {
  if (operation === 'scan' || operation === 'timeout') {
    return BLUETOOTH_ERROR_HINTS[operation];
  }

  return BLUETOOTH_ERROR_HINTS[operation][deviceType || 'Unknown'];
}
```

**Uso en handleDeviceAction:**

```tsx
const handleDeviceAction = useCallback(
  async (device: BluetoothDevice) => {
    setIsOperating(true);
    setErrorMessage(null);

    try {
      if (device.pairing_state === 'Unpaired') {
        await invoke('pair_bluetooth_device', {
          address: device.address,
          pin: '',
        });
        success('Device paired', `Successfully paired with ${device.name}`);
        await loadDevices();
      } else if (device.pairing_state === 'Paired') {
        if (device.is_connected) {
          await invoke('disconnect_bluetooth_device', {
            address: device.address,
          });
          success('Device disconnected', `Disconnected from ${device.name}`);
          await loadDevices();
        } else {
          await invoke('connect_bluetooth_device', {
            address: device.address,
          });
          success('Device connected', `Connected to ${device.name}`);
          await loadDevices();
        }
      }
    } catch (error) {
      console.error('Bluetooth operation failed:', error);

      // Determine operation type
      const operation = device.pairing_state === 'Unpaired' ? 'pairing' : 'connection';
      const hint = getBluetoothErrorHint(operation, device.device_type);

      let title = 'Operation failed';
      if (device.pairing_state === 'Unpaired') {
        title = `Failed to pair with ${device.name}`;
      } else if (device.is_connected) {
        title = `Failed to disconnect from ${device.name}`;
      } else {
        title = `Failed to connect to ${device.name}`;
      }

      showErrorToast(title, hint); // ✅ Context-aware error
      setErrorMessage(title);
    } finally {
      setIsOperating(false);
    }
  },
  [loadDevices, success, showErrorToast]
);
```

---

### 2.3 Game Launch Error Handling

**Categoría:** Necessary
**Impacto:** ALTO (usuario no sabe por qué juego no inicia)
**Esfuerzo:** 2 horas

**Problema:**
Si juego no se puede lanzar, no hay feedback.

**Solución:**

#### Archivo: `src/components/App/LibrarySection.tsx` (o donde esté onLaunchGame)

**ANTES:**

```tsx
const handleLaunchGame = async (game: Game) => {
  await invoke('launch_game', { gameId: game.id });
  // Sin error handling
};
```

**DESPUÉS:**

```tsx
import { useToast } from '@/hooks/useToast';

const { error: showErrorToast, success } = useToast();

const handleLaunchGame = async (game: Game) => {
  try {
    await invoke('launch_game', { gameId: game.id });
    success('Launching game', `Starting ${game.title}...`);
  } catch (error) {
    console.error('Failed to launch game:', error);

    // Parse error type
    const errorStr = String(error).toLowerCase();
    let title = `Failed to launch ${game.title}`;
    let hint = '';

    if (errorStr.includes('not found') || errorStr.includes('does not exist')) {
      hint =
        'Game executable not found. Try rescanning your library or check the game installation.';
    } else if (errorStr.includes('permission') || errorStr.includes('access denied')) {
      hint = 'Permission denied. Try running as administrator or check file permissions.';
    } else if (errorStr.includes('already running')) {
      hint = 'The game is already running. Close it first before launching again.';
    } else {
      hint = 'Check that the game is properly installed and the executable is not corrupted.';
    }

    showErrorToast(title, hint);
  }
};
```

---

### 2.4 WiFi Connection Error Hints

**Categoría:** Necessary
**Impacto:** ALTO
**Esfuerzo:** 1 hora

**Solución:**

#### Archivo: `src/components/overlay/WiFiPanel/WiFiPanel.tsx`

**Agregar error mapping:**

```tsx
/**
 * WiFi error hints
 */
const WIFI_ERROR_HINTS = {
  scan_failed: 'WiFi adapter may be disabled. Check your WiFi settings or drivers.',
  connection_timeout:
    'Connection timed out. The network may be out of range or have too many connected devices.',
  wrong_password: 'Incorrect password. Double-check the password and try again.',
  network_not_found: 'Network not found. It may be hidden or out of range.',
  already_connected: 'Already connected to this network.',
  permission_denied: 'Permission denied. Try running with administrator privileges.',
  default: 'Connection failed. Check your WiFi adapter and network settings.',
} as const;

function getWiFiErrorHint(error: unknown): { title: string; hint: string } {
  const errorStr = String(error).toLowerCase();

  if (errorStr.includes('timeout')) {
    return { title: 'Connection timeout', hint: WIFI_ERROR_HINTS.connection_timeout };
  } else if (errorStr.includes('password') || errorStr.includes('authentication')) {
    return { title: 'Authentication failed', hint: WIFI_ERROR_HINTS.wrong_password };
  } else if (errorStr.includes('not found')) {
    return { title: 'Network not found', hint: WIFI_ERROR_HINTS.network_not_found };
  } else if (errorStr.includes('already connected')) {
    return { title: 'Already connected', hint: WIFI_ERROR_HINTS.already_connected };
  } else if (errorStr.includes('permission') || errorStr.includes('access denied')) {
    return { title: 'Permission denied', hint: WIFI_ERROR_HINTS.permission_denied };
  }

  return { title: 'Connection failed', hint: WIFI_ERROR_HINTS.default };
}
```

---

### BATCH 2 SUMMARY

**Archivos a Modificar:** 4

1. `src/components/overlay/QuickSettings.tsx` - Error mapping table
2. `src/components/overlay/BluetoothPanel/BluetoothPanel.tsx` - Context-aware hints
3. `src/components/App/LibrarySection.tsx` - Game launch error handling
4. `src/components/overlay/WiFiPanel/WiFiPanel.tsx` - WiFi error hints

**Tests de Verificación:**

- [ ] QuickSettings: Volume error muestra hint sobre drivers
- [ ] QuickSettings: Brightness error menciona soporte del device
- [ ] QuickSettings: TDP error menciona admin privileges
- [ ] BluetoothPanel: Pairing error con AudioVideo menciona "pairing mode"
- [ ] BluetoothPanel: Connection error con Phone menciona "otro device"
- [ ] GameLibrary: Launch error detecta "not found" y sugiere rescan
- [ ] WiFiPanel: Connection timeout muestra hint específico
- [ ] WiFiPanel: Wrong password detectado y sugiere verificar

**Commit Message:**

```bash
git commit -m "feat(ux): BATCH 2 - error visibility con mensajes user-friendly

MEJORAS:
- Error mapping tables para mensajes comprensibles
- Context-aware hints basados en device type y operation
- Error parsing para sugerencias específicas

COMPONENTES:
- QuickSettings: 6 error messages con hints (volume, brightness, TDP, etc.)
- BluetoothPanel: Context-aware errors (AudioVideo, Phone, Peripheral)
- GameLibrary: Launch error parsing (not found, permission, already running)
- WiFiPanel: Connection error hints (timeout, password, not found)

IMPACTO:
- Usuario entiende POR QUÉ falló la operación
- Hints accionables ("Revisa drivers", "Enciende modo pairing")
- Menos frustraci��n, más autonomía

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## BATCH 3: WiFi PASSWORD INPUT (8-10h) ⚡ BLOCKER

### Objetivo

Implementar modal de password para redes seguras (WPA/WPA2/WPA3).

**Categoría:** Necessary - BLOCKER
**Impacto:** CRÍTICO (WiFiPanel inútil sin esto)
**Esfuerzo:** 8-10 horas

---

### 3.1 Crear WiFiPasswordModal Component

**Archivos NUEVOS:**

1. `src/components/overlay/WiFiPanel/WiFiPasswordModal.tsx`
2. `src/components/overlay/WiFiPanel/WiFiPasswordModal.css`

#### Archivo: `src/components/overlay/WiFiPanel/WiFiPasswordModal.tsx`

```tsx
import './WiFiPasswordModal.css';

import { Eye, EyeOff, Lock } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/core/Button/Button';
import { IconWrapper } from '@/components/core/IconWrapper/IconWrapper';

interface WiFiPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (password: string, remember: boolean) => void;
  ssid: string;
  securityType: string;
  isConnecting: boolean;
}

/**
 * WiFi Password Input Modal
 *
 * Modal for entering password for secured WiFi networks (WPA/WPA2/WPA3).
 * Features:
 * - Password input with show/hide toggle
 * - "Remember network" checkbox
 * - Validation (min 8 characters)
 * - Keyboard shortcuts (ESC cancel, Enter submit)
 * - Gamepad navigation
 */
export const WiFiPasswordModal: React.FC<WiFiPasswordModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  ssid,
  securityType,
  isConnecting,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setShowPassword(false);
      setRemember(false);
      setValidationError('');
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'Enter':
          e.preventDefault();
          void handleSubmit();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, password, remember]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = useCallback(() => {
    // Validation
    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters');
      return;
    }

    if (password.length > 63) {
      setValidationError('Password must be less than 63 characters');
      return;
    }

    setValidationError('');
    onConnect(password, remember);
  }, [password, remember, onConnect]);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setValidationError(''); // Clear error on input
  };

  if (!isOpen) return null;

  return (
    <div className="wifi-password-modal-overlay">
      <div className="wifi-password-modal">
        {/* Header */}
        <div className="wifi-password-header">
          <IconWrapper size="lg">
            <Lock />
          </IconWrapper>
          <div className="wifi-password-title">
            <h3>Connect to Network</h3>
            <p className="wifi-password-ssid">{ssid}</p>
            <span className="wifi-password-security">{securityType}</span>
          </div>
        </div>

        {/* Password Input */}
        <div className="wifi-password-input-group">
          <label htmlFor="wifi-password">Network Password</label>
          <div className="wifi-password-input-wrapper">
            <input
              id="wifi-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={handlePasswordChange}
              placeholder="Enter password"
              autoFocus
              disabled={isConnecting}
              className={validationError ? 'error' : ''}
            />
            <button
              type="button"
              className="wifi-password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isConnecting}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {validationError ? <span className="wifi-password-error">{validationError}</span> : null}
        </div>

        {/* Remember Checkbox */}
        <label className="wifi-password-remember">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            disabled={isConnecting}
          />
          <span>Remember this network</span>
        </label>

        {/* Actions */}
        <div className="wifi-password-actions">
          <Button variant="secondary" size="md" onClick={onClose} disabled={isConnecting} fullWidth>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!password || isConnecting}
            fullWidth
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </Button>
        </div>

        {/* Keyboard Hints */}
        <div className="wifi-password-hints">
          <span className="hint">
            <kbd>ESC</kbd> Cancel
          </span>
          <span className="hint">
            <kbd>Enter</kbd> Connect
          </span>
        </div>
      </div>
    </div>
  );
};

WiFiPasswordModal.displayName = 'WiFiPasswordModal';

export default WiFiPasswordModal;
```

#### Archivo: `src/components/overlay/WiFiPanel/WiFiPasswordModal.css`

```css
/* WiFi Password Modal */
.wifi-password-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.wifi-password-modal {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  max-width: 500px;
  width: 90%;
  box-shadow: var(--glow-lg);
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Header */
.wifi-password-header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.wifi-password-title h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 var(--space-2) 0;
}

.wifi-password-ssid {
  font-size: 1rem;
  color: var(--color-text-primary);
  font-weight: 500;
  display: block;
  margin-bottom: var(--space-1);
}

.wifi-password-security {
  display: inline-block;
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

/* Password Input */
.wifi-password-input-group {
  margin-bottom: var(--space-4);
}

.wifi-password-input-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}

.wifi-password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.wifi-password-input-wrapper input {
  flex: 1;
  padding: var(--space-3) var(--space-4);
  padding-right: 48px; /* Space for toggle button */
  background: var(--color-background-elevated-1);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: 1rem;
  font-family: monospace;
  letter-spacing: 0.5px;
  transition: all 0.2s;
}

.wifi-password-input-wrapper input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.2);
}

.wifi-password-input-wrapper input.error {
  border-color: var(--color-error);
}

.wifi-password-input-wrapper input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wifi-password-toggle {
  position: absolute;
  right: 8px;
  padding: var(--space-2);
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}

.wifi-password-toggle:hover:not(:disabled) {
  color: var(--color-primary);
  background: rgba(255, 255, 255, 0.05);
}

.wifi-password-toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wifi-password-error {
  display: block;
  font-size: 0.75rem;
  color: var(--color-error);
  margin-top: var(--space-1);
}

/* Remember Checkbox */
.wifi-password-remember {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-5);
  cursor: pointer;
  user-select: none;
}

.wifi-password-remember input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.wifi-password-remember:hover {
  color: var(--color-text-primary);
}

/* Actions */
.wifi-password-actions {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

/* Keyboard Hints */
.wifi-password-hints {
  display: flex;
  gap: var(--space-4);
  justify-content: center;
  padding-top: var(--space-3);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.wifi-password-hints .hint {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}

.wifi-password-hints kbd {
  display: inline-block;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-sm);
  font-family: monospace;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}
```

---

### 3.2 Integrar WiFiPasswordModal en WiFiPanel

**Archivo:** `src/components/overlay/WiFiPanel/WiFiPanel.tsx`

**ANTES (Líneas 83-105):**

```tsx
const handleConnect = useCallback(
  async (network: WiFiNetwork) => {
    if (network.is_connected) return;

    if (network.security === 'Open') {
      try {
        setIsConnecting(true);
        setErrorMessage(null);
        await invoke('connect_wifi', { ssid: network.ssid, password: '' });
        await loadNetworks();
      } catch (error) {
        setErrorMessage(`Connection failed: ${String(error)}`);
      } finally {
        setIsConnecting(false);
      }
    } else {
      setErrorMessage(
        'Password input not yet implemented. Use Windows Settings for secured networks.'
      );
    }
  },
  [loadNetworks]
);
```

**DESPUÉS:**

```tsx
// Agregar imports
import { WiFiPasswordModal } from './WiFiPasswordModal';

// Agregar states (después de línea 40)
const [passwordModalOpen, setPasswordModalOpen] = useState(false);
const [selectedNetwork, setSelectedNetwork] = useState<WiFiNetwork | null>(null);

// Nuevo handler: abre modal para redes seguras
const handleNetworkClick = useCallback((network: WiFiNetwork) => {
  if (network.is_connected) {
    // Ya conectado, no hacer nada
    return;
  }

  if (network.security === 'Open') {
    // Red abierta: conectar directamente
    void handleConnectOpen(network);
  } else {
    // Red segura: abrir modal de password
    setSelectedNetwork(network);
    setPasswordModalOpen(true);
  }
}, []);

// Handler para redes abiertas
const handleConnectOpen = useCallback(
  async (network: WiFiNetwork) => {
    try {
      setIsConnecting(true);
      setErrorMessage(null);
      await invoke('connect_wifi', { ssid: network.ssid, password: '' });
      success('Connected successfully', `Connected to ${network.ssid}`);
      await loadNetworks();
    } catch (error) {
      console.error('Connection failed:', error);
      const { title, hint } = getWiFiErrorHint(error);
      showErrorToast(title, hint);
      setErrorMessage(title);
    } finally {
      setIsConnecting(false);
    }
  },
  [loadNetworks, success, showErrorToast]
);

// Handler para redes seguras (con password)
const handleConnectWithPassword = useCallback(
  async (password: string, remember: boolean) => {
    if (!selectedNetwork) return;

    try {
      setIsConnecting(true);
      setErrorMessage(null);

      await invoke('connect_wifi', {
        ssid: selectedNetwork.ssid,
        password: password,
        remember: remember, // Guardar credenciales si checkbox marcado
      });

      success('Connected successfully', `Connected to ${selectedNetwork.ssid}`);
      setPasswordModalOpen(false);
      await loadNetworks();
    } catch (error) {
      console.error('Connection failed:', error);
      const { title, hint } = getWiFiErrorHint(error);
      showErrorToast(title, hint);
      setErrorMessage(title);
      // No cerrar modal en caso de error (para que usuario pueda reintentar)
    } finally {
      setIsConnecting(false);
    }
  },
  [selectedNetwork, loadNetworks, success, showErrorToast]
);

// Handler para cerrar modal
const handleClosePasswordModal = useCallback(() => {
  if (!isConnecting) {
    setPasswordModalOpen(false);
    setSelectedNetwork(null);
  }
}, [isConnecting]);
```

**Actualizar render de network cards (Línea 225-235):**

```tsx
// ANTES
onClick={() => {
  setSelectedIndex(index);
  void handleConnect(network);
}}

// DESPUÉS
onClick={() => {
  setSelectedIndex(index);
  handleNetworkClick(network); // ✅ Nuevo handler
}}
```

**Agregar modal al final del JSX (antes del </OverlayPanel>):**

```tsx
{
  /* WiFi Password Modal */
}
<WiFiPasswordModal
  isOpen={passwordModalOpen}
  onClose={handleClosePasswordModal}
  onConnect={handleConnectWithPassword}
  ssid={selectedNetwork?.ssid || ''}
  securityType={selectedNetwork?.security || 'WPA2'}
  isConnecting={isConnecting}
/>;
```

---

### 3.3 Verificar Tauri Backend

**Archivo:** `src-tauri/src/commands/network.rs` (o similar)

**Verificar que el comando acepta password:**

```rust
#[tauri::command]
pub async fn connect_wifi(
    ssid: String,
    password: Option<String>,  // ✅ Debe ser Option<String>
    remember: Option<bool>,    // ✅ Agregar si no existe
) -> Result<(), String> {
    // Implementación...
}
```

**Si NO existe soporte para password, actualizar:**

```rust
// ANTES
#[tauri::command]
pub async fn connect_wifi(ssid: String) -> Result<(), String> {
    // Solo SSID
}

// DESPUÉS
#[tauri::command]
pub async fn connect_wifi(
    ssid: String,
    password: Option<String>,
    remember: Option<bool>,
) -> Result<(), String> {
    let pwd = password.unwrap_or_default();
    let remember_network = remember.unwrap_or(false);

    // Usar Windows WiFi API para conectar con password
    // Implementación específica de Windows...
}
```

---

### BATCH 3 SUMMARY

**Archivos NUEVOS:** 2

1. `src/components/overlay/WiFiPanel/WiFiPasswordModal.tsx` (200 líneas)
2. `src/components/overlay/WiFiPanel/WiFiPasswordModal.css` (150 líneas)

**Archivos MODIFICADOS:** 2

1. `src/components/overlay/WiFiPanel/WiFiPanel.tsx` (70 líneas agregadas)
2. `src-tauri/src/commands/network.rs` (verificar/actualizar password support)

**Tests de Verificación:**

- [ ] Click en red abierta → conecta directamente (sin modal)
- [ ] Click en red WPA2 → abre modal de password
- [ ] Modal muestra SSID y tipo de seguridad (WPA2, WPA3)
- [ ] Input password funciona (typing, show/hide toggle)
- [ ] Validación: min 8 chars muestra error "must be at least 8 characters"
- [ ] Validación: max 63 chars muestra error "must be less than 63 characters"
- [ ] "Remember network" checkbox funciona
- [ ] Click "Connect" → llama invoke con password correcto
- [ ] Conexión exitosa → toast verde + cierra modal
- [ ] Conexión fallida → toast rojo + modal permanece abierto (reintento)
- [ ] ESC cierra modal (si no está connecting)
- [ ] Enter submitea form (si password válido)
- [ ] Gamepad navigation funciona (checkbox, buttons)
- [ ] Virtual keyboard se abre al focus input (si aplicable)
- [ ] Modal se anima al abrir/cerrar (fadeIn, slideUp)

**Commit Message:**

```bash
git commit -m "feat(wifi): BLOCKER RESUELTO - implementar password input para redes seguras

BLOCKER RESUELTO: WiFiPanel ahora funciona con WPA/WPA2/WPA3

COMPONENTES NUEVOS:
- WiFiPasswordModal: Modal completo con password input
  - Show/hide password toggle (Eye/EyeOff icons)
  - "Remember network" checkbox
  - Validation: min 8 chars, max 63 chars
  - Keyboard shortcuts: ESC cancel, Enter submit
  - Gamepad navigation support
  - Animaciones suaves (fadeIn, slideUp)

INTEGRACIÓN WiFiPanel:
- Detecta red segura → abre WiFiPasswordModal
- Detecta red abierta → conecta directamente
- Password enviado a backend via invoke('connect_wifi')
- Success toast verde al conectar
- Error toast rojo si falla (con hint)
- Modal permanece abierto si falla (permite reintento)

BACKEND:
- Verificado soporte para password en connect_wifi command
- Agregado parámetro 'remember' para guardar credenciales

IMPACTO:
- WiFiPanel ahora FUNCIONAL para 99% de redes WiFi
- UX completa: validación, feedback, hints
- BLOCKER eliminado

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## BATCH 4: CONFIRMATIONS (6-8h)

### Objetivo

Prevenir acciones destructivas accidentales con confirmaciones claras.

---

### 4.1 GameLibrary DELETE Confirmation

**Categoría:** Necessary
**Impacto:** ALTO (prevenir borrado accidental de juegos)
**Esfuerzo:** 2-3 horas

**Problema:**
Si se implementa DELETE, debe pedir confirmación (acción destructiva).

**Solución:**

#### Opción A: Usar ConfirmationModal existente

**Archivo:** `src/components/App/LibrarySection.tsx` (o donde esté el DELETE)

```tsx
import { ConfirmationModal } from '@/components/App/ConfirmationModal';
import { useToast } from '@/hooks/useToast';

const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
const [gameToDelete, setGameToDelete] = useState<Game | null>(null);
const { success, error } = useToast();

// Handler: abrir confirmación
const handleDeleteClick = (game: Game) => {
  setGameToDelete(game);
  setDeleteConfirmOpen(true);
};

// Handler: confirmar DELETE
const handleConfirmDelete = async () => {
  if (!gameToDelete) return;

  try {
    await invoke('delete_game', { gameId: gameToDelete.id });
    success('Game deleted', `${gameToDelete.title} has been removed from your library`);
    setDeleteConfirmOpen(false);
    setGameToDelete(null);
    // Reload library
    await loadGames();
  } catch (error) {
    console.error('Failed to delete game:', error);
    error('Delete failed', `Could not delete ${gameToDelete.title}`);
  }
};

// Handler: cancelar DELETE
const handleCancelDelete = () => {
  setDeleteConfirmOpen(false);
  setGameToDelete(null);
};

// En el JSX
<ConfirmationModal
  isOpen={deleteConfirmOpen}
  title="Delete Game"
  message={`Are you sure you want to delete "${gameToDelete?.title}"? This action cannot be undone.`}
  confirmText="Delete"
  cancelText="Cancel"
  onConfirm={handleConfirmDelete}
  onCancel={handleCancelDelete}
  variant="danger"
/>;
```

#### Opción B: Modal inline personalizado

**Si se prefiere inline (más contexto visual):**

```tsx
const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
const [gameToDelete, setGameToDelete] = useState<Game | null>(null);

// ... handlers similares ...

// En el JSX (dentro de Card o donde esté DELETE button)
{
  deleteConfirmOpen && gameToDelete && (
    <div className="game-delete-confirm-overlay">
      <div className="game-delete-confirm-modal">
        <h3>Delete {gameToDelete.title}?</h3>
        <p>This action cannot be undone. The game will be removed from your library.</p>

        {gameToDelete.image && (
          <img src={gameToDelete.image} alt={gameToDelete.title} className="delete-confirm-cover" />
        )}

        <div className="delete-confirm-actions">
          <Button variant="secondary" size="md" onClick={handleCancelDelete} autoFocus>
            Cancel
          </Button>
          <Button variant="danger" size="md" onClick={handleConfirmDelete}>
            Delete Game
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**CSS:**

```css
.game-delete-confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.game-delete-confirm-modal {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  max-width: 400px;
  text-align: center;
}

.game-delete-confirm-modal h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
}

.game-delete-confirm-modal p {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-4);
}

.delete-confirm-cover {
  width: 120px;
  height: 180px;
  object-fit: cover;
  border-radius: var(--radius-md);
  margin: 0 auto var(--space-4);
}

.delete-confirm-actions {
  display: flex;
  gap: var(--space-3);
}
```

---

### 4.2 PowerModal Pre-Confirmation

**Categoría:** Necessary
**Impacto:** ALTO (prevenir apagado/reinicio accidental)
**Esfuerzo:** 2 horas

**Problema:**
Click en "Shutdown" inicia countdown inmediatamente sin confirmación previa.

**Solución:**

#### Archivo: `src/components/overlay/PowerModal/PowerModal.tsx`

**ANTES (Líneas 91-135):**

```tsx
{
  !selectedAction ? (
    // Action selection
    <div className="power-modal-actions">
      <Button onClick={() => setSelectedAction('shutdown')} fullWidth>
        Shutdown
      </Button>
      {/* ... otros botones ... */}
    </div>
  ) : (
    // Countdown (inicia inmediatamente)
    <p className="power-modal-message">
      {selectedAction === 'shutdown' && `Shutting down in ${countdown} seconds...`}
    </p>
  );
}
```

**DESPUÉS (Agregar paso intermedio):**

```tsx
// Agregar state (línea ~20)
const [confirmed, setConfirmed] = useState(false);

// Reset confirmed cuando modal cierra (línea ~25)
useEffect(() => {
  if (!isOpen) {
    setSelectedAction(null);
    setConfirmed(false); // ✅ Reset confirmed
    setCountdown(5);
    setIsExecuting(false);
  }
}, [isOpen]);

// Countdown solo inicia si confirmed=true (línea ~59)
useEffect(() => {
  if (selectedAction && confirmed && countdown > 0) {
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  } else if (selectedAction && confirmed && countdown === 0) {
    void executeAction();
  }
}, [selectedAction, confirmed, countdown, executeAction]); // ✅ Agregar confirmed

// Nuevo handler: confirmar acción
const handleConfirmAction = () => {
  setConfirmed(true);
};

// Nuevo handler: cancelar (volver a selección)
const handleBackToSelection = () => {
  setSelectedAction(null);
  setConfirmed(false);
  setCountdown(5);
};

// JSX actualizado (línea ~90)
{
  !selectedAction ? (
    // PASO 1: Selección de acción
    <div className="power-modal-actions">
      <Button
        variant="danger"
        size="lg"
        icon={
          <IconWrapper size="lg">
            <Power />
          </IconWrapper>
        }
        onClick={() => setSelectedAction('shutdown')}
        fullWidth
      >
        Shutdown
      </Button>
      {/* ... otros botones ... */}
    </div>
  ) : !confirmed ? (
    // PASO 2: Confirmación (NUEVO)
    <>
      <div className="power-modal-confirm">
        <Power size={48} className="power-icon" />
        <h3 className="confirm-title">
          {selectedAction === 'shutdown' && 'Shutdown PC?'}
          {selectedAction === 'restart' && 'Restart PC?'}
          {selectedAction === 'logout' && 'Logout?'}
        </h3>
        <p className="confirm-message">
          {selectedAction === 'shutdown' &&
            'Your PC will shut down. Make sure you have saved all your work.'}
          {selectedAction === 'restart' &&
            'Your PC will restart. Open applications will be closed.'}
          {selectedAction === 'logout' &&
            'You will be logged out. Running applications will be closed.'}
        </p>
      </div>

      <div className="power-modal-actions">
        <Button variant="secondary" size="md" onClick={handleBackToSelection} fullWidth>
          Cancel
        </Button>
        <Button variant="danger" size="md" onClick={handleConfirmAction} autoFocus fullWidth>
          {selectedAction === 'shutdown' && 'Shutdown'}
          {selectedAction === 'restart' && 'Restart'}
          {selectedAction === 'logout' && 'Logout'}
        </Button>
      </div>
    </>
  ) : (
    // PASO 3: Countdown (solo si confirmed=true)
    <>
      <p className="power-modal-message">
        {selectedAction === 'shutdown' && `Shutting down in ${countdown} seconds...`}
        {selectedAction === 'restart' && `Restarting in ${countdown} seconds...`}
        {selectedAction === 'logout' && `Logging out in ${countdown} seconds...`}
      </p>
      <div className="power-modal-countdown">{countdown}</div>
      <Button variant="secondary" size="md" onClick={handleCancel} disabled={isExecuting}>
        Cancel
      </Button>
    </>
  );
}
```

**CSS adicional:**

```css
.power-modal-confirm {
  text-align: center;
  margin-bottom: var(--space-5);
}

.power-icon {
  color: var(--color-error);
  margin-bottom: var(--space-3);
}

.confirm-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}

.confirm-message {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}
```

---

### 4.3 SettingsPanel Reset Confirmation

**Categoría:** Necessary
**Impacto:** MEDIO (prevenir pérdida de configuración personalizada)
**Esfuerzo:** 2 horas

**Problema:**
Si existe "Reset to defaults", debe pedir confirmación.

**Solución:**

#### Archivo: `src/components/overlay/SettingsPanel/SettingsPanel.tsx`

```tsx
// Agregar state
const [showResetConfirm, setShowResetConfirm] = useState(false);
const { success, error } = useToast();

// Handler: abrir confirmación
const handleResetClick = () => {
  setShowResetConfirm(true);
};

// Handler: confirmar reset
const handleConfirmReset = async () => {
  try {
    await invoke('reset_settings_to_defaults');
    success('Settings reset', 'All settings have been restored to default values');
    setShowResetConfirm(false);
    // Reload settings
    await loadCurrentValues();
  } catch (err) {
    console.error('Failed to reset settings:', err);
    error('Reset failed', 'Could not reset settings to defaults');
  }
};

// Handler: cancelar reset
const handleCancelReset = () => {
  setShowResetConfirm(false);
};

// Botón "Reset to Defaults" (agregar en footer o en SystemTab)
<Button
  variant="danger"
  size="md"
  onClick={handleResetClick}
  icon={
    <IconWrapper size="md">
      <RotateCcw />
    </IconWrapper>
  }
>
  Reset to Defaults
</Button>;

// Modal de confirmación
{
  showResetConfirm && (
    <div className="settings-reset-confirm-overlay">
      <div className="settings-reset-confirm-modal">
        <AlertTriangle size={48} className="warning-icon" />
        <h3>Reset All Settings?</h3>
        <p>
          This will restore all settings to their default values.
          <strong> Your custom configuration will be lost.</strong>
        </p>
        <p className="settings-affected">
          Affected settings:
          <br />• Display, Performance, Appearance
          <br />• Input, Library, System
        </p>

        <div className="reset-confirm-actions">
          <Button variant="secondary" size="md" onClick={handleCancelReset} autoFocus>
            Cancel
          </Button>
          <Button variant="danger" size="md" onClick={handleConfirmReset}>
            Reset to Defaults
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**CSS:**

```css
.settings-reset-confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
}

.settings-reset-confirm-modal {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  max-width: 450px;
  text-align: center;
}

.warning-icon {
  color: var(--color-warning);
  margin-bottom: var(--space-3);
}

.settings-reset-confirm-modal h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
}

.settings-reset-confirm-modal p {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-3);
  line-height: 1.5;
}

.settings-reset-confirm-modal p strong {
  color: var(--color-error);
}

.settings-affected {
  background: rgba(255, 255, 255, 0.05);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  font-size: 0.8rem;
  text-align: left;
  margin-bottom: var(--space-4);
}

.reset-confirm-actions {
  display: flex;
  gap: var(--space-3);
}
```

---

### BATCH 4 SUMMARY

**Archivos a Modificar:** 3

1. `src/components/App/LibrarySection.tsx` - DELETE confirmation
2. `src/components/overlay/PowerModal/PowerModal.tsx` - Pre-confirmation
3. `src/components/overlay/SettingsPanel/SettingsPanel.tsx` - Reset confirmation

**Tests de Verificación:**

- [ ] GameLibrary: Click DELETE → modal "Delete [Game]? Cannot be undone"
- [ ] GameLibrary: Cancel en modal → no borra, cierra modal
- [ ] GameLibrary: Confirm en modal → toast verde + juego eliminado
- [ ] PowerModal: Click "Shutdown" → modal "Shutdown PC? Save your work"
- [ ] PowerModal: Confirm → inicia countdown (5s)
- [ ] PowerModal: Cancel en confirmación → vuelve a selección de acciones
- [ ] PowerModal: Cancel durante countdown → cierra modal
- [ ] SettingsPanel: Click "Reset to Defaults" → modal warning
- [ ] SettingsPanel: Modal muestra lista de settings afectados
- [ ] SettingsPanel: Cancel → no resetea
- [ ] SettingsPanel: Confirm → toast verde + settings reseteados

**Commit Message:**

```bash
git commit -m "feat(ux): BATCH 4 - confirmaciones para acciones destructivas

SEGURIDAD:
- GameLibrary: Confirmación antes de DELETE con cover preview
- PowerModal: Pre-confirmación antes de countdown (3 pasos)
- SettingsPanel: Confirmación antes de reset con warning

COMPONENTES:
- GameLibrary: DELETE confirmation modal (inline o ConfirmationModal)
- PowerModal: 3-step flow (Selection → Confirmation → Countdown)
- SettingsPanel: Reset modal con lista de settings afectados

IMPACTO:
- Prevención de acciones accidentales (DELETE, Shutdown, Reset)
- Usuario tiene oportunidad de cancelar antes de acción destructiva
- Warnings claros ("cannot be undone", "will be lost")

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## BATCH 5: ACCESSIBILITY & POLISH (8-10h) - Nice-to-Have

### Objetivo

Tooltips globales, keyboard shortcuts panel, advanced settings.

**Categoría:** Nice-to-Have
**Impacto:** MEDIO (mejora UX, no crítico)
**Esfuerzo:** 8-10 horas

---

### 5.1 Global Tooltips System

**Esfuerzo:** 4-5 horas

#### Crear useTooltip hook

**Archivo:** `src/hooks/useTooltip.ts`

```tsx
import { useCallback, useState } from 'react';

interface TooltipPosition {
  x: number;
  y: number;
}

interface TooltipData {
  text: string;
  position: TooltipPosition;
  visible: boolean;
}

export const useTooltip = () => {
  const [tooltip, setTooltip] = useState<TooltipData>({
    text: '',
    position: { x: 0, y: 0 },
    visible: false,
  });

  const showTooltip = useCallback((text: string, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    setTooltip({
      text,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
      },
      visible: true,
    });
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  return {
    tooltip,
    showTooltip,
    hideTooltip,
  };
};
```

#### Crear Tooltip component

**Archivo:** `src/components/ui/Tooltip/Tooltip.tsx`

```tsx
import './Tooltip.css';

import React from 'react';

interface TooltipProps {
  text: string;
  x: number;
  y: number;
  visible: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({ text, x, y, visible }) => {
  if (!visible || !text) return null;

  return (
    <div
      className="tooltip"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translate(-50%, -100%)',
      }}
    >
      {text}
    </div>
  );
};
```

**CSS:**

```css
.tooltip {
  position: fixed;
  z-index: 99999;
  background: var(--color-background-elevated-2);
  color: var(--color-text-primary);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: var(--glow-md);
  animation: tooltipFadeIn 0.15s ease-out;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, calc(-100% - 4px));
  }
  to {
    opacity: 1;
    transform: translate(-50%, -100%);
  }
}
```

**Uso en componentes:**

```tsx
import { useTooltip } from '@/hooks/useTooltip';
import { Tooltip } from '@/components/ui/Tooltip/Tooltip';

const { tooltip, showTooltip, hideTooltip } = useTooltip();

// En button/icon sin label
<button
  onMouseEnter={(e) => showTooltip('WiFi Settings', e.currentTarget)}
  onMouseLeave={hideTooltip}
  onFocus={(e) => {
    // Gamepad focus: delay 1s para evitar spam
    setTimeout(() => showTooltip('WiFi Settings', e.currentTarget), 1000);
  }}
  onBlur={hideTooltip}
>
  <Wifi />
</button>

// Tooltip global (render una vez en App)
<Tooltip {...tooltip} />
```

---

### 5.2 Keyboard Shortcuts Panel

**Esfuerzo:** 2-3 horas

#### Crear KeyboardShortcutsPanel

**Archivo:** `src/components/overlay/KeyboardShortcutsPanel/KeyboardShortcutsPanel.tsx`

```tsx
import './KeyboardShortcutsPanel.css';

import { Keyboard } from 'lucide-react';
import React from 'react';

import { OverlayPanel } from '../OverlayPanel/OverlayPanel';

interface KeyboardShortcutsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  {
    category: 'Navigation',
    shortcuts: [
      { keys: ['Arrow Keys'], description: 'Navigate menu' },
      { keys: ['Tab'], description: 'Switch focus area' },
      { keys: ['ESC'], description: 'Close overlay / Go back' },
      { keys: ['Enter'], description: 'Select / Confirm' },
    ],
  },
  {
    category: 'Search',
    shortcuts: [
      { keys: ['Ctrl', 'F'], description: 'Open search' },
      { keys: ['/'], description: 'Quick search' },
    ],
  },
  {
    category: 'Quick Actions',
    shortcuts: [
      { keys: ['Ctrl', 'W'], description: 'Open WiFi panel' },
      { keys: ['Ctrl', 'B'], description: 'Open Bluetooth panel' },
      { keys: ['Ctrl', 'Q'], description: 'Open Quick Settings' },
      { keys: ['Ctrl', ','], description: 'Open Settings' },
    ],
  },
  {
    category: 'Game Library',
    shortcuts: [
      { keys: ['R'], description: 'Refresh library' },
      { keys: ['F'], description: 'Toggle favorite' },
      { keys: ['Ctrl', 'A'], description: 'Select all' },
    ],
  },
  {
    category: 'In-Game',
    shortcuts: [
      { keys: ['Xbox Guide'], description: 'Open in-game menu' },
      { keys: ['Start'], description: 'Open in-game menu' },
    ],
  },
];

export const KeyboardShortcutsPanel: React.FC<KeyboardShortcutsPanelProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <OverlayPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts"
      width="600px"
      icon={<Keyboard />}
    >
      <div className="shortcuts-container">
        {SHORTCUTS.map((category) => (
          <div key={category.category} className="shortcuts-category">
            <h3 className="category-title">{category.category}</h3>
            <div className="shortcuts-list">
              {category.shortcuts.map((shortcut, idx) => (
                <div key={idx} className="shortcut-item">
                  <div className="shortcut-keys">
                    {shortcut.keys.map((key, keyIdx) => (
                      <React.Fragment key={keyIdx}>
                        <kbd className="shortcut-key">{key}</kbd>
                        {keyIdx < shortcut.keys.length - 1 && (
                          <span className="shortcut-plus">+</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  <span className="shortcut-description">{shortcut.description}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </OverlayPanel>
  );
};
```

**Trigger: F1 o ? key**

```tsx
// En App.tsx o OverlayManager
const [shortcutsPanelOpen, setShortcutsPanelOpen] = useState(false);

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'F1' || e.key === '?') {
      e.preventDefault();
      setShortcutsPanelOpen(true);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);

<KeyboardShortcutsPanel isOpen={shortcutsPanelOpen} onClose={() => setShortcutsPanelOpen(false)} />;
```

---

### 5.3 Advanced WiFi Settings

**Esfuerzo:** 2 horas

#### Agregar botón "Advanced" en WiFiPasswordModal

```tsx
// En WiFiPasswordModal, agregar state
const [showAdvanced, setShowAdvanced] = useState(false);

// Agregar botón toggle
<button className="wifi-advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
  {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
</button>;

{
  showAdvanced && (
    <div className="wifi-advanced-settings">
      <div className="wifi-setting-item">
        <label>IP Configuration</label>
        <select>
          <option value="dhcp">Automatic (DHCP)</option>
          <option value="static">Manual (Static IP)</option>
        </select>
      </div>

      <div className="wifi-setting-item">
        <label>DNS Servers</label>
        <select>
          <option value="auto">Automatic</option>
          <option value="manual">Manual</option>
        </select>
      </div>

      <div className="wifi-setting-item">
        <label>Proxy</label>
        <select>
          <option value="none">None</option>
          <option value="manual">Manual</option>
        </select>
      </div>
    </div>
  );
}
```

---

### BATCH 5 SUMMARY

**Archivos NUEVOS:** 3

1. `src/hooks/useTooltip.ts`
2. `src/components/ui/Tooltip/Tooltip.tsx`
3. `src/components/overlay/KeyboardShortcutsPanel/KeyboardShortcutsPanel.tsx`

**Archivos MODIFICADOS:** 2

1. `src/components/overlay/WiFiPanel/WiFiPasswordModal.tsx` - Advanced settings
2. `src/components/App/OverlayManager.tsx` - Shortcuts panel integration

**Tests de Verificación:**

- [ ] Tooltips aparecen en hover (mouse)
- [ ] Tooltips aparecen en focus (gamepad) con delay 1s
- [ ] Tooltips positioned correctamente (centered above element)
- [ ] F1 abre KeyboardShortcutsPanel
- [ ] ? abre KeyboardShortcutsPanel
- [ ] Panel muestra todos los shortcuts organizados por categoría
- [ ] WiFi advanced settings toggle funciona
- [ ] Advanced settings muestra IP, DNS, Proxy options

**Commit Message:**

```bash
git commit -m "feat(ux): BATCH 5 - accessibility & polish (tooltips, shortcuts panel)

ACCESIBILIDAD:
- Global tooltips system (useTooltip hook + Tooltip component)
- Keyboard shortcuts panel (F1 o ?)
- Advanced WiFi settings (IP, DNS, Proxy)

COMPONENTES NUEVOS:
- useTooltip hook: Show/hide tooltips con posicionamiento
- Tooltip component: Tooltip global con fadeIn animation
- KeyboardShortcutsPanel: Panel con todos los shortcuts

INTEGRACIÓN:
- Tooltips en 20+ elementos sin label (iconos, buttons)
- F1/? shortcut global para abrir panel
- WiFiPasswordModal con advanced settings collapse

IMPACTO:
- UX pulido y profesional
- Usuarios descubren shortcuts fácilmente
- Gamepad users pueden ver tooltips (focus delay 1s)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## RESUMEN FINAL - IMPLEMENTACIÓN COMPLETA

### Timeline Total Estimado

| Batch       | Descripción      | Esfuerzo   | Prioridad       |
| ----------- | ---------------- | ---------- | --------------- |
| **BATCH 1** | Quick Wins       | 4-6h       | ⚡ CRÍTICO      |
| **BATCH 2** | Error Visibility | 5-7h       | ⚡ CRÍTICO      |
| **BATCH 3** | WiFi Password    | 8-10h      | 🔴 BLOCKER      |
| **BATCH 4** | Confirmations    | 6-8h       | ⚡ CRÍTICO      |
| **BATCH 5** | Accessibility    | 8-10h      | 🟡 Nice-to-Have |
| **TOTAL**   |                  | **31-41h** |                 |

### Orden de Implementación Recomendado

**Semana 1 (CRÍTICO):**

1. BATCH 3: WiFi Password (8-10h) ← BLOCKER primero
2. BATCH 1: Quick Wins (4-6h)

**Semana 2 (CRÍTICO):** 3. BATCH 2: Error Visibility (5-7h) 4. BATCH 4: Confirmations (6-8h)

**Semana 3 (Nice-to-Have):** 5. BATCH 5: Accessibility & Polish (8-10h)

### Archivos Totales Afectados

**Nuevos:** 5 archivos

- WiFiPasswordModal.tsx
- WiFiPasswordModal.css
- useTooltip.ts
- Tooltip.tsx
- KeyboardShortcutsPanel.tsx

**Modificados:** 10 archivos

- OverlayPanel.css (animaciones)
- InGameMenuOptimized.tsx (FPS spinner)
- InGameMenu.css (spin animation)
- SettingsPanel.tsx (save feedback)
- WiFiPanel.tsx (toast + password modal integration)
- BluetoothPanel.tsx (toast + error hints)
- QuickSettings.tsx (toast + error mapping)
- GameLibraryVirtualized.tsx (toast + launch errors)
- PowerModal.tsx (pre-confirmation)
- LibrarySection.tsx (DELETE confirmation)

**Total:** 15 archivos (5 nuevos + 10 modificados)

### Criterios de Éxito FINAL

Después de completar los 5 batches:

- ✅ **Feedback Visual (90%):** Toasts, spinners, animations, success feedback
- ✅ **Manejo de Errores (85%):** Errores visibles con hints user-friendly
- ✅ **Confirmaciones (90%):** DELETE, Power, Reset confirmados
- ✅ **Completitud (95%):** WiFi password funcional, flujos completos
- ✅ **Accesibilidad (85%):** Tooltips, shortcuts panel, gamepad support

**Score Total Esperado: 89/100** ✅ (vs actual 53/100)

---

## Anexo: Error Message Best Practices

### Estructura de Error Messages

**Componentes de un buen error message:**

1. **Title:** Qué falló (user-friendly, no código técnico)
2. **Hint:** Por qué pudo haber fallado + cómo solucionarlo
3. **Duration:** 5s (más largo que success, para dar tiempo a leer hint)

**Ejemplos:**

❌ **MAL:**

```tsx
showErrorToast('Error', 'Failed to set volume: HRESULT 0x80070005');
```

✅ **BIEN:**

```tsx
showErrorToast(
  'Volume adjustment failed',
  'Check your audio drivers and make sure no other app is controlling volume'
);
```

### Error Parsing Patterns

```tsx
function parseError(error: unknown): { title: string; hint: string } {
  const errorStr = String(error).toLowerCase();

  // Permission errors
  if (errorStr.includes('permission') || errorStr.includes('access denied')) {
    return {
      title: 'Permission denied',
      hint: 'Try running as administrator or check file permissions',
    };
  }

  // Timeout errors
  if (errorStr.includes('timeout')) {
    return {
      title: 'Operation timed out',
      hint: 'The operation took too long. Try again or check your connection',
    };
  }

  // Not found errors
  if (errorStr.includes('not found') || errorStr.includes('does not exist')) {
    return {
      title: 'Resource not found',
      hint: 'The requested resource could not be found. Check the path or settings',
    };
  }

  // Default
  return {
    title: 'Operation failed',
    hint: 'An unexpected error occurred. Please try again',
  };
}
```

---

**FIN DE UX_IMPROVEMENTS.md**
