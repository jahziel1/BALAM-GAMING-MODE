# Estado del Proyecto y Checklist

## 🟢 Implementado y Robusto (Stable)

### 🕹️ Input & Control (Universal)
- [x] **Arquitectura Input Inmortal (Dual-Channel):**
  - Canal Web: Navegación UI fluida y precisa.
  - Canal Nativo (Rust): Respaldo a prueba de fallos cuando la ventana pierde foco.
- [x] **Soporte Multi-Plataforma:** Xbox (XInput), PlayStation y Switch (Gilrs).
- [x] **Global Wake-Up:** Combinación `LB + RB + START` funcional en segundo plano.
- [x] **Paridad UX de Consola:**
  - Navegación intuitiva (Back -> Resume Menu).
  - Indicadores visuales de "Juego en Curso".
  - Foco visual sincronizado entre teclado, ratón y mando.

### 🎮 Gestión de Juegos Backend
- [x] **Registry Watchdog (Steam):** Detección 100% precisa.
- [x] **Universal Scanner:** Steam, Epic y Xbox/UWP.
- [x] **Process Watchdog:** Detección automática de cierre de juegos.
- [x] **Task Killer:** Cierre forzoso funcional para todos los plataformas.

### 🖥️ Frontend (React UI)
- [x] **Mode Selector:** Integración fluida entre Biblioteca y Menú In-Game.
- [x] **Performance:** Carga instantánea con cache persistente.
- [x] **Visual Feedback:** Debug overlay de estado conexión de mando.

---

## 🟡 En Progreso / Pendiente de Pulido

- [ ] **Efectos de Sonido (SFX):** Feedback auditivo al navegar y seleccionar.
- [ ] **Animaciones de Transición:** Suavizar la entrada/salida del Overlay.
- [ ] **Metadata Fetcher:** Descargar carátulas de alta calidad (IGDB) en lugar de iconos locales.

---

## 🔴 Pendientes (Roadmap)

### Core System
- [ ] **Gestión de Energía:** Apagar/Reiniciar/Suspender PC desde UI.
- [ ] **Modo Shell Puro:** Reemplazo total de `explorer.exe` (Kiosk Mode).
- [ ] **Configuración Manual:** UI para añadir rutas de juegos "portables" o emuladores.

### UX Avanzada
- [ ] **Buscador Global:** Filtrado rápido por teclado virtual.
- [ ] **Temas:** Selección de colores de acento.

---

## 🐛 Bugs Conocidos (Tracked)
- [ ] El scroll del ratón puede requerir un clic inicial si la ventana viene de estar minimizada mucho tiempo (mitigado por Canal Nativo, pero existente en Web).
