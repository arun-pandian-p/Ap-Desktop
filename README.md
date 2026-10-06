<div align="center">

<img width="100%" alt="Ap Desktop Hero Banner" src="https://github.com/user-attachments/assets/060bde0b-adb2-4b75-825e-acb2f7915fc1" />

# Ap Desktop

### Interview Preparation & Coding Practice Platform

A premium, offline-first Windows desktop app for mastering **Data Structures, Algorithms, SQL, and PostgreSQL**.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Platform](https://img.shields.io/badge/platform-Windows%20x64-lightgrey)
![Tests](https://img.shields.io/badge/tests-54%20passing-brightgreen)
![Built with](https://img.shields.io/badge/built%20with-React%20%7C%20TypeScript%20%7C%20Electron-61dafb)

</div>

---

## Screenshots

| Login | Overview |
| :---: | :---: |
| <img src="https://github.com/user-attachments/assets/f73c73d6-3921-47a7-95c5-2e7d538bffef" alt="Login" /> | <img src="https://github.com/user-attachments/assets/b1be3733-9dbe-4f11-a441-db8dd468dab1" alt="Overview" /> |

| Problems | Python Practice |
| :---: | :---: |
| <img src="https://github.com/user-attachments/assets/b28520aa-7e01-442b-b299-84a699eef9c4" alt="Problems" /> | <img src="https://github.com/user-attachments/assets/eb0fd01f-0bfb-4605-b8fe-bf583058ae0c" alt="Python" /> |

| SQL Studio | PostgreSQL Lab |
| :---: | :---: |
| <img src="https://github.com/user-attachments/assets/4e285a2b-537d-4f7b-9797-d7f37df0920d" alt="SQL Studio" /> | <img src="https://github.com/user-attachments/assets/50ee8583-10a3-44fa-9660-1042d082c142" alt="SQL Lab" /> |

| To-Do |
| :---: |
| <img src="https://github.com/user-attachments/assets/6fd8463a-c18b-4671-9ab4-7456bf221af7" alt="To-do" /> |

---

## Features

| Feature | Description |
| :--- | :--- |
| 🔒 **Anti-Cheat Practice Mode** | Blocks clipboard operations in the Monaco Editor (`Ctrl+V`, `Cmd+V`, context-menu paste) so you build real muscle memory and syntax recall. |
| 🐘 **PostgreSQL 16 Lab** | pgAdmin-style explorer tree, live inline cell editing, dataset import (`.csv`, `.xlsx`, `.json`, `.sql`) and one-click `CSV` / `XLSX` export. |
| ⚡ **SQL Studio (SQLite WASM)** | Instant in-memory SQL execution on realistic production schemas, with query plan insights and real-time syntax checking. |
| 🎵 **Tamil Study Music** | Fully offline focus music: veena, flute, soft piano, ambient and lo-fi instrumental tracks. |
| 📅 **52-Week Activity Heatmap** | Rolling calendar of daily submissions and study streaks. |
| 🤖 **Automation & Webhooks** | Event dispatch to Telegram Bot, Twilio SMS/WhatsApp, Google Sheets and Windows Toast notifications, with offline resilience. |
| 🛡️ **Signed Installer** | SHA-256 Authenticode signature with RFC 3161 timestamping for a smooth Windows install. |

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Tailwind CSS, Monaco Editor, Recharts |
| **Offline services** | sql.js (SQLite WASM), LocalStorage, IndexedDB, offline audio player, webhook dispatcher |
| **Desktop bridge** | Electron (main process + IPC), Python 3 judge, PostgreSQL 16 bridge |
| **Quality** | Vitest-style test suite (54 tests), TypeScript type checking |
| **Packaging** | Inno Setup 6, Electron NSIS, PowerShell build and signing scripts |

---

## Architecture

```mermaid
graph TD
    subgraph UI_Layer [Frontend Presentation Layer]
        React[React 18 + TypeScript UI]
        Monaco[Monaco Code Editor]
        Tailwind[Tailwind CSS Design System]
        Recharts[Analytics & Heatmap Charts]
    end

    subgraph Service_Layer [Offline Core Services]
        SQLWasm[sql.js SQLite WASM]
        AudioService[Offline Study Music Player]
        StorageService[LocalStorage & IndexedDB Cache]
        NotifService[Automation & Webhook Dispatcher]
    end

    subgraph Backend_Bridge [Electron & Python Runtime Bridge]
        ElectronMain[Electron Main Process / IPC]
        PythonWorker[Python 3 Execution & Judge Normalizer]
        PgBridge[PostgreSQL 16 Bridge Engine]
    end

    React --> Monaco
    React --> Tailwind
    React --> Recharts
    React --> SQLWasm
    React --> AudioService
    React --> StorageService
    React --> NotifService
    React --> ElectronMain
    ElectronMain --> PythonWorker
    ElectronMain --> PgBridge
```

---

## Getting Started

### Prerequisites

- **Node.js** v18.x or v20.x
- **Python** 3.10+ (Python judge and PostgreSQL worker)
- **PostgreSQL 16** (optional, only for the genuine PostgreSQL lab)

### Install and Run

```powershell
# 1. Clone and install
git clone https://github.com/arun-pandian-p/Self_learn-desktop-application.git
cd Self_learn-desktop-application
npm install

# 2. Type check and run tests
npm run typecheck
npm test

# 3a. Desktop development mode
npm run electron:dev

# 3b. Or web preview mode
npm run dev
```

---

## Production Build & Release

```powershell
# 1. Quality gate (type check + 54 tests)
npm run typecheck
npm test

# 2. Build the production frontend bundle
npm run build

# 3. Build the Inno Setup 6 installer
powershell -ExecutionPolicy Bypass -File .\scripts\build-installer.ps1 -SkipFrontendBuild

# 4. Sign (SHA-256 Authenticode) and unblock for SmartScreen
powershell -ExecutionPolicy Bypass -File .\scripts\sign-and-unblock.ps1
```

### Release Targets

| Target | Output Path | Description |
| :--- | :--- | :--- |
| **Inno Setup 6 Installer** *(recommended)* | `release\installer\Ap_Setup_v1.0.0_x64.exe` | Compact standalone Windows setup wizard |
| **Electron NSIS Installer** | `release\Ap-Setup-1.0.0-x64.exe` | Standard Electron installer with auto-update support |
| **Portable Build** | `release\win-unpacked\Ap.exe` | Zero-install standalone executable |

---

## Testing

The repo ships with a 54-test suite across all core subsystems:

```text
✓ tests/license.test.ts              (4 tests)
✓ tests/study-music.test.ts          (7 tests)
✓ tests/notifications.test.ts        (4 tests)
✓ tests/sql-runner.test.ts           (4 tests)
✓ tests/sandbox.test.ts              (4 tests)
✓ tests/electron-ipc.test.ts         (5 tests)
✓ tests/phase-enhancements.test.ts   (4 tests)
✓ tests/curriculum-import.test.ts    (7 tests)
✓ tests/profile-submissions.test.ts  (10 tests)
✓ tests/postgres.test.ts             (5 tests)

Test Files  10 passed (10)
     Tests  54 passed (54)
```

```powershell
npm test
```

---

## Keyboard Shortcuts & Practice Rules

| Shortcut / Action | Scope | Behavior |
| :--- | :--- | :--- |
| `Ctrl + Enter` / `Cmd + Enter` | Monaco Editor | Run code / submit solution |
| `Ctrl + S` / `Cmd + S` | Practice Mode | Save code draft locally |
| `Ctrl + V` / `Ctrl + C` | Practice Mode editor | **Blocked** to enforce manual typing |
| `Double-click cell` | PostgreSQL table view | Edit inline and dispatch `UPDATE` |
| `Space` | Study Music Player | Play / pause current track |

---

## Roadmap

- [ ] v1.1: bug fixes and stability improvements
- [ ] Refactors for cleaner OOP structure and LLD
- [ ] More problems and curriculum content

---

## License & Credits

Designed and developed by **Ap Software Technologies** ([Arun Pandian](https://github.com/arun-pandian-p)).

All bundled focus music and curriculum datasets are licensed for offline redistribution.
