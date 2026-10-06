@echo off
setlocal
title Ap Desktop Installer

echo =======================================================
echo   Ap — Developer Practice & Interview Prep Platform
echo =======================================================
echo.
echo Installing Ap to %LOCALAPPDATA%\Programs\Ap ...

set "INSTALL_DIR=%LOCALAPPDATA%\Programs\Ap"
set "SRC_DIR=%~dp0release\win-unpacked"

if not exist "%SRC_DIR%\Ap.exe" (
    set "SRC_DIR=%~dp0win-unpacked"
)

if not exist "%SRC_DIR%\Ap.exe" (
    set "SRC_DIR=%~dp0..\release\win-unpacked"
)

if not exist "%SRC_DIR%\Ap.exe" (
    echo [ERROR] Source application files not found at %SRC_DIR%
    pause
    exit /b 1
)

:: Create Install Directory
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

:: Copy Files
echo [1/3] Copying application files...
robocopy "%SRC_DIR%" "%INSTALL_DIR%" /E /NP /NFL /NDL /R:1 /W:1 >nul

:: Copy Icon
if exist "%~dp0build\icon.ico" copy /Y "%~dp0build\icon.ico" "%INSTALL_DIR%\icon.ico" >nul

:: Create Desktop & Start Menu Shortcuts via PowerShell
echo [2/3] Creating Desktop and Start Menu shortcuts...
powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$desktop = [Environment]::GetFolderPath('Desktop'); " ^
  "$s1 = $ws.CreateShortcut(\"$desktop\Ap.lnk\"); " ^
  "$s1.TargetPath = \"$env:LOCALAPPDATA\Programs\Ap\Ap.exe\"; " ^
  "$s1.IconLocation = \"$env:LOCALAPPDATA\Programs\Ap\icon.ico,0\"; " ^
  "$s1.WorkingDirectory = \"$env:LOCALAPPDATA\Programs\Ap\"; " ^
  "$s1.Save(); " ^
  "$programs = [Environment]::GetFolderPath('Programs'); " ^
  "$s2 = $ws.CreateShortcut(\"$programs\Ap.lnk\"); " ^
  "$s2.TargetPath = \"$env:LOCALAPPDATA\Programs\Ap\Ap.exe\"; " ^
  "$s2.IconLocation = \"$env:LOCALAPPDATA\Programs\Ap\icon.ico,0\"; " ^
  "$s2.WorkingDirectory = \"$env:LOCALAPPDATA\Programs\Ap\"; " ^
  "$s2.Save();"

:: Unblock installed files
powershell -NoProfile -Command "Get-ChildItem -Path '%INSTALL_DIR%' -Recurse | Unblock-File"

echo [3/3] Installation Complete!
echo.
echo Launching Ap Desktop...
start "" "%INSTALL_DIR%\Ap.exe"
exit /b 0
