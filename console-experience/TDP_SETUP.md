# Configuración de Control de TDP

## 🎮 ¿Qué es el Control de TDP?

El TDP (Thermal Design Power) controla cuánta energía puede usar tu CPU. Útil para:

- **Handhelds/Laptops**: Extender batería reduciendo TDP
- **Gaming**: Balancear rendimiento vs temperatura
- **Desktop**: Testing (impacto limitado)

## 🖥️ Compatibilidad

### ✅ Soportado

- **CPUs AMD Mobile/APU**: Ryzen Mobile series (Zen, Zen+, Zen2, Zen3, Zen4)
- **Handhelds**: ROG Ally, Legion Go, Steam Deck
- **Laptops**: Con CPU AMD Ryzen Mobile
- **Sistemas**: Windows 10/11 (64-bit)

### ❌ No Soportado

- **CPUs AMD Desktop**: Ryzen 3900X, 5950X, 7950X, etc. (no tienen control de TDP)
- **CPUs Intel** (por ahora)
- **Sistemas de 32-bit**

### ⚠️ Limitación de RyzenAdj

RyzenAdj está diseñado **solo para CPUs móviles** (APUs). Los CPUs AMD desktop **no tienen soporte** para control de TDP a través de MSR registers.

## 🔧 Tu Sistema: Ryzen 3900X (Desktop)

### ⚠️ TDP Control NO Funcional

Tu CPU **NO está soportado** para control de TDP:

| Aspecto                  | Tu Desktop (3900X)       | Handheld (ROG Ally)       |
| ------------------------ | ------------------------ | ------------------------- |
| **Tipo de CPU**          | Desktop (Zen2)           | Mobile/APU (Zen3+)        |
| **TDP Base**             | 105W                     | 15W                       |
| **Soporte RyzenAdj**     | ❌ NO                    | ✅ SÍ                     |
| **Slider visible**       | ❌ Disabled              | ✅ Enabled                |
| **Detección automática** | ✅ Sin batería = Desktop | ✅ Con batería = Handheld |

**Razón**: RyzenAdj solo funciona con CPUs móviles/APUs que tienen los registros MSR necesarios para control de TDP. Los CPUs desktop no tienen esta funcionalidad.

## 📦 Instalación (Para el Usuario Final)

### ✨ Bundle Automático

Las DLLs necesarias se **incluyen automáticamente** en el instalador:

- `libryzenadj.dll` - Librería principal
- `inpoutx64.dll` - Driver de bajo nivel
- `WinRing0x64.dll` - Acceso a registros

**El usuario NO necesita instalar nada manualmente.**

## 🧪 Testing en tu Desktop (Desarrollador)

### Paso 1: Verificar DLLs

Las DLLs ya están descargadas en:

```
console-experience/src-tauri/
├── libryzenadj.dll  ✅
├── inpoutx64.dll    ✅
└── WinRing0x64.dll  ✅
```

### Paso 2: Ejecutar en Modo Dev

```bash
cd console-experience
npm run tauri dev
```

### Paso 3: Verificar Quick Settings

1. Presiona **Q** (o SELECT en gamepad)
2. Navega al slider **TDP**
3. **Verás que está DISABLED** (tu CPU no está soportado)

### Logs Esperados

```
[INFO] Detected AMD CPU
[INFO] Initializing RyzenAdj library...
Fam17h: unsupported model 113
Only Ryzen Mobile Series are supported
[WARN] RyzenAdj initialization failed. This CPU model may not be supported for TDP control.
[WARN] Desktop Ryzen CPUs (like 3900X) are not supported by RyzenAdj.
[WARN] TDP control is only available on Ryzen Mobile/APU chips (handhelds/laptops).
[WARN] TDP control not supported: TDP control not supported on this CPU model...
```

### ✅ Comportamiento Correcto

- La app **NO debe crashear**
- El slider TDP debe aparecer **deshabilitado (grayed out)**
- Los otros sliders (Volume, Brightness, Refresh Rate) **deben funcionar**

## 🎯 Detección Automática

El código detecta **automáticamente** el tipo de sistema:

```rust
// Detecta batería usando Windows API
fn is_battery_powered() -> bool {
    GetSystemPowerStatus(&mut status);
    // Si tiene batería: Handheld/Laptop (5-30W)
    // Sin batería: Desktop (65-142W)
}
```

**En tu PC**:

- ❌ No detecta batería
- ✅ Usa rangos desktop (65-142W)
- ℹ️ Logs mostrarán: "No battery detected: Using desktop TDP limits"

## 📝 Logs de Debug

Para ver qué está pasando:

```bash
# En la consola de la app verás:
[INFO] No battery detected: Using desktop TDP limits (65-142W)
[INFO] Initializing RyzenAdj library...
[INFO] RyzenAdj initialized successfully
[INFO] Setting TDP to 105W (105000mW)
[INFO] TDP set successfully to 105W
```

## ⚙️ Build para Producción

Cuando generes el instalador:

```bash
cd console-experience
npm run tauri build
```

El instalador incluirá automáticamente:

- ✅ Todas las DLLs necesarias
- ✅ Se copian al directorio de recursos
- ✅ El usuario NO necesita hacer nada extra

Ubicación en producción:

```
C:\Program Files\Console Experience\
├── console-experience.exe
└── resources\
    ├── libryzenadj.dll
    ├── inpoutx64.dll
    └── WinRing0x64.dll
```

## 🛡️ Seguridad

### Validaciones Implementadas

- ✅ **Clamping automático**: TDP fuera de rango se ajusta al límite más cercano
- ✅ **Detección de hardware**: Solo funciona en AMD
- ✅ **Mutex protection**: Previene cambios concurrentes
- ✅ **RAII cleanup**: Libera recursos automáticamente

### Permisos Necesarios

⚠️ **Requiere derechos de administrador** porque:

- Accede a registros MSR (Model-Specific Registers)
- Modifica configuración de hardware

## 🐛 Troubleshooting

### "libryzenadj.dll not found"

**Causa**: DLL no está en el directorio correcto
**Solución** (dev):

```bash
cd console-experience/src-tauri
# Verificar que existe
ls libryzenadj.dll
```

### "RyzenAdj initialization failed"

**Causa**: No tienes permisos de administrador
**Solución**: Ejecutar como administrador

### "TDP control only supported on AMD CPUs"

**Causa**: CPU no es AMD (o CPUID detection falló)
**Solución**: Verificar que tienes CPU AMD

### Slider muestra "Disabled"

**Causa**: CPU no soportado o verificación falló

**Si tienes CPU Desktop AMD (3900X, 5950X, etc.)**:

- ✅ **Esto es normal** - RyzenAdj solo soporta CPUs móviles
- ✅ La app debe seguir funcionando normalmente
- ✅ Los otros sliders (Volume, Brightness, Refresh) deben funcionar
- ℹ️ Logs mostrarán: "Only Ryzen Mobile Series are supported"

**Si tienes Handheld/Laptop con Ryzen Mobile**:
**Diagnóstico**:

1. Revisa logs en consola
2. Verifica que RyzenAdj se cargó
3. Confirma permisos de administrador

## 📊 Rangos por Sistema

| Tipo          | Detección   | Min | Max  | Default | Uso Típico        |
| ------------- | ----------- | --- | ---- | ------- | ----------------- |
| **Desktop**   | Sin batería | 65W | 142W | 105W    | Testing           |
| **Laptop**    | Con batería | 5W  | 30W  | 15W     | Balancear batería |
| **ROG Ally**  | Con batería | 5W  | 30W  | 15W     | Gaming portátil   |
| **Legion Go** | Con batería | 5W  | 30W  | 15W     | Gaming portátil   |

## 📚 Referencias

- **RyzenAdj**: https://github.com/FlyGoat/RyzenAdj
- **Windows Power API**: https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-getsystempowerstatus
- **AMD MSR**: https://www.amd.com/en/support/tech-docs

## 🤝 Para Contribuidores

Si quieres mejorar la detección de hardware:

```rust
// En ryzenadj_adapter.rs, función get_hardware_limits()
fn get_hardware_limits() -> (u32, u32) {
    // Detectar modelos específicos
    let cpu_model = detect_cpu_model(); // TODO: Implementar

    match cpu_model {
        CpuModel::RogAlly => (5, 30),
        CpuModel::LegionGo => (5, 25),
        CpuModel::SteamDeck => (4, 15),
        CpuModel::Desktop3900X => (65, 142),
        CpuModel::Desktop5950X => (105, 170),
        _ => auto_detect_by_battery(),
    }
}
```

## ✅ Checklist de Testing

- [ ] Compilación exitosa (`cargo build`)
- [ ] DLLs presentes en `src-tauri/`
- [ ] App carga sin errores
- [ ] Quick Settings abre (tecla Q)
- [ ] Slider TDP muestra "65W - 142W"
- [ ] Ajustar TDP no causa errores
- [ ] Logs muestran "No battery detected"
- [ ] Bundle incluye DLLs (`npm run tauri build`)

---

**Nota**: Este sistema es seguro para testing en tu desktop. Los usuarios finales con handhelds obtendrán rangos diferentes (5-30W) automáticamente.
