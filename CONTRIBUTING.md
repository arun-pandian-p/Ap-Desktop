# Contributing to Ap Desktop

Thank you for your interest in contributing to **Ap Desktop**! We welcome contributions to our desktop shell, frontend workspace, Java Spring Boot backend, and documentation.

---

## 1. Code of Conduct

Please be respectful, collaborative, and constructive in all discussions, pull requests, and issue reports.

---

## 2. Development Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/arun-pandian-p/Ap-Desktop.git
   cd Ap-Desktop
   ```
2. Install dependencies:
   ```bash
   npm ci
   ```
3. Verify your environment:
   ```bash
   npm test
   npm run test:backend
   ```

---

## 3. Simplified Commands

We maintain simple, human-friendly commands in `package.json`:

- `npm run dev` — Launch Vite web dev server
- `npm run dev:desktop` — Launch Electron desktop application with Spring Boot sidecar
- `npm run build` — Run full TypeScript and Spring Boot backend build
- `npm run clean` — Clean up build outputs and temporary caches
- `npm test` — Run all frontend & desktop test suites (Vitest)
- `npm run test:backend` — Run Spring Boot backend test suites (Maven)
- `npm run typecheck` — Perform strict TypeScript validation

---

## 4. Pull Request Workflow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Implement your changes following established patterns.
3. Ensure all tests and type checks pass:
   ```bash
   npm run typecheck
   npm test
   npm run test:backend
   ```
4. Commit your changes using conventional commit messages (`feat: ...`, `fix: ...`, `docs: ...`, `refactor: ...`).
5. Push to your fork and submit a Pull Request against `main`.
6. Fill out the [Pull Request Template](.github/pull_request_template.md) completely.

---

## 5. Security & Sensitive Data

- **Never** commit plaintext passwords, API keys, Telegram Bot Tokens, or Twilio SIDs.
- Use `.env.example` as a template for local environment variables.
