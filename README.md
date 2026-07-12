# Voboost Installer

Cross-platform desktop installer for Voboost Android application on Voyah vehicle head units. Supports macOS and Windows.

## Overview

The Voboost Installer is a user-friendly desktop application that automates the installation of the Voboost Android app on Voyah vehicle multimedia systems. It features a 6-step wizard interface (Welcome, EULA, Firmware, Connection, Install, Complete), multi-language support, and a unified headless command-line mode for automation.

## For Users

### Installation on macOS

1. Download the latest DMG file from the [Releases](https://github.com/voboost/voboost-install/releases) page
2. Double-click the DMG file to mount it
3. Drag the `voboost-install.app` to your Applications folder
4. Launch the app from Applications or Launchpad
5. On first launch, you may need to right-click and select "Open" if macOS shows a security warning

### Installation on Windows

1. Download the latest NSIS installer (`.exe`) from the [Releases](https://github.com/voboost/voboost-install/releases) page
2. Double-click the installer to run it
3. Follow the installation wizard prompts
4. Launch the app from the Start menu or desktop shortcut

### Headless Mode (Command Line)

The installer can run entirely from the command line without opening a graphical window. This is ideal for automation scripts and remote integration. Three headless modes are available; exactly one is selected per invocation.

#### macOS Examples

```bash
# Full provision: APK + daemon + agents + manifest + init hook
/Volumes/voboost-install/voboost-install.app/Contents/MacOS/voboost-install \
    --install "/path/to/voboost-debug.apk" \
    --daemon-bin "/path/to/voboost-inject" \
    --agents-dir "/path/to/agents" \
    --manifest "/path/to/manifest.json" \
    --manifest-sig "/path/to/manifest.sig" \
    --lang ru

# Restore the init hook after a system OTA (no artifacts needed)
./src-tauri/target/aarch64-apple-darwin/release/voboost-install --restore --lang en

# Full teardown: stop daemon, remove hook, wipe data, uninstall APK, reboot
./src-tauri/target/aarch64-apple-darwin/release/voboost-install --uninstall
```

#### Windows Examples

```bash
# Full provision
"C:\Program Files\voboost-install\voboost-install.exe" ^
    --install "C:\path\to\voboost-debug.apk" ^
    --daemon-bin "C:\path\to\voboost-inject.exe" ^
    --agents-dir "C:\path\to\agents" ^
    --manifest "C:\path\to\manifest.json" ^
    --manifest-sig "C:\path\to\manifest.sig" ^
    --lang en

# Restore the init hook after a system OTA
.\src-tauri\target\release\voboost-install.exe --restore --lang ru

# Full teardown
.\src-tauri\target\release\voboost-install.exe --uninstall
```

#### Available CLI Flags

- `--install <apk>` (`-i`) - Full headless install: APK + daemon + agents + manifest + init hook. Requires `--daemon-bin`, `--agents-dir`, `--manifest`, `--manifest-sig`; `--release-key` is optional.
- `--restore` (`-r`) - Restore the init hook after a system OTA (no artifacts needed).
- `--uninstall` (`-U`) - Full teardown: stop daemon, remove init hook, wipe `/data/voboost`, uninstall APK, reboot.
- `--daemon-bin <path>` - Path to the voboost-inject daemon binary (provision).
- `--agents-dir <path>` - Directory of agent files (provision).
- `--manifest <path>` - Path to manifest.json (provision).
- `--manifest-sig <path>` - Path to manifest.sig (provision).
- `--release-key <path>` - Path to release-public.pem for OTA signature verification (optional; omit to disable).
- `--lang <en|ru>` (`-l`) - Language for CLI output.
- `--dry-run` (`-d`) - Simulate actions without executing them on a real device.
- `--platform <id>` (`-p`) - Override platform for cable connection messages (`win-old`, `win-new`, `mac-old`, `mac-new`).
- `--help` (`-h`) - Show help and exit.

Headless modes do not open a GUI window. Without `--install`, `--restore`, or `--uninstall`, the React wizard is shown.

## For Developers

### Requirements

- **Node.js** 18+
- **Rust** 1.70+
- **Platform SDK**: Xcode for macOS, Visual Studio Build Tools for Windows

### Quick Start

```bash
# Clone repository
git clone https://github.com/voboost/voboost-install.git
cd voboost-install

# Install dependencies
npm install

# Run in development mode (GUI with Tauri)
npm run tauri:dev

# Build for production
npm run tauri:build
```

### Project Structure

```
voboost-install/
├── content/              # Screen content as Markdown files
│   ├── 1-welcome-en.md
│   ├── 2-eula-title-en.md
│   └── ...
├── config/               # Configuration files and tooling config
│   ├── config-commands.json    # ADB command library
│   ├── config-install.json     # Installation scenario
│   ├── config-uninstall.json   # Uninstallation scenario
│   ├── config-eula-en.md       # EULA text (English)
│   ├── config-eula-ru.md       # EULA text (Russian)
│   ├── .env.example            # Environment variables template
│   ├── eslint.config.mjs
│   ├── prettier.config.mjs
│   ├── tsconfig.json
│   └── vite.config.ts
├── scripts/              # Utility scripts (ADB verification)
├── src/                  # React frontend
│   ├── components/       # Reusable UI components
│   ├── screens/          # Wizard step screens
│   ├── i18n/             # Translation JSON files
│   ├── store/            # Zustand state management
│   ├── services/         # Backend service wrappers
│   └── hooks/            # Custom React hooks
├── src-tauri/            # Rust backend
│   ├── src/
│   │   ├── commands/     # Tauri command handlers
│   │   └── utils/        # Utility functions
│   └── tauri.conf.json   # Tauri configuration
├── tests/                # Test files
└── docs/                 # Detailed documentation
```

### Building

```bash
# Development build (with Tauri)
npm run tauri:dev

# Production build (creates platform-specific installer)
npm run tauri:build

# macOS multi-arch DMG build (Apple Silicon + Intel)
npm run release

# Code quality checks
npm run lint          # Run ESLint
npm run format        # Format code with Prettier
npm run typecheck     # TypeScript type checking
```

### Adding a New Language

This guide explains how to add a new language to the Voboost Installer. We'll use German as an example.

#### Overview

Adding a new language requires updating 9 locations across the codebase:

1. i18n JSON file
2. i18n initialization
3. Language type definition
4. Language selector component
5. Content markdown files
6. Screen components (if not using helper)
7. Config command titles
8. Rust backend StepTitle
9. NSIS installer languages

#### Step-by-Step Guide

**1. Create i18n JSON File**

Create `src/i18n/de.json` by copying `src/i18n/en.json` and translating all values:

```json
{
    "app": {
        "title": "Voboost Installationsprogramm",
        "version": "Version {{version}}"
    },
    "common": {
        "next": "Weiter",
        "back": "Zurück",
        "exit": "Beenden",
        "retry": "Wiederholen",
        "uninstall": "Deinstallieren"
    },
    "welcome": {
        "button": "Installation starten"
    },
    "eula": {
        "accept": "Ich akzeptiere die Lizenzvereinbarung"
    },
    "download": {
        "button": "Firmware herunterladen",
        "loading": "Versionen werden abgerufen...",
        "fetchError": "Fehler beim Abrufen der Versionen. Bitte überprüfen Sie Ihre Internetverbindung.",
        "localJson": "releases.json auswählen",
        "localApk": "Lokale APK auswählen",
        "downloading": "Herunterladen...",
        "ready": "Firmware erfolgreich heruntergeladen und verifiziert. Bereit zum Fortfahren."
    },
    "install": {
        "button": "Installation starten"
    },
    "complete": {
        "button": "Fertigstellen"
    }
}
```

**2. Update i18n Initialization**

Update `src/i18n/index.ts` to include the new language:

```typescript
import de from './de.json';

i18n.use(initReactI18next).init({
    resources: {
        en: { translation: en },
        ru: { translation: ru },
        de: { translation: de },  // Add new language
    },
    lng: 'en',
    fallbackLng: 'en',
});
```

**3. Update Language Type**

Update `src/store/types.ts`:

```typescript
export type Language = 'en' | 'ru' | 'de';
```

**4. Update Language Selector**

Update `src/components/LanguageSelector/LanguageSelector.tsx`:

```typescript
const languages = [
    { code: 'en', label: 'English' },
    { code: 'ru', label: 'Русский' },
    { code: 'de', label: 'Deutsch' },
];
```

Also update the type cast in the `handleChange` function:

```typescript
const handleChange = (value: string) => {
    setLanguage(value as 'en' | 'ru' | 'de');
    i18n.changeLanguage(value);
    setOpen(false);
};
```

**5. Create Content Markdown Files**

Create German versions of all content files in the `content/` directory:

- `content/1-welcome-de.md`
- `content/2-eula-title-de.md`
- `content/2-eula-license-de.md`
- `content/3-download-de.md`
- `content/4-connection-de.md`
- `content/4-connection-step1-mac-new-de.md`
- `content/4-connection-step1-mac-old-de.md`
- `content/4-connection-step1-win-new-de.md`
- `content/4-connection-step1-win-old-de.md`
- `content/4-connection-step2-de.md`
- `content/4-connection-step3-de.md`
- `content/5-install-de.md`
- `content/6-complete-de.md`

Each file should be a translated version of its English counterpart.

**6. Update Content Index**

Update `src/content/index.ts` to import and include the new language:

```typescript
import { html as welcomeDe } from '../../content/1-welcome-de.md';
import { html as eulaTitleDe } from '../../content/2-eula-title-de.md';
import { html as eulaLicenseDe } from '../../content/2-eula-license-de.md';
import { html as downloadDe } from '../../content/3-download-de.md';
import { html as connectionDe } from '../../content/4-connection-de.md';
import { html as connectionStep1WinNewDe } from '../../content/4-connection-step1-win-new-de.md';
import { html as connectionStep1WinOldDe } from '../../content/4-connection-step1-win-old-de.md';
import { html as connectionStep1MacNewDe } from '../../content/4-connection-step1-mac-new-de.md';
import { html as connectionStep1MacOldDe } from '../../content/4-connection-step1-mac-old-de.md';
import { html as connectionStep2De } from '../../content/4-connection-step2-de.md';
import { html as connectionStep3De } from '../../content/4-connection-step3-de.md';
import { html as installDe } from '../../content/5-install-de.md';
import { html as completeDe } from '../../content/6-complete-de.md';

export const content = {
    welcome: { en: welcomeEn, ru: welcomeRu, de: welcomeDe },
    eulaTitle: { en: eulaTitleEn, ru: eulaTitleRu, de: eulaTitleDe },
    eulaLicense: { en: eulaLicenseEn, ru: eulaLicenseRu, de: eulaLicenseDe },
    download: { en: downloadEn, ru: downloadRu, de: downloadDe },
    connection: { en: connectionEn, ru: connectionRu, de: connectionDe },
    connectionStep1WinNew: { en: connectionStep1WinNewEn, ru: connectionStep1WinNewRu, de: connectionStep1WinNewDe },
    connectionStep1WinOld: { en: connectionStep1WinOldEn, ru: connectionStep1WinOldRu, de: connectionStep1WinOldDe },
    connectionStep1MacNew: { en: connectionStep1MacNewEn, ru: connectionStep1MacNewRu, de: connectionStep1MacNewDe },
    connectionStep1MacOld: { en: connectionStep1MacOldEn, ru: connectionStep1MacOldRu, de: connectionStep1MacOldDe },
    connectionStep2: { en: connectionStep2En, ru: connectionStep2Ru, de: connectionStep2De },
    connectionStep3: { en: connectionStep3En, ru: connectionStep3Ru, de: connectionStep3De },
    install: { en: installEn, ru: installRu, de: installDe },
    complete: { en: completeEn, ru: completeRu, de: completeDe },
} as const;
```

The `getContent()` and `getConnectionStep1Content()` functions in `src/content/index.ts` already handle language selection with fallback to English, so no changes are needed in screen components.

**7. Update Config Command Titles**

Update `config/config-commands.json` to add German translations to each title:

```json
{
    "id": "request_root",
    "title": {
        "en": "Requesting root access",
        "ru": "Переключение ADB в режим root",
        "de": "Root-Zugriff anfordern"
    },
    "command": ["adb", "root"],
    "fatal": true,
    "retry_count": 3,
    "retry_delay_secs": 2
}
```

Repeat this for all commands in the file. Also update `config/config-install.json` and `config/config-uninstall.json` similarly.

**8. Update Rust Backend StepTitle**

The Rust backend uses a `StepTitle` struct that needs to be updated. See the implementation in `src-tauri/src/commands/install.rs` for details on how to extend it for new languages.

**9. Update NSIS Installer Languages (Windows)**

Update `src-tauri/tauri.conf.json` to include the new language in the languages array:

```json
"languages": ["English", "Russian", "German"]
```

#### Verification

After completing all steps:

1. Run `npm run tauri:dev` to test the application
2. Select the new language from the language selector
3. Verify all UI text is displayed correctly
4. Check that all markdown content loads properly
5. Test the installation flow to ensure all step titles are translated

#### Notes

- The `getContent()` function in `src/content/index.ts` automatically falls back to English if a translation is missing
- Always test with the new language selected to ensure all translations are present
- Keep translation keys consistent across all language files
- Consider using translation tools or services for accuracy

### Editing Screen Content

The `content/` directory contains Markdown files that define the text displayed on each screen of the installer wizard. These files are processed at build time and converted to HTML.

#### Naming Convention

Files follow the pattern: `N-screenname-lang.md`

- `N` - Step number (1-6)
- `screenname` - Screen identifier (welcome, eula-title, eula-license, download, connection, connection-step1-mac-new, connection-step1-mac-old, connection-step1-win-new, connection-step1-win-old, connection-step2, connection-step3, install, complete)
- `lang` - Language code (en, ru, etc.)

#### Example

To edit the welcome screen text in English, modify `content/1-welcome-en.md`. The Markdown will be automatically converted to HTML and displayed in the app.

#### Build-Time Processing

The `vite-plugin-markdown` plugin processes these files during the build. The HTML output is imported in `src/content/index.ts` and used by the `MarkdownBlock` component.

### Configuration

The `config/` directory contains configuration files that control the installer's behavior:

#### config-commands.json

Defines the ADB command library with retry logic and error handling:

```json
{
    "id": "request_root",
    "title": {
        "en": "Requesting root access",
        "ru": "Переключение ADB в режим root"
    },
    "command": ["adb", "root"],
    "fatal": true,
    "retry_count": 3,
    "retry_delay_secs": 2
}
```

- `id` - Unique command identifier
- `title` - Display text for each language
- `command` - ADB command to execute
- `fatal` - Whether failure should halt installation
- `retry_count` - Number of retry attempts
- `retry_delay_secs` - Delay between retries

#### config-install.json

Defines the installation scenario - the sequence of commands to execute during installation.

#### config-uninstall.json

Defines the uninstallation scenario - the sequence of commands to execute during uninstallation.

#### .env

Environment variables for configuration (create from `config/.env.example`):

```env
# Frontend (Vite) - URL for fetching the releases manifest
VITE_RELEASES_URL=https://raw.githubusercontent.com/voboost/voboost-install/main/releases.json

# Backend (Rust) - override at build time to change the default releases.json URL
# RELEASES_URL=https://example.com/releases.json
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | [Tauri 2.x](https://tauri.app/) | Desktop app (Rust + Web) |
| Frontend | React 18 + TypeScript | UI components and logic |
| Build Tool | Vite 6.x | Fast development and bundling |
| UI Library | [Fluent UI React](https://react.fluentui.dev/) | Microsoft's design system |
| State | [Zustand](https://zustand-demo.pmnd.rs/) | Lightweight state management |
| i18n | [react-i18next](https://react.i18next.com/) | Internationalization |
| Backend | Rust | System operations (ADB, installations, fallbacks) |

## ADB Installation Sequence

The installer executes these ADB commands to install the Voboost APK safely into the vehicle multimedia environment:

1. `adb wait-for-device` & `adb root` (Gain system root)
2. `adb disable-verity` (Disable verified boot modifications)
3. `adb reboot` (Reboot the system)
4. `adb wait-for-device` & `adb root` (Re-establish system root post-reboot)
5. `adb remount` (Remount the filesystem as read-write)
6. `adb shell setenforce 0` (Disable SELinux permissive mode conflicts)
7. `adb install -g -r -d <apk>` (Install APK, forcing downgrades naturally where unblocked)
8. **Permissions Phase**: Sequential execution of AppOps allows (`REQUEST_INSTALL_PACKAGES`) and `pm grant` injections (`SYSTEM_ALERT_WINDOW`, `WRITE_SECURE_SETTINGS`, `READ_LOGS`, `RECORD_AUDIO`, `WRITE_EXTERNAL_STORAGE`).
9. **Environment Phase**: Hidden API policy bypassing (`hidden_api_policy_pre_p_apps`, `hidden_api_policy_p_apps`) and freeform support configurations override (`enable_freeform_support`, `force_resizable_activities`).

**Note on Failure Handlers:** All steps are strictly wrapped in a token retry bucket. Fatal steps (`adb remount`) trigger hard exits if the retry boundaries lapse, whereas non-fatal steps (`hidden_api_policy`) are logged and gracefully skipped.

## Security

- **ADB command whitelist**: Rust explicitly locks commands purely to: `start-server`, `devices`, `wait-for-device`, `root`, `remount`, `disable-verity`, `install`, `reboot`, `shell`, `uninstall`.
- **Pre-packaged Payload Checks**: All downloads are strictly hash-summed through SHA256 cryptographic validations against the `releases.json`.
- **No telemetry**: Absolutely no telemetry exists within this installation pathway.

## Troubleshooting

### Common Issues

**Device not detected**
- Ensure USB debugging is enabled on the device
- Check that the device is authorized for ADB connection
- Try a different USB cable or port

**Installation fails with version downgrade error**
- The installer automatically handles `INSTALL_FAILED_VERSION_DOWNGRADE` scenarios
- If it persists, manually uninstall the old version first

**Permission denied errors**
- Ensure the device is in root mode
- Check that SELinux is disabled (`adb shell setenforce 0`)

**Build fails on macOS**
- Ensure Xcode command line tools are installed: `xcode-select --install`
- Check that Rust is properly installed: `rustc --version`

**Build fails on Windows**
- Ensure Visual Studio Build Tools are installed
- Check that Rust is properly installed: `rustc --version`

For more detailed troubleshooting information, see [docs/16-troubleshooting.md](docs/16-troubleshooting.md).

## License

This project is licensed under the GPL v3.0 License - see the [LICENSE](LICENSE) file for details.
