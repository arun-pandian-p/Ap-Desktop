; ============================================================================
; Ap — Developer Practice & Placement Preparation
; Inno Setup 6 | Per-user installation | Windows 10/11 x64
;
; Expected layout (relative to this script):
;   ..\release\win-unpacked\Ap.exe
;   ..\release\win-unpacked\*             (complete Electron packaged output)
;   ..\build\icon.ico
;
; Build only after `npm run build` and the Electron packaging step succeed.
; This installer does not install Python/PostgreSQL or claim to validate them.
; User data belongs in %APPDATA%\Ap or %LOCALAPPDATA%\Ap, never {app}.
; ============================================================================

#define MyAppName "Ap"
#define MyAppVersion "1.2.0"
#define MyAppPublisher "Arun Pandian"
#define MyAppURL "https://arunpandian.online"
#define MyAppExeName "Ap.exe"
#define MyAppId "{{C2819894-399F-4D2A-98C1-02E09B1F54B0}}"

[Setup]
AppId={#MyAppId}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={localappdata}\Programs\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
AllowNoIcons=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64
MinVersion=10.0
WizardStyle=modern
SetupIconFile=..\build\icon.ico
UninstallDisplayIcon={app}\icon.ico
OutputDir=..\release\installer
OutputBaseFilename=Ap_Setup_v{#MyAppVersion}_x64
Compression=lzma2
SolidCompression=yes
CloseApplications=yes
RestartApplications=no
SetupLogging=yes
Uninstallable=yes
UsePreviousAppDir=yes
; Do not set SignTool here unless a real, trusted signing certificate is configured.
; See the signing instructions accompanying this script.

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"; Flags: unchecked

[Dirs]
; These are application-install directories only. Store user data elsewhere.
Name: "{app}"

[Files]
; Install the complete Electron `win-unpacked` output, including resources and DLLs.
Source: "..\release\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\build\icon.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\icon.ico"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\icon.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch Ap"; WorkingDir: "{app}"; Flags: postinstall nowait skipifsilent

[UninstallDelete]
; Intentionally do NOT delete databases, progress, streaks, or user settings.
; Ap must keep user data under {userappdata}\Ap or {localappdata}\Ap.
; Do not add a wildcard that deletes user data here.

