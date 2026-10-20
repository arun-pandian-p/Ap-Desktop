# Ap Desktop — Build & Developer Guide

This document describes how to build, test, and package **Ap Desktop** from source on Windows.

---

## 1. Prerequisites

Ensure the following runtimes and tools are installed on your system:

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 20+ (22 LTS recommended) | Electron host, Vite build system, frontend packages |
| **Java JDK** | 21+ LTS (Temurin / Adoptium) | Spring Boot backend sidecar runtime & tests |
| **Python** | 3.10+ (3.12 recommended) | Python code execution sandbox & PostgreSQL bridge |
| **Git** | Latest | Version control |

---

## 2. Quick Start

Clone the repository and install npm dependencies:

```bash
git clone https://github.com/arun-pandian-p/Ap-Desktop.git
cd Ap-Desktop
npm ci
```

---

## 3. Humanized Commands

All complex shell scripts have been simplified into readable npm commands:

### Running Development Servers

- **Web Mode (Vite Dev Server):**
  ```bash
  npm run dev
  ```
  Starts Vite dev server at `http://localhost:5173` with mock API fallbacks.

- **Desktop Mode (Electron + Vite):**
  ```bash
  npm run dev:desktop
  ```
  Concurrently starts the Vite server and launches the Electron desktop shell with the live Java Spring Boot backend sidecar.

---

### Building the Project

- **Full Project Build:**
  ```bash
  npm run build
  ```
  Compiles TypeScript, bundles the Vite frontend into `dist/`, and verifies/packages the Spring Boot fat JAR in `backend/target/`.

- **Frontend Only:**
  ```bash
  npm run build:frontend
  ```

- **Backend Only:**
  ```bash
  npm run build:backend
  ```

---

### Running Tests

- **All Unit & Integration Tests (Vitest):**
  ```bash
  npm test
  ```
  Executes all 21 test suites (164 tests) covering Electron IPC, Streaks, Analytics, WebSocket, Crypto, and Sandboxes.

- **Spring Boot Backend Tests (Maven):**
  ```bash
  npm run test:backend
  ```
  Executes all 18 JUnit 5 integration tests inside `backend/` using the Maven wrapper.

- **TypeScript Type Checking:**
  ```bash
  npm run typecheck
  ```

---

### Cleaning & Packaging

- **Clean Build Artifacts:**
  ```bash
  npm run clean
  ```
  Cross-platform cleanup of `dist/`, `out/`, `release/`, `backend/target/`, and temporary test databases.

- **Package Windows Installer:**
  ```bash
  npm run release
  ```
  Runs the full build, invokes `electron-builder`, packages the NSIS installer into `out/`, and computes its SHA-256 checksum.
