# Estándares de Ingeniería y Buenas Prácticas

Este documento define el contrato técnico para el desarrollo de **Console Experience**. Todo código enviado debe cumplir estrictamente estas reglas.

## 1. Arquitectura y Principios de Diseño
### 1.1. Arquitectura Hexagonal (Ports & Adapters) y Clean Architecture
El proyecto seguirá estrictamente una arquitectura por capas para desacoplar la lógica de negocio de la infraestructura (Windows, UI, Base de Datos).

*   **Dominio (Core):** Entidades y Lógica de Negocio Pura. No depende de NADA externo.
    *   *Ejemplo:* `Game`, `Library`.
*   **Puertos (Ports):** Interfaces (Traits en Rust) que definen qué necesita el Dominio para funcionar.
    *   *Ejemplo:* `GameRepository`, `SystemPowerManager`.
*   **Adaptadores (Adapters):** Implementaciones concretas de los puertos.
    *   *Ejemplo:* `SqliteGameRepository`, `WindowsPowerManager`, `TauriFrontend`.
*   **Aplicación (Use Cases):** Orquestadores que ejecutan acciones específicas usando el dominio.
    *   *Ejemplo:* `LaunchGameUseCase`, `ScanLibraryUseCase`.

### 1.2. Principios Generales
*   **Clean Code:**
    *   Nombres de variables y funciones descriptivos y pronunciables.
    *   Funciones pequeñas que hacen **una sola cosa**.
    *   Evitar efectos secundarios ocultos.
*   **KISS (Keep It Simple, Stupid):** La solución más simple que funcione es la correcta.
*   **SOLID:** Cumplimiento estricto de los 5 principios.
*   **Controller-First:** Toda UI debe ser navegable al 100% con mando.

## 2. Reglas de Código (Hard Limits)
*   **Límite de Archivo:** Ningún archivo de código fuente puede exceder las **500 líneas**.
    *   *Acción:* Si un archivo crece más allá, debe refactorizarse y dividirse en submódulos.
*   **Documentación:**
    *   Todas las funciones públicas, estructuras y módulos deben tener documentación (Rustdoc `///` o JSDoc `/** */`).
    *   Comentarios explicativos en bloques de lógica compleja ("Por qué", no "Qué").
*   **Testing:**
    *   **Cobertura:** Toda nueva lógica de negocio debe incluir sus **Unit Tests**.
    *   No se acepta código sin tests asociados.
*   **Performance-First (Critical):**
    *   Todo re-renderizado debe ser justificado. Usar `React.memo`, `useMemo` y `useCallback` por defecto en componentes de la galería.
    *   Evitar lecturas del DOM en bucles de animación o polling.
    *   Mantener el bundle de Tauri por debajo de los 100MB si es posible.
*   **Native-First Architecture (KISS/CLEAN):**
    *   **Prioridad Nativa:** Usar siempre APIs nativas de Windows (Win32, COM, WinRT) para interactuar con hardware y sistema. Evitar `Command::new` para utilidades de sistema si existe una API de bajo nivel.
    *   **Control Total:** Interceptar eventos del sistema (ej: teclas multimedia) para suprimir la UI nativa de Windows (OSD) y mantener la inmersión de consola.
    *   **Eficiencia:** El backend en Rust debe ser el "cerebro" reactivo, comunicándose con el frontend vía eventos (`emit`) para evitar polling innecesario.

## 3. Estándares Específicos: Rust (Backend)
*   **Seguridad de Memoria:**
    *   Prohibido el uso de `unsafe` a menos que sea estrictamente necesario y esté justificado documentalmente.
    *   **Prohibido `unwrap()` y `expect()`** en código de producción. Usar manejo de errores explícito (`match`, `?`, `map_err`).
*   **Formato:**
    *   Uso obligatorio de `cargo fmt` y `cargo clippy`.
    *   No ignorar warnings del compilador.

### 4.1. Optimización de Renderizado (React Performance)
*   **Virtualización Obligatoria:**
    *   Cualquier lista que pueda contener más de 50 elementos (ej: Grid de Juegos) DEBE usar virtualización (`react-window` o similar).
    *   Prohibido renderizar listas masivas directamente en el DOM.
*   **Animaciones GPU-First:**
    *   Las animaciones deben realizarse preferentemente con CSS (`transform`, `opacity`) para usar la aceleración de hardware.
    *   Evitar animar propiedades que causen `reflow` (como `width`, `height`, `top`, `left`) en bucles de renderizado.
*   **Gestión de Estado Atómica:**
    *   Minimizar re-renderizados globales. Usar selectores de estado granulares.
    *   Componentes que se actualizan frecuentemente (ej: cursor, barra de progreso) deben estar aislados.
*   **Asset Management:**
    *   Las imágenes críticas (placeholders, logos) deben estar locales en `src/assets`.
    *   Cargar imágenes remotas de forma perezosa (lazy loading).

## 6. Herramientas de Calidad Automática (Linters)
Para garantizar el cumplimiento de estas normas sin intervención humana constante, se configuran las siguientes herramientas obligatorias:

### 6.1. Backend (Rust)
*   **Rustfmt:** Formateador de código oficial.
    *   *Configuración:* `edition = "2021"`, `max_width = 100`.
*   **Clippy:** Linter oficial de Rust. Se usará en modo estricto.
    *   *Reglas Forzadas:*
        *   `#![deny(clippy::unwrap_used)]`: Prohíbe `unwrap()` (evita pánicos).
        *   `#![deny(clippy::expect_used)]`: Prohíbe `expect()` (fuerza manejo de errores).
        *   `#![warn(clippy::pedantic)]`: Activa sugerencias avanzadas de optimización y legibilidad.

### 6.3. Cobertura de Código (Test Coverage)
Se establece un umbral mínimo de cobertura para garantizar la fiabilidad del sistema.

*   **Umbral Mínimo Global:** **80%**.
    *   Si la cobertura baja del 80%, el pipeline de integración continua (CI) fallará.
*   **Umbral Crítico (Core Domain):** **90%**.
    *   La lógica de negocio pura (entidades y casos de uso) debe estar testeadas casi en su totalidad.
*   **Herramienta:** `tarpaulin` (para Rust).
    *   Comando: `cargo tarpaulin --ignore-tests --fail-under 80`.
*   **Exclusiones Permitidas:**
    *   Archivos de configuración UI pura (ej: estilos CSS).
    *   Adaptadores de infraestructura difíciles de mockear (ej: llamadas directas a APIs de Windows, aunque se intentará cubrir con tests de integración).
