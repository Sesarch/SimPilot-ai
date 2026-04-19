# Changelog

All notable changes to **SimPilot Bridge** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> 💡 You don't have to update this file by hand for every PR — the
> [Release Drafter](.github/workflows/release-drafter.yml) workflow keeps a
> draft release on GitHub up to date based on merged PR labels. When you cut
> a release, copy the drafted notes into the section below.

## [Unreleased]

### ✨ Features
-

### 🐛 Bug Fixes
-

### 🔒 Security
-

### 🚀 Performance
-

### 📚 Documentation
-

### 🧰 Maintenance
-

---

## [1.0.0] — TBD

First public release of SimPilot Bridge.

### ✨ Features
- Tray-icon Electron desktop app with cockpit-themed UI.
- Telemetry sidecar streaming MSFS 2024 (SimConnect) and X-Plane 12 (UDP)
  to `ws://127.0.0.1:8080`.
- One-click pairing via the `simpilot://pair?token=...` deep link.
- Inno Setup Windows installer with shortcuts, autostart, deep-link protocol
  registration, and an auto-update channel.
- Built-in auto-updater that polls the GitHub Releases `latest.yml` feed
  every 6 hours, verifies SHA-512, and prompts before installing.
- "Updates" tab in the desktop app + "Check for updates…" tray menu item.

### 🔒 Security
- WebSocket bound to `127.0.0.1` only.
- JWT-authenticated handshake (Supabase session tokens **or** short-lived
  pairing JWTs signed with `BRIDGE_PAIRING_SECRET`).

[Unreleased]: https://github.com/simpilot-ai/bridge/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/simpilot-ai/bridge/releases/tag/v1.0.0
