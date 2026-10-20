# MASTER PROMPT — Ap Desktop: Current-State Audit, Spring Boot Migration, Windows Security & Production Release

## 1. Your role

Act as a senior Windows desktop application architect, Java Spring Boot engineer, Electron security engineer, build/release engineer, and QA specialist.

You are working on my existing repository:

**Product:** Ap Desktop  
**Publisher:** Ap Software Technologies  
**Developer:** Arun Pandian  
**Target:** Windows 10/11 x64  
**Release version:** 1.0.0, unless the repository establishes a different version.

Your responsibility is to inspect the real codebase, establish the current implementation status, migrate the backend to Java + Spring Boot, preserve working features, repair the Windows installer pipeline, and prepare a verifiable production release.

Do not merely generate documentation, mock implementations, sample code, or a generic plan. Work with the existing repository and produce evidence-based changes.

## 2. Existing product identity and features

Ap Desktop is an offline-first developer practice and interview preparation application.

The existing documented technology stack includes:

- React 18 and TypeScript
- Electron desktop runtime
- Monaco Editor
- Tailwind CSS, Lucide Icons and Recharts
- SQLite WASM through sql.js
- Python practice and code evaluation worker
- PostgreSQL lab and database bridge
- Local study progress, drafts, streaks and history
- Focus timer and bundled offline study audio
- Activity heatmap and achievements
- Optional notifications and webhooks
- Inno Setup 6 Windows installer

The repository documentation describes a Python execution worker, PostgreSQL integration through a Python bridge, 1,330+ coding problems, and a 54-test suite. Treat these as documented claims that must be verified against the current code and tests. Do not assume they are all currently working.

### Mandatory preservation requirements

Do not remove or regress:

1. React and TypeScript user interface.
2. Monaco Editor, language features and editor shortcuts.
3. Python practice, problem evaluation and output normalization.
4. Offline SQLite WASM practice and seeded schemas.
5. Local drafts, study history, streaks, settings and achievements.
6. PostgreSQL database exploration, query execution and supported table editing.
7. Dataset import/export.
8. Focus timers, audio playback and study mode.
9. Notifications and offline webhook queue.
10. Existing user data and upgrade compatibility.

Do not replace real functionality with mock responses, placeholder buttons, static success messages or fake readiness indicators.

## 3. Phase 1 — Audit the current repository

Before changing code, inspect:

- `package.json`
- `electron-builder.json`
- `electron/main.cjs`
- `electron/preload.cjs`
- `src/`
- `workers/`
- `tests/`
- `scripts/`
- `installer/ap_installer.iss`
- `PRODUCT_DOCUMENTATION.md`
- `README.md`
- Existing environment configuration and database schemas
- Existing build outputs and installer scripts
- All current Python execution and PostgreSQL bridge integrations

Inspect the actual source files. Do not rely solely on README descriptions.

Produce `docs/CURRENT_STATUS_AUDIT.md` containing:

1. Features verified as implemented.
2. Features implemented but failing.
3. Features partially implemented.
4. Features that are only documented or mocked.
5. Existing frontend/backend boundaries.
6. Existing security weaknesses.
7. Dependency and runtime requirements.
8. Test results and reproducible failures.
9. Build and installer failures with their root causes.
10. A prioritized repair plan.

Use evidence from filenames, functions, tests, build output and reproducible execution. Label unverified items clearly.

Run available checks such as:

- Dependency installation validation
- TypeScript type checking
- Frontend production build
- Existing unit and integration tests
- Electron packaging
- Python worker tests
- PostgreSQL bridge tests where the environment permits
- Inno Setup compilation on a Windows environment

Do not claim a test passed unless it was actually run and its result was inspected.

## 4. Phase 2 — Migrate backend responsibilities to Java Spring Boot

The chosen backend architecture is Java + Spring Boot.

### Runtime policy

**Require a compatible Java runtime installed on the user's Windows computer. Do not bundle a JRE or JDK in this release.**

Choose a supported Java LTS version compatible with the selected Spring Boot version. Determine the exact version from the actual backend build configuration and document it as a single source of truth.

The installer must verify the runtime, and Electron must independently verify it again at application startup.

Do not silently download or install Java.

### Backend implementation

Create or update the `backend/` project using Maven or the repository's established Java build system.

Include:

- Versioned executable Spring Boot JAR.
- REST API controllers.
- Service and repository layers.
- DTOs and request validation.
- Consistent error responses.
- Structured, sanitized logging.
- Health and readiness endpoints.
- Database configuration.
- Database migration support where required.
- Unit and integration tests.
- A documented API contract.

Keep business logic out of controllers where practical.

Do not create an API merely to wrap existing frontend functions that should remain local.

### Responsibilities

Use Spring Boot for backend responsibilities that genuinely benefit from it, such as:

- Application business rules.
- Validated data operations.
- Persistent database services.
- Future authenticated application integrations.
- Structured service health and diagnostics.

Preserve local frontend functionality for:

- SQLite WASM query execution.
- Monaco Editor interactions.
- Local drafts and user interface state.
- Offline focus audio and timers.
- Independent offline practice features.

Do not make all features depend on Spring Boot or PostgreSQL being available.

### Python compatibility

The Java migration must not automatically delete or rewrite the existing Python worker.

Inspect which responsibilities currently use Python.

Keep Python for code execution and PostgreSQL integration wherever those workers remain the appropriate existing implementation. Migrate responsibilities deliberately, not merely because the primary backend language is changing.

If any responsibility is migrated away from Python, document the replacement and prove feature parity with tests.

### PostgreSQL compatibility

Retain support for the existing PostgreSQL lab.

Determine whether Spring Boot should own database operations or whether the existing Python bridge should remain responsible for specific features. Establish one clear ownership model for each operation.

Use parameterized database access, least-privilege credentials and validated inputs. Do not embed database passwords in source code, frontend assets or installer scripts.

## 5. Phase 3 — Secure Electron and local API communication

Inspect and repair `electron/main.cjs` and `electron/preload.cjs`.

Required controls:

- `contextIsolation: true`
- `nodeIntegration: false`
- Enable renderer sandboxing where compatible.
- Expose only the minimum required IPC API.
- Validate IPC arguments and sender context.
- Restrict navigation and untrusted windows.
- Apply an appropriate Content Security Policy.
- Prevent renderer input from becoming arbitrary shell commands.
- Protect secrets from renderer JavaScript and application logs.
- Handle application startup and shutdown reliably.

### Spring Boot local service

If the backend runs locally:

1. Bind it to `127.0.0.1`, not `0.0.0.0`.
2. Select an available local port safely.
3. Avoid assuming port 8080 is always free.
4. Use a protected startup handshake to establish local API authentication.
5. Do not place authentication secrets in command-line arguments or logs.
6. Do not expose sensitive endpoints without authentication.
7. Validate request origins where appropriate.
8. Do not treat CORS or loopback binding as sufficient authentication.
9. Wait for the actual readiness endpoint before enabling backend-dependent UI.
10. Handle startup timeouts, Java incompatibility, port conflicts and unexpected process termination.
11. Stop only the backend process owned by the current Ap instance.
12. Never terminate unrelated Java processes.
13. Prevent duplicate backend instances where possible.
14. Keep useful, sanitized diagnostic logs.

Do not start the backend through an independent installer launch entry if Electron is responsible for managing its lifecycle.

If a different architecture is justified by the current code, document the trade-off before implementing it.

## 6. Phase 4 — Java runtime discovery

Create a reusable Java discovery and validation mechanism shared conceptually by the installer and Electron startup code.

The validation must:

- Find a candidate Java executable using documented discovery rules.
- Check an explicit configured runtime location where supported.
- Check `JAVA_HOME` and `PATH` without blindly trusting either.
- Execute the candidate and capture its actual version.
- Validate the Java feature version against the backend's required minimum.
- Reject unsupported runtimes with a clear error.
- Handle paths containing spaces.
- Avoid unsafe shell interpolation.
- Avoid blocking the UI while Java is being checked.
- Show the detected executable path and version in diagnostics.

Do not use string comparisons that incorrectly classify Java versions. Parse the actual runtime version into a feature-version value and compare it with the required version.

### Missing Java behavior

If Java is missing or incompatible:

- Display a clear explanation.
- Show the required Java version.
- Provide a link to a trusted official Java distribution page.
- Offer a retry action after the user installs Java.
- Preserve user progress and local settings.
- Keep independent offline features available if the application architecture permits.
- Do not display a false success status.

The installer may allow installation to proceed with a warning if offline functionality can work independently. If Java is essential to the first-run experience, provide an actionable installation block instead.

Document and implement one consistent policy.

## 7. Phase 5 — Fix the Inno Setup installer

Create a production-oriented `installer/ap_installer.iss` based on the real Electron output and backend build artifacts.

Do not assume file locations. Discover the actual paths and fail the preflight check if required files are missing.

### Installer requirements

- Stable `AppId` across upgrades.
- Correct product name, publisher, version and support metadata.
- Per-user installation under LocalAppData.
- No unnecessary administrator elevation.
- Correct Windows x64 packaging.
- Complete packaged Electron application.
- Correct application icon and wizard artwork.
- Correct Start Menu and optional desktop shortcuts.
- Correct uninstall registration.
- Reliable upgrade behavior.
- Safe user-data preservation.
- No duplicate or competing installation systems.
- Clear Java runtime validation.
- No silent Java downloads or installations.
- No fake Python, SQLite, PostgreSQL or curriculum verification.
- No assumptions that PostgreSQL is installed or running.
- No unconditional launch if installation has failed.

Package the versioned Spring Boot JAR inside the actual Electron distribution or another controlled application directory. Ensure the Java backend can locate it after installation.

Do not copy the entire development repository into the installer.

### User-data policy

Keep mutable user data outside the application installation directory.

Preserve:

- Progress databases.
- Code drafts.
- Settings.
- Streaks and achievements.
- Study history.
- User-configured connection details, subject to secure storage.

Test migrations and backups before replacing an existing database.

On uninstall, retain user data by default and explain that policy to the user. Do not delete the user's entire LocalAppData directory.

### Compiler and packaging validation

The preflight script must validate:

- Required source directories.
- Electron executable and packaged resources.
- Backend JAR.
- Python worker and required dependencies.
- SQLite WASM and seeded practice assets.
- Icons and wizard artwork.
- Output directories and permissions.
- Version consistency across frontend, backend, Electron and installer.
- Required build tools.

Fail early with an actionable message when a required artifact is absent.

## 8. Phase 6 — Windows security and signing

Investigate the existing reports that the installer sometimes fails to open and Windows Security blocks the installer or application.

Do not assume these are one problem.

Distinguish:

- Inno Setup compilation errors.
- Missing or corrupt application files.
- Electron launch failures.
- Invalid executable signatures.
- Microsoft Defender detections.
- SmartScreen reputation warnings.
- Smart App Control restrictions.
- Permission and application-control policies.

### Signing policy

- Use a legitimate, trusted Authenticode code-signing certificate.
- Use SHA-256 file digests.
- Apply RFC 3161 timestamping.
- Sign applicable application executables and DLLs.
- Sign the final installer after packaging.
- Verify signatures and timestamp validity.
- Generate SHA-256 release hashes.
- Record the publisher and signing status in release documentation.

Keep signing credentials out of source control, frontend assets and installer scripts. Use secure certificate storage or a trusted signing service.

Do not hardcode certificate passwords.

Do not claim that the application is signed until signature verification succeeds.

### Windows Security policy

Never:

- Disable Microsoft Defender to make the build pass.
- Disable Smart App Control as a product release workaround.
- Suppress or ignore a genuine malware detection.
- Use `Unblock-File` or delete `Zone.Identifier` streams as a substitute for establishing trust.
- Claim that code signing guarantees no SmartScreen warnings.

When a security detection occurs, record the exact detection name, file path, artifact hash and Windows Protection History result. Investigate and resolve the issue before distribution.

## 9. Phase 7 — Automated build and release scripts

Create or repair these scripts where appropriate:

### `scripts/preflight.ps1`

- Check prerequisites.
- Check Java and its version policy.
- Verify repository files and required build tools.
- Validate output paths.
- Reject missing required resources.
- Print a concise diagnostic report.
- Exit with a nonzero code on failure.

### `scripts/build-installer.ps1`

- Run or validate frontend build.
- Build the Spring Boot backend.
- Run required tests.
- Package Electron.
- Verify required artifacts.
- Compile Inno Setup.
- Report output paths and file hashes.
- Fail if any stage fails.

Do not claim signing succeeded if no signing certificate is available.

### `scripts/verify-release.ps1`

- Verify the generated installer exists and is nonempty.
- Verify required packaged files.
- Verify the backend JAR and application version.
- Verify executable signatures where required.
- Generate SHA-256 hashes.
- Produce a release verification report.
- Report any skipped checks explicitly.

Use safe PowerShell invocation, explicit exit-code checks and useful error messages.

Do not use `ExecutionPolicy Bypass` as a security feature or treat it as a release requirement. Document the supported script execution method for the development environment.

## 10. Phase 8 — Testing and release acceptance

Preserve existing tests and add tests for the migration.

### Backend tests

- API request validation.
- Correct error responses.
- Java version compatibility.
- Database failure handling.
- Authentication and authorization.
- SQL injection prevention.
- Startup and shutdown behavior.
- Port conflicts and readiness checks.

### Electron tests

- Safe IPC.
- Renderer restrictions.
- Java discovery.
- Backend startup and timeout.
- Backend crash and restart behavior.
- Local API authentication.
- Clean application shutdown.

### Feature regression tests

- Python judge and output normalization.
- SQLite WASM query execution.
- Monaco editor behavior.
- Draft persistence.
- Study streak and heatmap calculations.
- PostgreSQL connection and query execution.
- Dataset import/export.
- Offline music and focus timer.
- Notifications and offline webhook queue.

### Windows installation tests

Test on a clean Windows 10/11 x64 environment with:

1. Compatible Java already installed.
2. Java missing.
3. Java below the required version.
4. Java installed in a path containing spaces.
5. Multiple Java installations.
6. Port conflict.
7. PostgreSQL unavailable.
8. No internet connection.
9. Fresh installation.
10. Upgrade over an existing installation.
11. Uninstall and subsequent reinstall.
12. Existing user data that must be preserved.

Use a clean test environment with Microsoft Defender enabled.

A build is not production-ready simply because the Inno Setup compiler exits successfully.

## 11. Phase 9 — Documentation deliverables

Update:

- `README.md`
- `PRODUCT_DOCUMENTATION.md`
- `docs/CURRENT_STATUS_AUDIT.md`
- `docs/ARCHITECTURE.md`
- `docs/SECURITY.md`
- `docs/BUILD_AND_RELEASE.md`

Document actual versions, supported prerequisites, build commands, Java installation requirements, runtime diagnostics, PostgreSQL setup, offline behavior, data preservation and known limitations.

Remove outdated claims about the old backend architecture only after the migration is verified.

Do not claim 100% offline operation for features that require PostgreSQL, external webhooks or remote APIs.

## 12. Execution rules

Follow this exact order:

1. Inspect the repository.
2. Write the current-status audit.
3. Identify migration risks and missing information.
4. Establish the Java/Spring Boot compatibility contract.
5. Implement the backend migration incrementally.
6. Preserve or deliberately migrate existing Python bridge responsibilities.
7. Repair Electron integration and Java lifecycle handling.
8. Repair the Inno Setup script and packaging pipeline.
9. Add security and regression tests.
10. Build and verify the release.
11. Update documentation.
12. Produce a final evidence-based report.

Make small, reversible changes. Preserve working code. Avoid broad rewrites when a targeted change is sufficient.

Do not invent files, build results, test results, certificates, signing status, or Windows compatibility.

If a Windows-only verification cannot be run in the current environment, state that clearly and provide the exact command or manual test needed on Windows.

Do not stop after producing the audit unless a genuine blocker requires clarification. Continue with the implementation and verification work that the environment supports.

## 13. Definition of done

Ap Desktop is ready for release only when:

- The actual repository has been audited.
- The Spring Boot backend builds and its tests pass.
- The Electron application launches reliably.
- Java discovery works and gives correct missing/incompatible-runtime diagnostics.
- Offline SQLite and Python practice remain functional.
- PostgreSQL integration remains functional where configured.
- Existing user data survives an upgrade.
- The Inno Setup installer includes the correct packaged files.
- The installer and application security issues have been investigated.
- Signatures are verified where signing is required.
- All required tests pass, with unavailable tests explicitly identified.
- The final release report distinguishes verified facts from unverified assumptions.

## Final response format

At completion, provide:

1. **Current status:** verified working, partially working, broken, and unverified.
2. **Architecture changes:** actual files changed and why.
3. **Java compatibility:** required version and runtime detection behavior.
4. **Security changes:** concrete controls implemented.
5. **Installer changes:** actual packaging paths and installation behavior.
6. **Test report:** commands executed and real results.
7. **Windows validation:** completed tests and remaining manual checks.
8. **Build instructions:** exact commands to reproduce the release.
9. **Remaining blockers:** unresolved issues, risks and next actions.
10. **Release verdict:** ready for testing, release candidate, or production-ready, with evidence.

Begin by inspecting the current repository and establishing the real status. Do not assume the documented product state is identical to the implementation.