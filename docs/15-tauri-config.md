# Tauri Configuration

## Overview

This document describes the Tauri 2.x configuration for the Voboost Installer.

---

## Main Configuration

```json
// src-tauri/tauri.conf.json

{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Voboost Installer",
  "version": "1.0.0",
  "identifier": "ru.voboost.installer",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:5173",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "Voboost Installer",
        "width": 900,
        "height": 700,
        "resizable": false,
        "fullscreen": false,
        "center": true,
        "decorations": true,
        "transparent": false,
        "minWidth": 900,
        "minHeight": 700,
        "maxWidth": 900,
        "maxHeight": 700
      }
    ],
    "security": {
      "csp": "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:"
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
      "resources/adb/**/*"
    ],
    "category": "Utility",
    "shortDescription": "Install Voboost on your vehicle",
    "longDescription": "Cross-platform installer for Voboost Android application. Supports Windows and macOS.",
    "copyright": "© 2024 Voboost",
    "windows": {
      "nsis": {
        "installerIcon": "icons/icon.ico",
        "headerImage": "icons/header.bmp",
        "sidebarImage": "icons/sidebar.bmp",
        "installMode": "currentUser",
        "languages": ["English", "Russian"],
        "displayLanguageSelector": false
      },
      "wix": null
    },
    "macOS": {
      "minimumSystemVersion": "11.0",
      "dmg": {
        "appPosition": { "x": 180, "y": 170 },
        "applicationFolderPosition": { "x": 480, "y": 170 },
        "windowSize": { "width": 660, "height": 400 }
      },
      "hardenedRuntime": true,
      "gatekeeperAssess": false
    },
    "linux": {
      "appimage": {
        "bundleMediaFramework": false
      }
    }
  },
  "plugins": {
    "os": {}
  }
}
```

---

## Capabilities

```json
// src-tauri/capabilities/default.json

{
  "$schema": "https://schema.tauri.app/config/2/capability",
  "identifier": "default",
  "description": "Default capabilities for the installer",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:event:default",
    "core:window:default",
    "os:default"
  ]
}
```

---

## Cargo Configuration

```toml
# src-tauri/Cargo.toml

[package]
name = "voboost-installer"
version = "1.0.0"
description = "Voboost Installer"
authors = ["Voboost Team"]
edition = "2021"
rust-version = "1.70"

[lib]
name = "voboost_installer_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = ["devtools"] }
tauri-plugin-os = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
reqwest = { version = "0.11", features = ["json", "stream", "rustls-tls"], default-features = false }
sha2 = "0.10"
hex = "0.4"
tokio = { version = "1", features = ["full"] }
futures-util = "0.3"
chrono = { version = "0.4", features = ["serde"] }
lazy_static = "1.4"
thiserror = "1"
log = "0.4"

[target.'cfg(target_os = "macos")'.dependencies]
# macOS-specific dependencies if needed

[target.'cfg(target_os = "windows")'.dependencies]
# Windows-specific dependencies if needed

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]

[profile.release]
panic = "abort"
codegen-units = 1
lto = true
opt-level = "s"
strip = true
```

---

## Build Script

```rust
// src-tauri/build.rs

fn main() {
    tauri_build::build()
}
```

---

## Main Entry Point

```rust
// src-tauri/src/main.rs

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    voboost_installer_lib::run()
}
```

```rust
// src-tauri/src/lib.rs

mod commands;
mod utils;

use commands::{adb, download, install};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .invoke_handler(tauri::generate_handler![
            // ADB commands
            adb::start_adb_server,
            adb::get_devices,
            adb::execute_adb,
            adb::execute_adb_with_timeout,
            // Download commands
            download::fetch_releases,
            download::download_apk,
            download::check_existing_apk,
            // Install commands
            install::get_install_steps,
            install::execute_install_step,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## Resource Bundling

### ADB Binaries

Place ADB binaries in `src-tauri/resources/adb/`:

```
src-tauri/resources/adb/
├── win/
│   ├── adb.exe
│   ├── AdbWinApi.dll
│   └── AdbWinUsbApi.dll
└── mac/
    └── adb
```

### Accessing Resources at Runtime

```rust
use tauri::AppHandle;
use std::path::PathBuf;

pub fn get_resource_path(app: &AppHandle, resource: &str) -> Result<PathBuf, String> {
    app.path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource dir: {}", e))
        .map(|dir| dir.join(resource))
}

// Usage
let adb_path = get_resource_path(&app, "adb/win/adb.exe")?;
```

---

## Window Configuration

### Fixed Size Window

The installer uses a fixed 900x700 window:

```json
{
  "width": 900,
  "height": 700,
  "resizable": false,
  "minWidth": 900,
  "minHeight": 700,
  "maxWidth": 900,
  "maxHeight": 700
}
```

**Why fixed size?**
- Consistent layout across platforms
- Simpler CSS (no responsive design needed)
- Wizard-style UI works best at fixed size

### Window Decorations

```json
{
  "decorations": true,
  "transparent": false
}
```

- Native title bar and window controls
- No custom title bar (simpler, more native feel)

---

## Bundle Configuration

### Windows (NSIS)

```json
{
  "windows": {
    "nsis": {
      "installerIcon": "icons/icon.ico",
      "installMode": "currentUser",
      "languages": ["English", "Russian"]
    }
  }
}
```

**Install Mode Options:**
- `currentUser` - Install for current user only (no admin required)
- `perMachine` - Install for all users (requires admin)

### macOS (DMG)

```json
{
  "macOS": {
    "minimumSystemVersion": "11.0",
    "dmg": {
      "appPosition": { "x": 180, "y": 170 },
      "applicationFolderPosition": { "x": 480, "y": 170 }
    }
  }
}
```

**DMG Layout:**
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│     ┌─────────┐              ┌─────────┐           │
│     │  App    │    ───▶      │  Apps   │           │
│     │  Icon   │              │ Folder  │           │
│     └─────────┘              └─────────┘           │
│                                                     │
│     Drag to Applications to install                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Environment Variables

### Development

Create `.env` file (not committed):

```env
# Development settings
VITE_RELEASES_URL=https://raw.githubusercontent.com/voboost/voboost-install/main/releases.json
```

### Production

In production, the URL is hardcoded in Rust:

```rust
const RELEASES_URL: &str = "https://raw.githubusercontent.com/voboost/voboost-install/main/releases.json";
```

---

## Vite Configuration

```typescript
// vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],

  // Prevent vite from obscuring rust errors
  clearScreen: false,

  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 5174,
        }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },

  build: {
    // Tauri uses Chromium on Windows and WebKit on macOS
    target: process.env.TAURI_ENV_PLATFORM === 'windows'
      ? 'chrome105'
      : 'safari14',
    // Don't minify for debug builds
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    // Produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },

  // Env prefix for client-side variables
  envPrefix: ['VITE_', 'TAURI_ENV_'],
});
```

---

## TypeScript Configuration

```json
// tsconfig.json

{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

```json
// tsconfig.node.json

{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

---

## Scripts

```json
// package.json scripts

{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "lint": "eslint src --ext ts,tsx",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  }
}
```
