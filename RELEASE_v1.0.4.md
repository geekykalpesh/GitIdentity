# 🛡️ Release Notes — GitIdentity v1.0.4

`GitIdentity v1.0.4 — High-Visibility SSH Key Display & Bulletproof Clipboard Copy Fix 🔑`

---

<h1 align="center">GitIdentity v1.0.4</h1>

<p align="center">
  <b>Multi-Account SSH & Repository Identity Manager for GitHub</b><br>
  <i>Managed SSH Key Routing & Native Git IncludeIf Identity Switcher</i>
</p>

---

## 🌟 What's New in v1.0.4

### 1. 🔑 High-Visibility SSH Key Box & Full Public Key Rendering
- Fixed account cards in `AccountManager` where `publicKey` text was previously undefined.
- Public SSH key is now dynamically read from disk (`~/.ssh/id_ed25519_*.pub`) and fully displayed without text clipping or vertical overflow.
- Single-click anywhere inside the SSH key box automatically highlights and selects the entire key string.

### 2. ⚡ Bulletproof 3-Tier Clipboard Copy & "Select All" Button
- Added native Electron IPC clipboard handler (`system:copy-to-clipboard`) that bypasses browser window focus restrictions.
- Integrated a 3-tier fallback strategy (Electron Native IPC ➔ Web Navigator API ➔ Dynamic Textarea `execCommand`).
- Added a dedicated **Select All** button alongside **Copy Public Key** so users can instantly select the full key for manual copying (`Ctrl+C` / `Cmd+C`).

### 3. 🎯 Streamlined Clean Releases (1 Installer per OS)
- Simplified release targets so users get 1 clean, unambiguous installer per operating system without confusing redundant choices.

---

## 📦 Multi-Platform Release Assets

| Operating System | Binary Name | Type |
| :--- | :--- | :--- |
| **Windows** | `GitIdentity-Windows-Installer-1.0.4.exe` | Standard Windows Setup Installer |
| **macOS** | `GitIdentity-macOS-Installer-1.0.4.dmg` | macOS Disk Image Installer |
| **Linux** | `GitIdentity-Linux-Installer-1.0.4.AppImage` | Universal Linux Executable Binary |

---

Made with ❤️ by [GeekyKalpesh](https://geekykalpesh.com)
