# Ap Desktop — Security Architecture & Threat Model

Ap Desktop handles user code execution, local database storage, and external automation notifications. This document defines the security guarantees and countermeasures implemented across all layers.

---

## 1. Electron Isolation & IPC Guardrails

- **Context Isolation:** Enabled (`contextIsolation: true`). The React UI has zero access to Node.js `require` or native operating system APIs.
- **Node Integration Disabled:** Enabled (`nodeIntegration: false`). Malicious web content cannot execute Node system calls.
- **Strict Preload Whitelist:** All desktop functionality is mediated through explicit, validated channels exposed via `window.electronAPI`.
- **Navigation Lock:** External URLs are prevented from navigating inside the application window and are opened exclusively in the user's default OS browser via `shell.openExternal`.

---

## 2. Spring Boot Sidecar Defense-in-Depth

- **Loopback Binding Only:** The Spring Boot backend binds strictly to `127.0.0.1`. It refuses to bind to `0.0.0.0` or public network adapters.
- **Dynamic Port Allocation:** Rather than using a predictable port (like 8080), the backend listens on an ephemeral, OS-assigned dynamic loopback port (`server.port=0`).
- **Ephemeral Authentication Token (`X-Ap-Internal-Token`):**
  - Upon startup, the Electron main process generates a secure, cryptographically random 256-bit token.
  - The token is passed to the Spring Boot process via environment variable `AP_INTERNAL_TOKEN`.
  - Every incoming HTTP REST request and WebSocket handshake must supply the matching `X-Ap-Internal-Token` header.
  - Requests with missing or invalid tokens are immediately rejected with `401 Unauthorized`.

---

## 3. Cryptography & Vault Security

- **Key Derivation (PBKDF2):**
  - Passwords and master vault keys use PBKDF2 with HMAC-SHA256 and **100,000 iterations**.
  - A unique, cryptographically random 16-byte salt is generated per user.
- **Symmetric Encryption (AES-256-GCM):**
  - Third-party automation credentials (Telegram Bot Tokens, Twilio Account SIDs, Google OAuth tokens, n8n webhooks) are encrypted using AES-256 in Galois/Counter Mode (GCM).
  - Each encryption operation uses a fresh 12-byte initialization vector (IV) and a 128-bit authentication tag to ensure data integrity and confidentiality.
- **No Plaintext Leakage:**
  - Status endpoints return masked configuration states (e.g. `configured: true`, `target: "****1234"`). Plaintext keys are never transmitted back to the UI.

---

## 4. Code Execution Sandboxing

- **Isolated Subprocesses:** Code runners (Python, Java, C++) are spawned as child processes with strict memory and execution timeouts (default: 5000ms).
- **Python Audit Hooks:** A customized Python audit hook intercepts and blocks dangerous system calls (such as socket connections, process spawning, and unapproved file deletion).
- **Transient Workspaces:** Temporary source files are created inside isolated sandbox directories and purged immediately upon process termination.

---

## 5. Backup & Restoration Integrity

- **Versioned Manifests:** Every `.apbackup` archive includes a signed manifest with application version, timestamp, and SHA-256 hash.
- **Safety Pre-Restore Snapshots:** Before any database restore operation overwrites existing tables, an automated safety snapshot is written to `%APPDATA%\Ap\backups\pre_restore_safety.sqlite`.
