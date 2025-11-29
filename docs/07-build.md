# Build and Distribution

## Prerequisites

### All Platforms

- Node.js 18+ and npm
- Rust 1.70+ (install via [rustup](https://rustup.rs/))

### Windows

- Visual Studio Build Tools 2019+ with C++ workload
- WebView2 (usually pre-installed on Windows 10/11)

### macOS

- Xcode Command Line Tools: `xcode-select --install`
- For universal builds: both x64 and ARM64 Rust targets

## Project Setup

```bash
# Clone repository
cd /Users/vitaly/Yandex.Disk.localized/Проекты/voboost/voboost-install

# Install Node dependencies
npm install

# Install Rust targets (macOS only, for universal binary)
rustup target add x86_64-apple-darwin
rustup target add aarch64-apple-darwin
```

## Development

```bash
# Start development server with hot reload
npm run tauri dev

# The app will open automatically
# Frontend changes hot reload instantly
# Rust changes require rebuild (automatic)
```

## Build Commands

### Build for Current Platform

```bash
# Build release version
npm run tauri build
```

### Windows Builds (on Windows)

```bash
# x64 build (most common)
npm run tauri build -- --target x86_64-pc-windows-msvc

# Output files:
# - src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msi/Voboost Installer_1.0.0_x64_en-US.msi
# - src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/Voboost Installer_1.0.0_x64-setup.exe
```

### macOS Builds (on macOS)

```bash
# Intel Mac (x64)
npm run tauri build -- --target x86_64-apple-darwin

# Apple Silicon (ARM64)
npm run tauri build -- --target aarch64-apple-darwin

# Universal binary (both architectures)
npm run tauri build -- --target universal-apple-darwin

# Output files:
# - src-tauri/target/universal-apple-darwin/release/bundle/dmg/Voboost Installer_1.0.0_universal.dmg
# - src-tauri/target/universal-apple-darwin/release/bundle/macos/Voboost Installer.app
```

## Tauri Configuration

```json
// src-tauri/tauri.conf.json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Voboost Installer",
  "version": "1.0.0",
  "identifier": "ru.voboost.installer",
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "frontendDist": "../dist",
    "devUrl": "http://localhost:5173"
  },
  "app": {
    "windows": [
      {
        "title": "Voboost Installer",
        "width": 900,
        "height": 700,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true,
        "center": true,
        "decorations": true,
        "transparent": false
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "resources": [
      "resources/adb/**"
    ],
    "copyright": "© 2024 Voboost. Licensed under GPL v3.0",
    "category": "Utility",
    "shortDescription": "Installer for Voboost Android app",
    "longDescription": "Desktop installer for Voboost app on Voyah vehicle head units",
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": "",
      "wix": null,
      "nsis": {
        "installerIcon": "icons/icon.ico",
        "headerImage": null,
        "sidebarImage": null,
        "installMode": "currentUser",
        "languages": ["English", "Russian"],
        "displayLanguageSelector": true
      }
    },
    "macOS": {
      "minimumSystemVersion": "10.15",
      "signingIdentity": null,
      "providerShortName": null,
      "entitlements": null,
      "exceptionDomain": null,
      "frameworks": [],
      "dmg": {
        "appPosition": { "x": 180, "y": 170 },
        "applicationFolderPosition": { "x": 480, "y": 170 },
        "windowSize": { "width": 660, "height": 400 }
      }
    },
    "linux": {
      "appimage": {
        "bundleMediaFramework": false
      },
      "deb": {
        "depends": []
      }
    }
  }
}
```

## Output Files

### Windows

| File | Type | Description |
|------|------|-------------|
| `Voboost Installer_1.0.0_x64-setup.exe` | NSIS | Self-extracting installer (~25MB) |
| `Voboost Installer_1.0.0_x64_en-US.msi` | MSI | Windows Installer package (~25MB) |

**Recommended**: Use NSIS `.exe` for end users (simpler installation).

### macOS

| File | Type | Description |
|------|------|-------------|
| `Voboost Installer_1.0.0_universal.dmg` | DMG | Disk image with app (~45MB) |
| `Voboost Installer.app` | App Bundle | Application bundle |

**Recommended**: Use universal DMG for distribution (works on Intel and Apple Silicon).

## Icon Generation

Tauri requires PNG icons. Generate from SVG source:

```bash
#!/bin/bash
# scripts/generate-icons.sh

SVG_SOURCE="src/assets/images/logo.svg"
ICONS_DIR="src-tauri/icons"

# Create icons directory
mkdir -p "$ICONS_DIR"

# Generate PNG icons using rsvg-convert (install: brew install librsvg)
rsvg-convert -w 32 -h 32 "$SVG_SOURCE" > "$ICONS_DIR/32x32.png"
rsvg-convert -w 128 -h 128 "$SVG_SOURCE" > "$ICONS_DIR/128x128.png"
rsvg-convert -w 256 -h 256 "$SVG_SOURCE" > "$ICONS_DIR/128x128@2x.png"
rsvg-convert -w 512 -h 512 "$SVG_SOURCE" > "$ICONS_DIR/icon.png"

# Generate ICO for Windows (requires ImageMagick)
convert "$ICONS_DIR/icon.png" -define icon:auto-resize=256,128,64,48,32,16 "$ICONS_DIR/icon.ico"

# Generate ICNS for macOS (requires iconutil)
ICONSET_DIR="$ICONS_DIR/icon.iconset"
mkdir -p "$ICONSET_DIR"
rsvg-convert -w 16 -h 16 "$SVG_SOURCE" > "$ICONSET_DIR/icon_16x16.png"
rsvg-convert -w 32 -h 32 "$SVG_SOURCE" > "$ICONSET_DIR/icon_16x16@2x.png"
rsvg-convert -w 32 -h 32 "$SVG_SOURCE" > "$ICONSET_DIR/icon_32x32.png"
rsvg-convert -w 64 -h 64 "$SVG_SOURCE" > "$ICONSET_DIR/icon_32x32@2x.png"
rsvg-convert -w 128 -h 128 "$SVG_SOURCE" > "$ICONSET_DIR/icon_128x128.png"
rsvg-convert -w 256 -h 256 "$SVG_SOURCE" > "$ICONSET_DIR/icon_128x128@2x.png"
rsvg-convert -w 256 -h 256 "$SVG_SOURCE" > "$ICONSET_DIR/icon_256x256.png"
rsvg-convert -w 512 -h 512 "$SVG_SOURCE" > "$ICONSET_DIR/icon_256x256@2x.png"
rsvg-convert -w 512 -h 512 "$SVG_SOURCE" > "$ICONSET_DIR/icon_512x512.png"
rsvg-convert -w 1024 -h 1024 "$SVG_SOURCE" > "$ICONSET_DIR/icon_512x512@2x.png"
iconutil -c icns "$ICONSET_DIR" -o "$ICONS_DIR/icon.icns"
rm -rf "$ICONSET_DIR"

echo "Icons generated successfully!"
```

## ADB Binary Preparation

Download platform-specific ADB binaries:

```bash
#!/bin/bash
# scripts/prepare-adb.sh

ADB_VERSION="35.0.1"  # Check for latest version
RESOURCES_DIR="src-tauri/resources/adb"

mkdir -p "$RESOURCES_DIR/win"
mkdir -p "$RESOURCES_DIR/mac"

# Download Windows ADB
echo "Downloading Windows ADB..."
curl -L "https://dl.google.com/android/repository/platform-tools_r${ADB_VERSION}-windows.zip" -o /tmp/platform-tools-win.zip
unzip -j /tmp/platform-tools-win.zip "platform-tools/adb.exe" "platform-tools/AdbWinApi.dll" "platform-tools/AdbWinUsbApi.dll" -d "$RESOURCES_DIR/win"
rm /tmp/platform-tools-win.zip

# Download macOS ADB
echo "Downloading macOS ADB..."
curl -L "https://dl.google.com/android/repository/platform-tools_r${ADB_VERSION}-darwin.zip" -o /tmp/platform-tools-mac.zip
unzip -j /tmp/platform-tools-mac.zip "platform-tools/adb" -d "$RESOURCES_DIR/mac"
chmod +x "$RESOURCES_DIR/mac/adb"
rm /tmp/platform-tools-mac.zip

echo "ADB binaries prepared successfully!"
```

## Code Signing (Optional)

### Windows

For Windows code signing, you need a code signing certificate:

1. Obtain a certificate from a CA (e.g., DigiCert, Sectigo)
2. Install certificate in Windows Certificate Store
3. Update `tauri.conf.json`:

```json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": "YOUR_CERTIFICATE_THUMBPRINT",
      "timestampUrl": "http://timestamp.digicert.com"
    }
  }
}
```

### macOS

For macOS code signing and notarization:

1. Enroll in Apple Developer Program
2. Create Developer ID Application certificate
3. Update `tauri.conf.json`:

```json
{
  "bundle": {
    "macOS": {
      "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)"
    }
  }
}
```

4. For notarization, set environment variables:

```bash
export APPLE_ID="your@email.com"
export APPLE_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="YOUR_TEAM_ID"
```

## CI/CD with GitHub Actions

```yaml
# .github/workflows/build.yml
name: Build

on:
  push:
    tags:
      - 'v*'

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Setup Rust
        uses: dtolnay/rust-action@stable

      - name: Install dependencies
        run: npm ci

      - name: Prepare ADB
        run: bash scripts/prepare-adb.sh

      - name: Build
        run: npm run tauri build

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: windows-installer
          path: |
            src-tauri/target/release/bundle/nsis/*.exe
            src-tauri/target/release/bundle/msi/*.msi

  build-macos:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Setup Rust
        uses: dtolnay/rust-action@stable
        with:
          targets: x86_64-apple-darwin,aarch64-apple-darwin

      - name: Install dependencies
        run: npm ci

      - name: Prepare ADB
        run: bash scripts/prepare-adb.sh

      - name: Build universal binary
        run: npm run tauri build -- --target universal-apple-darwin

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: macos-installer
          path: |
            src-tauri/target/universal-apple-darwin/release/bundle/dmg/*.dmg

  release:
    needs: [build-windows, build-macos]
    runs-on: ubuntu-latest
    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v4

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            windows-installer/*
            macos-installer/*
```

## Cross-Platform Building

### Building Windows on macOS

There are several options for building Windows installers when developing on macOS:

#### Option 1: GitHub Actions (Recommended)

The easiest and most reliable way. GitHub provides Windows VMs for free.

**Pros**:
- No local setup needed
- Guaranteed to work
- Free for public repos (2000 minutes/month for private)
- Automatic releases

**Cons**:
- Need to push code to test builds
- Slower iteration (5-10 minutes per build)

See the GitHub Actions workflow above.

#### Option 2: Local Cross-Compilation (Experimental)

You can try cross-compiling on macOS, but it has limitations:

```bash
# Install Windows GNU target (MSVC doesn't work on macOS)
rustup target add x86_64-pc-windows-gnu

# Install MinGW cross-compiler
brew install mingw-w64

# Try to build (may have issues)
npm run tauri build -- --target x86_64-pc-windows-gnu
```

**Known Issues**:
- MSVC target (`x86_64-pc-windows-msvc`) does NOT work on macOS
- GNU target (`x86_64-pc-windows-gnu`) may work but:
  - Some Windows APIs may not work correctly
  - NSIS installer generation may fail
  - WebView2 bundling issues
  - ADB Windows binaries won't be tested

**Verdict**: Not recommended for production builds. Use for quick testing only.

#### Option 3: Virtual Machine (Parallels/VMware/UTM)

Run Windows in a VM on your Mac:

```bash
# Inside Windows VM
cd /path/to/project
npm install
npm run tauri build
```

**Pros**:
- Full Windows environment
- Can test the app visually
- Can test ADB with real device
- Works with Apple Silicon (ARM) via UTM or Parallels

**Cons**:
- Requires Windows license (~$140 or use evaluation)
- Uses disk space (20-50GB) and RAM (4-8GB)
- Slower than native

**Recommended VMs for Mac**:
| VM | Intel Mac | Apple Silicon | Free |
|----|-----------|---------------|------|
| Parallels | Yes | Yes | No ($100/year) |
| VMware Fusion | Yes | Yes | Yes (Personal) |
| UTM | Yes | Yes | Yes |
| VirtualBox | Yes | No | Yes |

#### Option 4: Remote Windows Machine

Use a cloud Windows VM or remote Windows PC:

```bash
# SSH/RDP to Windows machine
# Clone repo and build there
git clone https://github.com/user/voboost-install.git
cd voboost-install
npm install
npm run tauri build
```

**Cloud Options**:
- AWS EC2 Windows instance (~$0.10/hour for t3.medium)
- Azure Windows VM
- Google Cloud Windows VM
- GitHub Codespaces (limited Windows support)

---

### Recommended Development Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Mac (Development)                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  npm run tauri dev    →  Test on macOS              │    │
│  │  npm run tauri build  →  Build macOS .dmg           │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│                           ▼ git push                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions (CI/CD)                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  windows-latest  →  Build Windows .exe/.msi         │    │
│  │  macos-latest    →  Build macOS .dmg (universal)    │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  GitHub Releases  →  Download installers            │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**Daily Development**:
1. Develop and test on macOS with `npm run tauri dev`
2. Build macOS version locally with `npm run tauri build`
3. Push to GitHub when ready
4. GitHub Actions builds Windows version
5. Download Windows installer from Actions artifacts
6. Test on Windows VM or real Windows machine (optional)

---

### Building macOS on Windows

If you need to build macOS version on Windows:

**Short answer**: Not possible locally.

**Options**:
1. **GitHub Actions** (recommended) - use `macos-latest` runner
2. **macOS VM** - technically possible but violates Apple EULA
3. **Mac in Cloud** - services like MacStadium, AWS EC2 Mac

---

## Troubleshooting

### Windows

**Error: WebView2 not found**
- Install WebView2 Runtime from Microsoft

**Error: MSVC not found**
- Install Visual Studio Build Tools with C++ workload

### macOS

**Error: Command Line Tools not found**
```bash
xcode-select --install
```

**Error: Code signing failed**
- Check certificate is valid and not expired
- Ensure Keychain access is unlocked

### General

**Error: Rust compilation failed**
```bash
# Update Rust
rustup update

# Clean build
cargo clean
npm run tauri build
```

**Error: Node modules issues**
```bash
rm -rf node_modules package-lock.json
npm install
```
