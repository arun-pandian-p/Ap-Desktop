; ============================================================
; Ap Desktop - Inno Setup 6
; Electron + React + TypeScript + locally bundled Monaco
; PostgreSQL Server download + Java JDK prerequisite
;
; PREREQUISITES:
; 1. Build Electron first: release\win-unpacked\Ap.exe
; 2. Confirm build\icon.ico exists.
; 3. Verify the pinned EDB download URL before release.
;
; SECURITY:
; - Never embeds a PostgreSQL password.
; - Verifies the downloaded PostgreSQL Authenticode signature.
; - Does not remove, upgrade, or reconfigure an existing database.
; - Does not disable Windows security features.
;
; APPLICATION-SIDE WORK STILL REQUIRED:
; - Create the Ap database/schema and run migrations.
; - Store database credentials using Windows Credential Manager
;   or DPAPI.
; - Implement PostgreSQL connection configuration and health checks.
; ============================================================

#define MyAppName "Ap Desktop"
#define MyAppVersion "1.3.0"
#define MyAppPublisher "Arun Pandian"
#define MyAppURL "https://arunpandian.online"
#define MyAppExeName "Ap.exe"
#define MyAppId "{{C2819894-399F-4D2A-98C1-02E09B1F54B0}}"
#define PostgreSQLInstallerURL "https://get.enterprisedb.com/postgresql/postgresql-18.6-1-windows-x64.exe"
#define PostgreSQLInstallerName "ap-postgresql-installer.exe"

[Setup]
AppId={#MyAppId}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\Ap Desktop
DefaultGroupName={#MyAppName}
PrivilegesRequired=admin
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
OutputDir=..\release\installer
OutputBaseFilename=Ap_Desktop_Setup_v{#MyAppVersion}_x64
SetupIconFile=..\build\icon.ico
UninstallDisplayIcon={app}\icon.ico
WizardStyle=modern
Compression=lzma2
SolidCompression=yes
DisableProgramGroupPage=yes
CloseApplications=yes
RestartApplications=no
Uninstallable=yes
; Keep the same AppId for upgrades of the same application.
; Increment MyAppVersion for each release.

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"; Flags: unchecked

[Files]
; Electron Builder must create release\win-unpacked first.
; Monaco must already be bundled into the frontend assets.
Source: "..\release\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\build\icon.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\icon.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\icon.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch {#MyAppName}"; WorkingDir: "{app}"; Flags: nowait postinstall skipifsilent

[Code]
var
  JavaInstallFailed: Boolean;
  PostgreSQLInstallFailed: Boolean;

function OnDownloadProgress(const Url, FileName: String; const Progress, ProgressMax: Int64): Boolean;
begin
  Result := True;
end;

function RunCommand(
  const FileName, Params: String;
  const ShowWindow: Integer;
  var ResultCode: Integer
): Boolean;
begin
  Result := Exec(
    FileName,
    Params,
    '',
    ShowWindow,
    ewWaitUntilTerminated,
    ResultCode
  );
end;

function RunPowerShell(
  const ScriptText: String;
  var ResultCode: Integer
): Boolean;
var
  PowerShellPath: String;
  Params: String;
begin
  PowerShellPath := ExpandConstant(
    '{sys}\WindowsPowerShell\v1.0\powershell.exe'
  );
  Params :=
    '-NoLogo -NoProfile -NonInteractive -Command "' +
    ScriptText + '"';
  Result := RunCommand(
    PowerShellPath,
    Params,
    SW_HIDE,
    ResultCode
  );
end;

function ParseJavaMajorVersion(const VersionStr: String): Integer;
var
  StartIdx, EndIdx: Integer;
  MajorStr: String;
begin
  Result := 0;
  StartIdx := Pos('version "', VersionStr);
  if StartIdx > 0 then
  begin
    StartIdx := StartIdx + 9;
    EndIdx := StartIdx;
    while (EndIdx <= Length(VersionStr)) and (VersionStr[EndIdx] <> '.') and (VersionStr[EndIdx] <> '"') do
      EndIdx := EndIdx + 1;
    MajorStr := Copy(VersionStr, StartIdx, EndIdx - StartIdx);
    Result := StrToIntDef(MajorStr, 0);
  end;
end;

function IsJava21OrNewer(): Boolean;
var
  ResultCode: Integer;
  OutputFile: String;
  OutputText: AnsiString;
  CommandSucceeded: Boolean;
  MajorVer: Integer;
begin
  Result := False;
  OutputFile := ExpandConstant('{tmp}\ap-java-version.txt');
  CommandSucceeded := RunCommand(
    ExpandConstant('{sys}\cmd.exe'),
    '/C java -version > "' + OutputFile + '" 2>&1',
    SW_HIDE,
    ResultCode
  );
  if CommandSucceeded and (ResultCode = 0) then
  begin
    if LoadStringFromFile(OutputFile, OutputText) then
    begin
      OutputText := Lowercase(String(OutputText));
      MajorVer := ParseJavaMajorVersion(String(OutputText));
      if MajorVer >= 21 then
        Result := True
      else
        Result := (Pos('openjdk version "21', OutputText) > 0) or
                  (Pos('openjdk version "22', OutputText) > 0) or
                  (Pos('openjdk version "23', OutputText) > 0) or
                  (Pos('openjdk version "24', OutputText) > 0) or
                  (Pos('openjdk version "25', OutputText) > 0) or
                  (Pos('openjdk version "26', OutputText) > 0) or
                  (Pos('java version "21', OutputText) > 0) or
                  (Pos('java version "22', OutputText) > 0) or
                  (Pos('java version "23', OutputText) > 0) or
                  (Pos('java version "24', OutputText) > 0) or
                  (Pos('java version "25', OutputText) > 0) or
                  (Pos('java version "26', OutputText) > 0);
    end;
  end;
  DeleteFile(OutputFile);
end;

function InstallJavaIfMissing(): Boolean;
var
  ResultCode: Integer;
  CommandSucceeded: Boolean;
begin
  Result := True;
  if IsJava21OrNewer() then
  begin
    Log('Compatible Java runtime detected.');
    Exit;
  end;

  Log('Compatible Java runtime not detected. Trying Microsoft OpenJDK 21 via winget.');
  CommandSucceeded := RunCommand(
    'winget.exe',
    'install --id Microsoft.OpenJDK.21 --exact --silent --accept-package-agreements --accept-source-agreements',
    SW_SHOW,
    ResultCode
  );
  if not CommandSucceeded or (ResultCode <> 0) then
  begin
    JavaInstallFailed := True;
    Result := False;
    MsgBox(
      'Java could not be installed automatically.' + #13#10 + #13#10 +
      'Install a compatible JDK 21+ using the official Microsoft guide:' + #13#10 +
      'https://learn.microsoft.com/en-us/java/openjdk/install',
      mbInformation,
      MB_OK
    );
  end
  else
  begin
    Log('Java installer completed. Runtime verification is deferred to application start.');
  end;
end;

function IsPostgreSQLServicePresent(): Boolean;
var
  ResultCode: Integer;
  CommandSucceeded: Boolean;
  OutputFile: String;
  OutputText: AnsiString;
begin
  Result := False;
  OutputFile := ExpandConstant('{tmp}\ap-postgres-services.txt');
  CommandSucceeded := RunCommand(
    ExpandConstant('{sys}\cmd.exe'),
    '/C sc.exe query state= all > "' + OutputFile + '" 2>&1',
    SW_HIDE,
    ResultCode
  );
  if CommandSucceeded and FileExists(OutputFile) then
  begin
    if LoadStringFromFile(OutputFile, OutputText) then
    begin
      OutputText := Lowercase(String(OutputText));
      Result := Pos('postgresql', String(OutputText)) > 0;
    end;
  end;
  DeleteFile(OutputFile);
end;

function VerifyEDBSignature(const InstallerPath: String): Boolean;
var
  ResultCode: Integer;
  PowerShellScript: String;
  CommandSucceeded: Boolean;
begin
  // Fail closed if the executable has no valid trusted signature
  // or the signer does not match EnterpriseDB.
  PowerShellScript :=
    '$s = Get-AuthenticodeSignature -LiteralPath ''' + InstallerPath + '''; ' +
    'if ($s.Status -ne ''Valid'') { exit 10 }; ' +
    'if ($s.SignerCertificate.Subject -notmatch ''EnterpriseDB'') { exit 11 }; ' +
    'exit 0';
  CommandSucceeded := RunPowerShell(PowerShellScript, ResultCode);
  Result := CommandSucceeded and (ResultCode = 0);
end;

function InstallPostgreSQLIfMissing(): Boolean;
var
  InstallerPath: String;
  ResultCode: Integer;
  CommandSucceeded: Boolean;
  DownloadedBytes: Int64;
begin
  Result := True;
  if IsPostgreSQLServicePresent() then
  begin
    Log('Existing PostgreSQL service detected. Leaving it untouched.');
    MsgBox(
      'An existing PostgreSQL service was detected.' + #13#10 + #13#10 +
      'Ap Setup will not replace or reconfigure the existing server.' + #13#10 +
      'Configure Ap to use the existing database connection settings.',
      mbInformation,
      MB_OK
    );
    Exit;
  end;

  InstallerPath := ExpandConstant('{tmp}\{#PostgreSQLInstallerName}');
  try
    Log('Downloading PostgreSQL installer from EDB.');
    DownloadedBytes := DownloadTemporaryFile(
      '{#PostgreSQLInstallerURL}',
      '{#PostgreSQLInstallerName}',
      '',
      @OnDownloadProgress
    );

    if (DownloadedBytes <= 0) and not FileExists(InstallerPath) then
      RaiseException('PostgreSQL installer download failed.');

    if not FileExists(InstallerPath) then
      RaiseException('Downloaded PostgreSQL installer was not found.');

    if not VerifyEDBSignature(InstallerPath) then
      RaiseException('The PostgreSQL installer signature is invalid or its publisher could not be verified. Installation was blocked.');

    // Run EDB in interactive mode. This allows the user to set the
    // PostgreSQL password without putting it in command-line arguments.
    // pgAdmin and StackBuilder are excluded.
    CommandSucceeded := RunCommand(
      InstallerPath,
      '--disable-components pgAdmin,stackbuilder',
      SW_SHOW,
      ResultCode
    );

    if not CommandSucceeded then
      RaiseException('Windows could not start the PostgreSQL installer.');

    if ResultCode <> 0 then
      RaiseException('PostgreSQL installer returned exit code ' + IntToStr(ResultCode) + '.');

    if not IsPostgreSQLServicePresent() then
      RaiseException('PostgreSQL installation could not be verified. No PostgreSQL service was found.');

    Log('PostgreSQL installation completed.');
  except
    PostgreSQLInstallFailed := True;
    Result := False;
    Log('PostgreSQL installation error: ' + GetExceptionMessage());
    MsgBox(
      'PostgreSQL setup could not be completed.' + #13#10 + #13#10 +
      GetExceptionMessage() + #13#10 + #13#10 +
      'Ap Desktop will still be installed, but database-dependent features may be unavailable.' + #13#10 +
      'Official download page:' + #13#10 +
      'https://www.postgresql.org/download/windows/',
      mbError,
      MB_OK
    );
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    InstallJavaIfMissing();
    InstallPostgreSQLIfMissing();
    if JavaInstallFailed or PostgreSQLInstallFailed then
    begin
      MsgBox(
        'Ap Desktop installation finished with prerequisite warnings.' + #13#10 +
        'Review the messages above and complete any missing setup before using Java or database features.',
        mbInformation,
        MB_OK
      );
    end;
  end;
end;
