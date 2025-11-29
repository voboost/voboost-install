# Error Handling & Edge Cases

## Overview

This document describes error handling strategies and edge cases that the installer must handle gracefully.

---

## Network Errors

### Fetching Releases

| Error | Cause | User Message | Action |
|-------|-------|--------------|--------|
| Network timeout | Slow/no internet | "Unable to connect to server. Please check your internet connection." | Retry button |
| DNS failure | No internet | "Unable to connect to server. Please check your internet connection." | Retry button |
| 404 Not Found | releases.json missing | "Release information not available. Please try again later." | Retry button |
| Invalid JSON | Corrupted response | "Failed to load release information. Please try again." | Retry button |
| SSL error | Certificate issue | "Secure connection failed. Please check your system date/time." | Show details |

### Downloading APK

| Error | Cause | User Message | Action |
|-------|-------|--------------|--------|
| Connection lost | Network dropped | "Download interrupted. Click retry to resume." | Retry (resume) |
| Timeout | Slow connection | "Download timed out. Please try again." | Retry |
| Disk full | No space | "Not enough disk space. Free up {{needed}} MB and try again." | Show disk info |
| Permission denied | Write access | "Cannot save file. Please check permissions." | Show path |
| Hash mismatch | Corrupted download | "Downloaded file is corrupted. Please try again." | Delete & retry |

### Resume Download

```typescript
// Check if partial download exists
async function resumeDownload(url: string, existingPath: string): Promise<void> {
  const existingSize = await getFileSize(existingPath);

  // Request with Range header
  const response = await fetch(url, {
    headers: {
      'Range': `bytes=${existingSize}-`
    }
  });

  if (response.status === 206) {
    // Server supports resume, append to existing file
    await appendToFile(existingPath, response.body);
  } else {
    // Server doesn't support resume, start over
    await deleteFile(existingPath);
    await downloadFull(url, existingPath);
  }
}
```

---

## ADB Errors

### Device Detection

| Error | Cause | User Message | Action |
|-------|-------|--------------|--------|
| No devices | Not connected | "No device found. Please connect your vehicle via USB." | Keep polling |
| Unauthorized | Debug not accepted | "Please accept USB debugging on your vehicle's screen." | Keep polling |
| Offline | Connection issue | "Device is offline. Please reconnect the USB cable." | Retry button |
| No permissions | Driver issue (Win) | "USB driver issue. Please install the correct driver." | Show instructions |
| Multiple devices | >1 device | "Multiple devices found. Please disconnect other devices." | Show list |

### Installation Steps

| Step | Possible Errors | Recovery |
|------|-----------------|----------|
| `wait-for-device` | Timeout (120s) | "Device not responding. Please check connection." |
| `root` | "adbd cannot run as root" | "Root access not available on this device." |
| `remount` | "remount failed" | "Cannot modify system. Device may not support this." |
| `disable-verity` | "verity not enabled" | Continue (not an error) |
| `install` | Various INSTALL_FAILED_* | See APK install errors below |
| `reboot` | Timeout | "Device not responding after reboot." |

### APK Installation Errors

| Error Code | Cause | User Message |
|------------|-------|--------------|
| INSTALL_FAILED_ALREADY_EXISTS | App exists | "Voboost is already installed. Uninstall first?" |
| INSTALL_FAILED_INVALID_APK | Corrupted APK | "Installation file is corrupted. Please re-download." |
| INSTALL_FAILED_INSUFFICIENT_STORAGE | No space | "Not enough storage on device." |
| INSTALL_FAILED_OLDER_SDK | Android too old | "Your device's Android version is not supported." |
| INSTALL_FAILED_VERSION_DOWNGRADE | Older version | "Cannot install older version. Uninstall current version first?" |
| INSTALL_PARSE_FAILED_* | APK parsing error | "Installation file is invalid. Please re-download." |

---

## Device Disconnection

### During Download
- Download continues (not dependent on device)
- No action needed

### During Connection Screen
- Status changes to "searching"
- Polling continues automatically
- User sees "Device disconnected. Please reconnect."

### During Installation
- **Critical**: Installation may be in inconsistent state
- Stop current step
- Show error: "Device disconnected during installation. Please reconnect and try again."
- Offer "Retry" button
- Log the exact step where disconnection occurred

```typescript
// Handle disconnection during install
async function executeInstallWithDisconnectHandling(
  steps: InstallStep[],
  onDisconnect: () => void
): Promise<void> {
  for (const step of steps) {
    // Check device still connected before each step
    const devices = await getDevices();
    const connected = devices.find(d => d.state === 'device');

    if (!connected) {
      onDisconnect();
      throw new Error('Device disconnected');
    }

    await executeStep(step);
  }
}
```

---

## Platform-Specific Issues

### Windows

| Issue | Detection | Solution |
|-------|-----------|----------|
| Missing USB driver | Device shows "no permissions" | Show driver installation guide |
| ADB server conflict | Port 5037 in use | Kill existing adb.exe, restart |
| Antivirus blocking | ADB fails to start | Add exception for bundled ADB |
| Long path issue | Path > 260 chars | Use short temp path |

### macOS

| Issue | Detection | Solution |
|-------|-----------|----------|
| Gatekeeper blocking | App won't open | Show "Open Anyway" instructions |
| USB accessory prompt | Device not appearing | Remind user to click "Allow" |
| ADB not executable | Permission denied | chmod +x on first run |
| Rosetta not installed | ARM Mac, Intel binary | Show Rosetta installation |

---

## User Experience Guidelines

### Error Messages

**DO:**
- Use plain language, not technical jargon
- Explain what went wrong
- Suggest a specific action
- Provide a way to get more details

**DON'T:**
- Show raw error codes/stack traces
- Blame the user
- Use vague messages like "An error occurred"
- Leave user without next steps

### Example Error Dialog

```
┌─────────────────────────────────────────────────────────────┐
│  [!] Installation Failed                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  The APK could not be installed on your device.             │
│                                                             │
│  This might be because:                                     │
│  • The device doesn't have enough storage                   │
│  • An incompatible version is already installed             │
│                                                             │
│  What you can do:                                           │
│  1. Free up space on your device                            │
│  2. Uninstall the existing Voboost app                      │
│  3. Try the installation again                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Error: INSTALL_FAILED_INSUFFICIENT_STORAGE          │   │
│  │ Device: Voyah Free (ABC123)                         │   │
│  │ APK: voboost-1.2.0.apk (15.0 MB)                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Copy Details]              [View Log]        [Try Again]  │
└─────────────────────────────────────────────────────────────┘
```

### Progress Feedback

Always show:
1. **What's happening now** - Current step name
2. **How far along** - Progress bar or step X of Y
3. **Estimated time** - If possible
4. **Cancel option** - Where safe to do so

---

## Logging Strategy

### What to Log

```typescript
interface LogEntry {
  timestamp: string;      // ISO 8601
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  category: string;       // 'ADB', 'DOWNLOAD', 'INSTALL', 'UI'
  message: string;        // Human-readable
  details?: {
    command?: string;     // ADB command executed
    exitCode?: number;    // Process exit code
    stdout?: string;      // Standard output
    stderr?: string;      // Standard error
    duration?: number;    // Milliseconds
  };
}
```

### Log Levels

| Level | When to Use |
|-------|-------------|
| DEBUG | Detailed info for debugging (not shown to user) |
| INFO | Normal operations (shown in log viewer) |
| WARN | Recoverable issues (shown in log viewer) |
| ERROR | Failures (shown in log viewer, highlighted) |

### Example Log Output

```
[14:32:01.123] [INFO] [DOWNLOAD] Starting download: voboost-1.2.0.apk
[14:32:01.456] [DEBUG] [DOWNLOAD] URL: https://github.com/voboost/voboost/releases/...
[14:32:15.789] [INFO] [DOWNLOAD] Download complete: 15728640 bytes
[14:32:15.890] [INFO] [DOWNLOAD] Verifying SHA256 hash...
[14:32:16.234] [INFO] [DOWNLOAD] Hash verified successfully
[14:32:20.000] [INFO] [ADB] Starting installation
[14:32:20.100] [INFO] [ADB] Executing: adb wait-for-device
[14:32:21.200] [INFO] [ADB] Device ready
[14:32:21.300] [INFO] [ADB] Executing: adb root
[14:32:22.400] [INFO] [ADB] Root access enabled
[14:32:22.500] [INFO] [ADB] Executing: adb remount
[14:32:23.600] [WARN] [ADB] Remount warning: Already remounted
[14:32:23.700] [INFO] [ADB] Executing: adb install -g /tmp/voboost-1.2.0.apk
[14:32:45.800] [INFO] [ADB] APK installed successfully
```

---

## Recovery Strategies

### Automatic Recovery

| Situation | Automatic Action |
|-----------|------------------|
| ADB server not running | Start server automatically |
| Device unauthorized | Keep polling, show prompt |
| Network timeout | Retry up to 3 times |
| Partial download exists | Verify hash, resume if valid |

### Manual Recovery (User Action Required)

| Situation | User Action |
|-----------|-------------|
| No internet | Check connection, retry |
| Device not connected | Connect USB, wait |
| Driver missing (Windows) | Install driver |
| Disk full | Free space, retry |
| Installation failed | View log, contact support |

---

## Telemetry (Optional, Opt-in)

If telemetry is added in the future:

### What to Collect (with consent)
- Installation success/failure rate
- Error types encountered
- Device models
- OS versions
- Installation duration

### What NOT to Collect
- Personal information
- Device serial numbers
- IP addresses
- File paths
- Log contents

### Privacy Notice
```
We collect anonymous usage data to improve the installer.
No personal information is collected.
You can disable this in Settings.
```
