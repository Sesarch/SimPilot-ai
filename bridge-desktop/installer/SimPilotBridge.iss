; ============================================================================
;  SimPilot Bridge — Modern Inno Setup Installer
;  Cockpit-themed wizard UI with shortcuts, autostart, deep-link protocol,
;  and built-in auto-update channel.
;
;  Build:
;    1. Install Inno Setup 6 from https://jrsoftware.org/isdl.php
;    2. Drop your compiled SimPilotBridge.exe into  installer/payload/
;    3. Right-click this .iss file → "Compile"
;    4. Output appears in  installer/output/SimPilotBridge-Setup-1.0.0.exe
; ============================================================================

#define MyAppName        "SimPilot Bridge"
#define MyAppVersion     "1.0.0"
#define MyAppPublisher   "SimPilot.AI"
#define MyAppURL         "https://simpilot.ai"
#define MyAppExeName     "SimPilotBridge.exe"
#define MyAppId          "{{A8F3D7E1-9B4C-4F2A-8E1D-C5B6A7E8F9D0}"
#define MyUpdateFeedURL  "https://github.com/simpilot-ai/bridge/releases/latest/download/latest.yml"

[Setup]
AppId={#MyAppId}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}/support
AppUpdatesURL={#MyAppURL}/bridge/releases
DefaultDirName={autopf}\SimPilot\Bridge
DefaultGroupName=SimPilot
DisableProgramGroupPage=yes
DisableDirPage=auto
DisableReadyPage=no
DisableWelcomePage=no
LicenseFile=assets\license.txt
OutputDir=output
OutputBaseFilename=SimPilotBridge-Setup-{#MyAppVersion}
SetupIconFile=assets\app-icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
WizardSizePercent=120
WizardImageFile=assets\wizard-sidebar.bmp
WizardSmallImageFile=assets\wizard-header.bmp
WizardImageStretch=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
CloseApplications=yes
RestartApplications=no
ShowLanguageDialog=no
MinVersion=10.0.17763
AllowNoIcons=yes
AppCopyright=© 2025 SimPilot.AI

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon";    Description: "Create a &desktop shortcut";                 GroupDescription: "Additional shortcuts:"
Name: "startmenuicon";  Description: "Create a Start &Menu shortcut";              GroupDescription: "Additional shortcuts:"; Flags: checkedonce
Name: "autostart";      Description: "Launch {#MyAppName} when Windows &starts";   GroupDescription: "Startup options:"
Name: "deeplink";       Description: "Register simpilot:// browser protocol (recommended for one-click pairing)"; GroupDescription: "Integration:"; Flags: checkedonce
Name: "autoupdate";     Description: "Automatically check for updates on launch";  GroupDescription: "Updates:";    Flags: checkedonce

[Files]
Source: "payload\{#MyAppExeName}";  DestDir: "{app}"; Flags: ignoreversion
Source: "payload\*";                DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "{#MyAppExeName}"
Source: "assets\app-icon.ico";      DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}";              Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app-icon.ico"; Tasks: startmenuicon
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}";                                  Tasks: startmenuicon
Name: "{autodesktop}\{#MyAppName}";        Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app-icon.ico"; Tasks: desktopicon

[Registry]
; ---- Launch at Windows startup (per-user) ----
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; \
  ValueType: string; ValueName: "SimPilotBridge"; ValueData: """{app}\{#MyAppExeName}"" --hidden"; \
  Flags: uninsdeletevalue; Tasks: autostart

; ---- simpilot:// deep-link protocol handler ----
Root: HKCR; Subkey: "simpilot"; \
  ValueType: string; ValueName: ""; ValueData: "URL:SimPilot Protocol"; \
  Flags: uninsdeletekey; Tasks: deeplink
Root: HKCR; Subkey: "simpilot"; \
  ValueType: string; ValueName: "URL Protocol"; ValueData: ""; Tasks: deeplink
Root: HKCR; Subkey: "simpilot\DefaultIcon"; \
  ValueType: string; ValueName: ""; ValueData: """{app}\{#MyAppExeName}"",0"; Tasks: deeplink
Root: HKCR; Subkey: "simpilot\shell\open\command"; \
  ValueType: string; ValueName: ""; ValueData: """{app}\{#MyAppExeName}"" ""%1"""; Tasks: deeplink

; ---- Auto-update feed configuration ----
Root: HKCU; Subkey: "Software\SimPilot\Bridge"; \
  ValueType: string; ValueName: "UpdateFeed"; ValueData: "{#MyUpdateFeedURL}"; \
  Flags: uninsdeletekey; Tasks: autoupdate
Root: HKCU; Subkey: "Software\SimPilot\Bridge"; \
  ValueType: dword;  ValueName: "AutoUpdate"; ValueData: "1"; Tasks: autoupdate

; ---- Install metadata (always written) ----
Root: HKCU; Subkey: "Software\SimPilot\Bridge"; ValueType: string; ValueName: "InstallDir"; ValueData: "{app}"; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\SimPilot\Bridge"; ValueType: string; ValueName: "Version";    ValueData: "{#MyAppVersion}"; Flags: uninsdeletevalue

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch {#MyAppName} now"; \
  Flags: nowait postinstall skipifsilent

[UninstallRun]
; Best-effort: stop the bridge before uninstall
Filename: "taskkill.exe"; Parameters: "/F /IM {#MyAppExeName}"; Flags: runhidden; RunOnceId: "KillBridge"

[UninstallDelete]
Type: filesandordirs; Name: "{app}"
Type: filesandordirs; Name: "{userappdata}\SimPilot\Bridge\logs"

[Code]
// ---------------------------------------------------------------------------
//  Modern wizard polish: cockpit-themed accents + .NET version check stub
// ---------------------------------------------------------------------------
procedure InitializeWizard;
begin
  WizardForm.WelcomeLabel1.Font.Color := $FDD421;   // BGR for cyan #21d4fd
  WizardForm.WelcomeLabel1.Caption    := 'Welcome to the' + #13#10 + 'SimPilot Bridge Setup';
  WizardForm.WelcomeLabel2.Caption    :=
    'This wizard will install SimPilot Bridge ' + '{#MyAppVersion}' + ' on your computer.' + #13#10 + #13#10 +
    'SimPilot Bridge connects your flight simulator (MSFS, X-Plane) to your SimPilot.AI dashboard ' +
    'for live telemetry, automatic logbook entries, and AI-driven debriefs.' + #13#10 + #13#10 +
    'It is recommended that you close all other applications before continuing.';
  WizardForm.FinishedLabel.Caption :=
    'SimPilot Bridge has been installed successfully.' + #13#10 + #13#10 +
    'Launch the app, sign in to your SimPilot.AI dashboard, and click "Pair Bridge" to connect.';
end;

function InitializeSetup(): Boolean;
begin
  // Reserve hook for future runtime checks (e.g. SimConnect SDK presence)
  Result := True;
end;
