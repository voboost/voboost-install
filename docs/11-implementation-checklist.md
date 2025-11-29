# Implementation Checklist

## Overview

This document provides a comprehensive checklist for implementing the Voboost Installer. Use this to track progress and ensure nothing is missed.

---

## Phase 1: Project Setup

### 1.1 Initialize Project
- [ ] Create Tauri project with React + TypeScript template
- [ ] Configure `package.json` with dependencies
- [ ] Set up `tsconfig.json` with strict mode
- [ ] Configure Vite for development
- [ ] Set up ESLint and Prettier
- [ ] Create `.editorconfig` (symlink to voboost-codestyle)
- [ ] Create `AGENTS.md` (reference voboost-codestyle)

### 1.2 Dependencies
```json
{
  "dependencies": {
    "@fluentui/react-components": "^9.x",
    "@fluentui/react-icons": "^2.x",
    "@tauri-apps/api": "^2.x",
    "@tauri-apps/plugin-os": "^2.x",
    "i18next": "^23.x",
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-i18next": "^14.x",
    "react-markdown": "^9.x",
    "react-use-wizard": "^2.x",
    "zustand": "^4.x"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.x",
    "@types/react": "^18.x",
    "@types/react-dom": "^18.x",
    "@vitejs/plugin-react": "^4.x",
    "typescript": "^5.x",
    "vite": "^5.x"
  }
}
```

### 1.3 Rust Dependencies
```toml
# src-tauri/Cargo.toml
[dependencies]
tauri = { version = "2", features = ["devtools"] }
tauri-plugin-os = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
reqwest = { version = "0.11", features = ["json", "stream"] }
sha2 = "0.10"
hex = "0.4"
tokio = { version = "1", features = ["full"] }
futures-util = "0.3"
chrono = "0.4"
lazy_static = "1.4"
```

---

## Phase 2: Core Infrastructure

### 2.1 Tauri Configuration
- [ ] Configure `tauri.conf.json`
  - [ ] App identifier: `ru.voboost.installer`
  - [ ] Window size: 900x700
  - [ ] Window title: "Voboost Installer"
  - [ ] Disable resize (fixed size)
  - [ ] Bundle ADB resources
- [ ] Set up resource bundling for ADB binaries
- [ ] Configure app icons

### 2.2 State Management
- [ ] Create Zustand store (`src/store/`)
  - [ ] Define state types
  - [ ] Implement store with all actions
  - [ ] Create selectors for performance

### 2.3 Internationalization
- [ ] Set up i18next configuration
- [ ] Create English translations (`src/i18n/en.json`)
- [ ] Create Russian translations (`src/i18n/ru.json`)
- [ ] Implement language switching

### 2.4 Theming
- [ ] Create Windows theme
- [ ] Create macOS theme
- [ ] Implement platform detection
- [ ] Implement dark mode detection
- [ ] Set up FluentProvider

---

## Phase 3: Rust Backend

### 3.1 ADB Integration
- [ ] Implement `get_adb_path()` for platform-specific paths
- [ ] Implement `start_adb_server()` command
- [ ] Implement `get_devices()` command
- [ ] Implement `execute_adb()` command
- [ ] Implement `execute_adb_with_timeout()` command
- [ ] Add proper error handling

### 3.2 Download System
- [ ] Implement `fetch_releases()` command
- [ ] Implement `download_apk()` with progress events
- [ ] Implement `check_existing_apk()` for cache
- [ ] Implement SHA256 hash verification
- [ ] Handle download errors gracefully

### 3.3 Installation
- [ ] Implement `get_install_steps()` command
- [ ] Implement `execute_install_step()` command
- [ ] Emit progress events for each step
- [ ] Implement logging system

---

## Phase 4: React Components

### 4.1 Shared Components
- [ ] `WizardLayout` - Main layout container
- [ ] `StepIndicator` - Progress indicator
- [ ] `LanguageSelector` - Language dropdown
- [ ] `VersionCard` - Release version card
- [ ] `ConnectionStatus` - ADB connection status
- [ ] `InstallStep` - Single installation step
- [ ] `LogViewer` - Expandable log viewer
- [ ] `InstructionCarousel` - Image carousel for instructions

### 4.2 Screen Components
- [ ] `EulaScreen` - License agreement
- [ ] `DownloadScreen` - Version selection and download
- [ ] `ConnectionScreen` - USB connection guide
- [ ] `InstallScreen` - Installation progress
- [ ] `CompleteScreen` - Success and next steps

### 4.3 Custom Hooks
- [ ] `useAdb` - ADB device polling
- [ ] `useDownload` - Download management
- [ ] `useInstall` - Installation execution
- [ ] `usePlatform` - Platform detection
- [ ] `useDarkMode` - Dark mode detection

---

## Phase 5: Assets

### 5.1 Images
- [ ] App icon (SVG source)
- [ ] Generate PNG icons for all sizes
- [ ] Generate ICO for Windows
- [ ] Generate ICNS for macOS
- [ ] USB cable illustration (placeholder)
- [ ] USB port illustration (placeholder)
- [ ] Settings illustration (placeholder)
- [ ] Success checkmark illustration

### 5.2 EULA Files
- [ ] `EULA.en.md` - English license text
- [ ] `EULA.ru.md` - Russian license text

### 5.3 ADB Binaries
- [ ] Download Windows ADB (adb.exe, DLLs)
- [ ] Download macOS ADB (universal binary)
- [ ] Place in `src-tauri/resources/adb/`

---

## Phase 6: Testing

### 6.1 Unit Tests
- [ ] Test Zustand store actions
- [ ] Test utility functions
- [ ] Test hash calculation

### 6.2 Integration Tests
- [ ] Test ADB commands (mock)
- [ ] Test download flow (mock)
- [ ] Test installation flow (mock)

### 6.3 Manual Testing
- [ ] Test on Windows 10
- [ ] Test on Windows 11
- [ ] Test on macOS Intel
- [ ] Test on macOS Apple Silicon
- [ ] Test with real device
- [ ] Test error scenarios

---

## Phase 7: Build & Distribution

### 7.1 Build Configuration
- [ ] Configure Windows NSIS installer
- [ ] Configure macOS DMG
- [ ] Set up code signing (optional)
- [ ] Configure auto-update (optional)

### 7.2 CI/CD
- [ ] Create GitHub Actions workflow
- [ ] Build on Windows runner
- [ ] Build on macOS runner
- [ ] Upload artifacts
- [ ] Create GitHub Release

### 7.3 Release Files
- [ ] Create initial `releases.json`
- [ ] Document release process
- [ ] Create `scripts/update-releases.py`

---

## Phase 8: Documentation

### 8.1 User Documentation
- [ ] README with installation instructions
- [ ] Troubleshooting guide
- [ ] FAQ

### 8.2 Developer Documentation
- [x] Architecture overview
- [x] Screen specifications
- [x] ADB integration
- [x] Releases schema
- [x] Theming guide
- [x] i18n guide
- [x] Build guide
- [x] Timeline
- [x] State management
- [x] Component specifications

---

## Files to Create

### Root Files
```
voboost-install/
├── AGENTS.md
├── .editorconfig (symlink)
├── .gitignore
├── README.md
├── LICENSE
├── releases.json                 # Release manifest (fetched by installer)
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── index.html
└── .env.example
```

### Source Files
```
src/
├── main.tsx
├── App.tsx
├── App.css
├── vite-env.d.ts
├── components/
│   ├── WizardLayout/
│   │   ├── WizardLayout.tsx
│   │   └── WizardLayout.css
│   ├── StepIndicator/
│   │   ├── StepIndicator.tsx
│   │   └── StepIndicator.css
│   ├── LanguageSelector/
│   │   └── LanguageSelector.tsx
│   ├── VersionCard/
│   │   ├── VersionCard.tsx
│   │   └── VersionCard.css
│   ├── ConnectionStatus/
│   │   ├── ConnectionStatus.tsx
│   │   └── ConnectionStatus.css
│   ├── InstallStep/
│   │   ├── InstallStep.tsx
│   │   └── InstallStep.css
│   ├── LogViewer/
│   │   └── LogViewer.tsx
│   └── InstructionCarousel/
│       ├── InstructionCarousel.tsx
│       └── InstructionCarousel.css
├── screens/
│   ├── EulaScreen/
│   │   └── EulaScreen.tsx
│   ├── DownloadScreen/
│   │   └── DownloadScreen.tsx
│   ├── ConnectionScreen/
│   │   └── ConnectionScreen.tsx
│   ├── InstallScreen/
│   │   └── InstallScreen.tsx
│   └── CompleteScreen/
│       └── CompleteScreen.tsx
├── hooks/
│   ├── useAdb.ts
│   ├── useDownload.ts
│   ├── useInstall.ts
│   ├── usePlatform.ts
│   └── useDarkMode.ts
├── services/
│   ├── adb.ts
│   ├── download.ts
│   ├── install.ts
│   ├── releases.ts
│   └── platform.ts
├── store/
│   ├── index.ts
│   ├── appStore.ts
│   ├── selectors.ts
│   └── types.ts
├── themes/
│   ├── index.ts
│   ├── windows.ts
│   ├── macos.ts
│   └── tokens.ts
├── i18n/
│   ├── index.ts
│   ├── en.json
│   └── ru.json
├── types/
│   ├── index.ts
│   ├── releases.ts
│   ├── adb.ts
│   ├── install.ts
│   └── global.d.ts
└── assets/
    ├── images/
    │   ├── logo.svg
    │   ├── placeholder-usb-cable.svg
    │   ├── placeholder-usb-port.svg
    │   ├── placeholder-settings.svg
    │   └── success.svg
    └── eula/
        ├── EULA.en.md
        └── EULA.ru.md
```

### Rust Files
```
src-tauri/
├── Cargo.toml
├── tauri.conf.json
├── build.rs
├── icons/
│   ├── 32x32.png
│   ├── 128x128.png
│   ├── 128x128@2x.png
│   ├── icon.ico
│   ├── icon.icns
│   └── icon.png
├── src/
│   ├── main.rs
│   ├── lib.rs
│   ├── commands/
│   │   ├── mod.rs
│   │   ├── adb.rs
│   │   ├── download.rs
│   │   └── install.rs
│   └── utils/
│       ├── mod.rs
│       ├── hash.rs
│       ├── platform.rs
│       └── logger.rs
└── resources/
    └── adb/
        ├── win/
        │   ├── adb.exe
        │   ├── AdbWinApi.dll
        │   └── AdbWinUsbApi.dll
        └── mac/
            └── adb
```

---

## Estimated Time

| Phase | Duration |
|-------|----------|
| Phase 1: Project Setup | 2-3 hours |
| Phase 2: Core Infrastructure | 4-6 hours |
| Phase 3: Rust Backend | 6-8 hours |
| Phase 4: React Components | 8-12 hours |
| Phase 5: Assets | 2-3 hours |
| Phase 6: Testing | 4-6 hours |
| Phase 7: Build & Distribution | 3-4 hours |
| Phase 8: Documentation | 2-3 hours |
| **Total** | **31-45 hours** |

---

## Notes

1. **Start with Phase 1-2** to get a working skeleton
2. **Phase 3-4 can be done in parallel** by different developers
3. **Phase 5 (Assets)** can be done anytime, placeholders work initially
4. **Phase 6 (Testing)** should be ongoing throughout development
5. **Phase 7 (Build)** should be set up early to catch issues
