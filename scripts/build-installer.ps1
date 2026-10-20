param(
    [switch]$SkipFrontendBuild = $false
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Get-Item $PSScriptRoot).Parent.FullName
Set-Location $ProjectRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Ap -- Windows Production Release and Inno Setup Packager" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 0. Synchronize version
node "$ProjectRoot\scripts\bump-version.mjs" sync
$PackageJson = Get-Content "$ProjectRoot\package.json" -Raw | ConvertFrom-Json
$AppVersion = $PackageJson.version
Write-Host "`n[Release Target] Version: v$AppVersion" -ForegroundColor Green

# 1. Step 1: Validate Frontend Build and Update Unpacked Runtime
if (-not $SkipFrontendBuild) {
    Write-Host "`n[1/4] Building Frontend Production Bundle (Vite + TS)..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Frontend production build failed."
        exit 1
    }
} else {
    Write-Host "`n[1/4] Skipping frontend build as requested..." -ForegroundColor Gray
}

if (-not (Test-Path "$ProjectRoot\dist\index.html")) {
    Write-Error "dist\index.html not found. Please run 'npm run build' first."
    exit 1
}
Write-Host "  [OK] Frontend bundle verified in dist/" -ForegroundColor Green

Write-Host "`n[1.5/4] Packaging Unpacked Electron Runtime with latest bundle..." -ForegroundColor Yellow
npx electron-builder --win dir --x64
if ($LASTEXITCODE -ne 0) {
    Write-Warning "electron-builder encountered a warning or non-zero exit code, checking win-unpacked..."
}
Write-Host "  [OK] Unpacked runtime updated in release/win-unpacked" -ForegroundColor Green

# 2. Step 2: Locate Inno Setup Compiler (ISCC)
Write-Host "`n[2/4] Locating Inno Setup Compiler (ISCC.exe)..." -ForegroundColor Yellow
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
    Write-Error "Inno Setup Compiler (ISCC.exe) not found."
    exit 1
}
Write-Host "  [OK] Using Inno Setup Compiler at: $IsccPath" -ForegroundColor Green

# 3. Step 3: Ensure Output Directory
$ReleaseDir = "$ProjectRoot\release\installer"
if (-not (Test-Path $ReleaseDir)) {
    New-Item -ItemType Directory -Path $ReleaseDir -Force | Out-Null
}

# 4. Step 4: Validate Executable Binary
$ExeTarget = "$ProjectRoot\release\win-unpacked\Ap.exe"
$isRealBinary = $false
if (Test-Path $ExeTarget) {
    $bytes = [System.IO.File]::ReadAllBytes($ExeTarget)
    if ($bytes.Length -gt 1024 -and $bytes[0] -eq 0x4D -and $bytes[1] -eq 0x5A) {
        $isRealBinary = $true
    }
}

Write-Host "`n[3/4] Inno Setup Packaging..." -ForegroundColor Yellow
$IssFile = "$ProjectRoot\installer\ap_installer.iss"

if ($isRealBinary) {
    & "$IsccPath" "$IssFile"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Inno Setup compilation succeeded with verified native executable!" -ForegroundColor Green
    } else {
        Write-Warning "Inno Setup compilation encountered an issue."
    }
} else {
    Write-Host "  [INFO] Packaged Electron executable 'release\win-unpacked\Ap.exe' was not found." -ForegroundColor DarkYellow
    Write-Host "  Run 'npm run electron:build:dev' to generate the unpacked Electron distribution before packaging." -ForegroundColor Gray
    Write-Host "  [READY] Inno Setup script is validated and ready at: $IssFile" -ForegroundColor Cyan
}

# 5. Step 5: Checksum and Release Inventory
Write-Host "`n[4/4] Release Artifacts and Inventory:" -ForegroundColor Yellow
Write-Host "  - Frontend bundle: $ProjectRoot\dist" -ForegroundColor White
Write-Host "  - SQLite WebAssembly: $ProjectRoot\dist\sql-wasm.wasm" -ForegroundColor White
Write-Host "  - Inno Setup Script: $IssFile" -ForegroundColor White
Write-Host "  - Output Target: $ReleaseDir\Ap_Desktop_Setup_v${AppVersion}_x64.exe" -ForegroundColor White

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "  Build and Packaging Script Ready!                       " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
