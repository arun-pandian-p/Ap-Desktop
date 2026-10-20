## Description
<!-- Provide a clear, humanized summary of the changes introduced in this PR. -->

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change fixing an issue)
- [ ] ✨ New feature (non-breaking change adding functionality)
- [ ] ♻️ Refactoring or cleanup (no functional changes)
- [ ] ⚡ Performance optimization
- [ ] 📝 Documentation update
- [ ] 🔒 Security or cryptography improvement

## Subsystem Impact
- [ ] `apps/desktop` (Electron main, preload, renderer)
- [ ] `apps/web` (Web client / PWA)
- [ ] `backend` (Java Spring Boot services / APIs)
- [ ] `packages` (`shared-types`, `ui`, `validation`)
- [ ] `database` (SQLite schema, migrations, seeds)
- [ ] `installer` (Inno Setup / NSIS packaging)
- [ ] `scripts` (build, clean, release automation)

## Testing Checklist
- [ ] Unit & integration tests pass (`npm test`)
- [ ] Spring Boot backend tests pass (`cd backend && ./mvnw test`)
- [ ] TypeScript compilation passes with zero errors (`npm run typecheck`)
- [ ] Production build succeeds (`npm run build`)
- [ ] Manual smoke testing in Electron desktop shell verified

## Screenshots / Evidence (if applicable)
<!-- Attach screenshots or logs demonstrating verified behavior -->

## Security & Privacy Considerations
- [ ] No plaintext secrets or API tokens committed
- [ ] Ephemeral `X-Ap-Internal-Token` and loopback bindings preserved
- [ ] Database credentials and backups encrypted with AES-256-GCM
