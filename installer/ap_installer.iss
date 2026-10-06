; =====================================================================
; Ap — Developer Practice & Interview Prep Platform
; Self-Contained Production Inno Setup 6 Installer Script
; =====================================================================

#define MyAppName "Ap"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Arun Pandian"
#define MyAppURL "https://arunpandian.online"
#define MyAppExeName "Ap.exe"
#define MyAppId "{{C2819894-399F-4D2A-98C1-02E09B1F54B0}}"

[Setup]
; Unique application GUID for clean upgrades and safe uninstallation
AppId={#MyAppId}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=..\release\installer
OutputBaseFilename=Ap_Setup_v{#MyAppVersion}_x64
SetupIconFile=..\src-tauri\icons\icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
DisableProgramGroupPage=auto
CloseApplications=yes
RestartApplications=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Main Executable & Binaries
Source: "..\src-tauri\target\release\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion restartreplace
; Complete Production Web Assets (Local Offline Monaco Editor, Language Workers, Styles, Icons)
Source: "..\dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
; Execution Workers (Python sandbox worker & PostgreSQL bridge)
Source: "..\workers\*"; DestDir: "{app}\workers"; Flags: ignoreversion recursesubdirs createallsubdirs
; Multi-Resolution Application Icon
Source: "..\src-tauri\icons\icon.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\icon.ico"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\icon.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; Clean up temporary runtime caches while preserving user SQLite databases in %APPDATA%
Type: files; Name: "{app}\*.log"

[Code]
// Detect Microsoft WebView2 Runtime in 32-bit/64-bit Registry
function IsWebView2Installed(): Boolean;
var
  InstalledVersion: String;
begin
  Result := False;
  if RegQueryStringValue(HKLM64, 'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', InstalledVersion) then
  begin
    if (InstalledVersion <> '') and (InstalledVersion <> '0.0.0.0') then
      Result := True;
  end;
  if not Result and RegQueryStringValue(HKCU, 'Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', InstalledVersion) then
  begin
    if (InstalledVersion <> '') and (InstalledVersion <> '0.0.0.0') then
      Result := True;
  end;
end;

// Pre-installation check
function InitializeSetup(): Boolean;
begin
  Result := True;
  // If WebView2 is not detected on Windows 10/11, notify user before installation finishes
  if not IsWebView2Installed() then
  begin
    Log('Notice: Microsoft Edge WebView2 runtime was not detected. Tauri will use system Evergreen WebView2.');
  end;
end;

// Ensure user SQLite databases in %APPDATA% or %LOCALAPPDATA% are untouched during upgrades/uninstalls
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
  begin
    // Explicitly preserves %APPDATA%\Ap and %LOCALAPPDATA%\Ap Workspace databases
  end;
end;
