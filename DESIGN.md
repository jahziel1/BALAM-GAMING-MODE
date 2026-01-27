# Documento de Diseño: Project Console Experience

## 1. Visión General
Crear una interfaz tipo "Launcher" o "Frontend" (similar a Steam Big Picture) que funcione como el Shell principal de Windows, permitiendo una experiencia inmersiva de consola, pero con la flexibilidad de volver al escritorio de Windows tradicional cuando sea necesario.

## 2. Arquitectura del Sistema
El sistema se dividirá en 3 capas principales para manejar la complejidad:

### Capa 1: System Core (El "Shell")
Es el motor que interactúa con Windows.
*   **Responsabilidad:** 
    *   Gestionar el ciclo de vida de `explorer.exe`.
    *   **Modo Consola:** Matar/Bloquear `explorer.exe` para liberar RAM y eliminar distracciones.
    *   **Modo Escritorio:** Lanzar `explorer.exe` y minimizar el Launcher.
    *   Detectar resolución de pantalla, gestionar volumen y apagado del sistema.

### Capa 2: Library Manager (El "Cerebro")
Gestiona la biblioteca de juegos y aplicaciones.
*   **Responsabilidad:**
    *   **Base de Datos:** Almacenar rutas de juegos, nombres, categorías.
    *   **Scanner:** Buscar ejecutables (.exe) en carpetas designadas.
    *   **Metadata:** (Opcional) Descargar carátulas/arte desde internet.
    *   **Launcher:** Ejecutar el juego y esperar a que cierre para devolver el foco al Shell.

### Capa 3: User Interface (La "Cara")
La interfaz gráfica que ve el usuario.
*   **Requisitos:** Navegable con Mando (Gamepad) y Ratón.
*   **Estilo:** Grid de carátulas, animaciones suaves, moderno.

## 3. Análisis de Tecnologías (Performance & UI)

Dado que el rendimiento es crítico (el launcher no debe robar FPS a los juegos) y la experiencia visual debe ser fluida, evaluamos lenguajes compilados:

### Opción 1: Rust (Recomendado para Performance + Seguridad)
*   **Por qué:** Gestión de memoria impecable sin Garbage Collector (GC). Rendimiento nativo. Muy seguro contra crasheos.
*   **UI:** `Tauri` (Backend en Rust + Frontend Web ultra-ligero usando el WebView del sistema, no incluye un navegador entero como Electron). O `Iced` (GUI nativa en Rust, más "cruda" pero puramente nativa).
*   **Veredicto:** Excelente equilibrio. Consumo de RAM minúsculo (<50MB).

### Opción 2: C++ (El Estándar de la Industria)
*   **Por qué:** Control absoluto del hardware y la API de Windows. Es lo que usa Steam o los juegos AAA.
*   **UI:** `Qt` (C++). Es el estándar de oro para aplicaciones de escritorio de alto rendimiento con interfaz compleja.
*   **Veredicto:** Máximo rendimiento posible, pero desarrollo más lento y complejo. Mayor riesgo de bugs de memoria si no se tiene cuidado.

### Opción 3: Go (Golang)
*   **Por qué:** Muy rápido, compila a binario nativo, fácil concurrencia (útil para escanear miles de archivos de juegos en paralelo).
*   **UI:** `Wails` (Similar a Tauri/Electron pero con Go en el backend).
*   **Veredicto:** Bueno, pero el Garbage Collector (GC) podría introducir micro-pausas (aunque en Go es muy rápido, para un launcher es imperceptible). Menos maduro en GUIs de escritorio que C++/Qt.

### Opción 4: C# / .NET (WPF o Avalonia)
*   **Por qué:** "Nativo" de facto en Windows. Integración perfecta con APIs del sistema.
*   **Veredicto:** Buen rendimiento, pero requiere el runtime de .NET. Un poco más pesado que Rust/C++.

## 4. Flujo de "Switching" (El reto principal)

### Estado Inicial (Boot)
1. Windows arranca.
2. En lugar de cargar el Escritorio, carga **Project Console**.
3. El usuario ve solo la interfaz de juegos.

### Transición a "Modo Escritorio"
1. Usuario selecciona "Ir al Escritorio" en el menú.
2. **System Core** ejecuta `explorer.exe`.
3. Windows carga la barra de tareas y el fondo.
4. **Project Console** se minimiza a la bandeja o se cierra (dejando un agente en segundo plano).

### Retorno a "Modo Consola"
1. Usuario hace clic en el icono de **Project Console** o presiona un atajo (ej: Botón Home del mando).
2. **Project Console** toma foco completo.
3. (Opcional) **System Core** cierra `explorer.exe` suavemente para recuperar la inmersión.

## 5. Roadmap de Implementación y Mejores Prácticas

Para garantizar calidad AAA y rendimiento óptimo, seguiremos este orden estricto:

### Fase 1: Arquitectura de Datos y "Core" (Sin UI)
*   **Objetivo:** Definir cómo se guardan los datos para que el acceso sea instantáneo (O(1)).
*   **Mejor Práctica:** Usar bases de datos embebidas ultra-rápidas (SQLite con WAL mode) o estructuras en memoria (HashMaps) serializadas en binario (bincode/protobuf) en lugar de JSON texto plano para cargar miles de juegos en milisegundos.
*   **Performance:** El "Cold Start" (tiempo de carga inicial) debe ser < 500ms.

### Fase 2: Diseño de Experiencia (UX/UI Mockups)
*   **Objetivo:** Diseñar la interacción antes de programar.
*   **Mejor Práctica:** "Controller First". Diseñar pensando que NO existe el ratón.
*   **Performance Gráfico:** Definir presupuesto de polígonos/texturas. Usar "Virtual Scrolling" (solo renderizar lo que se ve en pantalla) para que la lista de 10,000 juegos no congele la UI. Carga perezosa (Lazy Loading) de imágenes.

### Fase 3: Prototipo del "Shell Manager"
*   **Objetivo:** Probar el reemplazo de Explorer.exe de forma aislada y segura.
*   **Mejor Práctica:** Implementar un "Watchdog". Un proceso separado minúsculo que vigila si tu Shell crashea y relanza Explorer automáticamente para que el usuario nunca quede atrapado en pantalla negra.

### Fase 4: Integración y Pulido
*   **Objetivo:** Unir UI y Core.
*   **Mejor Práctica:** Telemetría de rendimiento local. Medir cuánta RAM consume en reposo. Si pasa de 100MB, es un fallo. El Shell debe ser invisible para el rendimiento del juego.
