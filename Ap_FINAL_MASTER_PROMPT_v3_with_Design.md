# FINAL MASTER BUILD PROMPT v3 — Ap Desktop Application
### Security-Hardened, Licensed, Tamper-Resistant — Built to the Supplied Design Files + Full Feature Checklist

**Project status: NOT STARTED. Every checklist item in Section 22 begins unchecked.**

**UI source of truth:** the 16 design reference files listed in Section 16.1 (18 PNGs including two identical duplicates). Build the interface to match them exactly, subject to the Required Adaptations in 16.12.

---

## 0. How to Use This Prompt

Paste this whole file into Antigravity (or any agentic IDE) as the project brief. The agent must follow the milestone order in Section 20, track every feature in the **Master Feature Checklist (Section 22)**, and must not claim any feature works until it has been run and tested. Where this document says "fail closed", the application must refuse the risky action rather than degrade silently.

**Honesty rule for the whole project:** client-side protection on a user-controlled PC is *deterrence and tamper-evidence*, not absolute prevention. The agent must document this in `docs/security.md` and must never describe any mechanism as "unbreakable" or "uncrackable".

---

## 1. Role and Objective

Act as a senior desktop application engineer, React/TypeScript architect, Rust systems engineer, database engineer, and application security engineer.

Build **Ap**, a production-oriented, offline-first Windows desktop application for interview preparation, coding practice, SQL learning, task management, and progress analytics, with:

- a hardened execution sandbox for user code,
- a cryptographically signed license system,
- layered tamper detection and blocking,
- an encrypted local database,
- a refined, accessible, hybrid light/dark interface.

The product must be functional end to end. Do not create only a static UI, mock dashboard, or hardcoded results.

---

## 2. Mandatory Technology Stack

| Layer | Choice |
|---|---|
| Desktop shell | Tauri 2 |
| Frontend | React + TypeScript (strict) + Vite |
| Styling | Tailwind CSS + CSS variables (design tokens) |
| Editor | Monaco Editor |
| Backend | Rust (Tauri commands, plugins, services) |
| Local DB | SQLite via `rusqlite` with SQLCipher (encrypted at rest) |
| Migrations | Versioned, forward-only, transactional |
| Charts | Recharts |
| Python practice | Real CPython interpreter in a separate restricted worker process |
| SQL practice | Isolated local SQLite practice database |
| PostgreSQL lab | Genuine PostgreSQL connection (configured local or remote server) |
| Crypto | `p256` (ECDSA P-256) + `sha2` (SHA-256), `hmac`, `zeroize`, `subtle` |
| Secret storage | Windows Credential Manager / DPAPI via `keyring` |
| Windows APIs | `windows` crate (Job Objects, tokens, AppContainer, display affinity) |
| Installer | Tauri NSIS, Authenticode-signed |
| Updates | Tauri updater with signed update manifests |
| Tests | Vitest, Rust `cargo test`, integration tests, Playwright/WebDriver E2E |
| Supply chain | `cargo audit`, `cargo deny`, `npm audit`, SBOM generation |

Inspect the existing repository before modifying anything. Use maintained, compatible dependency versions and commit lockfiles.

---

## 3. Development Workflow — Live Updates

Use Tauri development mode with Vite HMR for all daily work. **Do not rebuild the Windows installer after every UI change.** The installed production EXE never updates automatically from source edits.

### 3.1 Start live development
Open the existing Ap project folder in Antigravity or a terminal, then run:

```bash
npm install          # first time, or after dependencies change
npm run tauri dev    # starts Vite dev server + Rust build + the Ap desktop window
```

If dependencies are already installed, only `npm run tauri dev` is needed. If it fails, inspect the `scripts` section of `package.json` first: the existing project may use a different script name (for example `npm run dev:tauri`). Keep the original source repository; an installed `.exe` alone is not a development workspace.

### 3.2 What updates automatically

| What you change | What happens |
|---|---|
| React components / TSX | Updates through HMR |
| CSS / Tailwind styling | Updates live |
| Popup and modal designs | Updates live |
| Dashboard and navigation UI | Updates live |
| Frontend logic / TypeScript | Usually HMR, sometimes a frontend reload |
| Rust backend commands | Recompile and restart the app (dev watcher) |
| Python worker script | Restart the worker only (independently restartable) |
| Database migrations | May require restart; **back up data first** |
| `tauri.conf.json` / capabilities / permissions | Often requires restart |
| Installer / EXE packaging / signing / updater config | Requires a production build |

Preserve UI state across HMR where practical; reset gracefully otherwise. Provide clear terminal logs for compile failures, IPC errors, DB errors and runtime failures.

### 3.3 Recommended workflow
1. **Edit** the existing source (component, popup, screen, CSS, command).
2. **Let Vite refresh** the UI; check the running Ap window and the terminal for errors.
3. **Test the feature:** the button, the backend operation, database persistence, and error/empty states. For screens, run the visual-parity check against the matching design file (Section 16.11).
4. **Build only when ready to release**, after code review and the PostgreSQL integration tests pass.

### 3.4 Build the updated Windows application (release only)

```bash
npm run tauri build
```

The NSIS installer is normally generated under `src-tauri/target/release/bundle/nsis/`; the exact output depends on the Tauri configuration and build target. Release builds are Authenticode-signed and verified per Sections 7 and 12.

### 3.5 Rules for working on the existing Ap project
- Keep **dev and production configs separate** (`tauri.dev.conf.json` vs `tauri.conf.json`) and document commands for dev, frontend build, tests, lint, audit and release packaging in `docs/dev-workflow.md`.
- Use a **separate development database** (for example `%APPDATA%\Ap-dev\`) or a safe test database when testing persistence. Never point dev builds at the production database.
- **Avoid running multiple app instances against the same database**, because migrations or writes can conflict. Enable `tauri-plugin-single-instance` (or an equivalent lock file) in both dev and production.
- **Back up before migrations:** dev mode takes an automatic pre-migration snapshot of the dev database, and migration changes require an app restart.
- **Dev must not weaken release security:** debug-only conveniences (DevTools, relaxed CSP for the Vite server, dev licence key, demo seed) are compiled in only under `cfg(debug_assertions)` or a dev feature flag and are absent from release builds. Production public keys are never replaced by dev keys in release artifacts.
- Keep the Python execution worker independently restartable so sandbox changes can be tested without restarting the whole app. Sandbox protections stay enabled in dev (fail closed applies there too).

### 3.6 Recommendation
Keep the Ap development window running while working on screens, popups and frontend behaviour. Restart it only when a change requires it (Rust commands, migrations, Tauri config, permissions), and create a release build only after the changes are verified and the PostgreSQL integration tests pass.

---

## 4. Threat Model (write to `docs/threat-model.md` first)

The agent must produce this document before writing security code and keep it current.

**Assets:** user study data, license entitlement, stored credentials (Telegram token, PostgreSQL password), app integrity, the host machine.

**Adversaries and scenarios:**

| # | Threat | Primary controls |
|---|---|---|
| T1 | Malicious or buggy user code escapes the Python runner | Section 8 sandbox |
| T2 | Forged or shared license key | Section 6 signed licenses + machine binding |
| T3 | Patched or modified EXE / replaced frontend assets | Section 7 integrity chain |
| T4 | Edited or swapped local database | Section 9 encryption + row/chain integrity |
| T5 | Credential theft from disk, logs, or frontend bundle | Section 10 secret handling |
| T6 | Malicious update or MITM on update channel | Section 12 signed updates |
| T7 | XSS or IPC abuse via WebView | Section 11 Tauri hardening |
| T8 | Supply-chain compromise | Section 13 |
| T9 | Clock rollback to extend license/trial | Section 6.7 |
| T10 | Screen/window capture of licensed content | Section 7.6 (optional) |

**Out of scope (state explicitly):** a determined attacker with administrator rights and a debugger can eventually bypass any purely client-side check. The goal is to make casual, scripted, and low-effort attacks fail, make tampering evident, and keep the licensing authority offline and server-side.

---

## 5. Product Design Summary

Application name: **Ap**. Offline-first. Windows 10/11 x64.

Main screens:
1. Dashboard
2. Learning Tracks
3. Coding Problems
4. Python Practice Workspace
5. SQL Practice
6. PostgreSQL Lab
7. To-do Planner
8. Study Sessions
9. Progress & Analytics
10. Daily Review
11. Reports & Notifications
12. Settings, License & Backup
13. Login / Welcome (local profile unlock — see 16.6 M)

The Security Center (Section 14) is hosted inside **Settings & Backup → Privacy & Security**; the design has no extra sidebar item.

Global features: command palette, global search, quick-add, daily goal ring, runtime/connection status chips, license status chip.

### 5.1 Content Import (optional, legal-safe)

Provide an **Importer** that loads a user-supplied CSV/JSON of practice items into `tracks → topics → subtopics → questions`. Schema:

```
track, topic, subtopic, title, platform, url, difficulty, order, hint, xp
```

Rules: store titles and links only; do not copy third-party problem statements, editorials, or branded assets. Ship Ap with its own original sample problems. Any external dataset must be one the user is entitled to use.

---

## 6. License System — SHA-256 Signed Keys

> SHA-256 is a hash, not a signature scheme. "SHA-256 signed" is implemented as **ECDSA over P-256 with SHA-256 (ES256)**. The signing (private) key never ships in the app.

### 6.1 Key architecture
- **Offline signing key (private):** generated on an air-gapped machine or hardware token (YubiKey/HSM). Never in the repo, CI, or installer.
- **Verification keys (public):** embedded in the Rust binary as a keyset `{kid → public key}` to support rotation. Minimum two slots (current + next).
- **Separate keys** for: licenses, update manifests, revocation lists. A leak of one must not compromise the others.

### 6.2 License token format
```
ApLic1.<base64url(payload_json)>.<base64url(ecdsa_p256_sha256_signature)>
```

Payload (canonical JSON, sorted keys, UTF-8, no whitespace):

```json
{
  "v": 1,
  "kid": "lic-2026-01",
  "lid": "uuid-v4",
  "product": "ap",
  "edition": "pro",
  "features": ["python", "sql", "postgres", "reports"],
  "issued_at": "2026-10-05T00:00:00Z",
  "not_before": "2026-10-05T00:00:00Z",
  "expires_at": "2027-10-05T00:00:00Z",
  "max_version": "2.x",
  "fp": "sha256-hex-of-salted-machine-fingerprint",
  "holder": "name-or-email-hash"
}
```

Signature input: `SHA-256( "ApLic1." || canonical_payload_bytes )`.

### 6.3 Verification flow (Rust only — never in JS)
1. Parse and size-limit the token (reject > 4 KB).
2. Reject unknown `v`, unknown `kid`, wrong `product`.
3. Verify ES256 signature using the public key for `kid` (constant-time comparison where applicable).
4. Check `not_before`/`expires_at` against trusted time (6.7).
5. Check `max_version` vs app version.
6. Recompute machine fingerprint and compare to `fp`.
7. Check revocation list (6.6).
8. Only then derive a `LicenseState` enum: `Valid | ExpiredGrace | Invalid | Revoked | WrongMachine | Tampered`.
9. Fail closed: any parse/crypto error → `Invalid`, premium features locked, core local features stay available per product policy.

The frontend receives only the resulting `LicenseState` and feature flags. Feature gating is **enforced in Rust command handlers**, not just by hiding buttons.

### 6.4 Machine fingerprint
- Collect: Windows MachineGuid, CPU vendor/family string, system volume serial, motherboard UUID (where available).
- Never send raw values anywhere. Compute `SHA-256(app_salt || component1 || … )`.
- Tolerate partial hardware change: require ≥ 2 of 3 components to match; document the re-activation flow.
- Do not collect personal data. Describe the fingerprint in the privacy notice.

### 6.5 Activation modes
- **Offline activation (default):** user pastes a token; app verifies locally. Works with no internet.
- **Optional online activation:** HTTPS with certificate pinning to your licensing server; the server signs a token bound to the fingerprint. Rate-limited, logged.
- Provide a separate **license issuing CLI** in `tools/license-issuer/` (not part of the shipped app, never uses the embedded public key path) that signs tokens with the offline private key.

### 6.6 Revocation
- Signed revocation list (separate key): `{ list_version, issued_at, revoked_lids[] }`.
- Fetched opportunistically when online, cached encrypted, version must be monotonic increasing (reject rollbacks).
- Offline users keep working until `expires_at`; document this trade-off.

### 6.7 Time and rollback defence
- Store a monotonic "high-water mark" timestamp (encrypted + MAC'd) updated on every launch and every license check.
- If system time < high-water mark − tolerance → flag `ClockRollback`, lock premium features, show explanation and recovery steps.
- Use `GetTickCount64`/QPC deltas within a session; optionally cross-check with a signed time attestation when online.

### 6.8 Storage
- Persist the token in Windows Credential Manager (DPAPI-protected) — not in plain files, not in `app_settings`.
- Log license events with `lid` only, never the full token.

### 6.9 License tests (required)
- Valid token → `Valid`.
- Single flipped bit in payload or signature → `Tampered/Invalid`.
- Expired, not-yet-valid, wrong machine, wrong product, unknown `kid`, revoked → correct states.
- Clock rollback detected.
- Token with oversized/garbled input does not panic.
- Property tests / fuzzing on the parser.

---

## 7. Anti-Tamper Blocking (layered)

Goal: detect modification and **block sensitive functionality** (license-gated features, Python runner, backups/exports, messaging) when integrity checks fail — while preserving access to the user's own data export so they are never locked out of their notes.

### 7.1 Build-time chain of trust
1. Authenticode-sign the EXE, DLLs, and NSIS installer with an EV or OV code-signing certificate; timestamp every signature.
2. Generate a **signed integrity manifest** at release: SHA-256 of every shipped file (EXE, DLLs, Python worker scripts, migration files, bundled assets, sample datasets).
3. Sign the manifest with the **release key** (ES256, separate from license key). Embed the manifest and the verifying public key.

### 7.2 Runtime integrity verification (Rust)
- At startup (and periodically, plus before each Python run), hash the loaded EXE image sections, the Python worker, migration files, and bundled resources; compare with the signed manifest.
- Verify own Authenticode signature via `WinVerifyTrust`; log the signer subject.
- Verify the Python interpreter path and hash against an allow-list; refuse unknown interpreters.
- On mismatch → state `IntegrityFailed`: show a clear dialog, block gated features, keep read-only access and data export.

### 7.3 Database integrity
- SQLCipher encrypts the app DB; key = random 256-bit data key wrapped by DPAPI (user scope) and stored in Credential Manager.
- Add a **tamper-evidence chain** for sensitive tables (`attempts`, `study_sessions`, `license_events`): each row stores `row_hmac = HMAC-SHA256(k_row, prev_hmac || canonical_row)`. Verify chain on startup (fast, incremental) and on backup/export.
- Run `PRAGMA integrity_check` and foreign-key check after migrations and restores.
- Backups: encrypted, include a signed manifest and chain head; restore verifies before swapping.

### 7.4 Anti-debug / anti-injection (release builds only, advisory)
- `IsDebuggerPresent`, `CheckRemoteDebuggerPresent`, and timing sanity checks in release builds.
- Enable process mitigation policies: `SetProcessMitigationPolicy` for DEP, ASLR, strict handle checks, disallow dynamic code, block non-Microsoft/Store-signed DLL injection where compatible with WebView2.
- Do **not** make these a hard crash; treat as a risk signal that raises the integrity score and gates sensitive features. Never interfere with legitimate accessibility tools or antivirus.

### 7.5 Frontend hardening
- Disable DevTools, context menu "Inspect", and remote debugging port in release builds.
- Strict CSP (Section 11). No `eval`, no inline scripts, no remote scripts.
- Minify and strip source maps from release bundles.
- Treat all frontend state as untrusted; the Rust side re-validates every command.

### 7.6 Optional capture protection (user/organization toggle, off by default)
- Setting: "Block screen capture of Ap windows" using `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` on supported Windows versions.
- Explain clearly it does not stop a phone camera or a hardware capture device, and may interfere with screen-reader recording or support sessions.

### 7.7 Integrity score and response policy
Compute a local score from independent signals (signature OK, manifest OK, DB chain OK, interpreter OK, debugger flag, clock OK, license OK).

| State | Behaviour |
|---|---|
| `Healthy` | Everything enabled |
| `Degraded` (soft signals only) | Warn, log, keep features |
| `IntegrityFailed` (hard signal) | Block license-gated features, Python runner, messaging, imports; allow read-only view and full data export |
| `Compromised` (multiple hard signals) | Same as above + force re-install prompt with signed installer link |

Never delete user data as a punishment. Never phone home without consent.

---

## 8. Secure Python Execution

User code never runs inside the privileged Tauri process.

### 8.1 Architecture
```
Tauri (Rust, privileged)
   └─ Runner service (Rust)
        └─ spawns Python worker as a restricted child process
              ├─ Job Object (limits + kill-on-close)
              ├─ Restricted token / Low integrity level
              ├─ AppContainer profile with NO network capability
              ├─ Private temp working dir per run (ACL'd, wiped after)
              └─ stdin/stdout/stderr pipes only
```

### 8.2 Required controls
- **Job Object:** `JOB_OBJECT_LIMIT_PROCESS_MEMORY`, `JOB_OBJECT_LIMIT_JOB_TIME`, `ACTIVE_PROCESS = 1` (no child processes), `KILL_ON_JOB_CLOSE`, UI restrictions.
- **Token:** run as restricted token (disable SIDs, remove privileges) at Low integrity; AppContainer preferred when available.
- **Network:** blocked via AppContainer without `internetClient` capability; as a second layer add a per-executable Windows Firewall block rule created at install/first run (if permitted). Verify with a test that a socket connect fails.
- **Filesystem:** worker can read only its run directory and the Python stdlib; no access to user profile, app data, or the Ap database.
- **Python flags:** `-I -S -B`, custom `sitecustomize` disabled, audit hook (`sys.addaudithook`) blocking `open` outside run dir, `socket`, `subprocess`, `ctypes`, `os.system`, `importlib` of denied modules. Treat the audit hook as defence in depth, **not** the boundary.
- **Limits:** wall-clock timeout (default 5 s), CPU time, memory (default 256 MB), stdout/stderr cap (default 1 MB), source size cap, test-case count cap.
- **Termination:** on timeout/overflow, terminate the whole job and report `TimeLimitExceeded` / `MemoryLimitExceeded` / `OutputLimitExceeded`.
- **Integrity:** worker script hash verified before each run (7.2).

### 8.3 Fail-safe rule
If the sandbox primitives (Job Object, AppContainer/low-IL, network block) cannot be established on the machine, **do not run the code**. Show: "Secure execution is unavailable on this system: <reason>." Never fall back to an unrestricted subprocess.

### 8.4 Escape test suite (required)
Automated tests that must all be *blocked*: reading `%USERPROFILE%`, reading the Ap DB, writing outside run dir, opening a socket, DNS lookup, spawning `cmd`/`powershell`, `ctypes` calls, fork-bomb, memory bomb, infinite loop, 10 GB stdout, deep recursion, importing denied modules, symlink/junction tricks, reading environment secrets.

Honesty: a Job Object + AppContainer reduces risk substantially but is not a formally verified sandbox. Document residual risk and recommend optional Windows Sandbox / Hyper-V isolated mode as a future hardening tier.

---

## 9. Data Layer

### 9.1 Location and encryption
- DB lives in `%APPDATA%\Ap\` (never in the install dir).
- SQLCipher with a DPAPI-wrapped key; `zeroize` key material after use.

### 9.2 Required tables (versioned migrations)
`tasks, tracks, topics, subtopics, questions, code_drafts, attempts, test_results, sql_exercises, study_sessions, goals, daily_reviews, notes, reminders, notification_queue, app_settings, license_events, integrity_events, backup_manifests, schema_migrations`

Use proper PKs, FKs with `ON DELETE` rules, `CHECK` constraints, indexes on filter/sort columns, `created_at/updated_at` (UTC ISO-8601), soft-delete where recovery is useful, and transactions for multi-row writes.

### 9.3 Backup / restore
- Encrypted backup with signed manifest; restore validates signature, schema version, chain head, and `integrity_check` before atomically swapping.
- JSON/CSV export of user content (never encrypted-only: users must be able to take their data out).
- Safe forward-only migrations with automatic pre-migration backup and rollback on failure.

### 9.4 CRUD scope
Complete Create/Read/Update/Delete with validation, confirmation on destructive actions, undo/recovery where practical, and search/sort/filter for: tasks, tracks, topics, questions, notes, goals, study sessions, daily reviews, reminders.

---

## 10. Secrets and Privacy

- Telegram bot token, WhatsApp provider key, PostgreSQL password → Windows Credential Manager only.
- Never in source, bundles, plaintext config, logs, crash reports, or error messages.
- Central log redactor strips tokens, passwords, `Authorization` headers, license tokens, file paths under the user profile.
- Telemetry: **off by default**; if added, opt-in, documented, and free of study content.
- Provide a "Wipe local data and credentials" action with confirmation.

---

## 11. Tauri and WebView Hardening

- **Capabilities:** deny-by-default; grant each window only the exact commands it needs. No `shell`, no arbitrary `fs`, no `http` from the frontend.
- **CSP (release):**
  ```
  default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
  img-src 'self' data:; font-src 'self'; connect-src 'self' ipc: http://ipc.localhost;
  object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'
  ```
  (Tighten `style-src` if Monaco allows.)
- Bundle Monaco locally (no CDN).
- Validate every IPC command: types, lengths, ranges, enums; return typed errors, never raw internals.
- Use Tauri's isolation pattern for IPC where compatible.
- Block navigation to external origins; open links in the default browser only after an explicit allow-list check.
- Sanitize any rendered Markdown (notes, problem statements) with a strict allow-list sanitizer.

---

## 12. Updates and Distribution

- Authenticode-signed installer; SmartScreen reputation note in docs.
- Tauri updater with **minisign/ES256-signed manifests**, HTTPS only, version must increase (anti-downgrade), update public key embedded and separate from license/release-manifest keys.
- Upgrade preserves `%APPDATA%\Ap\`; migrations run with pre-backup.
- NSIS: branded installer, install-dir selection, Start Menu + optional desktop shortcut, clean uninstall (asks whether to keep user data), prerequisite checks (WebView2, Python runtime, PostgreSQL optional).
- Distinguish the small app package from the optional Python runtime, sample datasets, and PostgreSQL server. Do not bundle a PostgreSQL server unless explicitly required.

---

## 13. Supply Chain and CI

- Pinned lockfiles; `cargo audit`, `cargo deny` (licenses + advisories), `npm audit --omit=dev`, `cargo clippy -D warnings`, `eslint`, `tsc --noEmit`.
- CI builds are reproducible where possible; signing keys live only in a protected release environment (or manual offline step).
- Generate an SBOM (CycloneDX) per release.
- Dependency review before adding any crate/package; prefer well-maintained, minimal-dependency options.
- Secret scanning (e.g., gitleaks) in pre-commit and CI.

---

## 14. Security Center Screen (new)

> Placement: inside **Settings & Backup → Privacy & Security** (licence summary also under **About Ap**). Do not add a 13th sidebar item; the sidebar must match the design files exactly.

A dedicated screen showing real, live status — no placeholders:

- **License:** state, edition, expiry, features, machine-binding status, "Activate / Replace key", "Export license request (fingerprint hash)".
- **Integrity:** signature status, manifest verification time, DB chain status, interpreter hash status, last check timestamp, integrity score and state.
- **Sandbox:** which isolation primitives are active (Job Object, low-IL/AppContainer, network block) with a "Run self-test" button.
- **Secrets:** which credentials are stored (names only), "Remove credential".
- **Events log:** filterable list of `integrity_events` and `license_events` (redacted).
- **Privacy:** capture-protection toggle, telemetry setting, "Wipe local data".

Every status must come from an actual check executed in Rust.

---

## 15. Python, SQL, PostgreSQL, Planner, Sessions, Analytics, Reports

Keep all functional requirements from the original prompt (workspace features, test cases, SQL engine, PostgreSQL lab, planner CRUD, idle detection, analytics, daily review, Telegram/WhatsApp queue) with these security additions:

- **Python:** all execution via Section 8; premium problem packs gated in Rust by license features.
- **SQL practice:** separate practice DB file, opened read-only by default; block `ATTACH`, `LOAD_EXTENSION`, `PRAGMA` abuse, file-writing functions; statement timeout and row cap; reset to a pristine copy.
- **PostgreSQL:** TLS preferred, certificate verification on, restricted role, read-only transactions by default, disposable practice schema for writes, statement timeout, clear active-engine label ("Engine: PostgreSQL 16 @ host" vs "Engine: SQLite").
- **Idle detection:** activity signals only (input timestamps); never record keystroke contents.
- **Analytics:** computed from persisted records with documented formulas; empty states show "No data yet", never fake percentages.
- **Messaging:** queue with retry/backoff, delivery status, secrets from Credential Manager, failure never crashes the app; explain that sending needs internet and valid credentials.

---

## 16. UI Design Specification — Source of Truth: the Supplied Design Files

**The PNG mockups below are the visual source of truth. Build the UI to match them exactly** (layout, spacing, colour, type, iconography, copy, states). Place the files in the repository at `design/reference/` and never rename them. Where a mockup conflicts with the functional/security requirements elsewhere in this document, follow the **Required Adaptations** (16.12); where a mockup contains a visual defect, follow **Known Mockup Defects** (16.13).

### 16.1 Design file inventory (file → screen/module)

| # | File (exact name) | Defines |
|---|---|---|
| 1 | `Red-Accented_Coding_Productivity_Dashboard.png` | **Dashboard** (top, light) and **Problems + Python workspace** (bottom, full-dark variant with icon-rail sidebar) |
| 2 | `Coding_Problems_Practice_Dashboard.png` | **Coding Problems** list screen |
| 3 | `Modern_Learning_Tracks_Dashboard.png` and `Modern_Learning_Tracks_Dashboard__1_.png` | **Learning Tracks** (the two files are identical; treat as one design) |
| 4 | `SQL_Practice_Dashboard_Workspace.png` | **SQL Practice** (light shell, dark workspace panels) |
| 5 | `Dark_PostgreSQL_SQL_Lab_Dashboard.png` | **PostgreSQL Lab** (light shell, dark workspace panels) |
| 6 | `Modern_To-Do_Planner_Dashboard.png` | **To-do Planner** + global bottom status bar |
| 7 | `Modern_Study_Sessions_Dashboard.png` | **Study Sessions** + idle detection |
| 8 | `Progress___Analytics_Dashboard.png` and `Progress___Analytics_Dashboard__1_.png` | **Progress & Analytics** (identical files; one design) |
| 9 | `Daily_Review_Dashboard_Interface.png` | **Daily Review** |
| 10 | `Reports_and_Notifications_Dashboard.png` | **Reports & Notifications** |
| 11 | `Ap_Settings___Backup_Dashboard.png` | **Settings & Backup** (all sub-sections) |
| 12 | `Ap_Popup___Modal_Design_System.png` | **Component library**: modals A–E, command palette F, toasts G, dropdown/date picker H, tooltip/context menu I, and button/input/toggle/theme/context-menu state sheets |
| 13 | `Red_Mountain_Login_UI.png` | **Login / Welcome** screen |
| 14 | `Glossy_Red_Ap_Monogram_Icon.png` | **App icon** (master source for `src-tauri/icons/`, installer, taskbar, window icon) |
| 15 | `Contemplative_Hiker_at_Alpine_Sunrise.png` | Brand hero image (neutral sunrise) — welcome/onboarding, empty states |
| 16 | `Crimson_Mountain_Sunset_with_Lone_Hiker.png` | Brand hero image (red-graded) — login background, splash, achievements |

Rules: convert hero images to optimised WebP/AVIF (≤ 300 KB each), bundle locally (no CDN), keep originals in `design/reference/`. Generate all icon sizes (`.ico`, 16–512 px, NSIS header/sidebar art) from file 14 with `tauri icon`.

### 16.2 Design canvas and window
- Reference frame: **1586 × 992 px** (all mockups). Minimum window 1100 × 700; layouts must reflow without clipping between those sizes.
- **Frameless custom title bar** (`decorations: false`): minimise / maximise / close controls top-right exactly as in the mockups, draggable region over the top bar, double-click to maximise, Windows snap-layout compatible, keyboard accessible, close respects unsaved-draft prompts.
- Global **bottom status bar** (dark, 28–32 px, full width of main area) as in `Modern_To-Do_Planner_Dashboard.png` and `Dark_PostgreSQL_SQL_Lab_Dashboard.png`: left = active engine + connection dot + database + schema + transaction mode; right = cursor position (`Ln, Col`) when an editor is focused + readiness dot. It must show **real** state (see 16.12).

### 16.3 Design tokens
Extract exact values by sampling the PNGs and store them in `design/tokens.json` → generated CSS variables. Provisional values (verify by sampling):

```css
:root {                                 /* light shell */
  --bg:#F7F8FC; --surface:#FFFFFF; --surface-2:#F1F3F9; --border:#E8EAF2;
  --text:#101828; --text-muted:#667085;
  --primary:#E11D26; --primary-hover:#C8101A; --primary-deep:#A80000; --primary-tint:#FDECEC;
  --success:#16A34A; --success-tint:#E8F7EE;
  --warning:#D97706; --warning-tint:#FFF4E0;
  --danger:#DC2626;  --danger-tint:#FDE8E8;
  --info:#2563EB;    --info-tint:#E8F0FE;
  --radius-card:14px; --radius-control:8px; --radius-pill:999px;
  --shadow-card:0 1px 2px rgba(16,24,40,.05);
}
[data-surface="dark-panel"] {           /* workspace panels inside the light shell */
  --bg:#0B1220; --surface:#0F182B; --surface-2:#142038; --border:#1E2A44;
  --text:#E6EAF5; --text-muted:#94A0BC;
  --row-selected:#5A0F14;               /* red-tinted selected row (e.g. "employees") */
}
[data-theme="dark"] { /* full-dark app, from Red-Accented_Coding_Productivity_Dashboard.png (bottom) */ }
```
- **Accent colour is switchable** (Settings → Appearance swatches: red default, pink, orange, yellow, green, blue, purple, gray). All primary/tint/focus tokens must derive from the chosen accent.
- Difficulty badges: **Easy** green, **Medium** amber/orange, **Hard** red (tinted pill, coloured text). Status badges: **Solved** green, **Attempted** blue, **Not Started** gray. Priority: **Low** green, **Medium** orange, **High** red. Track tags (tinted pills): DSA red, SQL blue, Python purple, Data Analytics green, Personal teal, Interview Preparation violet.
- WCAG AA must still hold; where a mockup tint fails AA for small text, darken the text colour, not the tint.

### 16.4 Typography, spacing, iconography
- UI font: a geometric humanist sans matching the mockups (**Plus Jakarta Sans** preferred; confirm by visual comparison, fall back to Inter). Code: **JetBrains Mono**. Bundle locally.
- Page title ≈ 28–32 px bold; page subtitle 14 px muted; card titles 16–18 px semibold; table text 13–14 px; captions 12 px.
- Spacing scale 4/8/12/16/24/32; page padding ≈ 24; card radius ≈ 14; control radius ≈ 8; pills fully rounded; 1 px borders, very light shadows.
- Icons: outline style, consistent stroke (Lucide-compatible set); red tinted rounded-square icon chips on KPI tiles.

### 16.5 Global shell (identical on every screen)
- **Left sidebar** ≈ 225 px (collapsed ≈ 64 px, icon-only). Header: red rounded-square **Ap** app icon + "Ap" wordmark. Nav order and labels, exactly: **Dashboard, Learning Tracks, Problems, Python Practice, SQL Practice, PostgreSQL Lab, To-do Planner, Study Sessions, Progress & Analytics, Daily Review, Reports & Notifications, Settings & Backup**. Active item = full-width solid red pill with white icon and text. Use the common style (light header with red icon); the red-banner header in the dashboard image is an outlier.
- **User card** pinned bottom: red avatar circle, name (e.g. "Arun"), plan label with gold crown, settings gear. The plan label comes from the verified licence edition (`Pro Plan` when Valid; otherwise "Free"/"Unlicensed"); never hardcode.
- **Top bar** (≈ 64–68 px): breadcrumb `Home > Page`, page-specific search or actions, **Daily Streak** (flame + "N days"), **Study Hours** (clock + total) or **Active time today**, notification bell with red dot/count badge, settings gear where shown, window controls. Streak/hours are computed values.
- Dashboard top bar extras: `Ctrl K` search, red **Quick Add** button, daily-goal ring, and an **online/offline wifi indicator** that reflects real connectivity.

### 16.6 Screen specifications

**A. Dashboard** — `Red-Accented_Coding_Productivity_Dashboard.png` (top)
- Greeting "Good morning, {name}! 👋" (time-of-day aware) + "Keep going! Consistency is your superpower."
- KPI row: Questions Solved, Accuracy, Active Study Time, Topics Completed (each with delta vs yesterday and mini trend glyph), a narrow purple icon tile (unlabeled in the mockup → implement as an Achievements shortcut), Tasks Completed `n/m` with progress ring.
- Weekly Progress line chart (This Week dropdown, Mon–Sun, filled gradient under line).
- Today's Plan (task count, checkboxes, difficulty badge, "View All →"); Focus Session card (Pomodoro ring 25:00 with play button, settings and reset icons); Recent Activity (View all; solved items with relative times, practice and review entries).
- Bottom row: Weak Topics (bars with %), Up Next (items with red-outline **Start** buttons), Upcoming Deadlines, red **quote card** (rotating local quote list).

**B. Coding Problems** — `Coding_Problems_Practice_Dashboard.png`
- Header: search "Search problems by title, topic, or ID…" `Ctrl+K`, red **+ Add Problem**.
- Title "Coding Problems" + subtitle. KPI tiles: Total Problems, Solved, Attempted, Not Started, Overall Completion (`solved / total`, % bar).
- Filter chips: All Problems (red), Not Started, Attempted, Solved, Bookmarked; **Sort by** dropdown (Recommended…); grid/list toggle. Second row: Difficulty chips (All/Easy/Medium/Hard) and Topic chips.
- Table columns: checkbox, Status badge, Problem Title + `#ID`, Difficulty, Topics, Last Attempted (date + relative), Action (red **play** button, bookmark, ⋯ menu). Bulk-select supported.
- Right rail: Continue Practice (title, `#id`, difficulty, progress %, red **Continue**), Recommended Next (3 items), Weak Topics (bars), Daily Goal (`n of m problems completed`, %, encouragement line).

**C. Learning Tracks** — `Modern_Learning_Tracks_Dashboard.png`
- Header: search "Search tracks and topics…", red **+ Create Track**. Summary card: Overall Progress (% + `done / total` Topics Completed), Study Hours (Total Study Time), Current Streak (Longest Streak).
- Chips: All Tracks, In Progress, Not Started, Completed; Sort by (Recently Studied…); grid/list toggle.
- Track cards (4-column grid): coloured icon chip, title, description, level badge (Beginner green / Intermediate amber / Advanced red), `n / m problems|lessons` + %, red progress bar, Topics line, Last studied + relative time, Est. remaining, red **Continue Learning →**, ⋯ menu (**Edit Track, Duplicate, Archive, Delete**).
- Dashed-border **Create a Custom Track** card with **Get Started**.

**D. Python Practice workspace** — `Red-Accented_Coding_Productivity_Dashboard.png` (bottom, full dark)
- Icon-rail sidebar (collapsed), top bar with timer, theme toggle, notification badge, window controls.
- Three zones: (1) Problems list (search, All/Easy/Medium/Hard chips, filter icon, numbered rows with difficulty badge and solved ✓ / bookmark state); (2) Problem pane (title `n. Name ▾`, difficulty, bookmark; tabs **Description / Editorial / Solutions / Submissions**; statement, **Example 1/2** code blocks; footer with local Accepted %, Submissions count, Difficulty); (3) Editor + results.
- Editor: language dropdown (Python3), Auto toggle, Monaco with line numbers; **Run Code** (dropdown) and red **Submit**; tabs **Console / Testcase / Custom Testcase** (console shows Input, Output, Expected, Status, Runtime).
- Right panel tabs **Testcase / Result**: "Accepted" headline, `x / y testcases passed`, Runtime, Memory, **numbered green/red testcase grid**, **Submission History** (date-time, Accepted/Wrong Answer, runtime, View all).

**E. SQL Practice** — `SQL_Practice_Dashboard_Workspace.png`
- Top bar: search "Search SQL challenges…" `Ctrl+K`, track dropdown ("SQL Interview Preparation"), difficulty dropdown, streak, Study Timer, red **Save Progress**, settings.
- Left dark **SQL Challenge Explorer**: collapsible, search, All/Easy/Medium/Hard chips, **Topics** with counts (SELECT & WHERE, Aggregations, JOINs, Subqueries, CTEs, Window Functions), numbered challenge list with completed ✓, difficulty badge, bookmark; selected row red-tinted.
- Centre: title + difficulty badge + bookmark, description, **Table Schema** mini-grid; tabs **Description / SQL Editor / Schema / Submissions**; engine selector **"SQLite Practice Engine ▾"**; editor; red **Run Query**, **Submit Solution**, **Reset Query**, status dot ("Ready") + execution ms; result tabs **Results / Test Cases / Console / Query History**; result grid; success bar "Query executed successfully. Execution time · Rows returned".
- Right: Challenge Progress ring (`done/total`, %), SQL Concepts chips, Next Suggested Challenges, Recent Attempts (Passed/Failed with timestamps), Daily Goal card (light).

**F. PostgreSQL Lab** — `Dark_PostgreSQL_SQL_Lab_Dashboard.png`
- Toolbar: connection selector with status dot (**Connected**), database dropdown, schema dropdown, **+ New Connection**, **Disconnect**, red **Run Query**, query timer, settings. Blue badge **"PostgreSQL (Real Connection)"** shown only when genuinely connected.
- Left **Database Explorer** (refresh, search, tree: database → Databases, Schemas → public → Tables / Views / Functions, Extensions); selected object red-tinted.
- Centre: query tabs (Query 1, Query 2, + New Query), toolbar (**Format SQL, Save, Clear**, fullscreen), SQL editor; result tabs **Query Results / Data Output / Messages / Query History**; sortable grid; success footer (rows, execution time, database).
- Right **Object Inspector**: object name/type, estimated row count; tabs **Columns / Constraints / Indexes / Data Preview**; column table with PK/FK badges; **Related Objects** list.
- Bottom status bar: `PostgreSQL | database | schema | Transaction: <real mode> | Ln, Col | status`.

**G. To-do Planner** — `Modern_To-Do_Planner_Dashboard.png`
- Header: search tasks, calendar icon, bell, streak, red **+ New Task**. Title "My Planner" + subtitle.
- KPI tiles: Today's Tasks, Completed, Overdue, Study Time Today.
- Tabs **My Day / Upcoming / All Tasks / Completed / Overdue**; Priority chips; Track chips; view toggle **List / Kanban / Calendar**; Sort.
- Inline quick-add row: "Add a task…", Due date, Priority, Track, Reminder, red **Add**.
- Grouped list **TODAY / TOMORROW / UPCOMING** with counts; row = checkbox, title, track tag, priority tag, due date-time, sub-progress bar `x/y`, ⋯ menu.
- Right rail: Daily Focus (`n of m`, %, remaining), Focus Timer (mode dropdown, red **Start Focus**, Focus/Short Break/Long Break presets), Upcoming Deadlines (coloured dots, relative time), Quick Notes (textarea + Save).

**H. Study Sessions** — `Modern_Study_Sessions_Dashboard.png`
- Header: Today date chip, streak, bell, settings, red **Start Session**.
- Dark **"Stay Focused"** card: circular timer ring (25:00, "Focus Session"), status pill ("Ready to focus"), current task, learning track, mode buttons **Focus 25 min / Short Break 5 min / Long Break 15 min**, **Start Focus / Pause / Reset**, Sound Notification toggle, Auto-start Next Session toggle.
- Today's Session Statistics (Focus Time, Sessions Completed, Tasks Completed, Average Session, each with delta). Recent Study Sessions table (Session, Learning Track, Start Time, Duration, **Active Time**, Status Completed/Interrupted, ⋯).
- Session Setup panel: task dropdown, track chips, duration chips (15/25/45/60), Daily Target dropdown, **Idle Detection** toggle + "Mark inactivity after N minutes".
- Focus Activity Today timeline (Focus/Break/Idle legend, 9 AM–5 PM) with totals. Focus Insights: Daily Focus Goal, Weekly Target, Current Streak, Next Recommended Task. **Idle Detection card** with privacy checklist (timestamps only, no keystroke monitoring, no screenshots or webcam, no content tracking) — these claims must be literally true in the implementation.

**I. Progress & Analytics** — `Progress___Analytics_Dashboard.png`
- Header: date-range dropdown ("Last 7 Days…"), **Export Report**, bell, streak, settings.
- 5 KPI tiles with delta vs previous period: Total Study Time, Problems Solved, Overall Accuracy, Current Streak, Learning Tracks Completed.
- **Study Activity** line chart with hover tooltip and dashed daily-goal line. **Problem-Solving Performance**: Total Attempts, Accepted Solutions, Failed Attempts, Accuracy, donut with legend.
- **Learning Track Progress** cards (icon, `n of m topics completed`, %, **View Track →**); **Topic Performance** bars with a **Focus Areas** subheading for weak topics; **Weekly Activity** (weekly goal, completed, remaining, progress bar, weekday × hour **heatmap** High/Medium/Low); **Recent Achievements** list with dates.

**J. Daily Review** — `Daily_Review_Dashboard_Interface.png`
- Header: date chip, streak, red **Save Review**, **View Previous Reviews**, bell, settings.
- **Your Day at a Glance** (Tasks Completed `n of m`, Focus Time, Problems Solved with deltas, Study Goal %).
- Lettered sections: **A Today's Accomplishments** (checked items with category tags and times, "Add another accomplishment…" + Category dropdown); **B Learning Reflection** (two textareas with 0/500 and 0/300 counters); **C Blockers and Improvements** (chips: Time management, Concept understanding, Distractions + notes 0/300); **D Plan for Tomorrow** (draggable rows: checkbox, title, category tag, priority, date, ⋮ menu; red **Add Priority**).
- Sticky footer: red **Save Daily Review**, **Save as Draft**, green "Changes saved locally", **Review history →**.
- Right rail: Daily Completion ring + breakdown, Study Breakdown bars (minutes per category), Review Consistency (`n of 7 days`, streak, Mon–Sun squares), Previous Review (yesterday's focus, study time, unfinished tasks, **Open Review →**).

**K. Reports & Notifications** — `Reports_and_Notifications_Dashboard.png`
- Header: period dropdown, bell with count, streak, red **Generate Report**.
- KPI tiles: Study Time This Week, Problems Solved, Tasks Completed `n of m`, Study Goal Progress (all with delta vs last week).
- **Your Reports**: tabs Daily/Weekly/Monthly; table (Report Name, Period, Study Time, Problems Solved, Generated Date, Actions **Preview / Export PDF / Export CSV**).
- **Recent Notifications**: tabs All/Unread/Reminders/Achievements; rows with icon, title, body, time, unread dot.
- **Connected Services**: Telegram (red **Connect**), WhatsApp (optional, **Connect**), Local Notifications (Enabled), Local Report Storage (Enabled), plus the note that reports stay local and external messaging needs explicit configuration and permission.
- Right: Weekly Summary chart, Weekly Goal Progress, Strongest Topic / Focus Area tiles, **Key Insights** bullets (computed, not canned), **Export Report**; **Reminder Settings** toggles (Daily study, Daily review, Weekly progress summary, Idle-session), Reminder time, Quiet hours.

**L. Settings & Backup** — `Ap_Settings___Backup_Dashboard.png`
- Header search "Search settings…" and green **"All changes saved locally"** chip. Left settings nav: **Appearance, General, Offline Storage, Python Runtime, SQL & PostgreSQL, Study Tracking, Notifications, Privacy & Security, Backup & Restore, About Ap** (active item = pink tint with red text).
- **Appearance:** Theme cards (Light / Dark / System Default), Accent Color swatches, Interface Density (Comfortable/Compact), Sidebar Behavior (Expanded/Collapsed), Font Size (Small/Medium/Large), Reduced Motion toggle, **live preview** panel that updates instantly.
- **General:** Launch on Windows startup, Start on Dashboard, Auto-save editor changes, Confirm before deleting data, Default landing page, Application language, **Reset Preferences**.
- **Study Tracking:** idle threshold dropdown, Exclude confirmed idle time, Track session duration, Record task completion timestamps, "Do not record keystrokes or editor content", local-only info note.
- **Offline Storage:** "Offline-first" badge, SQLite status, file location, size, last backup, **Open Data Folder / Export Data / Optimize Database**, PostgreSQL (External) "Not configured" card.
- **Python Runtime:** Ready badge, version, runtime location, execution timeout, memory limit, **Reset Python Environment**, restricted-process note.
- **SQL & PostgreSQL:** tabs SQLite (Practice) / PostgreSQL (External); profile, host, port, database, username, password (masked, eye toggle), SSL mode, **Test Connection**, **Save Connection**.
- **Notifications & Reminders:** the four toggles, Quiet hours with from/to times, Reminder time.
- **Backup & Restore:** last backup, Automatic backup toggle, frequency, keep-last-N, location, **Create Backup Now / Restore Backup / Export All Data / Import Data**, replace-data warning banner, **Backup History** table (Date, Size, Status).
- **Privacy & Security:** hosts the **Security Center** (Section 14: licence, integrity, sandbox self-test, secrets, event log, capture-protection toggle, wipe data). **About Ap:** version, tagline, **Check for Updates**, **Open Logs Folder**, Privacy Policy link; licence summary.

**M. Login / Welcome** — `Red_Mountain_Login_UI.png`
- Full-bleed red-graded mountain background (file 16), top-left menu icon + brand label, top-right "Back to Home", "Need Help?" and theme toggle. Centred circular red **Ap** badge, **"Welcome Back!"**, subtitle "Login to continue your learning journey".
- Glass-style inputs (user icon / lock icon with show-hide eye), red full-width **Sign In →** button, "OR" divider, three round provider buttons (Google, GitHub, Microsoft), shield + "Your data is safe with us" footer-left, "Don't have an account? **Sign Up**" footer-right.
- The "AP UI KIT" label is a design-kit caption; the shipped app shows "Ap". Behaviour per 16.12.

### 16.7 Component library — `Ap_Popup___Modal_Design_System.png`
Build each as a reusable component with the exact visuals, copy, spacing and states:
- **A Create Task modal:** Task title*, Description, Priority segmented (Low/Medium/High, coloured), Due date + time dropdown, Track/Topic, Estimated duration (minutes), "Add to today's plan" checkbox, Cancel / red **Create task**.
- **B Add Learning Question modal:** Question title*, Platform/Source dropdown (with logo), Topic, Difficulty segmented (Easy/Medium/Hard), Link (optional), Notes (optional), Cancel / **Save question**.
- **C Confirmation dialog:** red warning icon, "Delete this task?" + irreversible explanation, Cancel / red **Delete task**. Reused for every destructive action with action-specific copy.
- **D Start Study Session modal:** Session name, track dropdown, Planned duration chips (25/45/60/90 min), **Focus mode** toggle, Cancel / **Start session**.
- **E Backup & Restore dialog:** destination folder + **Choose folder**, estimated size, **Backup contents** checklist (Database (SQLite), Settings, Notes, Tasks, Study history), local-only info banner, Cancel / **Create backup**.
- **F Quick-Add Command Palette:** search field with ↑ ↓ Enter Esc hints; items with icon, title and subtitle: Create task, Start study session, Open Python practice, Open SQL practice, Add note, View daily review; selected row pink-tinted.
- **G Toasts:** success (green), info (blue), warning (orange), error (red) with title, body and dismiss ×; auto-dismiss with pause-on-hover; announced via `aria-live`.
- **H Dropdown & Date picker:** searchable track select with icons and selected check; month calendar with weekday header, today highlighted (red fill), weekend/overdue coloured dates, month navigation, **Today** link.
- **I Tooltip & context menu:** dark tooltips ("Settings", "Add task", "More info"); light context menu (**Open, Edit, Duplicate, Archive, Delete** in red) and a dark variant (**Run Code, View Output, Settings, Delete**).
- **State sheets:** Buttons (Primary, Hover, Focused with ring, Disabled); Inputs (Normal, Focused, Error with helper "This field is required", Success with check); Toggles (On, Off, Loading, Disabled); Theme variants (dark coding surface with language dropdown: Python, Java, JavaScript, C++).
- Modals: centred, dimmed backdrop, close ×, focus trap, `Esc` to close, returns focus to trigger, primary action red on the right.

### 16.8 Motion, accessibility, keyboard
- 120–200 ms ease-out transitions; honour `prefers-reduced-motion` and the in-app Reduced Motion toggle.
- Visible 2 px focus ring on every interactive element (red "Focused" button/input style from the state sheet); full keyboard operation; ARIA roles/labels; live-region announcements for run results, toasts, and timer state changes.
- Shortcuts (shown in a `?` overlay): `Ctrl+K` palette/search, `Ctrl+Enter` run, `Ctrl+Shift+Enter` submit, `Ctrl+B` sidebar, `Ctrl+N` quick-add, `Ctrl+S` save draft, `Ctrl+,` settings.
- Every data view has loading (skeleton), empty (with action), error (with retry) and success states; friendly error copy, no stack traces in the UI.

### 16.9 Responsive behaviour
Design for 1586 × 992 first; between 1100 and 1586 px collapse the right rails beneath main content, switch card grids from 4 → 3 → 2 columns, auto-collapse the sidebar below ≈ 1200 px, and keep tables horizontally scrollable inside their cards. Support UI zoom 90–150 % and high-contrast mode.

### 16.10 Data binding rule (no mock UI)
Every number, chart, badge, list and status shown in the mockups is **sample data**. In the product each value must come from persisted records or a real check (e.g. streak from `study_sessions`/`daily_reviews`; plan label from licence state; engine badge from the live connection). Empty datasets show friendly empty states, never placeholder percentages.

### 16.11 Visual-parity verification
1. Add a **dev-only demo seed** (`npm run seed:demo`, excluded from production builds) that loads the sample data shown in the mockups so each screen can be reproduced.
2. For every screen, render in the Tauri/WebView window at 1586 × 992 and capture a screenshot with Playwright/WebDriver.
3. Compare against the reference PNG (side-by-side + pixel/perceptual diff such as `pixelmatch`/SSIM) and record the result in `docs/ui-parity.md` with a documented tolerance. Differences caused by real data, fonts or anti-aliasing are acceptable; layout, spacing, colour and copy differences are not.
4. Repeat for light, dark and each accent colour on at least Dashboard, Problems and Settings.

### 16.12 Required adaptations (mockup → product)
| Mockup element | Conflict | Required implementation |
|---|---|---|
| Google / GitHub / Microsoft sign-in, "Sign Up" (`Red_Mountain_Login_UI.png`) | Ap is offline-first; no cloud account exists | Default: **local profile unlock** ("Sign In" = local profile name/password or Windows Hello, "Sign Up" = "Create local profile"). Render the provider buttons **only** if an optional, off-by-default online-account module is enabled; otherwise hide them. Never store passwords in plain text (Argon2id hash or OS credential). |
| Global stats "Accepted 57.1% / Submissions 12.8M / Solutions (12.4K)" | Cannot exist offline | Show **local** acceptance rate, local submission count and locally saved solutions/editorials. |
| "Pro Plan" crown | Must reflect the real licence | Bind to `LicenseState` (Section 6). |
| "Transaction: Auto (Read Committed)" | Lab is read-only by default | Show the **actual** mode (e.g. "Read-only", "Auto-commit", "In transaction"). |
| "PostgreSQL (Real Connection)" badge and status bar on non-DB pages | Must never claim a connection that doesn't exist | Show "SQLite (Local)" or "Not connected" when appropriate; status bar always truthful. |
| Telegram/WhatsApp "Connect", Check for Updates | Network + secrets | Credentials via Credential Manager; updates via signed updater; clear offline messaging. |
| Idle Detection privacy checklist | Claims must be true | Implement exactly: timestamps only, no keystrokes, no screenshots/webcam, no content. |
| Security/licence UI (not in mockups) | No sidebar slot | Place the Security Center in **Settings & Backup → Privacy & Security** and licence in **About Ap**; do not add a sidebar item. |

### 16.13 Known mockup defects — do NOT replicate
- Learning Tracks: the ⋯ menu overlaps and truncates the first card's title ("Algorithm…") — position the menu so it never covers content.
- To-do Planner: a ghost/duplicated "My Planner" heading artefact above the title — render one title only.
- Settings: the "About Ap" mini card contains duplicated notification toggles — implement About once, with version/updates/logs only.
- Analytics: Accuracy (78 %) and Accepted (76 %) disagree — define the formulas once (Section 12) and show consistent numbers.
- Planner/Dashboard samples with mismatching counts (e.g. "Completed 3" vs checked rows) — values must be computed from the same records.
- The dashboard's red sidebar banner differs from all other screens — use the common sidebar header.
- Streak/hours appear with different values across screens — compute once from the same source.

---

## 17. Required Project Structure

```
src/                     React app (features/, components/, hooks/, services/, types/, styles/)
src-tauri/src/           Rust: commands/, services/{license,integrity,sandbox,db,secrets,reports}/
src-tauri/migrations/    Versioned SQL migrations
src-tauri/capabilities/  Least-privilege permissions
src-tauri/icons/         App icons
workers/python/          Python execution worker (hash-pinned)
tools/license-issuer/    OFFLINE license signing CLI (never shipped)
tools/manifest-signer/   Release integrity-manifest signer (offline)
tests/                   unit, integration, security (escape + tamper), e2e
scripts/                 dev + packaging helpers
docs/                    setup, architecture, threat-model, security, release, dev-workflow, ui-parity
design/reference/        The supplied PNG design files (exact names, read-only source of truth)
design/tokens.json       Colours/type/spacing sampled from the PNGs; generates CSS variables
tests/visual/            Screenshot + diff harness comparing each screen to its reference PNG
```

Adapt to the existing repository; do not duplicate files or delete work blindly.

---

## 18. Security Test Matrix (must pass before release)

| Area | Tests |
|---|---|
| License | Valid/invalid/expired/revoked/wrong-machine/rollback, parser fuzz, key-rotation |
| Integrity | Modify EXE byte, worker script, migration file, asset → expect `IntegrityFailed` and feature block |
| DB | Flip row, break HMAC chain, swap DB file, corrupt page → detection + safe recovery |
| Sandbox | Full escape suite (Section 8.4) + fail-closed when primitives unavailable |
| IPC | Fuzz command inputs, oversized payloads, type confusion, unauthorized window |
| WebView | CSP violations blocked, no external navigation, XSS payloads in notes sanitized |
| Secrets | Grep binaries, logs, config, DB for tokens/passwords → none found |
| Updates | Tampered/unsigned/downgraded update rejected |
| Backup | Corrupted/foreign backup rejected; valid backup restores byte-for-byte content |
| Supply chain | `cargo audit`, `cargo deny`, `npm audit`, secret scan all clean or documented exceptions |

Document results in `docs/security-report.md`. Do not mark an item passed without running it.

---

## 19. Acceptance Criteria

Ap is releasable only when:

1. Dev mode supports live frontend updates; Rust changes recompile without installer builds.
2. All CRUD persists across restarts in the encrypted DB.
3. Python runs only inside the restricted runtime and **refuses to run** when isolation is unavailable.
4. SQL runs on the isolated practice DB; PostgreSQL mode uses a real server and labels the active engine.
5. Idle time is excluded correctly from active study time with no overlaps.
6. Analytics match persisted records.
7. License tokens verify with ES256/SHA-256, bind to the machine, resist tampering, rollback, and revocation per Section 6.
8. Integrity failures block gated features while preserving data export.
9. Backup/restore pass validation tests; user data survives upgrades.
10. Core features work offline.
11. Messaging failures are handled safely and secrets never leak.
12. Security Center reflects real, live checks.
13. The full test matrix is run and documented; residual risks are written down honestly.

---

## 20. Implementation Milestones

Work in small, verifiable steps. At each milestone: make real changes, run relevant tests, fix errors, keep the dev app runnable, update docs, and report completed work, limitations, and remaining tasks.

| # | Milestone |
|---|---|
| 1 | Inspect repo, dependencies, current build; report actual state. Write `docs/threat-model.md`. |
| 2 | Dev workflow (HMR, watcher), lint/typecheck/test commands, strict CSP + capabilities skeleton. |
| 3 | Design system from `design/reference` (sampled tokens, full component library of Section 16.7, shell, frameless title bar, status bar), encrypted SQLite, migrations, CRUD, backup/restore. |
| 4 | Planner, idle tracking, study sessions, dashboard, analytics, daily review. |
| 5 | Monaco, Python runner, **sandbox (Job Object + low-IL/AppContainer + network block)**, test cases, submissions, escape test suite. |
| 6 | SQL practice, PostgreSQL lab, isolated practice data, engine labelling. |
| 7 | **License system**: key tooling, ES256 verification, fingerprint, storage, rollback, revocation, tests. |
| 8 | **Integrity chain**: signed manifest, runtime verification, DB HMAC chain, response policy, Security Center. |
| 9 | Reports, optional messaging, signed updater, NSIS packaging, Authenticode signing. |
| 10 | Full security test matrix, clean-Windows install/upgrade test, documentation, release candidate. |

---

**UI parity at every milestone:** each screen delivered in a milestone must be rendered at 1586 × 992, screenshot-compared with its reference file (Section 16.11), and recorded in `docs/ui-parity.md` before it is marked done.

---

## 21. Final Instructions to the Agent

1. Begin by inspecting the repository. Preserve useful existing work.
2. Write the threat model before security code.
3. Never fake results: no hardcoded test outcomes, no simulated sandbox, no placeholder security status.
4. Fail closed on security uncertainty; never lock users out of exporting their own data.
5. Keep private keys, tokens, and passwords out of the repo, logs, bundles, and chat output.
6. Describe protections accurately — as deterrence and tamper-evidence with documented limits.
7. Do not build the installer after every change; use `tauri dev` + HMR daily, and package only release candidates.
8. Report honestly at every milestone, including what is untested.
9. Treat the design PNGs as the visual source of truth; follow the adaptations in 16.12 and do not copy the defects in 16.13. Mockup numbers are sample data, never hardcoded.
10. Copy Section 22 to `docs/PROGRESS.md` at the start and keep it updated. Mark `[~]` when work begins and `[x]` only after the item's verification has been run and its evidence (command output, test name, or screenshot path) is written beside it.
11. At the end of every milestone, print the checklist with counts: not started / in progress / done.

---

## 22. Master Feature Checklist (all items start NOT STARTED)

**Legend:** `[ ]` not started · `[~]` in progress · `[x]` done **and verified with evidence**
**Rule:** never tick `[x]` without recording evidence (command output, test name, or screenshot path) next to the item. Copy this section to `docs/PROGRESS.md` and keep it current.

### A. Foundation and Workflow (Milestones 1–2)
- [ ] A1 Repository inspected; actual framework, dependencies and build state reported
- [ ] A2 `docs/threat-model.md` written before any security code
- [ ] A3 Tauri 2 + React + TypeScript (strict) + Vite project runs with `npm run tauri dev`
- [ ] A4 Vite HMR works (frontend edit appears without rebuild)
- [ ] A5 Rust dev watcher recompiles and restarts on backend change
- [ ] A6 Separate dev and production configs (`tauri.dev.conf.json` vs `tauri.conf.json`)
- [ ] A7 Lint (`eslint`), typecheck (`tsc --noEmit`), `clippy -D warnings`, format commands wired
- [ ] A8 Test runners wired: Vitest, `cargo test`, E2E harness
- [ ] A9 `docs/dev-workflow.md` documents HMR vs recompile vs installer-rebuild limits
- [ ] A10 Structured logging with a redactor (no tokens, passwords, license strings, profile paths)
- [ ] A11 Separate development database (e.g. `%APPDATA%\Ap-dev\`) with automatic pre-migration snapshot; dev never touches the production DB
- [ ] A12 Single-instance guard enabled so two app instances cannot write to the same database
- [ ] A13 Debug-only features (DevTools, relaxed dev CSP, dev licence key, demo seed) compiled out of release builds, verified by inspecting the release artifact
- [ ] A14 `npm run tauri build` produces the NSIS installer under `src-tauri/target/release/bundle/nsis/`; documented as release-only, never run per UI change

### B. Design System and Shell (Milestone 3)
- [ ] B1 `design/tokens.json` sampled from the PNGs; light, dark-panel and full-dark tokens generated as CSS variables; accent colour switchable
- [ ] B2 Hybrid theme exactly as designed: light shell, dark workspace panels (SQL, PostgreSQL), full-dark Python workspace; user override Light/Dark/System
- [ ] B3 UI font (Plus Jakarta Sans, verified against the PNGs) + JetBrains Mono bundled locally
- [ ] B4 Core components: Button, IconButton, Input, Select, Combobox, DatePicker, Tag, Badge, Card, Tabs, Modal, Drawer, Toast, Tooltip, Skeleton, EmptyState, ErrorState, DataTable, ProgressRing, StatTile, SplitPane, ConfirmDialog, StatusChip
- [ ] B5 Sidebar (~225 px, collapsible to ~64 px) with the exact 12 nav items, red active pill, user card with licence-driven plan label; persisted state
- [ ] B6 Top bar: search trigger, quick-add, daily-goal ring, status chips
- [ ] B7 Resizable panes with saved sizes and focus mode
- [ ] B8 Loading, empty, error and success states on every data view
- [ ] B9 WCAG AA contrast verified for all token pairs
- [ ] B10 Minimum window 1100×700 with graceful reflow

### C. Data Layer (Milestone 3)
- [ ] C1 SQLite via `rusqlite` + SQLCipher, stored in `%APPDATA%\Ap\`
- [ ] C2 Data key wrapped by DPAPI and held in Credential Manager; key material zeroized
- [ ] C3 Versioned, forward-only, transactional migrations with pre-migration backup and rollback
- [ ] C4 Tables created: tasks, tracks, topics, subtopics, questions, code_drafts, attempts, test_results, sql_exercises, study_sessions, goals, daily_reviews, notes, reminders, notification_queue, app_settings, license_events, integrity_events, backup_manifests, schema_migrations
- [ ] C5 PKs, FKs with ON DELETE rules, CHECK constraints, indexes, UTC timestamps
- [ ] C6 Soft-delete and recovery where useful
- [ ] C7 Data persists across normal restart and forced kill
- [ ] C8 Backup (encrypted, signed manifest) and restore (validated before swap)
- [ ] C9 JSON/CSV export of all user content
- [ ] C10 `PRAGMA integrity_check` and foreign-key check after migrations and restores

### D. Learning Tracks and Problem Management
- [ ] D1 Track CRUD
- [ ] D2 Topic and subtopic CRUD with ordering
- [ ] D3 Question CRUD (statement, constraints, examples, difficulty, tags, platform, link, hints, XP)
- [ ] D4 Status per item: todo, attempted, solved, bookmarked
- [ ] D5 Filters: difficulty, topic, status, platform; saved filters
- [ ] D6 Notes and bookmarks per question
- [ ] D7 Own original sample problems shipped (no third-party statements copied)
- [ ] D8 CSV/JSON importer (titles and links only) with validation and clear error messages
- [ ] D9 Progress percentage per track computed from real records

### E. Python Practice Workspace (Milestone 5)
- [ ] E1 Monaco editor bundled locally with Python highlighting and completion
- [ ] E2 Problem panel: statement, constraints, examples, difficulty
- [ ] E3 Starter code and autosaved editable drafts
- [ ] E4 Run Code and Submit buttons
- [ ] E5 Visible and custom test cases
- [ ] E6 Results: expected vs actual diff, pass/fail counts, duration, memory
- [ ] E7 stdin/stdout support
- [ ] E8 Syntax errors, tracebacks, runtime errors, timeout, output-limit reporting
- [ ] E9 Submission history and attempt review
- [ ] E10 Hints, explanations, bookmarks, notes
- [ ] E11 Real CPython interpreter used; no simulated or hardcoded results

### F. Python Sandbox (Milestone 5)
- [ ] F1 Worker runs as a separate process, never inside the Tauri process
- [ ] F2 Job Object limits: memory, CPU time, active process = 1, kill-on-close
- [ ] F3 Restricted token / low integrity (AppContainer where available)
- [ ] F4 Network blocked (AppContainer without internet capability + optional firewall rule); socket test fails as required
- [ ] F5 Filesystem limited to private per-run directory, wiped after each run
- [ ] F6 Python flags `-I -S -B` and audit hook as defence in depth
- [ ] F7 Wall-clock timeout, output cap, source-size cap, test-case cap
- [ ] F8 Whole job terminated on timeout/overflow with correct status code
- [ ] F9 **Fail closed:** execution refused with a clear message if isolation cannot be established
- [ ] F10 Worker script and interpreter hash verified before every run
- [ ] F11 Escape test suite passes (profile read, app DB read, write outside dir, socket, DNS, cmd/powershell spawn, ctypes, fork bomb, memory bomb, infinite loop, huge stdout, junction tricks, env secrets)
- [ ] F12 Residual risk documented honestly in `docs/security.md`

### G. SQL Practice (Milestone 6)
- [ ] G1 Dedicated practice database separate from the app DB
- [ ] G2 Query editor with highlighting
- [ ] G3 Schema and table browser
- [ ] G4 Results grid (virtualized, copy/export) with execution timing and error messages
- [ ] G5 Resettable sample datasets
- [ ] G6 Exercises with instructions and expected-result validation
- [ ] G7 Query history and bookmarks
- [ ] G8 Coverage: SELECT, filtering, sorting, aggregation, JOINs, subqueries, CTEs, window functions, CASE, NULL handling, date functions, interview-style business questions
- [ ] G9 Destructive statements, `ATTACH`, `LOAD_EXTENSION`, `PRAGMA` abuse blocked; timeout and row limits enforced

### H. PostgreSQL Lab (Milestone 6)
- [ ] H1 Connection form: host, port, database, user, authentication, TLS option
- [ ] H2 Connection test and live status chip
- [ ] H3 Password stored only in Credential Manager
- [ ] H4 Schema and table browser against the real server
- [ ] H5 Exercises: JOINs, CTEs, window functions, transactions, indexes, views, `EXPLAIN` plans
- [ ] H6 Read-only by default; disposable practice schema or controlled transaction for writes
- [ ] H7 Restricted practice role and statement timeout
- [ ] H8 Active engine always labelled (PostgreSQL vs SQLite); never claims PostgreSQL when SQLite ran
- [ ] H9 Useful error messages and query history
- [ ] H10 Clear guidance when no PostgreSQL server is installed

### I. To-do Planner
- [ ] I1 Task CRUD: priority, status, due date, tags, link to topic
- [ ] I2 Complete, reopen, archive, delete with confirmation
- [ ] I3 List, board (Kanban) and calendar views consistent with each other
- [ ] I4 Quick-add parser (e.g. "Revise joins tomorrow !high #sql")
- [ ] I5 Goals CRUD with daily goal ring
- [ ] I6 Reminders CRUD with due-time notifications
- [ ] I7 Search, sort, filter on all lists

### J. Study Sessions and Idle Detection (Milestone 4)
- [ ] J1 Start, pause, resume, finish
- [ ] J2 Active vs elapsed duration
- [ ] J3 Configurable inactivity threshold (default 2 min)
- [ ] J4 Idle detection from activity signals only (no keystroke content recorded)
- [ ] J5 Idle prompt with user confirmation
- [ ] J6 Manual pause distinguished from auto-idle
- [ ] J7 No overlapping intervals or double-counted time
- [ ] J8 Crash/restart session recovery
- [ ] J9 Manual correction editor
- [ ] J10 Time breakdown by Python, SQL, PostgreSQL, topic and task

### K. Analytics and Dashboard (Milestone 4)
- [ ] K1 Daily goals and task completion
- [ ] K2 Questions attempted and solved
- [ ] K3 Accuracy by topic and difficulty
- [ ] K4 Active study duration
- [ ] K5 Python / SQL / PostgreSQL activity split
- [ ] K6 Daily, weekly, monthly trends
- [ ] K7 Streaks and consistency, activity heatmap
- [ ] K8 Weak topics and revision priorities
- [ ] K9 Planned vs completed work
- [ ] K10 Formulas documented; three metrics hand-verified against seeded data
- [ ] K11 Empty datasets show "No data yet", never fake percentages
- [ ] K12 Every chart has a data-table fallback

### L. Daily Review and Notes
- [ ] L1 Notes CRUD with sanitized Markdown rendering
- [ ] L2 Daily review: completed/unfinished tasks, attempts, passes, study time, mistakes, lessons, tomorrow's priorities
- [ ] L3 Auto-filled stats from real records
- [ ] L4 Local summary generated offline

### M. Reports and Messaging (Milestone 9)
- [ ] M1 Report preview
- [ ] M2 Configurable schedule
- [ ] M3 Delivery queue with status, retry and backoff
- [ ] M4 Telegram integration (bot token from Credential Manager only)
- [ ] M5 WhatsApp via an official/supported provider
- [ ] M6 Failures never crash the app; offline mode queues messages
- [ ] M7 UI explains that sending needs internet and valid credentials

### N. License System (Milestone 7)
- [ ] N1 Offline ECDSA P-256 signing key generated; private key kept out of repo, CI and installer
- [ ] N2 Public keyset embedded with `kid` rotation (current + next)
- [ ] N3 Token format `ApLic1.<payload>.<signature>` with canonical JSON and SHA-256 signature input
- [ ] N4 Verification in Rust only: size limit, version, kid, product, signature, dates, max_version, fingerprint, revocation
- [ ] N5 Machine fingerprint (salted SHA-256 of hardware components, ≥ 2 of 3 match)
- [ ] N6 `LicenseState` enum: Valid, ExpiredGrace, Invalid, Revoked, WrongMachine, Tampered
- [ ] N7 Feature gating enforced in Rust command handlers, not only hidden in the UI
- [ ] N8 Token stored in Credential Manager; logs record `lid` only
- [ ] N9 Signed revocation list with monotonic version
- [ ] N10 Clock-rollback defence with encrypted, MAC'd high-water mark
- [ ] N11 License issuer CLI in `tools/license-issuer/` (offline, never shipped)
- [ ] N12 Optional online activation with certificate pinning
- [ ] N13 License tests: valid, flipped bit, expired, not-yet-valid, wrong machine, wrong product, unknown kid, revoked, rollback, oversized/garbled input, parser fuzz, key rotation

### O. Integrity and Anti-Tamper (Milestone 8)
- [ ] O1 Authenticode signing of EXE, DLLs and installer with timestamp
- [ ] O2 Signed integrity manifest (SHA-256 of every shipped file) with separate release key
- [ ] O3 Runtime verification at startup, periodically and before each Python run
- [ ] O4 `WinVerifyTrust` signature check on own binary
- [ ] O5 Python interpreter allow-list and hash check
- [ ] O6 DB tamper-evidence HMAC chain on attempts, study_sessions, license_events
- [ ] O7 Chain verified on startup, backup and export
- [ ] O8 Release-only anti-debug and process mitigation policies (advisory signals, no hard crash)
- [ ] O9 DevTools, inspect menu and remote debugging disabled in release builds
- [ ] O10 Integrity score and states: Healthy, Degraded, IntegrityFailed, Compromised
- [ ] O11 IntegrityFailed blocks gated features, Python runner, messaging and imports but **always allows read-only view and full data export**
- [ ] O12 Optional capture protection toggle (off by default) with accurate limitations text
- [ ] O13 Tamper tests: modified EXE byte, worker script, migration file and asset all trigger IntegrityFailed

### P. Security Center Screen
- [ ] P1 License panel: state, edition, expiry, features, machine binding, activate/replace, export fingerprint request
- [ ] P2 Integrity panel: signature, manifest, DB chain, interpreter hash, last check, score
- [ ] P3 Sandbox panel: active primitives and "Run self-test" button
- [ ] P4 Secrets panel: names only, remove credential
- [ ] P5 Redacted, filterable events log
- [ ] P6 Privacy panel: capture toggle, telemetry (off by default), wipe local data and credentials
- [ ] P7 Every status backed by a real Rust check, no placeholders

### Q. Tauri and WebView Hardening
- [ ] Q1 Deny-by-default capabilities; no `shell`, arbitrary `fs` or frontend `http`
- [ ] Q2 Strict release CSP (no inline script, no eval, no remote scripts)
- [ ] Q3 Monaco and fonts bundled locally (no CDN)
- [ ] Q4 Every IPC command validates types, lengths, ranges and enums; typed errors only
- [ ] Q5 Isolation pattern used for IPC where compatible
- [ ] Q6 External navigation blocked; links opened only via allow-list
- [ ] Q7 Markdown sanitized with strict allow-list; XSS payload tests pass

### R. Search, Command Palette and Accessibility
- [ ] R1 Global search across tasks, problems, notes, screens
- [ ] R2 Command palette (`Ctrl+K`), keyboard-selectable, no stale results
- [ ] R3 Shortcuts: `Ctrl+Enter` run, `Ctrl+Shift+Enter` submit, `Ctrl+B` sidebar, `Ctrl+N` quick-add, `Ctrl+S` save, `Ctrl+,` settings, `?` overlay
- [ ] R4 Confirmation dialogs for destructive actions; modals trap focus and close on `Esc`
- [ ] R5 Toasts for success and error
- [ ] R6 Full keyboard navigation, visible focus ring, ARIA labels, screen-reader announcements
- [ ] R7 `prefers-reduced-motion` respected; high-contrast mode; UI zoom 90–150 %
- [ ] R8 Friendly error copy (what happened, why, what to do); no raw stack traces

### S. Settings and Backup
- [ ] S1 Appearance, editor and sandbox-limit settings
- [ ] S2 Idle threshold setting
- [ ] S3 Backup/restore UI with validation feedback
- [ ] S4 Integrations and credentials management
- [ ] S5 License and privacy settings
- [ ] S6 "Wipe local data and credentials" with confirmation

### T. Updates, Installer and Distribution (Milestone 9)
- [ ] T1 NSIS installer: branding, icon, version info, install-dir selection
- [ ] T2 Start Menu shortcut and optional desktop shortcut
- [ ] T3 Clean uninstall that asks whether to keep user data
- [ ] T4 Prerequisite checks: WebView2, Python runtime, optional PostgreSQL
- [ ] T5 Signed updater manifests, HTTPS only, anti-downgrade, separate update key
- [ ] T6 Upgrade preserves `%APPDATA%\Ap\` and runs migrations with pre-backup
- [ ] T7 Small app package kept distinct from optional Python runtime, datasets and PostgreSQL

### U. Testing, CI and Supply Chain (Milestone 10)
- [ ] U1 Frontend unit tests
- [ ] U2 Rust unit tests
- [ ] U3 Database and migration tests
- [ ] U4 Integration tests (commands, sandbox, license, integrity)
- [ ] U5 E2E tests for core flows
- [ ] U6 Security matrix executed: license, integrity, DB, sandbox, IPC, WebView, secrets, updates, backup, supply chain
- [ ] U7 `cargo audit`, `cargo deny`, `npm audit --omit=dev` clean or exceptions documented
- [ ] U8 Secret scanning (gitleaks) in pre-commit and CI
- [ ] U9 SBOM (CycloneDX) generated per release
- [ ] U10 Secrets grep over binaries, logs, config and DB finds nothing

### V. Documentation
- [ ] V1 `docs/setup.md`
- [ ] V2 `docs/architecture.md`
- [ ] V3 `docs/threat-model.md`
- [ ] V4 `docs/security.md` (including limits of client-side protection)
- [ ] V5 `docs/dev-workflow.md`
- [ ] V6 `docs/release.md`
- [ ] V7 `docs/security-report.md` with real test results
- [ ] V8 Release notes and known limitations

### W. UI Design Parity (source: `design/reference/`)
- [ ] W1 Design files placed in `design/reference/` with exact names; tokens sampled into `design/tokens.json`
- [ ] W2 Global shell matches all screens: sidebar, user card, top bar (streak/hours/bell), frameless title bar with working window controls, bottom status bar showing real engine state
- [ ] W3 Login / Welcome matches `Red_Mountain_Login_UI.png` with local-profile behaviour; provider buttons only when the optional online module is enabled
- [ ] W4 Dashboard matches `Red-Accented_Coding_Productivity_Dashboard.png` (top)
- [ ] W5 Coding Problems matches `Coding_Problems_Practice_Dashboard.png`
- [ ] W6 Python workspace (full dark) matches `Red-Accented_Coding_Productivity_Dashboard.png` (bottom) with local stats instead of global stats
- [ ] W7 Learning Tracks matches `Modern_Learning_Tracks_Dashboard.png` (card menu no longer overlaps)
- [ ] W8 SQL Practice matches `SQL_Practice_Dashboard_Workspace.png`
- [ ] W9 PostgreSQL Lab matches `Dark_PostgreSQL_SQL_Lab_Dashboard.png`; badge and transaction mode are truthful
- [ ] W10 To-do Planner matches `Modern_To-Do_Planner_Dashboard.png` (list, Kanban, calendar views)
- [ ] W11 Study Sessions matches `Modern_Study_Sessions_Dashboard.png`; privacy checklist statements are literally true
- [ ] W12 Progress & Analytics matches `Progress___Analytics_Dashboard.png` with consistent formulas
- [ ] W13 Daily Review matches `Daily_Review_Dashboard_Interface.png`
- [ ] W14 Reports & Notifications matches `Reports_and_Notifications_Dashboard.png`
- [ ] W15 Settings & Backup matches `Ap_Settings___Backup_Dashboard.png`, all 10 sub-sections; Security Center lives under Privacy & Security
- [ ] W16 Component library from `Ap_Popup___Modal_Design_System.png`: modals A–E, command palette F, toasts G, dropdown/date picker H, tooltip/context menus I, button/input/toggle state sheets
- [ ] W17 App icon from `Glossy_Red_Ap_Monogram_Icon.png` generated for window, taskbar, installer, `.ico`
- [ ] W18 Hero images (`Contemplative_Hiker_at_Alpine_Sunrise.png`, `Crimson_Mountain_Sunset_with_Lone_Hiker.png`) optimised and bundled locally; used for login, welcome, empty states
- [ ] W19 Accent colour, Light/Dark/System theme, density, font-size and reduced-motion settings apply live across every screen
- [ ] W20 Dev-only demo seed reproduces the mockup sample data and is excluded from production builds
- [ ] W21 Visual-diff harness captures every screen at 1586×992 and records results in `docs/ui-parity.md`
- [ ] W22 Responsive behaviour verified from 1586 px down to 1100×700; no clipped content
- [ ] W23 No value in the UI is hardcoded from the mockups; empty states verified on a fresh database
- [ ] W24 Known mockup defects (16.13) confirmed not reproduced

### X. Release Gate (all must be true)
- [ ] X1 Every item above is `[x]` with recorded evidence, or has a documented, accepted exception
- [ ] X2 Clean Windows VM: install, first launch, upgrade (data preserved), uninstall tested
- [ ] X3 Core workflows verified fully offline
- [ ] X4 No private keys, tokens or passwords in the repo, installer, bundles or logs
- [ ] X5 Residual risks written down honestly
- [ ] X6 Production installer built and Authenticode-signed
- [ ] X7 **Release decision:** ☐ Approved ☐ Blocked  Date: ________  By: ________

### Progress Summary (agent updates at each milestone)

| Group | Total | Not started | In progress | Done |
|---|---|---|---|---|
| A Foundation | 14 | 14 | 0 | 0 |
| B Design/Shell | 10 | 10 | 0 | 0 |
| C Data | 10 | 10 | 0 | 0 |
| D Tracks | 9 | 9 | 0 | 0 |
| E Python workspace | 11 | 11 | 0 | 0 |
| F Sandbox | 12 | 12 | 0 | 0 |
| G SQL | 9 | 9 | 0 | 0 |
| H PostgreSQL | 10 | 10 | 0 | 0 |
| I Planner | 7 | 7 | 0 | 0 |
| J Sessions/Idle | 10 | 10 | 0 | 0 |
| K Analytics | 12 | 12 | 0 | 0 |
| L Review/Notes | 4 | 4 | 0 | 0 |
| M Reports/Messaging | 7 | 7 | 0 | 0 |
| N License | 13 | 13 | 0 | 0 |
| O Integrity | 13 | 13 | 0 | 0 |
| P Security Center | 7 | 7 | 0 | 0 |
| Q Hardening | 7 | 7 | 0 | 0 |
| R Search/A11y | 8 | 8 | 0 | 0 |
| S Settings | 6 | 6 | 0 | 0 |
| T Installer/Updates | 7 | 7 | 0 | 0 |
| U Testing/CI | 10 | 10 | 0 | 0 |
| V Docs | 8 | 8 | 0 | 0 |
| W UI Design Parity | 24 | 24 | 0 | 0 |
| X Release gate | 7 | 7 | 0 | 0 |
| **Total** | **235** | **235** | **0** | **0** |
