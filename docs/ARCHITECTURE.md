# Ap Desktop — System Architecture

## Architectural Overview

Ap Desktop is built on a modular, offline-first desktop architecture combining **Electron**, **React 18**, **TypeScript**, **Java 21 Spring Boot**, and **SQLite/PostgreSQL**.

```
┌────────────────────────────────────────────────────────┐
│               Electron Desktop Shell                   │
│                                                        │
│  ┌─────────────────────────┐  Secure IPC  ┌─────────┐  │
│  │ React 18 UI / Monaco    │<────────────>│ Preload │  │
│  └─────────────────────────┘              └────┬────┘  │
│                           ▲                    │       │
│                           │                    │       │
│                Local WS   │                    ▼       │
│             127.0.0.1     │              ┌───────────┐ │
│                           │              │ Main.cjs  │ │
│                           │              └─────┬─────┘ │
└───────────────────────────┼────────────────────┼───────┘
                            │                    │
                            ▼                    ▼
      ┌──────────────────────────────────────────────────┐
      │  Spring Boot 3.3.5 Sidecar (PID managed)         │
      │  Binding: 127.0.0.1:<dynamic_port>               │
      │  Auth: X-Ap-Internal-Token (256-bit ephemeral)   │
      │                                                  │
      │  • REST Endpoints (/api/v1/*)                    │
      │  • Realtime WebSocket (/ws/realtime)             │
      │  • Canonical SQLite with WAL & Busy Timeout      │
      │  • PBKDF2 & AES-256-GCM Cryptographic Vault      │
      └──────────────────────────────────────────────────┘
```

## Core Layers

### 1. Desktop Shell (`apps/desktop/main`, `apps/desktop/preload`)
- **Main Process:** Handles Windows application lifecycle, frameless window chrome controls, tray icon, and native dialogs.
- **Preload Bridge:** Enforces strict context isolation (`contextIsolation: true`, `nodeIntegration: false`) exposing only whitelisted `electronAPI` methods.
- **Sidecar Supervisor:** Spawns, monitors, and cleanly terminates the Spring Boot backend process on dynamic loopback ports.

### 2. Frontend Layer (`apps/desktop/renderer`)
- **Framework:** React 18 + Vite + Tailwind CSS.
- **Editor:** Monaco Editor with syntax highlighting, IntelliSense, and keyboard shortcuts.
- **Client Service Gateway:** Dual-mode client (`backendClient.ts`) that transparently calls Spring Boot when online and falls back to local SQLite when offline.

### 3. Backend Service Layer (`backend/`)
- **Framework:** Java 21 LTS + Spring Boot 3.3.5.
- **Services:**
  - `StreakService`: Canonical daily streaks, milestones, activity tracking.
  - `AnalyticsService`: Solved statistics, accuracy calculation, time-series chart data.
  - `RealtimeWebSocketHandler`: RFC 6455 real-time event distribution.
  - `CryptoService`: PBKDF2 (100k iterations, SHA-256) & AES-256-GCM.
  - `AutomationService`: Telegram, Twilio, Google Sheets, n8n webhook triggers with encrypted credentials vault.
  - `BackupService`: Versioned `.apbackup` archives with SHA-256 checksums and pre-restore snapshots.
  - `CurriculumService`: Streaming CSV problem catalog ingestion.

### 4. Database Layer (`database/`)
- **Local Storage:** SQLite (via sql.js WASM and JDBC) operating in Write-Ahead Logging (WAL) mode with a 5000ms busy timeout.
- **External Lab:** Direct connection pooling to local or LAN PostgreSQL 16 servers for SQL practice.
