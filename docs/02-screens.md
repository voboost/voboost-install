# Screen Specifications

The installer has 5 wizard screens that guide the user through the installation process.

## Screen Flow

```
┌─────────┐    ┌──────────┐    ┌────────────┐    ┌─────────┐    ┌──────────┐
│  EULA   │───▶│ Download │───▶│ Connection │───▶│ Install │───▶│ Complete │
└─────────┘    └──────────┘    └────────────┘    └─────────┘    └──────────┘
```

---

## Screen 1: EULA (License Agreement)

**Purpose**: Display GPL v3.0 license and get user acceptance.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Voboost Installer                                    [─][□][×] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ● License  ○ Download  ○ Connect  ○ Install  ○ Done            │
│                                                                 │
│  License Agreement                                              │
│  ─────────────────                                              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  GNU GENERAL PUBLIC LICENSE                             │   │
│  │  Version 3, 29 June 2007                                │   │
│  │                                                         │   │
│  │  Copyright (C) 2007 Free Software Foundation, Inc.      │   │
│  │  ...                                                    │   │
│  │  [scrollable content]                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ☑ I accept the license agreement                               │
│                                                                 │
│  ┌──────────────┐                              ┌──────────────┐ │
│  │ 🌐 English ▼ │                              │    Next →    │ │
│  └──────────────┘                              └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### UI Elements

| Element | Fluent Component | Notes |
|---------|------------------|-------|
| Title | `Title2` | "License Agreement" |
| License text | `Card` + `react-markdown` | Scrollable, renders GPL v3.0 |
| Checkbox | `Checkbox` | "I accept the license agreement" |
| Language selector | Custom `LanguageSelector` | Dropdown: English, Russian |
| Next button | `Button` primary | Disabled until checkbox checked |

### State

```typescript
interface EulaState {
  accepted: boolean;
  language: 'en' | 'ru';
}
```

### Behavior

1. Load license text based on selected language
2. Language change updates all UI text immediately
3. Next button disabled until checkbox is checked
4. No Back button on first screen

---

## Screen 2: Download (Version Selection)

**Purpose**: Select version and download APK.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Voboost Installer                                    [─][□][×] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [x] License  [*] Download  [ ] Connect  [ ] Install  [ ] Done  │
│                                                                 │
│  Select Version                                                 │
│  ──────────────                                                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ◉ Version 1.2.0                          [STABLE]      │   │
│  │    Released: 2024-11-15  •  Size: 15.0 MB               │   │
│  │    ▼ What's new                                         │   │
│  │    ┌─────────────────────────────────────────────────┐  │   │
│  │    │ • New feature: Quick settings panel             │  │   │
│  │    │ • Bug fix: Bluetooth stability                  │  │   │
│  │    └─────────────────────────────────────────────────┘  │   │
│  │                                        [Download]       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ○ Version 1.3.0-beta.1                   [BETA]        │   │
│  │    Released: 2024-11-20  •  Size: 15.5 MB               │   │
│  │    ▶ What's new                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ████████████████████░░░░░░░░░░░░░░░░░░░░  45%                 │
│  Downloading... 6.8 MB / 15.0 MB                               │
│                                                                 │
│  ┌──────────────┐                              ┌──────────────┐ │
│  │   ← Back     │                              │    Next →    │ │
│  └──────────────┘                              └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### UI Elements

| Element | Fluent Component | Notes |
|---------|------------------|-------|
| Title | `Title2` | "Select Version" |
| Version cards | Custom `VersionCard` | Radio selection |
| Channel badge | `Badge` | Green for Stable, Orange for Beta |
| Changelog | `Accordion` | Expandable |
| Download button | `Button` | Inside version card |
| Progress bar | `ProgressBar` | Shows during download |
| Status text | `Text` | "Downloading...", "Verifying...", "Ready" |

### State

```typescript
interface DownloadState {
  releases: Release[];
  selectedVersion: string | null;
  status: 'idle' | 'downloading' | 'verifying' | 'ready' | 'error';
  progress: number;  // 0-100
  downloadedBytes: number;
  totalBytes: number;
  apkPath: string | null;
  error: string | null;
}
```

### Behavior

1. Fetch `releases.json` from GitHub on mount
2. Check if APK already exists in temp folder
3. If exists, verify SHA256 hash
4. Download button starts download with progress
5. After download, verify hash
6. Next button enabled only when status is 'ready'

---

## Screen 3: Connection (USB Setup)

**Purpose**: Guide user to connect device and detect connection.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Voboost Installer                                    [─][□][×] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [x] License  [x] Download  [*] Connect  [ ] Install  [ ] Done  │
│                                                                 │
│  Connect Your Vehicle                                           │
│  ────────────────────                                           │
│                                                                 │
│  1. Use a USB-A to USB-C cable                                  │
│     ┌─────────────────────────────────────────────────────┐    │
│     │              [Placeholder Image]                    │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                 │
│  2. Connect to the USB port in your car                         │
│     ┌─────────────────────────────────────────────────────┐    │
│     │              [Placeholder Image]                    │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                 │
│  3. Enable USB Debugging on head unit                           │
│     • Go to Settings > About > Build Number                     │
│     • Tap Build Number 7 times                                  │
│     • Go to Settings > Developer Options                        │
│     • Enable USB Debugging                                      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [~] Searching for device...                            │   │
│  │  [x] Connected: Voyah Free (ABC123)                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐        ┌──────────────┐    │
│  │   ← Back     │  │ Check Again  │        │    Next →    │    │
│  └──────────────┘  └──────────────┘        └──────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### UI Elements

| Element | Fluent Component | Notes |
|---------|------------------|-------|
| Title | `Title2` | "Connect Your Vehicle" |
| Instructions | Numbered list | With placeholder images |
| Images | `<img>` | SVG placeholders initially |
| Connection status | Custom `ConnectionStatus` | Spinner/checkmark/error |
| Check button | `Button` secondary | Manual retry |

### State

```typescript
interface ConnectionState {
  status: 'searching' | 'connected' | 'unauthorized' | 'error';
  device: AdbDevice | null;
  isPolling: boolean;
  error: string | null;
}
```

### Behavior

1. Start ADB server on mount
2. Poll for devices every 2 seconds
3. Show device info when connected
4. Handle "unauthorized" state (prompt user to accept on device)
5. Next button enabled only when connected
6. If device disconnects, disable Next button

---

## Screen 4: Installation (Progress)

**Purpose**: Execute installation steps and show progress.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Voboost Installer                                    [─][□][×] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [x] License  [x] Download  [x] Connect  [*] Install  [ ] Done  │
│                                                                 │
│  Installing Voboost                                             │
│  ──────────────────                                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [x] Waiting for device                                 │   │
│  │  [x] Enabling root access                               │   │
│  │  [x] Remounting filesystem                              │   │
│  │  [x] Disabling verity                                   │   │
│  │  [~] Installing APK...                                  │   │
│  │  ○  Rebooting device                                    │   │
│  │  ○  Waiting for device                                  │   │
│  │  ○  Enabling root access                                │   │
│  │  ○  Remounting filesystem                               │   │
│  │  ○  Disabling verity                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ████████████████████████████░░░░░░░░░░░░  50%                 │
│  Step 5 of 10: Installing APK...                               │
│                                                                 │
│  ▼ Installation Log                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [12:34:56] Starting installation...                     │   │
│  │ [12:34:57] adb wait-for-device                          │   │
│  │ [12:34:58] Device connected                             │   │
│  │ [12:34:59] adb root                                     │   │
│  │ [12:35:00] Root access enabled                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│  [Copy Log]                                                     │
│                                                                 │
│  ┌──────────────┐                              ┌──────────────┐ │
│  │   ← Back     │                              │    Next →    │ │
│  └──────────────┘                              └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Installation Steps

Based on the provided ADB commands:

| # | Step | ADB Command | Description |
|---|------|-------------|-------------|
| 1 | Wait for device | `adb wait-for-device` | Wait for device connection |
| 2 | Enable root | `adb root` | Get root access |
| 3 | Remount | `adb remount` | Remount filesystem as writable |
| 4 | Disable verity | `adb disable-verity` | Disable dm-verity |
| 5 | Install APK | `adb install -g voboost.apk` | Install with all permissions |
| 6 | Reboot | `adb reboot` | Reboot device |
| 7 | Wait for device | `adb wait-for-device` | Wait for reboot complete |
| 8 | Enable root | `adb root` | Get root access again |
| 9 | Remount | `adb remount` | Remount filesystem |
| 10 | Disable verity | `adb disable-verity` | Disable dm-verity again |

### UI Elements

| Element | Fluent Component | Notes |
|---------|------------------|-------|
| Title | `Title2` | "Installing Voboost" |
| Step list | Custom `InstallStep` | With status icons |
| Progress bar | `ProgressBar` | Overall progress |
| Status text | `Text` | Current step description |
| Log viewer | Custom `LogViewer` | Expandable, scrollable |
| Copy button | `Button` | Copy log to clipboard |

### State

```typescript
interface InstallState {
  status: 'idle' | 'running' | 'success' | 'error';
  currentStep: number;
  steps: InstallStep[];
  log: LogEntry[];
  error: string | null;
}

interface InstallStep {
  id: string;
  name: { en: string; ru: string };
  command: string;
  status: 'pending' | 'running' | 'success' | 'error';
  error?: string;
}

interface LogEntry {
  timestamp: string;
  message: string;
  level: 'info' | 'error' | 'success';
}
```

### Behavior

1. Start installation automatically on mount
2. Execute steps sequentially
3. Update UI after each step
4. Log all output with timestamps
5. On error: stop, show error, enable "Copy Log"
6. On success: enable Next button
7. Back button disabled during installation

---

## Screen 5: Complete (Finish)

**Purpose**: Show success and next steps.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Voboost Installer                                    [─][□][×] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [x] License  [x] Download  [x] Connect  [x] Install  [*] Done  │
│                                                                 │
│                                                                 │
│                         ┌─────────┐                             │
│                         │  [OK]   │                             │
│                         │ [OK OK] │                             │
│                         │  [OK]   │                             │
│                         └─────────┘                             │
│                                                                 │
│                  Installation Complete!                         │
│                                                                 │
│            Voboost has been successfully installed              │
│                                                                 │
│                                                                 │
│  Next Steps:                                                    │
│  ───────────                                                    │
│                                                                 │
│  1. Disconnect the USB cable from your car                      │
│                                                                 │
│  2. The head unit will restart automatically                    │
│                                                                 │
│  3. Find Voboost in your app list                               │
│                                                                 │
│                                                                 │
│                                                ┌──────────────┐ │
│                                                │    Finish    │ │
│                                                └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### UI Elements

| Element | Fluent Component | Notes |
|---------|------------------|-------|
| Success icon | SVG or Fluent icon | Large checkmark |
| Title | `Title1` | "Installation Complete!" |
| Subtitle | `Text` | "Voboost has been successfully installed" |
| Next steps | Numbered list | Instructions |
| Finish button | `Button` primary | Closes the app |

### Behavior

1. Display success message
2. Show next steps for user
3. Finish button closes the application
4. No Back button (installation is complete)
