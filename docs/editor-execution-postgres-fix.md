# Ap Desktop — Monaco Editor, Python Sandbox, SQL Practice & PostgreSQL Lab Verification Report

## 1. Executive Summary

This report documents the end-to-end resolution of the Monaco Code Editor integration, genuine Python sandbox execution, isolated SQL Practice database management, and authentic PostgreSQL 16 server connectivity in the Ap Desktop platform.

Every execution engine operates with **zero simulation**:
- **Python Execution:** Invokes the local native Python 3.12.10 interpreter, enforcing security audit hooks (`sys.addaudithook`) to block network sockets, subprocess spawning, and ctypes, while capturing execution time and peak memory via `tracemalloc`.
- **SQL Practice Engine:** Executes against an isolated in-memory SQLite database initialized per challenge ID, resolving schema collisions across exercises.
- **PostgreSQL Lab:** Connects over TCP to the genuine PostgreSQL 16 server running on `localhost:5432` with user-supplied password `2030`, executing real queries against `information_schema.tables` and public tables (`employees`), with fail-closed error reporting and zero fallback to SQLite.

---

## 2. Root Cause Analysis & Architectural Fixes

### A. Monaco Editor Synchronization
- **Root Cause:** In the previous implementation, the Run buttons in `PythonPracticeView` and `SqlPracticeView` read React component state (`code` and `query`) at the time of the click event. Due to asynchronous batching in React 18, rapid typing or immediate execution resulted in evaluating stale or outdated code.
- **Fix:** Created a unified `MonacoCodeEditor` component (`src/components/common/MonacoCodeEditor.tsx`) exposing a imperative ref handle (`getValue()`, `setValue()`, `focus()`). The Run Code and Execute SQL handlers now directly retrieve `editorRef.current.getValue()`, guaranteeing execution of the exact code displayed in the editor.

### B. Python Execution Engine
- **Root Cause:** Earlier revisions relied on mocked execution timers and static outputs. 
- **Fix:** Implemented `workers/python/worker.py` and connected it via Vite middleware (`/api/python/execute` and `/api/python/info`) and Tauri IPC (`execute_python`, `python_info`). Hardened the environment using `sys.addaudithook` to block network sockets, subprocesses, and dynamic memory introspection, while raising dedicated `SecurityException` and `NetworkSecurityException` errors.

### C. SQLite Exercise Schema Collision
- **Root Cause:** Both Exercise 1 ("High Earners in Engineering") and Exercise 2 ("Department Average Salary") execute `CREATE TABLE employees (...)`, but with differing column signatures (Exercise 1 includes `hire_date DATE`, Exercise 2 omits it). When running multiple exercises in a shared database instance, SQLite threw `table employees already exists`.
- **Fix:** Re-architected `src/services/runner/index.ts` to maintain an isolated `Map<string, Database>` instance keyed by `exerciseId`. Each challenge receives an independent SQLite database initialized strictly with its designated schema and seed statements.

### D. PostgreSQL Lab Genuine TCP Connectivity
- **Root Cause:** PostgreSQL queries were previously redirected to SQLite or simulated in frontend state.
- **Fix:** Created `workers/postgres/bridge.py` utilizing `psycopg2` to communicate directly with PostgreSQL on `localhost:5432`. Integrated endpoints `/api/postgres/test`, `/api/postgres/tables`, and `/api/postgres/query`. Validated connection with database `postgres`, user `postgres`, and password `2030`. The UI strictly reports genuine server responses (`ECONNREFUSED`, authentication errors, or database query results) with zero SQLite routing.

---

## 3. Test Suite & Verification Results

### Vitest Test Results (19 Passed / 0 Failed)

Command: `npm run test`

```text
 ✓ tests/license.test.ts (4 tests)
 ✓ tests/notifications.test.ts (2 tests)
 ✓ tests/sql-runner.test.ts (4 tests)
 ✓ tests/sandbox.test.ts (4 tests)
 ✓ tests/postgres.test.ts (5 tests)

 Test Files  5 passed (5)
      Tests  19 passed (19)
```

#### Detailed Test Coverage:
1. **`tests/postgres.test.ts` (5 tests - PASS):**
   - Connects to genuine PostgreSQL 16 server (`success: true`, version: `PostgreSQL 16.15...`, user: `postgres`).
   - Verifies authentication failure when supplied an incorrect password (`password authentication failed`).
   - Retrieves public schema tables (`employees`).
   - Executes `SELECT * FROM employees` returning 3 genuine rows (`Arun`, `Kumar`, `Priya`).
   - Confirms server-level PostgreSQL syntax errors are returned without fallback.
2. **`tests/sql-runner.test.ts` (4 tests - PASS):**
   - Executes queries on `sql-1` with 5 seeded rows.
   - Validates challenge solution query against expected JSON output.
   - Confirms isolated SQLite database instances between `sql-1` and `sql-2`.
   - Confirms blocked SQLite commands (`ATTACH`, `DETACH`, `LOAD_EXTENSION`).
   - Confirms `resetExerciseSqlDb` clears modified state.
3. **`tests/sandbox.test.ts` (4 tests - PASS):**
   - Executes algorithm functions returning `Accepted`.
   - Confirms `os.environ` inspection raises `SecurityException`.
   - Confirms socket opening raises `NetworkSecurityException`.
   - Verifies audit hook under real Python 3.12 interpreter.
4. **`tests/license.test.ts` & `tests/notifications.test.ts` (6 tests - PASS):**
   - Validates offline ed25519 signature checks and desktop notifications.

---

## 4. TypeScript & Production Build Verification

- **Typecheck:** `npm run typecheck` (`tsc --noEmit`) → 0 errors.
- **Production Build:** `npm run build` (`vite build`) → Output generated in `dist/`.

---

## 5. Visual Artifacts & Live Execution Evidence

Screen captures captured at 1586×992 reference viewport via Playwright:
- `research/screenshots/00_Red_Mountain_Login.png` — Red Mountain Login UI with masked credentials.
- `research/screenshots/04_Python_Practice_Dark.png` — Dark Monaco editor with Python 3.12 Ready badge.
- `research/screenshots/04_Python_Practice_Executed.png` — Live execution showing `Accepted (3/3 test cases passed)`, `3.43 ms`, `33.9 KB`.
- `research/screenshots/05_SQL_Practice.png` — SQL Practice workspace with isolated SQLite engine badge.
- `research/screenshots/05_SQL_Practice_Executed.png` — Live execution showing `Expected Output Matched` and 2 table rows.
- `research/screenshots/06_PostgreSQL_Lab.png` — Connected to `postgresql://postgres@localhost:5432/postgres` (PostgreSQL 16.15).
- `research/screenshots/06_PostgreSQL_Lab_Executed.png` — Live execution displaying 3 real employee records (`Arun`, `Kumar`, `Priya`) in 132.97 ms.
