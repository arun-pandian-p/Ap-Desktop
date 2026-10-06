# Ap Desktop Application — Developer Workflow Guide

**Version:** 1.0.0  
**Scope:** Development, Live Updates, Testing & Production Builds

---

## 1. Quick Start (Live Development)

To start the live interactive development environment:

```bash
npm run dev
```

This launches the Vite development server with Hot Module Replacement (HMR).

### What Updates Automatically
| Layer | Behavior on Change |
|---|---|
| React components (`.tsx`) | Updates instantly via Vite HMR |
| Tailwind styling & CSS tokens | Updates live |
| Modals, Popups & Dialogs | Updates live |
| Database Seed & Queries | Refreshes in-memory / local storage SQLite instance |
| Python Worker Script | Worker is invoked per run; edits take effect on next execution |

---

## 2. Available NPM Scripts

- `npm run dev`: Starts local Vite development server with HMR.
- `npm run build`: Typechecks with strict `tsc --noEmit` and creates production bundle in `dist/`.
- `npm run preview`: Previews production build locally.
- `npm run typecheck`: Runs strict TypeScript validation.
- `npm run test`: Executes Vitest test suite.

---

## 3. Architecture & Testing Boundaries

- **Database Layer:** Uses WebAssembly SQLite (`sql.js`) with complete persistence in local storage and versioned schema migrations.
- **Python Execution:** Restricted CPython 3.12 worker in `workers/python/worker.py` with `sys.addaudithook` preventing network sockets and process escapes.
- **Licensing Tool:** Offline token generator available at `tools/license-issuer/issue.js`.
