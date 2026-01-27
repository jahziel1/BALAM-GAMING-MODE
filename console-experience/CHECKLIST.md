# Estado del Proyecto y Checklist

## 🟢 Implementado y Robusto

### Backend (Rust)
- [x] **Registry Watchdog (Steam):** Detección 100% precisa vía Registro de Windows.
- [x] **Process Watchdog (Genérico):** Detección por PID para juegos Nativos/Epic.
- [x] **Universal Scanner:**
  - **Steam:** Detecta carpetas reales y manifiestos.
  - **Epic:** Detecta `.exe` reales.
  - **Xbox/UWP:** Implementación robusta vía PowerShell (compatible con/sin Explorer).
- [x] **Lanzamiento Nativo (Launcher):**
  - **Xbox/UWP:** ✅ Implementado `IApplicationActivationManager` para obtener **PID Real** (Crítico para Watchdog).
  - **General:** Gestión de procesos segura.
- [x] **Task Killer Inteligente:**
  - Soporta cierre forzoso de Steam, Epic y UWP.

### Frontend (React)
- [x] **Hybrid Multitasking UI:** Menú In-Game funcional (Overlay).
- [x] **Gamepad Hook:** Navegación nativa fluida.
- [x] **Cache System:** Carga instantánea (`games_cache.json`).

---

## 🟡 En Progreso / Pendiente de Pulido

- [ ] **Efectos de Sonido (SFX):** Feedback auditivo pendiente de implementación.
- [ ] **Validación Xbox Kill:** El cierre de UWP usa heurísticas, requiere más pruebas de campo.

---

## 🔴 Pendientes (Roadmap)

### Core
- [ ] **Gestión Energía:** Apagar/Reiniciar PC desde Rust.
- [ ] **Buscador Global:** Filtrado por texto en la UI.
- [ ] **Configuración Rutas:** UI para añadir carpetas manuales.

### UX Visual
- [ ] **Animaciones:** Transiciones suaves entre pantallas.
- [ ] **Metadatos Ricos:** Portadas (IGDB) y fondos dinámicos.

---

## 🐛 Bugs Conocidos
- [ ] **Mouse en Overlay:** Requiere doble clic a veces para ganar foco (tauri window focus issue).
