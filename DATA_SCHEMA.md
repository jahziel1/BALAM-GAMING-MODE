# Esquema de Datos Agnóstico

Para garantizar el máximo rendimiento (lecturas O(1)) y flexibilidad, utilizaremos **SQLite** como motor principal, pero con una capa de abstracción que permita exportar/importar a JSON para que el usuario pueda editar manualmente si lo desea.

## 1. Modelo Relacional (ER Diagram Simplificado)

### Tabla: `games`
La entidad principal. Representa cualquier cosa ejecutable.

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | UUID / INT | Identificador único (Primary Key). |
| `title` | TEXT | Nombre visible del juego (ej: "Elden Ring"). |
| `executable_path` | TEXT | Ruta absoluta al .exe o script. |
| `arguments` | TEXT | Argumentos de lanzamiento (ej: `-windowed -nointro`). |
| `working_dir` | TEXT | Directorio de trabajo (crucial para juegos viejos). |
| `icon_path` | TEXT | Ruta a la imagen pequeña (para listas). |
| `cover_path` | TEXT | Ruta a la imagen grande (para grid). |
| `backdrop_path` | TEXT | Ruta a la imagen de fondo (arte conceptual). |
| `play_count` | INT | Contador de veces jugado. |
| `last_played` | DATETIME | Para ordenar por "Recientes". |
| `is_favorite` | BOOLEAN | Pin para acceso rápido. |

### Tabla: `platforms` (Opcional)
Para agrupar por origen (Steam, Epic, Emuladores).

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | INT | PK |
| `name` | TEXT | Ej: "Steam", "GOG", "SNES". |
| `launcher_cmd` | TEXT | Comando base (ej: `steam://run/`). |

### Tabla: `tags` & `game_tags`
Para filtrado rápido (RPG, FPS, Local-Coop).

---

## 2. Ejemplo de Objeto JSON (Intercambio)

Este formato se usará para importar librerías externas o backups.

```json
{
  "schema_version": 1,
  "games": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Cyberpunk 2077",
      "executable": "C:\\Games\\Cyberpunk 2077\\bin\\x64\\Cyberpunk2077.exe",
      "args": "",
      "working_dir": "C:\\Games\\Cyberpunk 2077\\bin\\x64\\",
      "media": {
        "cover": "covers/cp2077_vertical.jpg",
        "backdrop": "backdrops/cp2077_bg.jpg",
        "icon": "icons/cp2077.ico"
      },
      "metadata": {
        "platform": "GOG",
        "tags": ["RPG", "Sci-Fi", "Open World"],
        "rating": 90
      }
    },
    {
      "title": "Notepad (App)",
      "executable": "C:\\Windows\\System32\\notepad.exe",
      "tags": ["System", "Tool"]
    }
  ]
}
```

## 3. Estrategia de Rendimiento

1.  **WAL Mode (Write-Ahead Logging):** Activaremos esto en SQLite para que las lecturas y escrituras sean concurrentes. La interfaz nunca se congelará mientras se guarda el tiempo de juego.
2.  **Índices:** Se crearán índices en `title`, `last_played` y `is_favorite` para que ordenar la lista sea instantáneo incluso con 10,000 juegos.
3.  **Caching de Imágenes:** Las rutas de las imágenes se guardan en BD, pero las imágenes en sí se procesarán (redimensionarán) en una carpeta `.cache` para no cargar JPGs de 4K en el grid de miniaturas.
