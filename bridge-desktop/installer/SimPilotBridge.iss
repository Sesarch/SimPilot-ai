; ============================================================================
;  SimPilot Bridge — Modern One-Click Cockpit Installer (Inno Setup)
;  "Discord-style" experience: branded welcome splash → automatic install →
;  finished page. No directory picker, no task picker, no license dialog.
;  Desktop shortcut, Start Menu entry, run-on-startup, firewall rule, and
;  simpilot:// deep-link are all enabled by default.
; ============================================================================

#define MyAppName        "SimPilot Bridge"
#define MyAppVersion     "1.0.0"
#define MyAppPublisher   "SimPilot.AI"
#define MyAppURL         "https://simpilot.ai"
#define MyAppExeName     "SimPilotBridge.exe"
#define MyAppId          "{{A8F3D7E1-9B4C-4F2A-8E1D-C5B6A7E8F9D0}"
#define MyUpdateFeedURL  "https://github.com/Sesarch/SimPilot-ai/releases/latest/download/latest.yml"
#define MyTagline        "Connect. Fly. Learn."

[Setup]
AppId={#MyAppId}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}/support
AppUpdatesURL={#MyAppURL}/bridge/releases
AppContact=support@simpilot.ai
AppComments=Live cockpit telemetry bridge for SimPilot.AI
DefaultDirName={autopf}\SimPilot\Bridge
DefaultGroupName=SimPilot
; ---- One-click experience: hide every page except Welcome / Installing / Finished
DisableProgramGroupPage=yes
DisableDirPage=yes
DisableReadyPage=yes
DisableWelcomePage=no
DisableFinishedPage=no
LicenseFile=
OutputDir=output
OutputBaseFilename=SimPilotBridge-Setup-{#MyAppVersion}
SetupIconFile=assets\app-icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName}
Compression=lzma2/ultra64
SolidCompression=yes
LZMAUseSeparateProcess=yes
LZMANumBlockThreads=2
WizardStyle=modern
WizardSizePercent=130,120
WizardImageFile=assets\wizard-sidebar.bmp
WizardSmallImageFile=assets\wizard-header.bmp
WizardImageStretch=yes
WizardImageAlphaFormat=premultiplied
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
CloseApplications=force
RestartApplications=no
ShowLanguageDialog=no
MinVersion=10.0.17763
AllowNoIcons=yes
AppCopyright=© 2025 SimPilot.AI — All rights reserved
SetupMutex=SimPilotBridgeSetupMutex
UsePreviousAppDir=yes
UsePreviousTasks=no
ChangesAssociations=yes
TimeStampsInUTC=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Messages]
; Branded copy for the only two visible pages: Welcome + Finished
WelcomeLabel1=Welcome aboard%n{#MyAppName}
WelcomeLabel2=Click Install to set up {#MyAppName} {#MyAppVersion} in one click.%n%n• A desktop shortcut and Start Menu entry will be created.%n• {#MyAppName} will run automatically when Windows starts.%n• The simpilot:// pairing protocol will be registered.%n%nClose any running simulators before continuing for the smoothest install.
FinishedHeadingLabel=Pre-flight checklist complete
FinishedLabelNoIcons={#MyAppName} is installed and ready for taxi.
FinishedLabel={#MyAppName} is installed and ready for taxi.%n%nLaunch the app, sign in to your SimPilot.AI dashboard, and tap “Pair Bridge” to link your simulator.
ClickFinish=Tap Finish to close the installer.
ButtonInstall=&Install
ButtonNext=&Install
ButtonFinish=&Take off
StatusExtractFiles=Loading flight systems...
StatusCreateIcons=Wiring up shortcuts...
StatusCreateRegistryEntries=Calibrating instruments...
StatusRegisterFiles=Spinning up engines...
StatusRollback=Aborting takeoff, restoring previous state...

[Files]
Source: "payload\{#MyAppExeName}";  DestDir: "{app}"; Flags: ignoreversion
Source: "payload\*";                DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "{#MyAppExeName}"
Source: "assets\app-icon.ico";      DestDir: "{app}"; Flags: ignoreversion

[Icons]
; All shortcuts always created — no user choice (one-click).
Name: "{group}\{#MyAppName}";              Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app-icon.ico"; Comment: "{#MyTagline}"
Name: "{group}\{#MyAppName} Dashboard";    Filename: "{#MyAppURL}/dashboard"; IconFilename: "{app}\app-icon.ico"; Comment: "Open your SimPilot.AI dashboard"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}";        Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app-icon.ico"; Comment: "{#MyTagline}"

[Registry]
; ---- Launch at Windows startup (per-user, hidden) — always on ----
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; \
  ValueType: string; ValueName: "SimPilotBridge"; ValueData: """{app}\{#MyAppExeName}"" --hidden"; \
  Flags: uninsdeletevalue

; ---- simpilot:// deep-link protocol handler — always registered ----
Root: HKCR; Subkey: "simpilot"; \
  ValueType: string; ValueName: ""; ValueData: "URL:SimPilot Protocol"; \
  Flags: uninsdeletekey
Root: HKCR; Subkey: "simpilot"; \
  ValueType: string; ValueName: "URL Protocol"; ValueData: ""
Root: HKCR; Subkey: "simpilot\DefaultIcon"; \
  ValueType: string; ValueName: ""; ValueData: """{app}\{#MyAppExeName}"",0"
Root: HKCR; Subkey: "simpilot\shell\open\command"; \
  ValueType: string; ValueName: ""; ValueData: """{app}\{#MyAppExeName}"" ""%1"""

; ---- Auto-update feed configuration — always on ----
Root: HKCU; Subkey: "Software\SimPilot\Bridge"; \
  ValueType: string; ValueName: "UpdateFeed"; ValueData: "{#MyUpdateFeedURL}"; \
  Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\SimPilot\Bridge"; \
  ValueType: dword;  ValueName: "AutoUpdate"; ValueData: "1"

; ---- Install metadata ----
Root: HKCU; Subkey: "Software\SimPilot\Bridge"; ValueType: string; ValueName: "InstallDir";  ValueData: "{app}";              Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\SimPilot\Bridge"; ValueType: string; ValueName: "Version";     ValueData: "{#MyAppVersion}";    Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\SimPilot\Bridge"; ValueType: string; ValueName: "InstalledOn"; ValueData: "{code:GetInstallTimestamp}"; Flags: uninsdeletevalue

[Run]
; Windows Firewall rule (best-effort, silent) — always added
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""SimPilot Bridge"" dir=in action=allow program=""{app}\{#MyAppExeName}"" enable=yes profile=any"; \
  Flags: runhidden; StatusMsg: "Opening firewall lane for telemetry..."

; Launch the bridge after install
Filename: "{app}\{#MyAppExeName}"; Description: "Launch {#MyAppName} now"; \
  Flags: nowait postinstall skipifsilent

; Open the dashboard so users can pair immediately
Filename: "{#MyAppURL}/dashboard"; Description: "Open SimPilot.AI dashboard to pair"; \
  Flags: shellexec nowait postinstall skipifsilent unchecked

[UninstallRun]
Filename: "taskkill.exe"; Parameters: "/F /IM {#MyAppExeName}"; Flags: runhidden; RunOnceId: "KillBridge"
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""SimPilot Bridge"""; Flags: runhidden; RunOnceId: "RemoveFirewall"

[UninstallDelete]
Type: filesandordirs; Name: "{app}"
Type: filesandordirs; Name: "{userappdata}\SimPilot\Bridge\logs"
Type: filesandordirs; Name: "{userappdata}\SimPilot\Bridge\cache"

[Code]
// ---------------------------------------------------------------------------
//  Cockpit-themed wizard polish — Welcome + Installing + Finished pages only
//  Palette (BGR — Inno uses BGR, not RGB):
//    Cyan  #21D4FD → BGR $FDD421   (primary accent)
//    Teal  #009199 → BGR $999100   (brand)
//    Ice   #E6F7FF → BGR $FFF7E6   (light text on dark)
//    Muted                        (sub-caption)
// ---------------------------------------------------------------------------

const
  COLOR_CYAN  = $FDD421;
  COLOR_TEAL  = $999100;
  COLOR_ICE   = $FFF7E6;
  COLOR_MUTED = $A89888;

var
  TaglineLabel: TLabel;

function GetInstallTimestamp(Param: string): string;
begin
  Result := GetDateTimeString('yyyy-mm-dd"T"hh:nn:ss', '-', ':');
end;

procedure InitializeWizard;
begin
  // ---- Welcome page typography ----
  WizardForm.WelcomeLabel1.Font.Name  := 'Segoe UI Semibold';
  WizardForm.WelcomeLabel1.Font.Size  := 20;
  WizardForm.WelcomeLabel1.Font.Color := COLOR_CYAN;

  WizardForm.WelcomeLabel2.Font.Name  := 'Segoe UI';
  WizardForm.WelcomeLabel2.Font.Size  := 10;
  WizardForm.WelcomeLabel2.Font.Color := COLOR_ICE;

  // ---- Finished page typography ----
  WizardForm.FinishedHeadingLabel.Font.Name  := 'Segoe UI Semibold';
  WizardForm.FinishedHeadingLabel.Font.Size  := 18;
  WizardForm.FinishedHeadingLabel.Font.Color := COLOR_CYAN;

  WizardForm.FinishedLabel.Font.Name  := 'Segoe UI';
  WizardForm.FinishedLabel.Font.Size  := 10;
  WizardForm.FinishedLabel.Font.Color := COLOR_ICE;

  // ---- Buttons ----
  WizardForm.NextButton.Font.Name   := 'Segoe UI Semibold';
  WizardForm.NextButton.Font.Style  := [fsBold];
  WizardForm.BackButton.Font.Name   := 'Segoe UI';
  WizardForm.CancelButton.Font.Name := 'Segoe UI';

  // ---- Tagline strip beneath the wizard ----
  TaglineLabel := TLabel.Create(WizardForm);
  TaglineLabel.Parent      := WizardForm;
  TaglineLabel.Caption     := '  ✈  {#MyTagline}   •   v{#MyAppVersion}   •   {#MyAppPublisher}';
  TaglineLabel.Font.Name   := 'Segoe UI';
  TaglineLabel.Font.Size   := 8;
  TaglineLabel.Font.Color  := COLOR_MUTED;
  TaglineLabel.AutoSize    := False;
  TaglineLabel.Left        := 0;
  TaglineLabel.Top         := WizardForm.ClientHeight - 44;
  TaglineLabel.Width       := WizardForm.ClientWidth;
  TaglineLabel.Height      := 18;
  TaglineLabel.Transparent := True;
  TaglineLabel.Anchors     := [akLeft, akRight, akBottom];
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  // Brighten the install progress caption
  if (CurPageID = wpInstalling) and Assigned(WizardForm.StatusLabel) then
  begin
    WizardForm.StatusLabel.Font.Name  := 'Segoe UI';
    WizardForm.StatusLabel.Font.Color := COLOR_TEAL;
    WizardForm.StatusLabel.Font.Style := [fsBold];
  end;
end;

function InitializeSetup(): Boolean;
var
  Version: TWindowsVersion;
begin
  GetWindowsVersionEx(Version);
  if Version.Major < 10 then
  begin
    MsgBox('SimPilot Bridge requires Windows 10 or later.' + #13#10 + #13#10 +
           'Please update Windows and try again.', mbError, MB_OK);
    Result := False;
    Exit;
  end;
  Result := True;
end;

function InitializeUninstall(): Boolean;
begin
  Result := MsgBox('Uninstall SimPilot Bridge?' + #13#10 + #13#10 +
                   'Your SimPilot.AI account, logbook, and cloud data will not be affected — only the local bridge app will be removed.',
                   mbConfirmation, MB_YESNO) = IDYES;
end;
