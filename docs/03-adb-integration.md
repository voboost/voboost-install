# ADB Integration

## Overview

The installer uses bundled ADB (Android Debug Bridge) to communicate with the vehicle's head unit. ADB binaries are included in the app bundle for both Windows and macOS.

## Bundled ADB Files

### Windows

Location: `src-tauri/resources/adb/win/`

| File | Size | Description |
|------|------|-------------|
| `adb.exe` | ~5.8 MB | ADB executable |
| `AdbWinApi.dll` | ~108 KB | Windows ADB API |
| `AdbWinUsbApi.dll` | ~73 KB | Windows USB API |

### macOS

Location: `src-tauri/resources/adb/mac/`

| File | Size | Description |
|------|------|-------------|
| `adb` | ~13.6 MB | Universal binary (x64 + ARM64) |

## Installation Steps

The installation process executes these ADB commands in sequence:

```bash
# Step 1: Wait for device to be connected
adb wait-for-device

# Step 2: Get root access
adb root

# Step 3: Remount filesystem as writable
adb remount

# Step 4: Disable dm-verity (required for system modifications)
adb disable-verity

# Step 5: Install APK with all permissions granted
adb install -g /path/to/voboost-1.0.0.apk

# Step 6: Reboot device to apply changes
adb reboot

# Step 7: Wait for device to come back online
adb wait-for-device

# Step 8: Get root access again after reboot
adb root

# Step 9: Remount filesystem again
adb remount

# Step 10: Disable dm-verity again (may be needed after reboot)
adb disable-verity
```

## Rust Implementation

### ADB Path Resolution

```rust
// src-tauri/src/utils/platform.rs

use std::path::PathBuf;
use tauri::AppHandle;

pub fn get_adb_path(app: &AppHandle) -> Result<PathBuf, String> {
    let resource_path = app.path().resource_dir()
        .map_err(|e| format!("Failed to get resource dir: {}", e))?;

    #[cfg(target_os = "windows")]
    let adb_path = resource_path.join("adb").join("win").join("adb.exe");

    #[cfg(target_os = "macos")]
    let adb_path = resource_path.join("adb").join("mac").join("adb");

    if !adb_path.exists() {
        return Err(format!("ADB not found at: {:?}", adb_path));
    }

    // On macOS, ensure executable permission
    #[cfg(target_os = "macos")]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = std::fs::metadata(&adb_path)
            .map_err(|e| e.to_string())?
            .permissions();
        perms.set_mode(0o755);
        std::fs::set_permissions(&adb_path, perms)
            .map_err(|e| e.to_string())?;
    }

    Ok(adb_path)
}
```

### ADB Commands

```rust
// src-tauri/src/commands/adb.rs

use std::process::Command;
use tauri::AppHandle;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct AdbDevice {
    pub serial: String,
    pub state: String,  // "device", "offline", "unauthorized"
    pub model: Option<String>,
    pub product: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CommandResult {
    pub success: bool,
    pub exit_code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
}

/// Start ADB server
#[tauri::command]
pub async fn start_adb_server(app: AppHandle) -> Result<(), String> {
    let adb_path = crate::utils::platform::get_adb_path(&app)?;

    Command::new(&adb_path)
        .args(["start-server"])
        .output()
        .map_err(|e| format!("Failed to start ADB server: {}", e))?;

    Ok(())
}

/// Get list of connected devices
#[tauri::command]
pub async fn get_devices(app: AppHandle) -> Result<Vec<AdbDevice>, String> {
    let adb_path = crate::utils::platform::get_adb_path(&app)?;

    let output = Command::new(&adb_path)
        .args(["devices", "-l"])
        .output()
        .map_err(|e| format!("Failed to get devices: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let devices = parse_devices_output(&stdout);

    Ok(devices)
}

/// Execute ADB command
#[tauri::command]
pub async fn execute_adb(
    app: AppHandle,
    args: Vec<String>,
    device_serial: Option<String>,
) -> Result<CommandResult, String> {
    let adb_path = crate::utils::platform::get_adb_path(&app)?;

    let mut cmd = Command::new(&adb_path);

    // Target specific device if serial provided
    if let Some(serial) = device_serial {
        cmd.args(["-s", &serial]);
    }

    cmd.args(&args);

    let output = cmd.output()
        .map_err(|e| format!("Failed to execute ADB: {}", e))?;

    Ok(CommandResult {
        success: output.status.success(),
        exit_code: output.status.code(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

/// Parse `adb devices -l` output
fn parse_devices_output(output: &str) -> Vec<AdbDevice> {
    let mut devices = Vec::new();

    for line in output.lines().skip(1) {  // Skip header line
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 {
            let serial = parts[0].to_string();
            let state = parts[1].to_string();

            // Parse additional info (model:XXX product:YYY)
            let mut model = None;
            let mut product = None;

            for part in &parts[2..] {
                if let Some(m) = part.strip_prefix("model:") {
                    model = Some(m.to_string());
                }
                if let Some(p) = part.strip_prefix("product:") {
                    product = Some(p.to_string());
                }
            }

            devices.push(AdbDevice {
                serial,
                state,
                model,
                product,
            });
        }
    }

    devices
}
```

### Installation Executor

```rust
// src-tauri/src/commands/install.rs

use tauri::{AppHandle, Emitter};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallStep {
    pub id: String,
    pub name_en: String,
    pub name_ru: String,
    pub command: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepResult {
    pub step_id: String,
    pub success: bool,
    pub output: String,
    pub error: Option<String>,
}

/// Get installation steps
#[tauri::command]
pub fn get_install_steps(apk_path: String) -> Vec<InstallStep> {
    vec![
        InstallStep {
            id: "wait-device-1".to_string(),
            name_en: "Waiting for device".to_string(),
            name_ru: "Ожидание устройства".to_string(),
            command: vec!["wait-for-device".to_string()],
        },
        InstallStep {
            id: "root-1".to_string(),
            name_en: "Enabling root access".to_string(),
            name_ru: "Включение root-доступа".to_string(),
            command: vec!["root".to_string()],
        },
        InstallStep {
            id: "remount-1".to_string(),
            name_en: "Remounting filesystem".to_string(),
            name_ru: "Перемонтирование файловой системы".to_string(),
            command: vec!["remount".to_string()],
        },
        InstallStep {
            id: "disable-verity-1".to_string(),
            name_en: "Disabling verity".to_string(),
            name_ru: "Отключение verity".to_string(),
            command: vec!["disable-verity".to_string()],
        },
        InstallStep {
            id: "install-apk".to_string(),
            name_en: "Installing Voboost APK".to_string(),
            name_ru: "Установка Voboost APK".to_string(),
            command: vec!["install".to_string(), "-g".to_string(), apk_path.clone()],
        },
        InstallStep {
            id: "reboot".to_string(),
            name_en: "Rebooting device".to_string(),
            name_ru: "Перезагрузка устройства".to_string(),
            command: vec!["reboot".to_string()],
        },
        InstallStep {
            id: "wait-device-2".to_string(),
            name_en: "Waiting for device".to_string(),
            name_ru: "Ожидание устройства".to_string(),
            command: vec!["wait-for-device".to_string()],
        },
        InstallStep {
            id: "root-2".to_string(),
            name_en: "Enabling root access".to_string(),
            name_ru: "Включение root-доступа".to_string(),
            command: vec!["root".to_string()],
        },
        InstallStep {
            id: "remount-2".to_string(),
            name_en: "Remounting filesystem".to_string(),
            name_ru: "Перемонтирование файловой системы".to_string(),
            command: vec!["remount".to_string()],
        },
        InstallStep {
            id: "disable-verity-2".to_string(),
            name_en: "Disabling verity".to_string(),
            name_ru: "Отключение verity".to_string(),
            command: vec!["disable-verity".to_string()],
        },
    ]
}

/// Execute single installation step
#[tauri::command]
pub async fn execute_install_step(
    app: AppHandle,
    step: InstallStep,
    device_serial: Option<String>,
) -> Result<StepResult, String> {
    // Emit progress event
    app.emit("install-step-start", &step.id)
        .map_err(|e| e.to_string())?;

    let result = crate::commands::adb::execute_adb(
        app.clone(),
        step.command.clone(),
        device_serial,
    ).await?;

    let step_result = StepResult {
        step_id: step.id.clone(),
        success: result.success,
        output: result.stdout,
        error: if result.success { None } else { Some(result.stderr) },
    };

    // Emit completion event
    app.emit("install-step-complete", &step_result)
        .map_err(|e| e.to_string())?;

    Ok(step_result)
}
```

## TypeScript Types

```typescript
// src/types/adb.ts

export interface AdbDevice {
  serial: string;
  state: 'device' | 'offline' | 'unauthorized' | 'no permissions';
  model?: string;
  product?: string;
}

export interface CommandResult {
  success: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

export interface InstallStep {
  id: string;
  nameEn: string;
  nameRu: string;
  command: string[];
}

export interface StepResult {
  stepId: string;
  success: boolean;
  output: string;
  error?: string;
}
```

## TypeScript Service

```typescript
// src/services/adb.ts

import { invoke } from '@tauri-apps/api/core';
import type { AdbDevice, CommandResult, InstallStep, StepResult } from '../types/adb';

export async function startAdbServer(): Promise<void> {
  return invoke('start_adb_server');
}

export async function getDevices(): Promise<AdbDevice[]> {
  return invoke('get_devices');
}

export async function executeAdb(
  args: string[],
  deviceSerial?: string
): Promise<CommandResult> {
  return invoke('execute_adb', { args, deviceSerial });
}

export async function getInstallSteps(apkPath: string): Promise<InstallStep[]> {
  return invoke('get_install_steps', { apkPath });
}

export async function executeInstallStep(
  step: InstallStep,
  deviceSerial?: string
): Promise<StepResult> {
  return invoke('execute_install_step', { step, deviceSerial });
}
```

## Error Handling

### Common ADB Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `device not found` | No device connected | Check USB connection |
| `device unauthorized` | USB debugging not accepted | Accept prompt on device |
| `device offline` | Connection issue | Reconnect USB cable |
| `INSTALL_FAILED_*` | APK installation error | Check APK compatibility |
| `remount failed` | Filesystem locked | Reboot and try again |

### Error Messages (i18n)

```json
{
  "adb": {
    "errors": {
      "deviceNotFound": "Device not found. Please check USB connection.",
      "deviceUnauthorized": "Please accept USB debugging prompt on your device.",
      "deviceOffline": "Device is offline. Please reconnect USB cable.",
      "installFailed": "APK installation failed: {{error}}",
      "remountFailed": "Failed to remount filesystem. Please reboot and try again."
    }
  }
}
```

## Device Polling

The Connection screen polls for devices every 2 seconds:

```typescript
// src/hooks/useAdb.ts

import { useState, useEffect, useCallback } from 'react';
import { getDevices, startAdbServer } from '../services/adb';
import type { AdbDevice } from '../types/adb';

const POLL_INTERVAL = 2000; // 2 seconds

export function useAdbDevices() {
  const [devices, setDevices] = useState<AdbDevice[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startPolling = useCallback(async () => {
    setIsPolling(true);
    setError(null);

    // Start ADB server first
    try {
      await startAdbServer();
    } catch (e) {
      setError('Failed to start ADB server');
      setIsPolling(false);
      return;
    }
  }, []);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  useEffect(() => {
    if (!isPolling) return;

    const poll = async () => {
      try {
        const deviceList = await getDevices();
        setDevices(deviceList);
        setError(null);
      } catch (e) {
        setError('Failed to get devices');
      }
    };

    // Initial poll
    poll();

    // Set up interval
    const interval = setInterval(poll, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [isPolling]);

  // Get first connected device
  const connectedDevice = devices.find(d => d.state === 'device');
  const unauthorizedDevice = devices.find(d => d.state === 'unauthorized');

  return {
    devices,
    connectedDevice,
    unauthorizedDevice,
    isPolling,
    error,
    startPolling,
    stopPolling,
  };
}
```

## Timeout Handling

Some ADB commands can take a long time (especially `wait-for-device` after reboot):

```rust
// src-tauri/src/commands/adb.rs

use std::time::Duration;
use tokio::time::timeout;

/// Execute ADB command with timeout
#[tauri::command]
pub async fn execute_adb_with_timeout(
    app: AppHandle,
    args: Vec<String>,
    device_serial: Option<String>,
    timeout_secs: u64,
) -> Result<CommandResult, String> {
    let adb_path = crate::utils::platform::get_adb_path(&app)?;

    let mut cmd = tokio::process::Command::new(&adb_path);

    if let Some(serial) = device_serial {
        cmd.args(["-s", &serial]);
    }

    cmd.args(&args);

    let result = timeout(
        Duration::from_secs(timeout_secs),
        cmd.output()
    ).await;

    match result {
        Ok(Ok(output)) => Ok(CommandResult {
            success: output.status.success(),
            exit_code: output.status.code(),
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        }),
        Ok(Err(e)) => Err(format!("ADB execution failed: {}", e)),
        Err(_) => Err(format!("ADB command timed out after {} seconds", timeout_secs)),
    }
}
```

### Recommended Timeouts

| Command | Timeout | Notes |
|---------|---------|-------|
| `wait-for-device` | 120s | After reboot, device may take time |
| `root` | 10s | Usually fast |
| `remount` | 30s | May take time on some devices |
| `disable-verity` | 30s | May take time |
| `install` | 120s | Depends on APK size |
| `reboot` | 10s | Command returns immediately |

## Windows USB Drivers

On Windows, users may need to install USB drivers for their device. The installer should detect this and provide guidance:

```rust
// Check if device is recognized but driver is missing
fn check_windows_driver_issue(devices: &[AdbDevice]) -> bool {
    #[cfg(target_os = "windows")]
    {
        // If we see a device with "no permissions" or similar, driver may be missing
        devices.iter().any(|d| d.state == "no permissions")
    }
    #[cfg(not(target_os = "windows"))]
    {
        false
    }
}
```

### Driver Installation Instructions

If driver issues are detected, show:

1. Download Google USB Driver from Android SDK
2. Open Device Manager
3. Find the device (may show as "Unknown device")
4. Right-click → Update driver → Browse → Select downloaded driver
5. Restart installer

## macOS Permissions

On macOS, the app may need to request permission to access USB devices. This is handled automatically by macOS, but users should be informed:

1. When connecting device, macOS may show "Allow accessory to connect?" dialog
2. User must click "Allow"
3. If denied, device won't appear in ADB

## Logging

All ADB commands are logged for debugging:

```rust
// src-tauri/src/utils/logger.rs

use chrono::Local;
use std::sync::Mutex;

lazy_static::lazy_static! {
    static ref LOG: Mutex<Vec<LogEntry>> = Mutex::new(Vec::new());
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct LogEntry {
    pub timestamp: String,
    pub level: String,
    pub message: String,
}

pub fn log(level: &str, message: &str) {
    let entry = LogEntry {
        timestamp: Local::now().format("%H:%M:%S%.3f").to_string(),
        level: level.to_string(),
        message: message.to_string(),
    };

    if let Ok(mut log) = LOG.lock() {
        log.push(entry);
    }
}

pub fn get_log() -> Vec<LogEntry> {
    LOG.lock().map(|l| l.clone()).unwrap_or_default()
}

pub fn clear_log() {
    if let Ok(mut log) = LOG.lock() {
        log.clear();
    }
}

// Usage in ADB commands:
// log("INFO", &format!("Executing: adb {}", args.join(" ")));
// log("SUCCESS", "Command completed successfully");
// log("ERROR", &format!("Command failed: {}", error));
```
