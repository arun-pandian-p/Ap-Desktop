# Ap Desktop Application — Master Product Documentation

**Product Version:** 1.0.0  
**Target Platform:** Windows 10 / 11 (x64)  
**Architecture:** Offline-First Hybrid Desktop (React 18 + TypeScript + Monaco Editor + sql.js WASM + Electron + Inno Setup 6)  
**Author / Publisher:** Ap Software Technologies (Arun Pandian)

---

## 1. Executive Summary

**Ap Desktop** is an enterprise-grade, offline-first developer practice and interview preparation environment designed for engineers, students, and competitive programmers. The application bridges the gap between simulated competitive coding and genuine production database management by combining:

1. A high-performance Python algorithm execution sandbox with robust output normalization.
2. A client-side SQLite WASM SQL practice laboratory.
3. A genuine PostgreSQL 16 server integration suite featuring a complete pgAdmin-style hierarchical tree, editable tables with live SQL generation, dataset importing, and multi-format data exports.
4. An offline focus study suite featuring licensed Tamil lo-fi and instrumental music.
5. An automated notification and webhook orchestration system.

---

## 2. System Architecture & Tech Stack

```
+-------------------------------------------------------------------------+
|                           Ap Desktop Window                             |
|                                                                         |
|  +------------------------+  +---------------------------------------+  |
|  |   Navigation Sidebar   |  |        Main Workspace View            |  |
|  | - Python Practice      |  |                                       |  |
|  | - SQL Practice         |  |   +---------------------------------+ |  |
|  | - PostgreSQL Lab       |  |   | Monaco Code Editor (Anti-Cheat) | |  |
|  | - Study Focus Mode     |  |   +---------------------------------+ |  |
|  | - Analytics & Streaks  |  |   | Results / Query Plan / Judge    | |  |
|  | - Automation Scheduler |  |   +---------------------------------+ |  |
|  | - Settings & Security  |  |   | Data Table (Inline Editable)    | |  |
|  +------------------------+  +---------------------------------------+  |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |       Offline Audio Service (Tamil Lo-Fi / Focus Ambience)        |  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
                                    |
                           IPC / Worker Bridge
                                    |
          +-------------------------+-------------------------+
          |                                                   |
+-------------------+                               +--------------------+
|  Python 3 Worker  |                               | PostgreSQL 16 Node |
| (Judge & Normal.) |                               |   (psycopg/bridge) |
+-------------------+                               +--------------------+
```

### Key Technical Components:
* **Frontend UI**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Canvas Confetti.
* **Code Editor**: `@monaco-editor/react` with customized keybindings, dark themes, and anti-cheat clipboard interception.
* **Client-Side SQL Engine**: `sql.js` (WebAssembly build of SQLite 3) enabling 100% offline query execution against rich seeded relational databases.
* **Desktop Runtime**: Electron 44 / Node 22 with context isolation and secure IPC communication channels.
* **Native Packaging**: Inno Setup 6 with LZMA2/Ultra64 compression producing a standalone single-file installer (`Ap_Setup_v1.0.0_x64.exe`).
* **Code Signing**: SHA-256 Microsoft Authenticode digital signing with RFC 3161 timestamping.

---

## 3. Core Feature Specification

### 3.1 Python Practice & Judge Engine
- **Curriculum**: Over 1,330 curated DSA problems categorized by topic (Arrays, Strings, Trees, Dynamic Programming, Graphs, System Design) and difficulty (Easy, Medium, Hard).
- **Anti-Cheat Typing Enforcement**:
  - Intercepts all clipboard paste shortcuts (`Ctrl+V`, `Cmd+V`, `Shift+Insert`) and direct DOM paste events inside practice code editors.
  - Displays a non-intrusive warning badge: `🔒 Paste/Copy disabled in IDE practice mode — manual typing required`.
  - Guarantees genuine muscle memory formation while leaving search inputs, settings fields, and modals unrestricted.
- **Judge Normalization**:
  - The execution worker (`workers/python/worker.py`) employs multi-tier output normalization (`clean_str` and `normalize_val`).
  - Equivalent string representations (e.g. `"Even"`, `'Even'`, and `Even` with leading/trailing whitespace or newlines) are parsed accurately and marked `Accepted`.
- **Persistent Code Drafts**:
  - Auto-saves in-progress code for every problem into local storage, restoring state seamlessly across application restarts.

---

### 3.2 SQL Practice Studio
- **Offline Relational Sandbox**: Executes queries against pre-seeded schemas including E-Commerce, Banking, Employee Management, and Social Media systems.
- **Visual Schema Browser**: Interactive tree displaying tables, column data types, primary keys, and foreign key relationships.
- **Export Formats**: 1-click export of query output to RFC-4180 standard **CSV** and Excel-compatible **XLSX**.

---

### 3.3 Genuine PostgreSQL 16 Lab
- **pgAdmin Explorer Hierarchy**:
  - `Servers (1)` &rarr; `PostgreSQL 16` &rarr; `Databases (3)`
  - `postgres` (connected active) with `Casts`, `Catalogs`, `Event Triggers`, `Extensions`, `Foreign Data Wrappers`, `Languages`, `Publications`, `Schemas (public -> Tables)`, `Subscriptions`.
  - `Test` and `testing` (disconnected state).
  - `Login/Group Roles` & `Tablespaces`.
- **Live Editable Tables**:
  - Double-clicking any cell enables inline editing.
  - Submitting changes automatically synthesizes and executes a parameterized `UPDATE` statement against the PostgreSQL database.
- **Dataset Importer & Export Suite**:
  - Dedicated **`[Upload Dataset]`** modal supporting `.csv`, `.xlsx`, `.json`, and `.sql` files with schema preview and table generation.
  - Instant **`[CSV]`** and **`[XLSX]`** data download buttons.

---

### 3.4 Study Mode & Focus Suite
- **Focus Timer**: Configurable Pomodoro (25/5), Long Focus (50/10), and Deep Work (90-minute) intervals with automated rest transitions.
- **Tamil Study Music Player**:
  - 100% offline audio player bundled with licensed Tamil ambient, lo-fi, veena, flute, and piano instrumental tracks.
  - Volume slider, mute toggle, track skipper, and looping support.
  - High-resolution dynamic studio wallpapers (e.g. Crimson Sunset, Hiker Sunrise).

---

### 3.5 Activity Heatmap & Streaks Engine
- **Rolling 52-Week Activity Heatmap**:
  - Dynamic timeline extending through the current active month (**October 2026**).
  - Preserves exact square geometry, theme-reactive colors, and responsive grid layouts.
- **Real-Time Streak Tracker**:
  - Tracks current streak, maximum streak, total active study days, and distinct problem solved counters.
  - Automatically awards milestone celebration badges and confetti animations upon achieving targets.

---

### 3.6 Automation Scheduler & External Webhooks
- **Multi-Channel Dispatching**:
  - **Telegram Bot**: Sends Markdown-formatted alerts with bot token and chat ID.
  - **Twilio SMS & WhatsApp**: Direct mobile dispatching via Twilio REST APIs.
  - **Google Sheets**: Webhook appending for daily progress tracking.
  - **Windows Notifications**: Native desktop toast notifications.
- **Trigger Events**:
  - Study Session Completed
  - Daily Problem Solved
  - Daily Streak Reminder
  - System Health & Backup Check
- **Offline Queue Resilience**: Failed dispatches due to lack of internet connectivity are automatically queued and retried upon network restoration.

---

## 4. File & Directory Layout

```
ap/
├── .agents/                    # Custom agent skills and workflows
│   └── skills/ap-build/        # Production build skill definition
├── dist/                       # Compiled production web assets
├── electron/                   # Electron main & preload scripts
│   ├── main.cjs                # Main process entry point
│   └── preload.cjs             # Secure isolated IPC bridge
├── installer/                  # Inno Setup 6 packaging configuration
│   ├── ap_installer.iss        # Setup compiler script (ISCC)
│   ├── wizard_banner.bmp       # Inno Setup wizard banner
│   └── wizard_small.bmp        # Inno Setup small top-right icon
├── public/                     # Public static assets & audio files
│   ├── audio/study/            # Offline focus music tracks
│   ├── sql-wasm.wasm           # SQLite WebAssembly binary
│   └── assets/                 # Icons, logos, and ambient artwork
├── release/                    # Distribution binaries and installers
│   ├── installer/              # Inno Setup 6 compiled installer
│   ├── win-unpacked/           # Portable standalone binary (Ap.exe)
│   └── Ap-Setup-1.0.0-x64.exe  # Electron NSIS setup package
├── scripts/                    # PowerShell automation & signing tools
│   ├── build-installer.ps1     # Inno Setup build packager
│   └── sign-and-unblock.ps1    # Authenticode signing and unblocker
├── src/                        # Core React application source code
│   ├── components/             # Reusable UI components & Monaco wrapper
│   ├── features/               # Modular application views (Python, SQL, etc.)
│   ├── services/               # Database, audio, runner & notification services
│   └── styles/                 # Tailwind CSS & global design system
├── tests/                      # Vitest verification test suites (54 tests)
├── workers/                    # Python and PostgreSQL execution workers
├── package.json                # Project dependencies and script runner
├── README.md                   # Product introduction & quick start
├── PRODUCT_DOCUMENTATION.md    # Master product specification (this file)
└── SKILL.md                    # Standardized build & release procedure
```

---

## 5. Security & Reliability

1. **Context Isolation**: Electron renderer processes operate in an isolated context with no direct access to Node.js primitives or system shell execution.
2. **Authenticode Signing**: All `.exe` and `.dll` binaries are signed with SHA-256 digital certificates, preventing tamper alerts on Windows 10/11.
3. **SmartScreen Compatibility**: Build scripts remove alternate data streams (`Zone.Identifier`) to ensure zero SmartScreen download warnings.
4. **Local Data Sovereignty**: 100% of user data, solutions, submissions, and credentials remain on the local machine unless explicitly pushed via configured external webhooks.
