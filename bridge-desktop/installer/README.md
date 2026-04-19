# SimPilot Bridge — Windows Installer

A modern, cockpit-themed Inno Setup installer for `SimPilotBridge.exe`.

## What you get

- 🎨 Branded wizard UI (cyan-on-dark sidebar + header banner)
- 📁 Installs to `Program Files\SimPilot\Bridge`
- 🖥️ Optional Desktop & Start Menu shortcuts
- 🚀 Optional "Launch at Windows startup" (runs hidden in tray)
- 🔗 Optional `simpilot://` deep-link protocol (one-click pairing from the web app)
- 🔄 Optional auto-update channel (reads from GitHub Releases `latest.yml`)
- 🛡️ Code-sign-ready (just plug in your `signtool` cert in the build script)
- 🗑️ Clean uninstaller (kills running process, removes registry keys & logs)

## Folder layout

```
installer/
├── SimPilotBridge.iss          ← The Inno Setup script (this is the build entry point)
├── README.md                   ← You are here
├── assets/
│   ├── app-icon.png            ← Source icon (convert to .ico — see below)
│   ├── app-icon.ico            ← (you create this — see step 2)
│   ├── wizard-sidebar.png      ← Source sidebar art (convert to .bmp — see below)
│   ├── wizard-sidebar.bmp      ← (you create this — see step 2)
│   ├── wizard-header.png       ← Source header art (convert to .bmp — see below)
│   ├── wizard-header.bmp       ← (you create this — see step 2)
│   └── license.txt             ← EULA shown in the wizard
├── payload/
│   └── SimPilotBridge.exe      ← (you drop your compiled .exe here)
└── output/
    └── SimPilotBridge-Setup-1.0.0.exe   ← (generated after compile)
```

## Build steps (one-time setup)

### 1. Install Inno Setup
Download the free compiler from <https://jrsoftware.org/isdl.php> (≈6 MB, 2-min install).

### 2. Convert the branded artwork
Inno Setup needs `.bmp` for wizard images and `.ico` for the app icon.

**Easiest path** — open each PNG in Paint, then `File → Save As`:
- `wizard-sidebar.png`  →  `wizard-sidebar.bmp`  (24-bit BMP)
- `wizard-header.png`   →  `wizard-header.bmp`   (24-bit BMP)
- `app-icon.png`        →  `app-icon.ico`        (use any free converter, e.g. <https://icoconvert.com>)

Or, with ImageMagick installed:
```bash
magick assets/wizard-sidebar.png  -resize 164x314!  BMP3:assets/wizard-sidebar.bmp
magick assets/wizard-header.png   -resize 150x57!   BMP3:assets/wizard-header.bmp
magick assets/app-icon.png        -define icon:auto-resize=256,128,64,48,32,16  assets/app-icon.ico
```

### 3. Drop in your bridge executable
Copy your compiled `SimPilotBridge.exe` into  `installer/payload/`.

### 4. Compile
Right-click `SimPilotBridge.iss`  →  **Compile**
…or from the command line:
```cmd
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" SimPilotBridge.iss
```

The signed-ready installer appears at  `installer/output/SimPilotBridge-Setup-1.0.0.exe`.

## Optional: code-signing

Add this near the top of `SimPilotBridge.iss` to auto-sign the installer **and** the bundled `.exe`:

```ini
SignTool=mysigntool $f
SignedUninstaller=yes
```

…and register the tool in Inno Setup via  *Tools → Configure Sign Tools*:

```
mysigntool = "C:\Path\To\signtool.exe" sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /a $f
```

## How the optional features wire up

| Task | What it does |
|---|---|
| **Desktop / Start Menu shortcuts** | Standard `[Icons]` entries with the branded `.ico`. |
| **Launch at startup** | Writes `HKCU\…\Run\SimPilotBridge = "…\SimPilotBridge.exe" --hidden`. Your bridge should detect `--hidden` and start minimized to tray. |
| **simpilot:// protocol** | Registers under `HKCR\simpilot`. Browsers will pass the full URL as `argv[1]` (e.g. `simpilot://pair?token=abc123`). Parse it on launch and POST to your local pairing endpoint. |
| **Auto-update** | Writes `HKCU\Software\SimPilot\Bridge\UpdateFeed`. Have the bridge fetch that URL on launch (a `latest.yml` published by your GitHub release workflow) and prompt the user when a newer version is available. |

## Versioning

Bump `MyAppVersion` at the top of the `.iss` file for each release. The
output filename and registry `Version` value update automatically.
