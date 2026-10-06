# Implementation Plan: Ap Desktop Application

**Project Name:** Ap  
**Type:** Security-Hardened, Offline-First Windows Desktop Application  
**Target OS:** Windows 10/11 x64  
**Design Reference:** 16 Supplied Reference Mockups (18 PNG files in `screens/`)  
**Data Sources:** `grindgram_all_problems.csv` (1,337 curated items), `secret.json` (Telegram, Twilio, Google, N8N credentials)  
**Security Specification:** `Ap_FINAL_MASTER_PROMPT_v3_with_Design.md` (v3 Security & Architecture Master)

---

## 1. Executive Summary & Architectural Overview

**Ap** is a production-grade, offline-first Windows desktop platform for tech career preparation, data structures & algorithms (50 patterns), SQL practice, genuine PostgreSQL lab work, time management, and performance analytics.

```
+--------------------------------------------------------------------------------------------------+
|                                    Ap Desktop Application Shell                                  |
|                                                                                                  |
|  +--------------------------------------------------------------------------------------------+  |
|  | Frameless Custom Title Bar (Window Controls, Quick Add, Global Search Ctrl+K, Streak, Time)|  |
|  +--------------------------------------------------------------------------------------------+  |
|  |                                                                                            |  |
|  |  +--------------------+  +--------------------------------------------------------------+  |  |
|  |  |  Collapsible       |  |  Active Workspace View (1 of 13 Screens)                     |  |  |
|  |  |  Left Sidebar      |  |  - Dashboard                      - Study Sessions           |  |  |
|  |  |  (~225px / 64px)   |  |  - Learning Tracks (50 Patterns)  - Progress & Analytics     |  |  |
|  |  |  - 12 Exact Nav    |  |  - Coding Problems (1,337 Items)  - Daily Review             |  |  |
|  |  |    Items (Red Pill)|  |  - Python Practice (Monaco)       - Reports & Notifications  |  |  |
|  |  |  - User Profile    |  |  - SQL Practice (SQLite Isolated) - Settings & Backup        |  |  |
|  |  |    Card + License  |  |  - PostgreSQL Lab (Real / Bridge) - Login / Welcome Screen   |  |  |
|  |  |    Badge           |  |    [Security Center hosted inside Settings > Privacy]        |  |  |
|  |  +--------------------+  +--------------------------------------------------------------+  |  |
|  |                                                                                            |  |
|  |  +--------------------------------------------------------------------------------------+  |  |
|  |  | Global Status Bar (Engine Badge, DB, Schema, Transaction Mode, Ln/Col, Ready Indicator)|  |  |
|  |  +--------------------------------------------------------------------------------------+  |  |
|  +--------------------------------------------------------------------------------------------+  |
+--------------------------------------------------------------------------------------------------+
          |                                        |                                  |
          v                                        v                                  v
+-----------------------+              +-----------------------+          +------------------------+
|  Hardened Execution   |              |  Local SQLite DB      |          |  Integrations & Auth   |
|  Sandbox (Python 3.12)|              |  (20 Encrypted Tables)|          |  (secret.json Vault)   |
|  - Restricted Worker  |              |  - Versioned Schema   |          |  - Telegram Bot Queue  |
|  - Process Limits     |              |  - HMAC Tamper Chain  |          |  - Twilio WhatsApp/SMS |
|  - -I -S -B Flags     |              |  - 1,337 Problem Seed |          |  - Google Sheets Sync  |
|  - Audit Hook Guard   |              |  - Monotonic Backups  |          |  - DPAPI Secure Store  |
+-----------------------+              +-----------------------+          +------------------------+
```

---

## 2. Technology Stack & Directory Structure

### 2.1 Technology Stack
- **Frontend Framework:** React 18 / 19 + TypeScript (Strict mode enabled) + Vite
- **Styling & Design Tokens:** Tailwind CSS 3.4+ & CSS Custom Variables (`design/tokens.json`)
- **Code Editor:** Monaco Editor (`@monaco-editor/react`) configured for offline local bundling
- **Data Visualization:** Recharts for analytics, streaks, weekly progress, and focus timelines
- **Icons & UI Primitives:** Lucide React (`lucide-react`)
- **Desktop Shell:** Tauri 2 (`src-tauri/`) with native Windows bindings, frameless windowing, and IPC commands
- **Local Database:** SQLite via `rusqlite` / `sql.js` with versioned transactional migrations
- **Python Execution:** CPython 3.12 worker in restricted child process with timeout, memory limits, and audit hooks
- **Cryptographic Engine:** ECDSA P-256 + SHA-256 (ES256) for licensing, HMAC-SHA256 for database tamper-evidence chains
- **Credential Storage:** DPAPI / Windows Credential Manager abstraction for `secret.json` keys

### 2.2 Repository Directory Layout
```
ap/
├── design/
│   ├── reference/             # 16 reference mockups (18 PNGs) from screens/
│   └── tokens.json            # Exact color, typography, spacing tokens
├── docs/
│   ├── PROGRESS.md            # 235-item Master Feature Checklist (tracked live)
│   ├── threat-model.md        # Complete threat analysis (T1-T10)
│   ├── architecture.md        # System architecture and component breakdown
│   ├── security.md            # Deterrence, tamper-evidence, and sandbox guarantees
│   ├── dev-workflow.md        # HMR, IPC watcher, and release build guidelines
│   └── ui-parity.md           # Visual-parity comparison log (1586x992 px)
├── public/
│   └── assets/                # App icons, hero WebP images
├── research/                  # Reverse-analysis audit reports & schemas
├── screens/                   # Raw design mockups
├── src/
│   ├── components/            # Reusable UI component library (Modals A-E, Palette F, Toasts G, etc.)
│   │   ├── layout/            # Shell, Sidebar, Frameless TitleBar, StatusBar
│   │   ├── common/            # Button, Input, Card, Badge, Modal, Toast, Tabs, etc.
│   │   └── dialogs/           # Create Task, Add Question, Confirm, Study Session, Backup
│   ├── features/              # Feature modules for all 13 screens
│   │   ├── dashboard/         # Dashboard screen
│   │   ├── tracks/            # Learning Tracks (50 DSA patterns)
│   │   ├── problems/          # Coding Problems (1,337 items)
│   │   ├── python/            # Python Practice Workspace (full-dark Monaco editor)
│   │   ├── sql/               # SQL Practice Workspace (SQLite practice engine)
│   │   ├── postgres/          # PostgreSQL Lab (real / bridge connection)
│   │   ├── planner/           # To-do Planner (List, Kanban, Calendar)
│   │   ├── sessions/          # Study Sessions & Pomodoro with Idle Detection
│   │   ├── analytics/         # Progress & Analytics Dashboard
│   │   ├── review/            # Daily Review & Reflection
│   │   ├── reports/           # Reports & Notifications + Telegram / Twilio
│   │   ├── settings/          # Settings & Backup + Security Center
│   │   └── auth/              # Login / Welcome screen (local profile unlock)
│   ├── services/              # Database, Execution, Licensing, Notifications, Crypto
│   │   ├── db/                # SQLite client, migrations, query runners, HMAC chain
│   │   ├── runner/            # Python sandbox runner & test case harness
│   │   ├── license/           # ECDSA P-256 license verifier, fingerprinting
│   │   ├── integrity/         # Manifest check, tamper detection, health status
│   │   ├── notifications/     # Telegram bot sender, queue with exponential backoff
│   │   └── secrets/           # DPAPI credential vault adapter (secret.json)
│   ├── types/                 # Shared TypeScript interfaces & domain models
│   ├── styles/                # Tailwind configuration, globals, design tokens
│   ├── App.tsx                # Main router and shell layout
│   └── main.tsx               # Entry point
├── src-tauri/                 # Tauri 2 Desktop configuration & Rust backend
│   ├── src/
│   │   ├── main.rs            # Tauri application entry point
│   │   ├── commands/          # IPC commands (CRUD, Python run, SQL, licensing)
│   │   └── services/          # System services (Job objects, credentials, crypto)
│   ├── capabilities/          # Least-privilege permission manifests
│   └── tauri.conf.json        # Tauri configuration
├── workers/
│   └── python/
│       └── worker.py          # Restricted Python child process runner with audit hooks
├── tools/
│   ├── license-issuer/        # Offline ECDSA P-256 license generator CLI
│   └── manifest-signer/       # Release integrity manifest generator & signer
├── secret.json                # User API credentials
├── grindgram_all_problems.csv # 1,337 Curated practice problems & career items
└── package.json               # Frontend dependencies & build scripts
```

---

## 3. UI Design Specifications & Screen Inventory

The visual source of truth is the 16 supplied reference mockups (18 PNGs in `screens/`). The canvas is designed for **1586 x 992 px** with responsive collapse down to 1100 x 700 px.

| # | Screen / Module | Reference Mockup | Theme & Visual Treatment | Key Features & Adaptations |
|---|---|---|---|---|
| **1** | **Dashboard** | `Red-Accented Coding Productivity Dashboard.png` (top) | Light shell, red accents (`#E11D26`) | Greeting, KPI row (Questions, Accuracy, Time, Topics, Tasks ring), Weekly chart, Today's Plan, Pomodoro card (25:00), Weak Topics, Up Next, Quote card |
| **2** | **Learning Tracks** | `Modern Learning Tracks Dashboard.png` | Light shell, 4-column card grid | 50 DSA patterns, Aptitude, SQL tracks, progress bars, est. remaining time, ⋯ menu fixed (no overlap defect), "+ Create Track" |
| **3** | **Coding Problems** | `Coding Problems Practice Dashboard.png` | Light shell, data table + right rail | 1,337 problems from CSV, filter chips (Difficulty, Status, Topic, Platform), bulk actions, right rail with Continue Practice & Daily Goal |
| **4** | **Python Practice** | `Red-Accented Coding Productivity Dashboard.png` (bottom) | Full-dark (`#0B1220`) workspace | 3-zone layout: Problems explorer, statement & examples, Monaco editor + Testcases/Console tabs, CPython 3.12 execution, local stats |
| **5** | **SQL Practice** | `SQL_Practice_Dashboard_Workspace.png` | Light shell + dark editor & results | SQLite practice engine, table schemas, SQL editor, results grid, execution timer, query history, test verification |
| **6** | **PostgreSQL Lab** | `Dark PostgreSQL SQL Lab Dashboard.png` | Light shell + dark database explorer | Real PostgreSQL connection / simulation bridge, database tree explorer, query editor, object inspector, truthful engine status |
| **7** | **To-do Planner** | `Modern To-Do Planner Dashboard.png` | Light shell, list/Kanban/calendar | Grouped tasks (Today/Tomorrow/Upcoming), quick-add parser (`!priority #tag`), daily focus timer, single clean title |
| **8** | **Study Sessions** | `Modern Study Sessions Dashboard.png` | Dark "Stay Focused" card + light stats | Pomodoro timer (25/5/15), idle detection (activity timestamps only, zero keystroke logging), session history table, focus timeline |
| **9** | **Progress & Analytics** | `Progress & Analytics Dashboard.png` | Light shell + rich charts | 5 KPI tiles, study activity line chart, problem accuracy donut, topic performance bars, weekly heatmap, achievements |
| **10** | **Daily Review** | `Daily Review Dashboard Interface.png` | Light shell, lettered review sections | A: Accomplishments, B: Reflection (counters), C: Blockers, D: Plan for tomorrow, sticky footer, consistency tracker |
| **11** | **Reports & Notifications** | `Reports and Notifications Dashboard.png` | Light shell, report cards + service tiles | Weekly/monthly reports, preview & CSV/PDF export, notification center, Telegram / Twilio connected service triggers |
| **12** | **Settings & Backup** | `Ap Settings & Backup Dashboard.png` | Light shell, 10 sub-sections | Appearance (color switchable), General, Storage, Python, SQL/PostgreSQL, Privacy & Security (hosts **Security Center**), Backup/Restore |
| **13** | **Login / Welcome** | `Red Mountain Login UI.png` | Crimson mountain hero background | Local profile unlock ("Sign In" = master password/PIN), glass inputs, offline-first design (social buttons disabled/optional) |
| **-** | **Component Library** | `Ap Popup & Modal Design System.png` | Light & dark surfaces | Modals A-E, Command Palette F (`Ctrl+K`), Toasts G, Date Picker H, Tooltips/Context Menus I, Button/Input/Toggle state sheets |

---

## 4. Data Layer & Schema Architecture

The database is an offline-first SQLite database with 20 versioned transactional tables.

```sql
-- 1. Tracks, Topics, Subtopics, Questions (1,337 Items Imported)
CREATE TABLE tracks (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    track_order INTEGER NOT NULL,
    level TEXT CHECK(level IN ('beginner', 'intermediate', 'advanced')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE topics (
    id TEXT PRIMARY KEY,
    track_id TEXT REFERENCES tracks(id) ON DELETE CASCADE,
    pattern_number INTEGER,
    title TEXT NOT NULL,
    topic_order INTEGER NOT NULL
);

CREATE TABLE subtopics (
    id TEXT PRIMARY KEY,
    topic_id TEXT REFERENCES topics(id) ON DELETE CASCADE,
    subtopic_number INTEGER,
    title TEXT NOT NULL,
    tutorial_link TEXT,
    video_link TEXT,
    subtopic_order INTEGER NOT NULL
);

CREATE TABLE questions (
    id TEXT PRIMARY KEY,
    subtopic_id TEXT REFERENCES subtopics(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    platform TEXT,
    difficulty TEXT CHECK(difficulty IN ('Easy', 'Medium', 'Hard')),
    practice_link TEXT,
    video_link TEXT,
    hint_link TEXT,
    xp INTEGER DEFAULT 5,
    content_type TEXT DEFAULT 'problem',
    status TEXT DEFAULT 'todo' CHECK(status IN ('todo', 'attempted', 'solved', 'bookmarked')),
    order_num INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Code Drafts & Submissions
CREATE TABLE code_drafts (
    id TEXT PRIMARY KEY,
    question_id TEXT REFERENCES questions(id) ON DELETE CASCADE,
    language TEXT NOT NULL,
    code TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE attempts (
    id TEXT PRIMARY KEY,
    question_id TEXT REFERENCES questions(id),
    language TEXT NOT NULL,
    code TEXT NOT NULL,
    status TEXT NOT NULL, -- Accepted, Wrong Answer, Time Limit Exceeded, Runtime Error
    runtime_ms INTEGER,
    memory_kb INTEGER,
    test_cases_passed INTEGER,
    total_test_cases INTEGER,
    row_hmac TEXT NOT NULL, -- HMAC-SHA256 tamper-evidence
    created_at TEXT NOT NULL
);

CREATE TABLE test_results (
    id TEXT PRIMARY KEY,
    attempt_id TEXT REFERENCES attempts(id) ON DELETE CASCADE,
    input TEXT,
    expected_output TEXT,
    actual_output TEXT,
    passed BOOLEAN NOT NULL
);

-- 3. SQL Exercises & Execution
CREATE TABLE sql_exercises (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    difficulty TEXT CHECK(difficulty IN ('Easy', 'Medium', 'Hard')),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    schema_sql TEXT NOT NULL,
    seed_sql TEXT NOT NULL,
    solution_sql TEXT NOT NULL,
    expected_output_json TEXT NOT NULL
);

-- 4. Planner, Goals, Sessions, Reviews
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT CHECK(priority IN ('Low', 'Medium', 'High')) DEFAULT 'Medium',
    status TEXT CHECK(status IN ('todo', 'in_progress', 'completed', 'archived')) DEFAULT 'todo',
    due_date TEXT,
    track_id TEXT REFERENCES tracks(id) ON DELETE SET NULL,
    estimated_minutes INTEGER DEFAULT 25,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE goals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    target_count INTEGER NOT NULL,
    current_count INTEGER DEFAULT 0,
    period TEXT CHECK(period IN ('daily', 'weekly', 'monthly')),
    date_key TEXT NOT NULL
);

CREATE TABLE study_sessions (
    id TEXT PRIMARY KEY,
    task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
    track_id TEXT REFERENCES tracks(id) ON DELETE SET NULL,
    session_type TEXT CHECK(session_type IN ('focus', 'short_break', 'long_break')),
    started_at TEXT NOT NULL,
    ended_at TEXT,
    elapsed_seconds INTEGER NOT NULL DEFAULT 0,
    active_seconds INTEGER NOT NULL DEFAULT 0,
    idle_seconds INTEGER NOT NULL DEFAULT 0,
    status TEXT CHECK(status IN ('completed', 'interrupted', 'abandoned')),
    row_hmac TEXT NOT NULL -- HMAC-SHA256 tamper-evidence
);

CREATE TABLE daily_reviews (
    id TEXT PRIMARY KEY,
    date_key TEXT UNIQUE NOT NULL,
    accomplishments_json TEXT,
    reflection_learning TEXT,
    blockers_improvements TEXT,
    tomorrow_plan_json TEXT,
    is_draft BOOLEAN DEFAULT FALSE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE notes (
    id TEXT PRIMARY KEY,
    question_id TEXT REFERENCES questions(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content_markdown TEXT NOT NULL,
    tags_json TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE reminders (
    id TEXT PRIMARY KEY,
    task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    remind_at TEXT NOT NULL,
    sent BOOLEAN DEFAULT FALSE
);

CREATE TABLE notification_queue (
    id TEXT PRIMARY KEY,
    channel TEXT CHECK(channel IN ('telegram', 'whatsapp', 'local')),
    payload_json TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE license_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    lid TEXT,
    details_json TEXT,
    row_hmac TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE integrity_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    score INTEGER NOT NULL,
    details_json TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE backup_manifests (
    id TEXT PRIMARY KEY,
    backup_path TEXT NOT NULL,
    sha256_hash TEXT NOT NULL,
    chain_head TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
);
```

---

## 5. Secure Execution Sandbox & Hardware Containment

### 5.1 Architecture
User code executes via a dedicated runner service spawning a restricted CPython 3.12 worker process:
1. **Isolated Child Process:** User code never runs in the main UI / Tauri process.
2. **Process Restrictions:** Windows Job Object enforcement (CPU limit 5s, memory limit 256MB, active processes = 1, `KILL_ON_JOB_CLOSE`).
3. **Execution Flags:** `python -I -S -B` (isolated mode, no user site-packages, no bytecode writing).
4. **Audit Hook Defense:** `sys.addaudithook` preventing network sockets, subprocess spawns, ctypes injection, or directory traversal outside the temporary run scratch folder.
5. **Fail-Closed Policy:** If security controls cannot be verified, execution is refused immediately with an explanatory dialog.

---

## 6. Cryptographic Licensing & Anti-Tamper Integrity Chain

### 6.1 ECDSA P-256 License Tokens
- **Format:** `ApLic1.<base64url(payload_json)>.<base64url(ecdsa_p256_sha256_signature)>`
- **Signing Key:** Kept offline in `tools/license-issuer/`; never shipped in the client app.
- **Verification Keyset:** Embedded public keys with key rotation support (`kid`).
- **Machine Fingerprint:** Salted SHA-256 of hardware properties (MachineGuid, CPU vendor, volume serial).
- **Monotonic High-Water Mark:** Rollback detection preventing clock resets.

### 6.2 Database Tamper-Evidence Chains
Every row in `attempts`, `study_sessions`, and `license_events` includes:
$$\text{row\_hmac} = \text{HMAC-SHA256}(k_{\text{row}}, \text{prev\_hmac} \parallel \text{canonical\_row})$$
Validated during startup, export, and before backups.

---

## 7. Connected Services & Credentials Handling (`secret.json`)

All credentials from `secret.json` are isolated and protected:
- **Telegram Bot Integration:** Dispatches automated session summaries and milestone alerts using `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` via background queue with retry logic.
- **Twilio SMS / WhatsApp:** Available for urgent deadline and study reminders using `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`.
- **Google Sheets Integration:** Supports exporting progress and completed problems directly to `GOOGLE_SPREADSHEET_ID` using `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
- **N8N Automation Webhooks:** Connected to `N8N_BASE_URL` with bearer token authentication for study workflow triggers.
- **Credential Storage:** In production, credentials are encrypted via Windows DPAPI and stored in Windows Credential Manager; central log redactor ensures no tokens or secrets ever appear in logs or errors.

---

## 8. Step-by-Step Implementation Roadmap

```
+-----------------------------------------------------------------------------------------------+
| PHASE 1: FOUNDATION & SETUP (Milestones 1 & 2)                                                |
| - Inspect environment, generate threat-model.md & PROGRESS.md                                 |
| - Initialize React + TypeScript + Vite + Tailwind CSS with strict types                      |
| - Extract tokens from design/reference PNGs to design/tokens.json                             |
+-----------------------------------------------------------------------------------------------+
                                               |
                                               v
+-----------------------------------------------------------------------------------------------+
| PHASE 2: SHELL, DESIGN SYSTEM & DATABASE (Milestone 3)                                        |
| - Build Frameless TitleBar, Sidebar (12 items), User Card, Bottom StatusBar                   |
| - Implement Reusable Component Library (Modals A-E, Palette F, Toasts G, State Sheets)        |
| - Setup SQLite database schema (20 tables) & import 1,337 items from grindgram_all_problems.csv|
+-----------------------------------------------------------------------------------------------+
                                               |
                                               v
+-----------------------------------------------------------------------------------------------+
| PHASE 3: CORE WORKSPACES & PRODUCTIVITY (Milestones 4, 5, 6)                                  |
| - Dashboard, To-do Planner, Study Sessions (Pomodoro + Idle Detection), Progress & Analytics   |
| - Coding Problems list with search/filters & Learning Tracks (50 DSA patterns)                |
| - Python Practice Workspace with Monaco Editor + Restricted CPython 3.12 runner               |
| - SQL Practice Workspace (SQLite) + PostgreSQL Lab (truthful status badge & query execution)  |
+-----------------------------------------------------------------------------------------------+
                                               |
                                               v
+-----------------------------------------------------------------------------------------------+
| PHASE 4: SECURITY, LICENSING & CONNECTED SERVICES (Milestones 7, 8, 9)                        |
| - Implement ECDSA P-256 license verifier + offline issuer CLI in tools/license-issuer/        |
| - HMAC tamper chain on SQLite tables + Security Center screen inside Settings                 |
| - Telegram notification queue & Twilio / Google Sheets connectors using secret.json           |
| - Daily Review screen & Reports & Notifications dashboard                                     |
+-----------------------------------------------------------------------------------------------+
                                               |
                                               v
+-----------------------------------------------------------------------------------------------+
| PHASE 5: VERIFICATION, TESTING & PACKAGING (Milestones 10 & Beyond)                          |
| - Execute Vitest suite, Python sandbox escape tests, and license tamper tests                 |
| - Perform 1586x992 visual-parity checks against all 16 mockups, record in docs/ui-parity.md   |
| - Update docs/PROGRESS.md with verified evidence for all 235 items                            |
+-----------------------------------------------------------------------------------------------+
```

---

## 9. Verification & Acceptance Criteria
1. **Live Development & HMR:** Frontend edits refresh instantly via Vite HMR; all UI changes visible without rebuilding installers.
2. **Visual Parity:** Every screen matches the reference PNGs at 1586 x 992 px with sampled design tokens and proper responsive reflow.
3. **Data Integrity:** All 1,337 problems from `grindgram_all_problems.csv` are accessible, filterable, and persist user progress across restarts.
4. **Hardened Execution:** Python code runs through the restricted runner and blocks prohibited operations (escapes, filesystem tampering, network calls).
5. **Cryptographic Protection:** License tokens verify with ECDSA P-256; tampered records or clock rollbacks are detected.
6. **No Leaked Secrets:** API tokens from `secret.json` are stored safely, redacted from logs, and used only through controlled services.
