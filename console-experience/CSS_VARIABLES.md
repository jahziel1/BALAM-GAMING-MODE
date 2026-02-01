# Design System - Console Experience

## Sistema de Diseño Unificado

Todas las variables están definidas en `src/App.css` en el bloque `:root`.

Este documento define el **lenguaje visual único** que unifica todo el proyecto.

---

## 🎨 Paleta de Colores

### Colores Principales

```css
var(--color-primary)           /* #2D73FF - Azul primario */
var(--color-primary-light)     /* #06BFFF - Azul claro/acento */
var(--color-primary-rgb)       /* 45, 115, 255 - RGB para transparencias */
var(--color-primary-light-rgb) /* 6, 191, 255 - RGB para transparencias */
```

### Fondos

```css
var(--color-background)          /* #0f0f0f - Fondo principal oscuro */
var(--color-background-card)     /* #1e1e24 - Fondo de tarjetas */
var(--color-background-elevated) /* rgba(20, 20, 30, 0.6) - Fondo elevado */
```

### Textos

```css
var(--color-text-primary)   /* #ffffff - Texto principal */
var(--color-text-secondary) /* rgba(255, 255, 255, 0.8) - Texto secundario */
var(--color-text-tertiary)  /* rgba(255, 255, 255, 0.6) - Texto terciario/disabled */
```

### Bordes

```css
var(--color-border)       /* rgba(255, 255, 255, 0.1) - Borde normal */
var(--color-border-focus) /* var(--color-primary) - Borde con foco */
```

### Estados Semánticos

```css
var(--color-success) /* #4ade80 - Verde para success */
var(--color-danger)  /* #ef4444 - Rojo para danger/error */
var(--color-warning) /* #ffca28 - Amarillo para warning */
```

---

## 🪟 Glassmorphism (Efecto Vidrio)

**OBLIGATORIO** para overlays, modales, sidebars, menús.

```css
var(--glass-bg)        /* rgba(15, 17, 21, 0.85) - Fondo oscuro translúcido */
var(--glass-bg-light)  /* rgba(20, 22, 28, 0.6) - Variante más clara */
var(--glass-blur)      /* blur(40px) - Desenfoque consistente */
var(--glass-border)    /* 1px solid rgba(255, 255, 255, 0.08) - Borde sutil */
```

### Uso:

```css
.mi-overlay {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
}
```

---

## ✨ Estados de Foco (SISTEMA UNIFICADO)

**CRÍTICO**: Todos los componentes interactivos deben usar este patrón.

```css
/* Variables de focus */
var(--focus-border)  /* 2px solid var(--color-primary) */
var(--focus-glow)    /* 0 0 0 3px rgba(45, 115, 255, 0.3) */
var(--focus-shadow)  /* 0 8px 32px rgba(45, 115, 255, 0.4) */
var(--focus-bg)      /* rgba(45, 115, 255, 0.12) */
```

### Template OBLIGATORIO para estados focused:

```css
.elemento {
  border: 2px solid transparent;
  transition: all var(--transition-fast);
}

.elemento:hover {
  background: rgba(var(--color-primary-rgb), 0.08);
  border-color: rgba(var(--color-primary-rgb), 0.3);
}

.elemento.focused {
  background: var(--focus-bg);
  border-color: var(--color-primary);
  box-shadow: var(--focus-shadow), var(--focus-glow);
}
```

---

## 🌑 Sombras (Sistema de Profundidad)

```css
var(--shadow-sm)  /* 0 2px 8px rgba(0, 0, 0, 0.3) - Elementos cercanos */
var(--shadow-md)  /* 0 8px 24px rgba(0, 0, 0, 0.4) - Tarjetas */
var(--shadow-lg)  /* 0 20px 50px rgba(0, 0, 0, 0.6) - Modales/overlays */
```

---

## ⏱️ Transiciones (Timing Consistente)

```css
var(--transition-fast)   /* 0.15s cubic-bezier(0.4, 0, 0.2, 1) - Hover/Focus */
var(--transition-normal) /* 0.25s cubic-bezier(0.4, 0, 0.2, 1) - Standard */
var(--transition-slow)   /* 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94) - Modales */
var(--transition-bounce) /* 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) - Cards/Playful */
```

---

## 📐 Border Radius

```css
var(--radius-sm)  /* 8px - Badges, thumbnails pequeños */
var(--radius-md)  /* 12px - Botones, cards, inputs */
var(--radius-lg)  /* 16px - Modales, panels grandes */
```

---

## 📋 Componentes Homologados

Todos estos componentes usan el sistema unificado:

- ✅ **InGameMenu.css** - Menú in-game (blade izquierdo)
- ✅ **Sidebar.css** - Barra lateral
- ✅ **Card.css** - Tarjetas de juegos
- ✅ **Slider.css** - Controles deslizantes
- ✅ **QuickSettings.css** - Panel de ajustes rápidos

---

## 🎯 Reglas de Oro

### 1. Estados Focused

**NUNCA** uses:

- ❌ `background: #fff` en focused
- ❌ `border: 2px solid #fff` en focused
- ❌ Colores inventados

**SIEMPRE** usa:

- ✅ `var(--focus-bg)` para background
- ✅ `var(--focus-border)` para border
- ✅ `var(--focus-shadow)` + `var(--focus-glow)` para sombras

### 2. Glassmorphism

**SIEMPRE** que hagas overlays/modales:

```css
background: var(--glass-bg);
backdrop-filter: var(--glass-blur);
border: var(--glass-border);
box-shadow: var(--shadow-lg);
```

### 3. Transiciones

**NO** inventes timings. Usa:

- Hover/Focus rápido: `var(--transition-fast)`
- Animaciones standard: `var(--transition-normal)`
- Modales: `var(--transition-slow)`
- Efectos playful: `var(--transition-bounce)`

### 4. Colores con Alpha

**SIEMPRE** usa versiones RGB para transparencias:

```css
/* ✅ CORRECTO */
background: rgba(var(--color-primary-rgb), 0.12);

/* ❌ INCORRECTO */
background: rgba(45, 115, 255, 0.12);
```

---

## 📝 Template Completo para Nuevos Componentes

```css
.nuevo-componente {
  /* Estructura */
  background: var(--color-background-elevated);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);

  /* Sombra según profundidad */
  box-shadow: var(--shadow-md);

  /* Texto */
  color: var(--color-text-primary);

  /* Transición */
  transition: all var(--transition-fast);
}

/* Estado hover */
.nuevo-componente:hover {
  background: rgba(var(--color-primary-rgb), 0.08);
  border-color: rgba(var(--color-primary-rgb), 0.3);
}

/* Estado focused (OBLIGATORIO usar este patrón) */
.nuevo-componente.focused {
  background: var(--focus-bg);
  border-color: var(--color-primary);
  box-shadow: var(--focus-shadow), var(--focus-glow);
}

/* Si es un overlay/modal */
.nuevo-modal {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
  box-shadow: var(--shadow-lg);
  animation: fadeIn var(--transition-slow);
}
```

---

## 🚀 Beneficios del Sistema Unificado

- ✅ **Consistencia visual total** - Todo se siente como una sola app
- ✅ **Fácil mantenimiento** - Un solo lugar para cambiar colores/estilos
- ✅ **Performance** - CSS nativo, sin JS overhead
- ✅ **Theming futuro** - Listo para temas claro/oscuro
- ✅ **Accesibilidad** - Estados visuales claros y consistentes
- ✅ **Developer Experience** - Variables con nombres semánticos

---

## ⚠️ Validación de Pull Requests

Antes de hacer commit, verifica:

1. ✅ ¿Usas `var(--focus-bg)` y NO `background: #fff` en focused?
2. ✅ ¿Los overlays usan `var(--glass-bg)` + `var(--glass-blur)`?
3. ✅ ¿Las transiciones usan variables y NO valores hardcodeados?
4. ✅ ¿Los colores con alpha usan `-rgb` variants?
5. ✅ ¿Los border-radius usan `var(--radius-*)`?
