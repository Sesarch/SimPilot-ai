; ============================================================================
;  SimPilot Bridge — Modern Cockpit-Themed Inno Setup Installer
;  Premium wizard UI: dark cockpit accents, animated progress, custom pages,
;  shortcuts, autostart, deep-link protocol, and built-in auto-update channel.
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
UsePreviousTasks=yes
ChangesAssociations=yes
TimeStampsInUTC=yes
DisableFinishedPage=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Messages]
; Custom wizard copy with a more premium, aviation-flavored tone
WelcomeLabel1=Welcome aboard%n{#MyAppName}
WelcomeLabel2=You are about to install {#MyAppName} {#MyAppVersion}.%n%n{#MyAppName} links your flight simulator (MSFS, X-Plane, P3D) to your SimPilot.AI flight deck for live telemetry, automatic logbook entries, and AI-powered debriefs.%n%nClose any running simulators before continuing for the smoothest install.
FinishedHeadingLabel=Pre-flight checklist complete
FinishedLabelNoIcons={#MyAppName} is installed and ready for taxi.
FinishedLabel={#MyAppName} is installed and ready for taxi.%n%nLaunch the app, sign in to your SimPilot.AI dashboard, and tap “Pair Bridge” to link your simulator.
ClickFinish=Tap Finish to close the installer.
SelectDirLabel3={#MyAppName} will be installed into the following folder.
SelectDirBrowseLabel=To continue, click Next. To choose a different folder, click Browse.
ReadyLabel1=Ready for departure
ReadyLabel2a=Setup is ready to install {#MyAppName} on your computer.
ReadyLabel2b=Click Install to begin, or Back to review your selections.
ButtonInstall=&Install
ButtonNext=&Next
ButtonFinish=&Take off
StatusExtractFiles=Loading flight systems...
StatusCreateIcons=Wiring up shortcuts...
StatusCreateRegistryEntries=Calibrating instruments...
StatusRegisterFiles=Spinning up engines...
StatusRollback=Aborting takeoff, restoring previous state...

[Tasks]
Name: "desktopicon";    Description: "Pin a &desktop shortcut";                          GroupDescription: "Shortcuts:"
Name: "startmenuicon";  Description: "Add a Start &Menu entry";                          GroupDescription: "Shortcuts:"; Flags: checkedonce
Name: "autostart";      Description: "Launch {#MyAppName} silently when Windows &starts"; GroupDescription: "Startup:"
Name: "deeplink";       Description: "Register the simpilot:// browser protocol (one-click pairing from your dashboard)"; GroupDescription: "Integration:"; Flags: checkedonce
Name: "autoupdate";     Description: "Keep {#MyAppName} up to date automatically";       GroupDescription: "Updates:"; Flags: checkedonce
Name: "firewall";       Description: "Allow {#MyAppName} through Windows Firewall (recommended)"; GroupDescription: "Network:"; Flags: checkedonce

[Files]
Source: "payload\{#MyAppExeName}";  DestDir: "{app}"; Flags: ignoreversion
Source: "payload\*";                DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "{#MyAppExeName}"
Source: "assets\app-icon.ico";      DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}";              Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app-icon.ico"; Comment: "{#MyTagline}"; Tasks: startmenuicon
Name: "{group}\{#MyAppName} Dashboard";    Filename: "{#MyAppURL}/dashboard"; IconFilename: "{app}\app-icon.ico"; Comment: "Open your SimPilot.AI dashboard"; Tasks: startmenuicon
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}";                                  Tasks: startmenuicon
Name: "{autodesktop}\{#MyAppName}";        Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app-icon.ico"; Comment: "{#MyTagline}"; Tasks: desktopicon

[Registry]
; ---- Launch at Windows startup (per-user, hidden) ----
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
Root: HKCU; Subkey: "Software\SimPilot\Bridge"; ValueType: string; ValueName: "InstallDir";    ValueData: "{app}";              Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\SimPilot\Bridge"; ValueType: string; ValueName: "Version";       ValueData: "{#MyAppVersion}";    Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\SimPilot\Bridge"; ValueType: string; ValueName: "InstalledOn";   ValueData: "{code:GetInstallTimestamp}"; Flags: uninsdeletevalue

[Run]
; Windows Firewall rule (best-effort, silent)
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""SimPilot Bridge"" dir=in action=allow program=""{app}\{#MyAppExeName}"" enable=yes profile=any"; \
  Flags: runhidden; Tasks: firewall; StatusMsg: "Opening firewall lane for telemetry..."

; Launch the bridge after install
Filename: "{app}\{#MyAppExeName}"; Description: "Launch {#MyAppName} now"; \
  Flags: nowait postinstall skipifsilent unchecked

; Open the dashboard so users can pair immediately
Filename: "{#MyAppURL}/dashboard"; Description: "Open SimPilot.AI dashboard to pair"; \
  Flags: shellexec nowait postinstall skipifsilent

[UninstallRun]
; Best-effort: stop the bridge before uninstall
Filename: "taskkill.exe"; Parameters: "/F /IM {#MyAppExeName}"; Flags: runhidden; RunOnceId: "KillBridge"
; Remove firewall rule
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""SimPilot Bridge"""; Flags: runhidden; RunOnceId: "RemoveFirewall"

[UninstallDelete]
Type: filesandordirs; Name: "{app}"
Type: filesandordirs; Name: "{userappdata}\SimPilot\Bridge\logs"
Type: filesandordirs; Name: "{userappdata}\SimPilot\Bridge\cache"

[Code]
// ---------------------------------------------------------------------------
//  Cockpit-themed wizard polish
//  Palette (BGR — Inno uses BGR, not RGB):
//    Cyan  #21D4FD → BGR $FDD421   (primary accent)
//    Teal  #009199 → BGR $999100   (brand)
//    Slate #0B1220 → BGR $20120B   (deep cockpit background)
//    Ice   #E6F7FF → BGR $FFF7E6   (light text on dark)
// ---------------------------------------------------------------------------

const
  COLOR_CYAN     = $FDD421;
  COLOR_TEAL     = $999100;
  COLOR_SLATE    = $20120B;
  COLOR_ICE      = $FFF7E6;
  COLOR_MUTED    = $A89888;

var
  TaglineLabel: TLabel;
  StatusBar: TLabel;
  AgreeCheckBox: TNewCheckBox;
  AgreeHintLabel: TLabel;

function GetInstallTimestamp(Param: string): string;
begin
  Result := GetDateTimeString('yyyy-mm-dd"T"hh:nn:ss', '-', ':');
end;

procedure StylePageHeading(Page: TWizardPage);
begin
  if Page = nil then Exit;
  if Assigned(WizardForm.PageNameLabel) then
  begin
    WizardForm.PageNameLabel.Font.Name  := 'Segoe UI Semibold';
    WizardForm.PageNameLabel.Font.Size  := 13;
    WizardForm.PageNameLabel.Font.Color := COLOR_TEAL;
  end;
  if Assigned(WizardForm.PageDescriptionLabel) then
  begin
    WizardForm.PageDescriptionLabel.Font.Name := 'Segoe UI';
    WizardForm.PageDescriptionLabel.Font.Size := 9;
  end;
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

  WizardForm.FinishedLabel.Font.Name := 'Segoe UI';
  WizardForm.FinishedLabel.Font.Size := 10;
  WizardForm.FinishedLabel.Font.Color := COLOR_ICE;

  // ---- Buttons: cockpit accent ----
  WizardForm.NextButton.Font.Name   := 'Segoe UI Semibold';
  WizardForm.NextButton.Font.Style  := [fsBold];
  WizardForm.BackButton.Font.Name   := 'Segoe UI';
  WizardForm.CancelButton.Font.Name := 'Segoe UI';

  // ---- Tagline strip beneath the wizard header ----
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

  // ---- Style the inner page headers ----
  StylePageHeading(nil);

  // ---- Final consent checkbox on the Ready page (gates the Install button) ----
  AgreeCheckBox := TNewCheckBox.Create(WizardForm);
  AgreeCheckBox.Parent      := WizardForm.ReadyPage;
  AgreeCheckBox.Left        := 0;
  AgreeCheckBox.Width       := WizardForm.ReadyPage.ClientWidth;
  AgreeCheckBox.Top         := WizardForm.ReadyPage.ClientHeight - 44;
  AgreeCheckBox.Height      := 22;
  AgreeCheckBox.Caption     := '  I have read and agree to the SimPilot Bridge License Agreement and Terms of Use.';
  AgreeCheckBox.Font.Name   := 'Segoe UI Semibold';
  AgreeCheckBox.Font.Size   := 9;
  AgreeCheckBox.Font.Color  := COLOR_CYAN;
  AgreeCheckBox.Checked     := False;
  AgreeCheckBox.Anchors     := [akLeft, akRight, akBottom];
  AgreeCheckBox.OnClick     := @AgreeCheckBoxClick;

  AgreeHintLabel := TLabel.Create(WizardForm);
  AgreeHintLabel.Parent     := WizardForm.ReadyPage;
  AgreeHintLabel.Left       := 22;
  AgreeHintLabel.Width      := WizardForm.ReadyPage.ClientWidth - 22;
  AgreeHintLabel.Top        := WizardForm.ReadyPage.ClientHeight - 22;
  AgreeHintLabel.Height     := 16;
  AgreeHintLabel.Caption    := 'Tick the box above to enable the Install button.';
  AgreeHintLabel.Font.Name  := 'Segoe UI';
  AgreeHintLabel.Font.Size  := 8;
  AgreeHintLabel.Font.Color := COLOR_MUTED;
  AgreeHintLabel.Anchors    := [akLeft, akRight, akBottom];
end;

procedure AgreeCheckBoxClick(Sender: TObject);
begin
  if WizardForm.CurPageID = wpReady then
  begin
    WizardForm.NextButton.Enabled := AgreeCheckBox.Checked;
    AgreeHintLabel.Visible := not AgreeCheckBox.Checked;
  end;
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  // Re-apply heading styling each page change (Inno re-creates labels)
  case CurPageID of
    wpSelectDir, wpSelectComponents, wpSelectTasks, wpReady, wpInstalling:
      StylePageHeading(nil);
  end;

  // Gate the Install button on the Ready page behind the consent checkbox
  if CurPageID = wpReady then
  begin
    WizardForm.NextButton.Enabled := AgreeCheckBox.Checked;
    AgreeHintLabel.Visible := not AgreeCheckBox.Checked;
  end
  else
  begin
    // Re-enable Next on every other page so it doesn't get stuck disabled
    WizardForm.NextButton.Enabled := True;
  end;

  // On the install page, brighten the progress bar caption
  if (CurPageID = wpInstalling) and Assigned(WizardForm.StatusLabel) then
  begin
    WizardForm.StatusLabel.Font.Name  := 'Segoe UI';
    WizardForm.StatusLabel.Font.Color := COLOR_TEAL;
    WizardForm.StatusLabel.Font.Style := [fsBold];
  end;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  // Hard-stop safeguard: never allow install without consent
  if (CurPageID = wpReady) and (not AgreeCheckBox.Checked) then
  begin
    MsgBox('Please tick the agreement checkbox to continue.', mbInformation, MB_OK);
    Result := False;
    Exit;
  end;
  Result := True;
end;

function InitializeSetup(): Boolean;
var
  Version: TWindowsVersion;
begin
  GetWindowsVersionEx(Version);
  // Friendly modern-Windows check (already enforced by MinVersion, but messaged nicely)
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
