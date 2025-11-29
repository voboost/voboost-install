# Voboost Installer

Cross-platform desktop installer for Voboost Android application. Supports Windows and macOS.

## Features

- **Multi-language support** - English and Russian (extensible)
- **Smart downloads** - Resume interrupted downloads, verify checksums
- **ADB integration** - Bundled ADB, automatic device detection
- **Native look** - Fluent UI with platform-specific themes
- **Accessible** - Full keyboard navigation, screen reader support

## Screenshots

*Coming soon*

## Requirements

### For Users

| Platform | Requirements |
|----------|-------------|
| Windows | Windows 10/11 (64-bit) |
| macOS | macOS 11+ (Intel or Apple Silicon) |

### For Development

- Node.js 18+
- Rust 1.70+
- Platform SDK (Xcode for macOS, Visual Studio Build Tools for Windows)

## Quick Start

```bash
# Clone repository
git clone https://github.com/voboost/voboost-install.git
cd voboost-install

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## Project Structure

```
voboost-install/
├── docs/                    # Documentation
├── releases/                # Release manifest (releases.json)
├── src/                     # React frontend
│   ├── components/          # Reusable UI components
│   ├── screens/             # Wizard screens
│   ├── hooks/               # Custom React hooks
│   ├── services/            # Tauri command wrappers
│   ├── store/               # Zustand state management
│   ├── themes/              # Fluent UI themes
│   ├── i18n/                # Translations
│   └── assets/              # Images, EULA files
├── src-tauri/               # Rust backend
│   ├── src/                 # Rust source code
│   └── resources/           # Bundled ADB binaries
└── scripts/                 # Build scripts
```

## Documentation

| Document | Description |
|----------|-------------|
| [01-architecture.md](docs/01-architecture.md) | Technology stack and project structure |
| [02-screens.md](docs/02-screens.md) | Wizard screens specification |
| [03-adb-integration.md](docs/03-adb-integration.md) | ADB commands and device detection |
| [04-releases-schema.md](docs/04-releases-schema.md) | JSON schema for releases |
| [05-themes.md](docs/05-themes.md) | Platform-specific theming |
| [06-i18n.md](docs/06-i18n.md) | Internationalization |
| [07-build.md](docs/07-build.md) | Build and distribution |
| [08-timeline.md](docs/08-timeline.md) | Development timeline |
| [09-state-management.md](docs/09-state-management.md) | Zustand store specification |
| [10-components.md](docs/10-components.md) | React component specifications |
| [11-implementation-checklist.md](docs/11-implementation-checklist.md) | Implementation checklist |
| [12-error-handling.md](docs/12-error-handling.md) | Error handling & edge cases |
| [13-testing-strategy.md](docs/13-testing-strategy.md) | Testing approach and examples |
| [14-security.md](docs/14-security.md) | Security considerations |
| [15-tauri-config.md](docs/15-tauri-config.md) | Tauri configuration details |
| [16-troubleshooting.md](docs/16-troubleshooting.md) | User troubleshooting guide |

## Installation Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   1. EULA   │───▶│ 2. Download │───▶│ 3. Connect  │───▶│ 4. Install  │───▶│ 5. Complete │
│             │    │             │    │             │    │             │    │             │
│ • Language  │    │ • Version   │    │ • USB guide │    │ • Progress  │    │ • Next      │
│ • Accept    │    │ • Download  │    │ • ADB check │    │ • Log view  │    │   steps     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | [Tauri 2.x](https://tauri.app/) |
| Frontend | React 18 + TypeScript |
| Build Tool | Vite 5.x |
| UI Library | [Fluent UI React](https://react.fluentui.dev/) |
| State | [Zustand](https://zustand-demo.pmnd.rs/) |
| i18n | [react-i18next](https://react.i18next.com/) |
| Backend | Rust |

## Development

### Prerequisites

1. Install [Node.js](https://nodejs.org/) 18+
2. Install [Rust](https://rustup.rs/)
3. Install platform-specific dependencies:

**macOS:**
```bash
xcode-select --install
```

**Windows:**
```bash
# Install Visual Studio Build Tools
winget install Microsoft.VisualStudio.2022.BuildTools
```

### Commands

```bash
# Development
npm run tauri dev          # Start dev server with hot reload

# Building
npm run tauri build        # Build production installer

# Linting
npm run lint               # Run ESLint
npm run typecheck          # Run TypeScript check

# Testing
npm run test               # Run unit tests
```

### Environment Variables

Create `.env.local` for development:

```env
VITE_RELEASES_URL=https://raw.githubusercontent.com/voboost/voboost-install/main/releases/releases.json
```

## Building

### Local Build

```bash
# macOS
npm run tauri build

# Windows (on Windows machine)
npm run tauri build
```

### CI/CD

GitHub Actions automatically builds installers for both platforms on push to `main` or tags.

See [07-build.md](docs/07-build.md) for detailed build instructions.

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Style

- Follow [voboost-codestyle](../voboost-codestyle/) guidelines
- Use TypeScript strict mode
- Write accessible components (WCAG AA)

## License

This project is licensed under the GPL v3.0 License - see the [LICENSE](LICENSE) file for details.

## Related Projects

- [voboost](https://github.com/voboost/voboost) - Main Android application
- [voboost-codestyle](../voboost-codestyle/) - Shared code style configuration

## Support

If you encounter issues during installation:

1. Check the installation log (available in the installer)
2. Copy the log and create an issue on GitHub
3. Include your OS version and device model

---

Made by Voboost Team
