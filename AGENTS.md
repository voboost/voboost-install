# Voboost Installer - Project Intelligence

## Global Rules (CRITICAL)

- This project follows ALL common rules from ../voboost-codestyle/.roorules
- The rules below are PROJECT-SPECIFIC additions to the global rules
- NEVER duplicate global rules here - they are inherited automatically
- ALL code comments, documentation, and commit messages MUST be in English only

## Project Overview

Desktop installer application for Voboost Android app. Installs Voboost on Voyah vehicle head units via USB/ADB connection.

**Platforms**: Windows (x64), macOS (x64, ARM64)
**License**: GPL v3.0

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | Tauri 2.x | Desktop app (Rust + Web) |
| Frontend | React 18 + TypeScript | UI components |
| Build | Vite 5.x | Fast bundling |
| UI Library | Fluent UI React | Microsoft design system |
| State | Zustand | Lightweight state management |
| i18n | react-i18next | Internationalization |
| Backend | Rust | System operations (ADB, downloads) |

## Project-Specific Patterns

### Application Architecture

- 5-screen wizard flow: EULA → Download → Connect → Install → Complete
- Platform-specific themes (Windows Fluent, macOS Apple-inspired)
- Bundled ADB binaries for offline operation
- Multi-language support (English, Russian)

### File Organization

```
src/
├── components/     # Reusable UI components (with co-located CSS)
├── screens/        # Wizard screens (with co-located CSS)
├── hooks/          # Custom React hooks
├── services/       # Tauri command wrappers
├── store/          # Zustand state management
├── themes/         # Fluent UI themes
├── i18n/           # Translation files
├── types/          # TypeScript types
└── assets/         # Images, EULA text

src-tauri/
├── src/commands/   # Tauri commands (exposed to frontend)
├── src/utils/      # Rust utilities
└── resources/adb/  # Bundled ADB binaries

scripts/            # Build and utility scripts
```

### CSS Approach

- Plain CSS files co-located with components
- BEM naming convention: `block__element_modifier_value`
- CSS custom properties for theming
- No Tailwind, no CSS-in-JS (Fluent UI handles component styling)

### Component Patterns

```typescript
// Component structure
ComponentName/
├── ComponentName.tsx    # Component logic
├── ComponentName.css    # Component styles
└── index.ts             # Export

// Export pattern
export { ComponentName } from './ComponentName';
```

### State Management

- Use Zustand for global state (wizard step, language, download status)
- Use React state for local component state
- Tauri commands for backend operations

### Tauri Commands

- All commands return `Result<T, String>` in Rust
- Use `invoke()` from `@tauri-apps/api/core` in TypeScript
- Emit events for progress updates (download, install)

### Error Handling

- Rust: Return `Result` types, use `?` operator
- TypeScript: Try/catch with user-friendly error messages
- Log all errors for debugging
- Provide "Copy Log" functionality for support

## ADB Integration

### Installation Steps

```bash
# First sequence: Prepare device and install APK
adb wait-for-device          # Wait until device is online
adb root                     # Restart adbd with root permissions
adb remount                  # Remount filesystem as read-write
adb disable-verity           # Disable verified boot for system modification
adb install -g voboost.apk   # Install APK with all permissions
adb reboot                   # Reboot device to apply changes

# Second sequence: Clean up after reboot
adb wait-for-device          # Wait for device to come back online
adb root                     # Re-establish root access
adb remount                  # Remount filesystem again
adb disable-verity           # Ensure verity is still disabled
```

### Device Detection

- Poll `adb devices -l` every 2 seconds
- Parse output for serial, state, model
- Handle states: device, offline, unauthorized

## Internationalization

- Default language: English
- Supported: English (en), Russian (ru)
- Language selector on EULA screen
- All UI text from translation files
- Changelog in releases.json supports multiple languages

## Platform-Specific

### Windows

- Theme: Default Fluent Design
- Font: Segoe UI
- Border radius: 4px
- Output: NSIS .exe installer

### macOS

- Theme: Apple-inspired (custom Fluent theme)
- Font: SF Pro (-apple-system)
- Border radius: 8px
- Output: Universal .dmg

## Development Workflow

```bash
# Development
npm run tauri dev

# Build
npm run tauri build

# macOS universal
npm run tauri build -- --target universal-apple-darwin
```

## Critical Implementation Details

### Icon Handling

- Source: SVG icon at `src/assets/images/logo.svg`
- Generate PNG/ICO/ICNS using `scripts/generate-icons.sh`
- Tauri requires PNG icons for bundling

### Releases JSON

- Hosted on GitHub (raw.githubusercontent.com)
- Contains version info, download URLs, SHA256 hashes
- Installer fetches on Download screen
- Cached APK verified by hash before reuse

### Security

- Verify APK hash before installation
- No data collection or transmission
- All operations local to user's machine

## Documentation

Detailed documentation in `docs/` folder:

1. `01-architecture.md` - Project structure
2. `02-screens.md` - UI specifications
3. `03-adb-integration.md` - ADB commands
4. `04-releases-schema.md` - JSON schema
5. `05-themes.md` - Platform themes
6. `06-i18n.md` - Translations
7. `07-build.md` - Build process
8. `08-timeline.md` - Development phases
9. `09-state-management.md` - Zustand store specification
10. `10-components.md` - React component specifications
11. `11-implementation-checklist.md` - Implementation checklist
12. `12-error-handling.md` - Error handling & edge cases
13. `13-testing-strategy.md` - Testing approach and examples
14. `14-security.md` - Security considerations
15. `15-tauri-config.md` - Tauri configuration details
16. `16-troubleshooting.md` - User troubleshooting guide
