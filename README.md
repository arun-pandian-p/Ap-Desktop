<div align="center">

# Ap Desktop

### Interview Preparation, Coding Practice & Career Learning Platform

A high-performance, offline-first Windows desktop platform combining **Electron**, **React 18**, **TypeScript**, and **Java 21 Spring Boot 3.4**.

[![Version](https://img.shields.io/badge/version-1.3.0-red.svg)](package.json)
[![Platform](https://img.shields.io/badge/platform-Windows%20x64-blue.svg)](https://microsoft.com)
[![Vitest](https://img.shields.io/badge/vitest-174%20passed-success.svg)](tests/)
[![Spring Boot](https://img.shields.io/badge/spring--boot-18%20passed-success.svg)](backend/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

</div>

---

## 🌟 Key Highlights

- **1,337+ Curated Problems:** Master LeetCode, Grind 75, Blind 75, NeetCode 150, and SQL curriculum tracks offline.
- **Multi-Language Practice:** Native code execution for **Python 3**, **Java 21 LTS**, and **C++** with automated test runners and draft auto-saving.
- **Java Spring Boot Microservice:** Embedded loopback-only backend (`127.0.0.1:<dynamic_port>`) with dynamic port discovery, 256-bit ephemeral token authentication, canonical streak engine, and RFC 6455 WebSocket broker.
- **Dual SQL Workspaces:** In-memory SQLite WASM studio plus direct connection pooling to genuine PostgreSQL 16 servers.
- **Encrypted Vault:** PBKDF2 (100k rounds) key derivation and AES-256-GCM authenticated encryption for automation credentials and versioned `.apbackup` archives.

---

## 📂 Project Organization

```
windows-app-template/
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                 # Automated lint, typecheck & multi-suite test
│   │   └── release.yml            # Build, sign & publish GitHub releases
│   ├── ISSUE_TEMPLATE/            # Bug report and feature request templates
│   └── pull_request_template.md   # Standardized PR checklist
│
├── apps/
│   ├── desktop/                   # Electron desktop application
│   │   ├── main/                  # Main process entry point
│   │   ├── preload/               # Secure context-isolated IPC bridge
│   │   ├── renderer/              # React 18 TypeScript UI entry
│   │   └── resources/             # Application icons & branding assets
│   │
│   └── web/                       # Progressive Web App companion
│       ├── public/                # PWA manifest and web HTML
│       └── src/                   # Web-specific entry components
│
├── backend/                       # Java 21 Spring Boot 3.3.5 Sidecar
│   ├── src/main/java/             # Controllers, Services, Security Filters
│   ├── src/main/resources/        # application.properties configuration
│   └── src/test/java/             # Full JUnit 5 integration test suite
│
├── packages/
│   ├── shared-types/              # Cross-layer TypeScript models & interfaces
│   ├── ui/                        # Reusable Tailwind UI components
│   └── validation/                # Shared schema and input validation rules
│
├── database/
│   ├── migrations/                # Versioned SQL migrations (001, 002)
│   ├── seeds/                     # Master 1,337 problem catalog & exercises
│   └── schema.sql                 # Canonical SQLite database schema
│
├── assets/
│   ├── branding/                  # High-resolution logos & monograms
│   ├── icons/                     # Multi-size Windows ICO & PNG icons
│   └── screenshots/               # Application UI screen captures
│
├── installer/
│   ├── windows/
│   │   └── installer.iss          # Inno Setup 6 packaging script
│   └── licenses/                  # Bundled MIT license agreement
│
├── scripts/
│   ├── clean.mjs                  # Cross-platform workspace cleanup
│   ├── build.mjs                  # Humanized multi-layer build runner
│   └── release.mjs                # Electron & NSIS release packager
│
├── tests/
│   ├── unit/                      # Pure unit test suites
│   ├── integration/               # Backend sidecar, IPC & DB tests
│   └── e2e/                       # Packaging & smoke tests
│
├── docs/
│   ├── ARCHITECTURE.md            # System topology & design documentation
│   ├── BUILD.md                   # Developer build & test guide
│   ├── INSTALLATION.md            # End-user setup guide for Windows
│   ├── SECURITY.md                # Threat model, IPC policies & crypto vault
│   └── USER_GUIDE.md              # Feature tour & workflow instructions
│
├── build/                         # Build resources (icons, manifests)
├── out/                           # Packaged installers & SHA256 checksums
├── .env.example                   # Environment configuration template
├── .gitignore                     # Git ignore rules
├── .npmrc                         # Strict package manager configuration
├── package.json                   # Simplified human commands
├── package-lock.json              # Deterministic lockfile
├── tsconfig.json                  # Strict TypeScript configuration
├── README.md                      # Project documentation
├── CONTRIBUTING.md                # Contributor guide & PR process
└── LICENSE                        # MIT License
```

---

## ⚡ Humanized Commands

All build and operational commands in `package.json` are simple, concise, and human-readable:

| Command | Action |
|---|---|
| `npm run dev` | Launch Vite web development server |
| `npm run dev:desktop` | Launch Electron desktop app with live Spring Boot backend |
| `npm run build` | Compile TypeScript and build full production bundle |
| `npm run build:frontend` | Compile frontend bundle only |
| `npm run build:backend` | Package Spring Boot fat JAR (`backend/target/`) |
| `npm run clean` | Clean up `dist/`, `out/`, `backend/target/`, and temp caches |
| `npm test` | Run all Vitest suites (174 tests) |
| `npm run test:backend` | Run Java Spring Boot JUnit 5 test suites (18 tests) |
| `npm run typecheck` | Run strict TypeScript compiler verification |
| `npm run release` | Package Windows NSIS installer into `out/` with SHA-256 |

---

## 📖 Documentation

- 📐 [Architecture Deep Dive](docs/ARCHITECTURE.md)
- 🛠️ [Build & Development Guide](docs/BUILD.md)
- 💾 [Installation Guide](docs/INSTALLATION.md)
- 🔒 [Security & Threat Model](docs/SECURITY.md)
- 🚀 [User Guide & Feature Tour](docs/USER_GUIDE.md)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
