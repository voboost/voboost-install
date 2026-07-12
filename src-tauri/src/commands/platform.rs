use std::process::Command;

#[tauri::command]
pub async fn has_usb_type_c() -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        // Windows: Check UCM class (USB Connector Manager) for Type-C ports
        // UCM class GUID: {e6f1aa1c-7f3b-4473-b2e8-c97d8ac71d53}
        let output = Command::new("pnputil")
            .args(["/enum-devices", "/class", "{e6f1aa1c-7f3b-4473-b2e8-c97d8ac71d53}"])
            .output();

        match output {
            Ok(result) => {
                let stdout = String::from_utf8_lossy(&result.stdout);
                // If output contains device info, UCM class exists → has Type-C
                Ok(stdout.contains("Class GUID:") || stdout.contains("Device Name:"))
            }
            Err(_) => {
                // On failure, default to true (modern assumption)
                Ok(true)
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        // macOS: Check for Thunderbolt controllers (all USB-C Macs have Thunderbolt)
        let output = Command::new("system_profiler")
            .args(["SPThunderboltDataType", "-json"])
            .output();

        match output {
            Ok(result) => {
                let stdout = String::from_utf8_lossy(&result.stdout);
                // If output contains Thunderbolt data, has USB-C
                Ok(stdout.contains("thunderbolt") || stdout.contains("Thunderbolt"))
            }
            Err(_) => {
                // On failure, default to true (modern assumption)
                Ok(true)
            }
        }
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        // For other platforms (Linux, etc.), default to true
        Ok(true)
    }
}


use tauri::AppHandle;
use tauri_plugin_cli::CliExt;

#[tauri::command]
pub async fn get_platform_override(app: AppHandle) -> Result<Option<String>, String> {
    if let Ok(matches) = app.cli().matches() {
        if let Some(arg) = matches.args.get("platform") {
            if let Some(value) = arg.value.as_str() {
                let v = value.to_string();
                if !v.is_empty() {
                    return Ok(Some(v));
                }
            }
        }
    }
    Ok(None)
}
