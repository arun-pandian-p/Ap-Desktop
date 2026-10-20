param(
    [switch]$SkipFrontendBuild = $false,
    [switch]$SkipUnpack = $false,
    [string]$BumpType = "sync"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Get-Item $PSScriptRoot).Parent.FullName
Set-Location $ProjectRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Ap Workspace -- Production Release & Inno Setup Packager" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Read, bump, and verify version across all manifests
if ($BumpType -and $BumpType -ne "none") {
    node "$ProjectRoot\scripts\bump-version.mjs" $BumpType
}
$PackageJson = Get-Content "$ProjectRoot\package.json" -Raw | ConvertFrom-Json
$AppVersion = $PackageJson.version
Write-Host "`n[Release Target] Version: v$AppVersion" -ForegroundColor Green

$IssFile = "$ProjectRoot\installer\ap_installer.iss"

# 2. Build Frontend Bundle
if (-not $SkipFrontendBuild) {
    Write-Host "`n[1/5] Building Frontend Production Bundle (Vite + TS)..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Frontend production build failed."
        exit 1
    }
} else {
    Write-Host "`n[1/5] Skipping frontend build as requested..." -ForegroundColor Gray
}

# 3. Package Unpacked Electron Distribution
if (-not $SkipUnpack) {
    Write-Host "`n[2/5] Packaging Unpacked Electron Runtime (electron-builder)..." -ForegroundColor Yellow
    npx electron-builder --win dir --x64
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "electron-builder exited with warning code, verifying unpacked directory..."
    }
} else {
    Write-Host "`n[2/5] Skipping Electron unpack as requested..." -ForegroundColor Gray
}

$ExeTarget = "$ProjectRoot\release\win-unpacked\Ap.exe"
if (-not (Test-Path $ExeTarget)) {
    Write-Error "Unpacked executable not found at $ExeTarget"
    exit 1
}
Write-Host "  [OK] Unpacked executable verified at $ExeTarget" -ForegroundColor Green

# 4. Locate Inno Setup Compiler (ISCC.exe)
Write-Host "`n[3/5] Locating Inno Setup Compiler (ISCC.exe)..." -ForegroundColor Yellow
$IsccCandidates = @(
    "C:\Users\Rishi\AppData\Local\Programs\Inno Setup 6\ISCC.exe",
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
    "C:\Program Files\Inno Setup 6\ISCC.exe",
    "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe"
)

$IsccPath = $null
foreach ($p in $IsccCandidates) {
    if (Test-Path $p) {
        $IsccPath = $p
        break
    }
}

if (-not $IsccPath) {
    $found = Get-Command iscc -ErrorAction SilentlyContinue
    if ($found) { $IsccPath = $found.Source }
}

if (-not $IsccPath) {
    Write-Error "Inno Setup Compiler (ISCC.exe) was not found. Please install Inno Setup 6."
    exit 1
}
Write-Host "  [OK] Found Inno Setup Compiler at: $IsccPath" -ForegroundColor Green

# 5. Compile Inno Setup Script
Write-Host "`n[4/5] Compiling Inno Setup Windows Installer..." -ForegroundColor Yellow
$ReleaseDir = "$ProjectRoot\release\installer"
if (-not (Test-Path $ReleaseDir)) {
    New-Item -ItemType Directory -Path $ReleaseDir -Force | Out-Null
}

& "$IsccPath" "$IssFile"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Inno Setup compilation failed."
    exit 1
}

$InstallerFileName = "Ap_Desktop_Setup_v${AppVersion}_x64.exe"
$InstallerPath = "$ReleaseDir\$InstallerFileName"

if (-not (Test-Path $InstallerPath)) {
    Write-Error "Expected installer not found at $InstallerPath"
    exit 1
}
Write-Host "  [OK] Inno Setup installer compiled: $InstallerPath" -ForegroundColor Green

# 6. Calculate SHA-256 Checksum and Generate Assets
Write-Host "`n[5/5] Calculating SHA-256 Checksum & Generating Release Notes..." -ForegroundColor Yellow
$HashObj = Get-FileHash -Path $InstallerPath -Algorithm SHA256
$Sha256 = $HashObj.Hash.ToLower()

$Sha256FileName = "$InstallerFileName.sha256"
$Sha256Path = "$ReleaseDir\$Sha256FileName"
$Sha256Content = "$Sha256  $InstallerFileName`n"
[System.IO.File]::WriteAllText($Sha256Path, $Sha256Content, [System.Text.Encoding]::UTF8)

# Generate GitHub Release Notes
$ReleaseNotesPath = "$ReleaseDir\release-notes-v${AppVersion}.md"
$ReleaseNotes = @(
    "# Ap Workspace v${AppVersion}",
    "",
    "## What's New in v${AppVersion}",
    "- **Secure Check for Updates**: Full in-app update checker integrated with GitHub Releases.",
    "- **SHA-256 Integrity Verification**: Streamed checksum verification before launching installers to protect against corruption or tampering.",
    "- **Safe Inno Setup Integration**: Clean upgrade path preserving SQLite databases, streak history, user notes, and system settings in `%APPDATA%\Ap`.",
    "- **Silent & Interactive Modes**: Flexible installer launch options via detached child processes without command-line shell invocation.",
    "- **Enhanced Stability**: Multi-language IDE runtimes, global autocomplete search, and real-time analytics synchronization.",
    "",
    "## Release Assets",
    "- Installer: ``$InstallerFileName``",
    "- SHA-256 Checksum: ``$Sha256``",
    "- Checksum File: ``$Sha256FileName``",
    "",
    "### Verification Command (PowerShell)",
    '```powershell',
    ('(Get-FileHash -Algorithm SHA256 .\' + $InstallerFileName + ').Hash -eq "' + $Sha256 + '"'),
    '```'
) -join [System.Environment]::NewLine

[System.IO.File]::WriteAllText($ReleaseNotesPath, $ReleaseNotes, [System.Text.Encoding]::UTF8)

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "  Release Package Ready for Publication!                  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Installer:      $InstallerPath" -ForegroundColor White
Write-Host "File Size:      $([math]::Round((Get-Item $InstallerPath).Length / 1MB, 2)) MB" -ForegroundColor White
Write-Host "SHA-256:        $Sha256" -ForegroundColor Green
Write-Host "Checksum File:  $Sha256Path" -ForegroundColor White
Write-Host "Release Notes:  $ReleaseNotesPath" -ForegroundColor White
Write-Host "`nTo publish this release to GitHub:" -ForegroundColor Yellow
Write-Host "1. Create tag 'v$AppVersion' on branch 'main' and push to origin" -ForegroundColor Gray
Write-Host "2. Navigate to https://github.com/arun-pandian-p/Ap-Desktop/releases/new" -ForegroundColor Gray
Write-Host "3. Set tag to 'v$AppVersion', title to 'Ap Workspace v$AppVersion'" -ForegroundColor Gray
Write-Host "4. Upload the following files from release\installer\:" -ForegroundColor Gray
Write-Host "     - $InstallerFileName" -ForegroundColor Cyan
Write-Host "     - $Sha256FileName" -ForegroundColor Cyan
Write-Host "5. Paste contents of release-notes-v${AppVersion}.md as the release description" -ForegroundColor Gray
Write-Host "6. Check 'Set as the latest release' and click 'Publish release'." -ForegroundColor Gray
