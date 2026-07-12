use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

use super::logger;

/// Pick the macOS ADB binary that matches the running host architecture.
///
/// Both `adb_arm` (Apple Silicon) and `adb_x86` (Intel) are bundled into
/// every macOS build (see `src/build/stage-resources.js`), so a single
/// universal binary runs natively on either architecture. The matching
/// binary is selected at runtime via `std::env::consts::ARCH`.
///
/// If the native binary is missing (corrupted install), the other
/// architecture binary is tried as a fallback — macOS transparently
/// translates it via Rosetta 2 on Apple Silicon.
fn mac_adb_filename() -> &'static str {
    match std::env::consts::ARCH {
        "aarch64" => "adb_arm",
        "x86_64" => "adb_x86",
        // Unknown host arch: prefer arm64 (the dominant macOS arch today),
        // Rosetta will translate it on Intel if needed.
        _ => "adb_arm",
    }
}

/// The fallback binary to try when the native one is unavailable.
fn mac_adb_fallback() -> &'static str {
    match mac_adb_filename() {
        "adb_arm" => "adb_x86",
        _ => "adb_arm",
    }
}

/// Resolve the base directory that holds the bundled `resources-staged/` tree.
///
/// Tauri's `app.path().resource_dir()` is the canonical source, but on macOS
/// it returns `unknown path` when the binary is launched directly from
/// `Contents/MacOS/` (i.e. not through LaunchServices/`open`), which is
/// exactly how headless CLI modes are invoked. To stay robust in that case we
/// fall back to deriving the resources directory from `current_exe()`:
///
/// - Raw cargo binary (`target/release/voboost-install`): resources live next
///   to the executable in `./resources-staged/`.
/// - `.app` bundle: the executable lives in `Contents/MacOS/` and resources
///   live in `../Resources/resources-staged/`.
///
/// The first candidate that actually contains a `resources-staged` directory
/// wins; if none do, the Tauri-provided path is returned as-is so the caller
/// gets a meaningful "ADB not found at ..." error.
fn resolve_resources_base(app: &AppHandle) -> Result<PathBuf, String> {
    // 1. Canonical Tauri resource dir.
    let tauri_res = app.path().resource_dir();
    if let Ok(ref p) = tauri_res {
        // Tauri may return a placeholder like "unknown path" on macOS when the
        // bundle URL cannot be resolved (direct binary launch). Detect that
        // and skip to the fallbacks.
        let s = p.to_string_lossy();
        if !s.is_empty() && s != "unknown path" && p.join("resources-staged").exists() {
            return Ok(p.clone());
        }
    }

    // 2. Derive from the current executable location.
    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            // Raw binary layout: <exe_dir>/resources-staged
            let raw = exe_dir.join("resources-staged");
            if raw.exists() {
                return Ok(exe_dir.to_path_buf());
            }
            // .app bundle layout: <exe_dir> = Contents/MacOS, resources in
            // Contents/Resources/resources-staged
            if let Some(contents_dir) = exe_dir.parent() {
                let bundle_res = contents_dir.join("Resources");
                if bundle_res.join("resources-staged").exists() {
                    return Ok(bundle_res);
                }
            }
        }
    }

    // 3. Last resort: return whatever Tauri gave us (or an error) so the
    // caller's existence check produces a clear message.
    tauri_res
        .map(|p| p.clone())
        .map_err(|e| format!("Failed to get resource dir: {}", e))
}

pub fn get_adb_path(app: &AppHandle) -> Result<PathBuf, String> {
    let resource_path = resolve_resources_base(app)?;

    #[cfg(target_os = "windows")]
    let adb_path = resource_path.join("resources-staged").join("win").join("adb.exe");

    #[cfg(target_os = "macos")]
    let adb_path = {
        let staged = resource_path.join("resources-staged").join("mac");
        let primary = staged.join(mac_adb_filename());
        if primary.exists() {
            primary
        } else {
            // Fallback: try the other architecture (Rosetta on Apple Silicon).
            let fallback = staged.join(mac_adb_fallback());
            if fallback.exists() {
                logger::log(
                    "WARN",
                    &format!(
                        "Native ADB binary '{}' not found; falling back to '{}' (Rosetta)",
                        mac_adb_filename(),
                        mac_adb_fallback()
                    ),
                );
                fallback
            } else {
                return Err(format!(
                    "ADB not found at: {:?} (also tried fallback '{}')",
                    primary,
                    mac_adb_fallback()
                ));
            }
        }
    };

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    let adb_path: PathBuf = {
        let _ = resource_path;
        return Err("Unsupported platform: ADB path resolution only supports Windows and macOS".to_string());
    };

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
