# Architecture Overview

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Tauri 2.x | Desktop app framework (Rust + Web) |
| **Frontend** | React 18 + TypeScript | UI components and logic |
| **Build Tool** | Vite 5.x | Fast development and bundling |
| **UI Library** | Fluent UI React | Microsoft's design system |
| **State** | Zustand | Lightweight state management |
| **i18n** | react-i18next | Internationalization |
| **Backend** | Rust | System operations (ADB, downloads) |

## Why Tauri?

- **Small bundle size**: ~20-25MB (vs Electron's ~150MB)
- **Single codebase**: One project for Windows and macOS
- **Rust backend**: Fast, safe system operations
- **Web frontend**: Familiar React/TypeScript development
- **Built-in features**: Auto-updates, code signing support

## Project Structure

```
voboost-install/
├── AGENTS.md                     # Project rules (references ../voboost-codestyle/.roorules)
├── .editorconfig                 # Editor config (symlink to ../voboost-codestyle/.editorconfig)
├── .gitignore
├── README.md
├── LICENSE                       # GPL v3.0
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── index.html
├── releases.json                 # Available versions for download (fetched by installer)
│
├── docs/                         # Documentation (this folder)
│   ├── 01-architecture.md
│   ├── 02-screens.md
│   ├── 03-adb-integration.md
│   ├── 04-releases-schema.md
│   ├── 05-themes.md
│   ├── 06-i18n.md
│   ├── 07-build.md
│   ├── 08-timeline.md
│   ├── 09-state-management.md
│   ├── 10-components.md
│   ├── 11-implementation-checklist.md
│   ├── 12-error-handling.md
│   ├── 13-testing-strategy.md
│   ├── 14-security.md
│   ├── 15-tauri-config.md
│   └── 16-troubleshooting.md
│
├── src/                          # React frontend
│   ├── main.tsx                  # React entry point
│   ├── App.tsx                   # Main app with Wizard
│   ├── App.css                   # Global styles
│   ├── vite-env.d.ts
│   │
│   ├── components/               # Reusable UI components
│   │   ├── WizardLayout/
│   │   ├── StepIndicator/
│   │   ├── LogViewer/
│   │   ├── LanguageSelector/
│   │   ├── VersionCard/
│   │   ├── ConnectionStatus/
│   │   └── InstallStep/
│   │
│   ├── screens/                  # Wizard screens (5 screens)
│   │   ├── EulaScreen/
│   │   ├── DownloadScreen/
│   │   ├── ConnectionScreen/
│   │   ├── InstallScreen/
│   │   └── CompleteScreen/
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAdb.ts
│   │   ├── useDownload.ts
│   │   ├── useInstall.ts
│   │   ├── usePlatform.ts
│   │   └── useAppStore.ts
│   │
│   ├── services/                 # Tauri command wrappers
│   │   ├── adb.ts
│   │   ├── download.ts
│   │   ├── install.ts
│   │   ├── releases.ts
│   │   └── platform.ts
│   │
│   ├── store/                    # Zustand state
│   │   ├── index.ts
│   │   ├── appStore.ts
│   │   └── types.ts
│   │
│   ├── themes/                   # Fluent UI themes
│   │   ├── index.ts
│   │   ├── windows.ts
│   │   ├── macos.ts
│   │   └── tokens.ts
│   │
│   ├── i18n/                     # Translations
│   │   ├── index.ts
│   │   ├── en.json
│   │   └── ru.json
│   │
│   ├── types/                    # TypeScript types
│   │   ├── index.ts
│   │   ├── releases.ts
│   │   ├── adb.ts
│   │   ├── install.ts
│   │   └── global.d.ts
│   │
│   └── assets/                   # Static assets
│       ├── images/
│       │   ├── placeholder-usb-cable.svg
│       │   ├── placeholder-usb-port.svg
│       │   ├── placeholder-settings.svg
│       │   ├── success.svg
│       │   └── logo.svg
│       └── eula/
│           ├── EULA.en.md
│           └── EULA.ru.md
│
├── src-tauri/                    # Rust backend
│   ├── Cargo.toml
│   ├── Cargo.lock
│   ├── tauri.conf.json
│   ├── build.rs
│   │
│   ├── icons/                    # App icons (generated from SVG)
│   │   ├── 32x32.png
│   │   ├── 128x128.png
│   │   ├── 128x128@2x.png
│   │   ├── icon.ico
│   │   ├── icon.icns
│   │   └── icon.png
│   │
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   ├── commands/
│   │   │   ├── mod.rs
│   │   │   ├── adb.rs
│   │   │   ├── download.rs
│   │   │   └── install.rs
│   │   └── utils/
│   │       ├── mod.rs
│   │       ├── hash.rs
│   │       ├── platform.rs
│   │       └── logger.rs
│   │
│   └── resources/
│       └── adb/
│           ├── win/
│           │   ├── adb.exe
│           │   ├── AdbWinApi.dll
│           │   └── AdbWinUsbApi.dll
│           └── mac/
│               └── adb
│
├── scripts/                      # Build and utility scripts
│   ├── build-win.sh              # Windows build script
│   ├── build-mac.sh              # macOS build script
│   ├── generate-icons.sh         # Convert SVG to PNG/ICO/ICNS
│   └── update-releases.py        # Update releases.json after new release
│
└── .github/                      # GitHub configuration
    └── workflows/
        └── build.yml             # CI/CD workflow for building installers
```

## Releases Location

The `releases.json` file is hosted in the root of this repository:

```
voboost-install/releases.json
```

**releases.json** (for installer to fetch):
```
https://raw.githubusercontent.com/voboost/voboost-install/main/releases.json
```

**APK files** (hosted in main voboost repo):
```
https://github.com/voboost/voboost/releases/download/v1.2.0/voboost-1.2.0.apk
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        App.tsx                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              FluentProvider (Theme)                  │    │
│  │  ┌───────────────────────────────────────────────┐  │    │
│  │  │              WizardLayout                      │  │    │
│  │  │  ┌─────────────────────────────────────────┐  │  │    │
│  │  │  │           StepIndicator                 │  │  │    │
│  │  │  └─────────────────────────────────────────┘  │  │    │
│  │  │  ┌─────────────────────────────────────────┐  │  │    │
│  │  │  │     Wizard (react-use-wizard)           │  │  │    │
│  │  │  │  ┌───────────────────────────────────┐  │  │  │    │
│  │  │  │  │  Screen 1: EulaScreen             │  │  │  │    │
│  │  │  │  │  Screen 2: DownloadScreen         │  │  │  │    │
│  │  │  │  │  Screen 3: ConnectionScreen       │  │  │  │    │
│  │  │  │  │  Screen 4: InstallScreen          │  │  │  │    │
│  │  │  │  │  Screen 5: CompleteScreen         │  │  │  │    │
│  │  │  │  └───────────────────────────────────┘  │  │  │    │
│  │  │  └─────────────────────────────────────────┘  │  │    │
│  │  └───────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   React UI   │────▶│   Zustand    │────▶│   Tauri      │
│  Components  │◀────│    Store     │◀────│  Commands    │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │  Rust Code   │
                                          │  - ADB       │
                                          │  - Download  │
                                          │  - Hash      │
                                          └──────────────┘
```

## Icons

Tauri requires PNG icons for bundling, but you can use SVG as source:

1. Place your SVG icon at `src/assets/images/logo.svg`
2. Run `scripts/generate-icons.sh` to generate PNG versions
3. Generated PNGs go to `src-tauri/icons/`

The script uses tools like `rsvg-convert` or `inkscape` to convert SVG to PNG at various sizes.

## Security Considerations

### APK Verification

- All APK downloads are verified using SHA256 hash
- Hash is stored in `releases.json` and compared after download
- If hash mismatch, file is deleted and user is notified

### ADB Security

- ADB binaries are bundled (not downloaded at runtime)
- No network access required for ADB operations
- All ADB commands are logged for debugging

### Data Privacy

- No telemetry or analytics
- No data sent to external servers (except APK download)
- All operations are local to user's machine
- Logs are stored locally and can be copied for support

## Error Recovery

### Download Failures

1. Network error → Retry button
2. Hash mismatch → Delete file, show error, allow retry
3. Disk full → Show error with disk space info

### Installation Failures

1. Device disconnected → Return to Connection screen
2. ADB command failed → Show error, log details, allow retry
3. APK install failed → Show specific error, suggest solutions

### State Persistence

- Wizard state is NOT persisted between app restarts
- Downloaded APK is cached in temp folder (survives restart)
- Language preference could be saved to localStorage (optional)
