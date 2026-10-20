# Ap Desktop — Installation Guide

This guide walks you through installing and configuring **Ap Desktop** on Windows 10 and 11.

---

## 1. System Requirements

- **Operating System:** Windows 10 (64-bit) or Windows 11
- **Architecture:** x64
- **Memory (RAM):** 4 GB minimum (8 GB recommended for local compilation)
- **Disk Space:** 500 MB free space (plus additional space for language SDKs)

---

## 2. Standard Installation (Installer)

1. Download the latest installer `Ap-Setup-1.3.0-x64.exe` from the [Releases](https://github.com/arun-pandian-p/Ap-Desktop/releases) page.
2. Double-click the `.exe` file to start the installation wizard.
3. Choose your preferred installation directory (default: `%LOCALAPPDATA%\Programs\Ap`).
4. Select whether to create a Desktop shortcut and Start Menu folder.
5. Click **Install**.
6. Once finished, check **Run Ap** and click **Finish**.

---

## 3. Verifying Runtime Dependencies

Ap Desktop includes an offline-first SQLite database and an embedded Java Spring Boot microservice. For full language execution features, verify that your machine has the desired compilers installed:

### Python 3
- Download from [python.org](https://www.python.org/downloads/).
- Ensure the option **"Add python.exe to PATH"** is checked during setup.
- Verify in PowerShell:
  ```powershell
  python --version
  ```

### Java JDK (for Java Code Execution)
- Download Eclipse Adoptium Temurin JDK 21+ from [adoptium.net](https://adoptium.net/).
- Verify in PowerShell:
  ```powershell
  javac -version
  java -version
  ```

### C++ Compiler (GCC / MSVC)
- Install MinGW-w64 via MSYS2 or Visual Studio C++ Build Tools.
- Verify in PowerShell:
  ```powershell
  g++ --version
  ```

### PostgreSQL 16 (Optional, for Live Database Practice)
- Ap Desktop includes an offline SQLite SQL practice lab out of the box.
- To practice with genuine PostgreSQL databases, install PostgreSQL 16 locally or connect to a remote instance via the **PostgreSQL Lab** tab in Settings.

---

## 4. Uninstallation

To remove Ap Desktop:
1. Open Windows **Settings > Apps > Installed apps**.
2. Search for **Ap**.
3. Click the three dots and select **Uninstall**.
4. User progress and backups located in `%APPDATA%\Ap` are preserved unless you choose to remove them.
