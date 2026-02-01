# 🛡️ Frontend Code Quality Setup

Este proyecto tiene **validación automática de calidad de código** configurada con ESLint, Prettier y TypeScript strict mode.

---

## 🔧 Herramientas Configuradas

### **1. ESLint** (Linter)

Analiza el código en busca de errores comunes y malas prácticas.

**Configuración:** `eslint.config.mjs`

- TypeScript strict type checking
- React Hooks rules
- Auto-sort imports
- No explicit `any` types
- No floating promises (async safety)

**Uso:**

```bash
npm run lint                  # Lints todo el código
npm run lint:fix              # Auto-fix issues
```

---

### **2. Prettier** (Code Formatter)

Formatea el código automáticamente siguiendo convenciones.

**Configuración:** `.prettierrc`

- Max line width: 100 caracteres
- Single quotes
- Semicolons enabled
- Trailing commas (ES5)

**Uso:**

```bash
npm run format                # Formatear todo
npm run format:check          # Solo verificar (no modifica)
```

---

### **3. TypeScript** (Type Checker)

Type checking estricto para prevenir errores en runtime.

**Configuración:** `tsconfig.json`

- Strict mode enabled
- No unused locals/parameters
- Path aliases (@domain, @application, @infrastructure)

**Uso:**

```bash
npm run type-check            # Type checking sin compilar
tsc                           # Compilar TypeScript
```

---

### **4. Pre-commit Hook** (Automático)

**Ubicación:** `.git/hooks/pre-commit`

Ejecuta automáticamente **antes de cada commit**:

1. ✅ `npm run format:check` - Verifica formato (Prettier)
2. ✅ `npm run lint` - Verifica lints (ESLint)
3. ✅ `npm run type-check` - Verifica tipos (TypeScript)

**Bypass** (solo si es urgente):

```bash
git commit --no-verify -m "mensaje"
```

---

## 📜 Comandos Disponibles

### **Validación Rápida**

```bash
# Windows
.\validate.ps1

# Linux/macOS
./validate.sh
```

**Ejecuta:**

1. Prettier check
2. ESLint
3. TypeScript type check
4. Tests (Vitest)

---

### **Validación Completa** (antes de push)

```bash
npm run quality
```

**Ejecuta:**

- format:check
- lint
- type-check
- test run

---

### **Build con Validación Automática**

```bash
npm run build
```

**Ejecuta automáticamente:**

1. `npm run validate` (formato + lint + types)
2. `tsc` (TypeScript compilation)
3. `vite build` (Production bundle)

**⚠️ El build FALLARÁ si hay issues de linter** (similar a Clippy en backend)

---

## 🚨 Reglas Críticas Bloqueadas

El pre-commit hook **bloquea** estos anti-patterns:

| Regla ESLint            | Descripción                     | Equivalente Rust (Clippy) |
| ----------------------- | ------------------------------- | ------------------------- |
| `no-explicit-any`       | Prohibe `any` types             | Similar a unsafe code     |
| `no-floating-promises`  | Promises deben tener `.catch()` | Similar a unwrap_used     |
| `no-non-null-assertion` | Prohibe `x!` assertions         | Similar a unwrap_used     |
| `no-debugger`           | Prohibe `debugger;`             | Similar a todo!           |
| `no-alert`              | Prohibe `alert()`               | -                         |

**Por qué:**

- `any` types bypasean type safety → bugs en runtime
- Floating promises pueden causar **unhandled rejections**
- Non-null assertions (`x!`) pueden causar **runtime crashes**

**Correcto:**

```typescript
// ❌ MAL
const data: any = await fetch();
const game = games!.find((x) => x.id === id)!;
void launchGame(); // Floating promise

// ✅ BIEN
const data: Game[] = await fetch();
const game = games?.find((x) => x.id === id) ?? null;
await launchGame().catch(console.error);
```

---

## 🔕 Reglas Permitidas

Estos lints están en **warn** (no bloquean commits):

- `no-console` (permitido: `console.warn`, `console.error`)
- `react-hooks/exhaustive-deps` (warnings, no errors)
- `react/jsx-no-bind` (permitido: arrow functions)

---

## 🧪 Tests (Vitest)

```bash
npm run test                  # Watch mode (desarrollo)
npm run test run              # Run once (CI/CD)
npm run test:coverage         # Coverage report
```

**Cobertura actual:** 126 tests pasando ✅

---

## 📊 Métricas de Calidad

### **Estado Actual**

```
🔴 ESLint: ~100+ errors (CRÍTICO - necesita refactor App.tsx)
✅ TypeScript: Strict mode enabled
✅ Prettier: Configurado
✅ Tests: 126/126 passing
🟡 Pre-commit: Activo (backend + frontend)
```

### **Después del Refactor (Opción A)**

```
✅ ESLint: 0 errors (App.tsx modularizado)
✅ TypeScript: 0 errors
✅ Prettier: Código formateado
✅ Tests: 200+ tests (overlays, hooks, UI)
✅ Pre-commit: Bloquea commits con issues
```

---

## 🚀 Workflow Recomendado

### **Durante Desarrollo**

```bash
# 1. Escribir código
# 2. Auto-fix imports y formato
npm run lint:fix
npm run format

# 3. Verificar types
npm run type-check
```

### **Antes de Commit**

```bash
# Automático vía pre-commit hook
git add .
git commit -m "feat: nueva feature"

# Hook ejecuta automáticamente:
# ✅ npm run format:check
# ✅ npm run lint
# ✅ npm run type-check
```

### **Antes de Push**

```bash
# Validación completa (recomendado)
npm run quality

# O manualmente
.\validate.ps1  # Windows
./validate.sh   # Linux/macOS
```

---

## 🔧 Troubleshooting

### **Build falla con "npm run validate"**

```bash
# Ver exactamente qué está fallando
npm run lint            # Linter errors
npm run type-check      # Type errors
npm run format:check    # Format errors

# Auto-fix lo que se pueda
npm run lint:fix
npm run format
```

### **ESLint reporta "floating promises"**

```typescript
// ❌ MAL
invoke('command');

// ✅ BIEN (opción 1: await)
await invoke('command');

// ✅ BIEN (opción 2: void operator)
void invoke('command');

// ✅ BIEN (opción 3: catch)
invoke('command').catch(console.error);
```

### **TypeScript "Type 'any' is not allowed"**

```typescript
// ❌ MAL
const data: any = getData();

// ✅ BIEN
interface GameData {
  id: string;
  title: string;
}
const data: GameData = getData();

// ✅ BIEN (si realmente desconocido)
const data: unknown = getData();
```

---

## 📚 Recursos

- [ESLint Rules](https://eslint.org/docs/latest/rules/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [Prettier Options](https://prettier.io/docs/en/options.html)
- [React Hooks Rules](https://react.dev/reference/rules/rules-of-hooks)

---

## 🆚 Comparación Backend vs Frontend

| Aspecto              | Backend (Rust) | Frontend (TypeScript)           |
| -------------------- | -------------- | ------------------------------- |
| **Linter**           | Clippy         | ESLint                          |
| **Formatter**        | rustfmt        | Prettier                        |
| **Type Check**       | cargo check    | tsc --noEmit                    |
| **Pre-commit**       | ✅ Activo      | ✅ Activo                       |
| **Build Validation** | ✅ Automático  | ✅ Automático (`npm run build`) |
| **Tests**            | 52 passing     | 126 passing                     |

\*\*Ambos bloq

uean commits con código de baja calidad\*\* ✅

---

**Configurado:** 2026-01-30
**Estado:** ✅ Activo y funcionando
**Siguiente:** Refactorizar App.tsx para pasar linter (Task #45)
