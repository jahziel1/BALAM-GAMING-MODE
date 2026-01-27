# Conceptos de Interfaz de Usuario (UI) - Controller First

Este documento define la distribución visual y el flujo de navegación, diseñado específicamente para ser controlado con un Mando (D-Pad / Analog Stick) sin necesidad de ratón.

## 1. Pantalla Principal (The Dashboard)
**Concepto:** Minimalista. Acceso rápido a lo último jugado y funciones del sistema.

```text
+-----------------------------------------------------------------------+
|  [10:42 PM]    [WIFI: ON]    [VOL: 50%]                    [PROFILE]  |
+-----------------------------------------------------------------------+
|                                                                       |
|   CONTINUAR JUGANDO                                                   |
|                                                                       |
|   +------------------+    +------------------+    +------------------+|
|   |                  |    |                  |    |                  ||
|   |   ELDEN RING     |    |   CYBERPUNK      |    |    HADES         ||
|   |   [JUGANDO]      |    |                  |    |                  ||
|   |                  |    |                  |    |                  ||
|   +------------------+    +------------------+    +------------------+|
|                                                                       |
|                                                                       |
|   MENÚ RÁPIDO                                                         |
|   [ BIBLIOTECA ]   [ TIENDA(Web) ]   [ APAGAR ]   [ ESCRITORIO ]      |
|                                                                       |
+-----------------------------------------------------------------------+
```

### Navegación
*   **Foco Inicial:** El juego más reciente ("Elden Ring" en el ejemplo).
*   **D-Pad Abajo:** Mueve el foco a "MENÚ RÁPIDO".
*   **D-Pad Derecha/Izquierda:** Navega entre las tarjetas de juegos.
*   **Botón A (Cross):** Lanzar juego / Seleccionar opción.
*   **Botón B (Circle):** Nada en esta pantalla.
*   **Botón Y (Triangle):** Buscar (Abre teclado en pantalla).

---

## 2. Vista de Biblioteca (Grid View)
**Concepto:** Muro infinito de carátulas. Optimizado para "Virtual Scrolling" (rendimiento).

```text
+-----------------------------------------------------------------------+
|  FILTROS:  [TODOS]  [FAVORITOS]  [RPG]  [FPS]             [BUSCAR]    |
+-----------------------------------------------------------------------+
|                                                                       |
|  +------+  +------+  +------+  +------+  +------+  +------+           |
|  | ART  |  | ART  |  | ART  |  | ART  |  | ART  |  | ART  |           |
|  |      |  |      |  |      |  |      |  |      |  |      |           |
|  +------+  +------+  +------+  +------+  +------+  +------+           |
|  Halo      Doom      FIFA      Zelda     GOW       Mario              |
|                                                                       |
|  +------+  +------+  +------+  +------+  +------+  +------+           |
|  | ART  |  | ART  |  | ART  |  | ART  |  | ART  |  | ART  |           |
|  |      |  |      |  |      |  |      |  |      |  |      |           |
|  +------+  +------+  +------+  +------+  +------+  +------+           |
|  GTA V     RDR 2     Portal    Sims      Civ 6     Tetris             |
|                                                                       |
+-----------------------------------------------------------------------+
```

### Detalles de UX
*   **Grid:** 6 columnas x 3 filas visibles.
*   **Focus State:** La carátula seleccionada se agranda un 10% y tiene un borde brillante (Accent Color).
*   **Lazy Loading:** Las imágenes de abajo no se cargan en memoria hasta que bajas.

---

## 3. Menú de Pausa / Overlay (Ingame)
**Concepto:** Al presionar el botón "Guide/Home" del mando mientras juegas.

```text
+---------------------------------------+
|                                       |
|        JUEGO PAUSADO (Fondo)          |
|                                       |
|      +-------------------------+      |
|      |  VOLVER AL JUEGO        |      |
|      +-------------------------+      |
|      |  CERRAR JUEGO           |      |
|      +-------------------------+      |
|      |  AJUSTES DE MANDO       |      |
|      +-------------------------+      |
|      |  IR AL ESCRITORIO       |      |
|      +-------------------------+      |
|                                       |
+---------------------------------------+
```

## 4. Teclado en Pantalla (OSK - On Screen Keyboard)
**Crucial para UX sin ratón.**
Diseño tipo "Flor" o "Grid Lineal" (Más fácil de navegar con flechas que un QWERTY estándar).

```text
[ A ] [ B ] [ C ] [ D ] [ E ] [ F ] ... [BORRAR]
[ G ] [ H ] [ I ] [ J ] [ K ] [ L ] ... [ESPACIO]
...
```
