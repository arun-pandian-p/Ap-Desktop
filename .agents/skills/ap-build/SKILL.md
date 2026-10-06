---
name: ap-build-release
description: Standardized production build, packaging, code signing, and release workflow for the Ap Windows desktop application.
---

# Ap Windows Desktop Build & Release Guide

This skill documents the complete end-to-end workflow for compiling, testing, packaging, signing, and releasing the **Ap Windows Desktop Application**.

---

## 1. Prerequisites & Environment Setup

Ensure the following tools are installed and accessible in the system path:
* **Node.js**: v18+ or v20+ (`node -v`, `npm -v`)
* **Inno Setup 6**: Compiler installed at `C:\Users\Rishi\AppData\Local\Programs\Inno Setup 6\ISCC.exe` or `C:\Program Files (x86)\Inno Setup 6\ISCC.exe`
* **PowerShell**: Windows PowerShell 5.1+ or PowerShell 7+ with execution policy configured to run local scripts (`Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`)
* **Code Signing Certificate**: Self-signed or CA-issued code signing certificate installed in `Cert:\CurrentUser\My` under subject `CN=Ap Software Technologies, O=Arun Pandian, C=IN`

---

## 2. Version Parity Management

Before initiating a release build, ensure the version numbers match across all 3 configuration manifests:

1. **[`package.json`](file:///c:/Users/Rishi/OneDrive/Desktop/ap/package.json)**:
   ```json
   "version": "1.0.0"
   ```
2. **[`installer/ap_installer.iss`](file:///c:/Users/Rishi/OneDrive/Desktop/ap/installer/ap_installer.iss)**:
   ```iss
   #define MyAppVersion "1.0.0"
   ```
3. **[`src-tauri/Cargo.toml`](file:///c:/Users/Rishi/OneDrive/Desktop/ap/src-tauri/Cargo.toml)**:
   ```toml
   [package]
   version = "1.0.0"
   ```

---

## 3. Step-by-Step Build Pipeline

### Step 3.1: Quality Verification & Test Suite
Run TypeScript typechecking and the 54-test verification suite:
```powershell
npm run typecheck
npm run test
```
*Expected Output: `54 passed (54)` across all 10 test suites.*

### Step 3.2: Production Frontend Bundle Build
Compile Vite React + TailwindCSS + Monaco Editor assets:
```powershell
npm run build
```
*Output: `dist/index.html`, `dist/assets/*`, and `dist/sql-wasm.wasm`.*

### Step 3.3: Inno Setup 6 Release Packaging
Execute the packaging script to generate the self-contained installer:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-installer.ps1 -SkipFrontendBuild
```
*Output: [`release\installer\Ap_Setup_v1.0.0_x64.exe`](file:///c:/Users/Rishi/OneDrive/Desktop/ap/release/installer/Ap_Setup_v1.0.0_x64.exe) (126.0 MB)*

### Step 3.4: Authenticode Code Signing & File Unblocking
Sign all release binaries with SHA-256 Authenticode and remove Web Zone identifiers:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sign-and-unblock.ps1
```
Or run directly via PowerShell:
```powershell
$cert = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert | Where-Object { $_.Subject -like "*Arun Pandian*" -or $_.Subject -like "*Ap Software*" } | Select-Object -First 1
Set-AuthenticodeSignature -FilePath "release\Ap-Setup-1.0.0-x64.exe" -Certificate $cert -HashAlgorithm SHA256
Set-AuthenticodeSignature -FilePath "release\installer\Ap_Setup_v1.0.0_x64.exe" -Certificate $cert -HashAlgorithm SHA256
Set-AuthenticodeSignature -FilePath "release\win-unpacked\Ap.exe" -Certificate $cert -HashAlgorithm SHA256
Unblock-File -Path "release\Ap-Setup-1.0.0-x64.exe"
Unblock-File -Path "release\installer\Ap_Setup_v1.0.0_x64.exe"
Unblock-File -Path "release\win-unpacked\Ap.exe"
```

---

## 4. Release Inventory Verification

Verify that all target binaries exist and are signed:
```powershell
Get-ChildItem -Path "release" -Recurse -Filter "*.exe" | Get-AuthenticodeSignature | Select-Object Path, Status, StatusMessage
```

### Artifact Manifest:
| Artifact Type | Path | Typical Size |
| :--- | :--- | :--- |
| **Inno Setup 6 Installer** | `release\installer\Ap_Setup_v1.0.0_x64.exe` | ~126.0 MB |
| **Electron NSIS Installer** | `release\Ap-Setup-1.0.0-x64.exe` | ~144.2 MB |
| **Unpacked Portable App** | `release\win-unpacked\Ap.exe` | ~245.7 MB |

---

## 5. Development Mode Execution

To test the application locally in Electron desktop mode:
```powershell
npm run electron:dev
```
Or for web preview:
```powershell
npm run dev
```
