# Ap Desktop Application — Threat Model

**Version:** 1.0.0  
**Status:** Canonical Security Reference  
**Scope:** Client-side Windows Desktop Application (Windows 10/11 x64)

---

## 1. System Overview & Core Philosophy

**Ap** is an offline-first Windows desktop platform for interview preparation, algorithmic practice, SQL/PostgreSQL labs, and productivity tracking.

### The Honesty Rule
Client-side protection on a user-controlled PC provides **deterrence, tamper-evidence, and defense-in-depth**, not absolute prevention. A determined attacker with administrative access, custom kernel drivers, or an interactive debugger can ultimately inspect and alter memory. 

The primary security objectives are:
1. Prevent casual, automated, or scripted tampering.
2. Ensure tamper-evidence: detectable alterations invalidate trust and switch the client to a fail-closed, read-only safe mode.
3. Guarantee that user-created notes and exports are never deleted or held hostage.
4. Keep the authoritative licensing authority offline and cryptographic.

---

## 2. Protected Assets

| Asset ID | Asset Name | Description | Sensitivity |
|---|---|---|---|
| **A1** | **User Study Data** | Tasks, problem attempts, session logs, notes, daily reviews. | Confidentiality & Integrity |
| **A2** | **Stored Credentials** | Telegram Bot Token, Twilio Account Secret, Google Service Keys. | Critical Confidentiality |
| **A3** | **License Entitlements** | ECDSA P-256 signed license tokens and feature grants. | Integrity & Non-Repudiation |
| **A4** | **Host Machine Integrity** | Operating system files, host network, user profile directories. | Critical System Safety |
| **A5** | **Application Binary & Assets** | Rust binaries, worker scripts, migrations, frontend bundles. | Integrity |

---

## 3. Threat Matrix (T1 – T10)

| # | Threat Scenario | Attack Vector | Impact | Primary Mitigations & Controls |
|---|---|---|---|---|
| **T1** | **Python Worker Code Escape** | Malicious or buggy user-submitted code in the Python workspace attempting to access host filesystem, execute system shells, or initiate network connections. | High (Host Compromise) | Windows Job Object process restrictions (CPU/RAM/Active Processes=1), Restricted Low-Integrity token, isolated scratch directory wiped post-run, `-I -S -B` CPython flags, and `sys.addaudithook` audit hooks. |
| **T2** | **Forged or Shared License** | Unauthorized generation of pro license keys, token sharing across multiple devices, or payload tampering. | High (Piracy) | ECDSA P-256 with SHA-256 (ES256) signature verification. Offline private key never ships. Token payload binds to salted SHA-256 hardware machine fingerprint. |
| **T3** | **Binary or Asset Patching** | Patching executable bytes, replacing Python worker scripts, or altering frontend JS bundles. | High (Integrity Breach) | Runtime integrity verification against release manifest (`manifest.json` signed with separate release key), Authenticode verification via `WinVerifyTrust`. |
| **T4** | **Database Tampering or Swapping** | Direct SQLite editing of attempt history, streak counters, or license logs. | High (Reputation / Tampering) | Encrypted storage via SQLCipher with DPAPI-wrapped keys, plus row-level HMAC-SHA256 tamper-evidence hash chain on sensitive audit tables. |
| **T5** | **Credential Theft** | Reading plaintext API tokens from logs, crash reports, disk files, or frontend bundles. | High (Privilege Abuse) | Credential storage via Windows Credential Manager / DPAPI. Centralized log redactor that masks tokens, passwords, and user profile paths. |
| **T6** | **Malicious Update / MITM** | Intercepting auto-update manifests to deliver malicious binaries. | Critical (Code Execution) | Tauri updater with minisign / ES256 signed manifests, forced HTTPS, strict anti-downgrade monotonic versioning. |
| **T7** | **IPC Abuse & WebView Exploitation** | Cross-Site Scripting (XSS) triggering unauthorized backend commands via the Tauri IPC bridge. | High (Elevation of Privilege) | Deny-by-default capabilities, strict Content Security Policy (`default-src 'self'`), typed parameter validation on every IPC command, strict markdown sanitization. |
| **T8** | **Supply Chain Compromise** | Malicious dependency pulled via npm or cargo crates. | High (Supply Chain) | Pinned dependency lockfiles, automated vulnerability audits (`npm audit`, `cargo audit`, `cargo deny`), software bill of materials (SBOM). |
| **T9** | **Clock Rollback Attacks** | Rolling back system clock to extend expired trials or valid windows. | Medium (Bypass Expiry) | Monotonic high-water mark timestamp persisted with HMAC encryption; session tick counting via `GetTickCount64`. |
| **T10** | **Window & Content Scraping** | Third-party background tools capturing proprietary practice content. | Low (Leakage) | User-configurable `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` protection for desktop windows. |

---

## 4. Fail-Closed Security Policy

When any hard security violation is detected (tampered files, invalid signature, broken HMAC database chain, or inability to establish sandbox isolation):
1. **Never Panic or Crash:** The application displays an informative integrity alert informing the user of the condition.
2. **Block Sensitive Operations:** Code execution, messaging dispatch, and license-gated features are immediately disabled.
3. **Preserve User Data:** The application continues to provide full read-only access and allows the user to export their existing data to standard JSON or CSV.
4. **No Hostile Retaliation:** The application never deletes local files or performs unconsented network telemetry.
