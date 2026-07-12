//! Headless CLI runner for `--install`, `--restore`, and `--uninstall` modes.
//!
//! Each mode resolves its scenario steps, runs them against a connected device,
//! and exits with a status code. No GUI window is shown: the caller exits the
//! process from inside the Tauri `setup` closure before the event loop pumps
//! the window, so the window is never displayed.

use tauri::AppHandle;

use crate::commands::{adb, install};

/// Init-hook body written to `/system/etc/init/voboost.rc`.
///
/// Proper Android init service definition (not a shell-style `exec` hook).
/// The service is `disabled` so init does not auto-start it on its own; it is
/// started on `sys.boot_completed=1` and on demand via `setprop ctl.start
/// voboost-inject`. Single-instance is enforced by the daemon (pidfile + flock).
///
/// The service executes `/system/bin/sh` (labeled `shell_exec`) which init
/// can transition to via `seclabel u:r:shell:s0`. The shell then runs
/// `/data/voboost/start.sh` which starts the daemon binary. This avoids
/// SELinux domain-transition failures when the daemon binary sits on
/// `/data` (labeled `system_data_file`) which init cannot execute directly
/// under Enforcing mode.
pub const INIT_HOOK_BODY: &str = "\
# >>> voboost-inject (do not edit)
service voboost-inject /system/bin/sh /data/voboost/start.sh
    class late_start
    user root
    group root
    seclabel u:r:shell:s0
    oneshot
    disabled

on property:sys.boot_completed=1
    start voboost-inject
# <<< voboost-inject
";

/// Write the init-hook body to a temp file on the host and return its path.
///
/// The file is later pushed to the device and appended to
/// `/system/etc/init/voboost.rc` by the `write-init-hook` / `restore-hook`
/// step templates.
fn write_hook_body_temp() -> Result<String, String> {
    let mut path = std::env::temp_dir();
    path.push("voboost.rc.body");
    std::fs::write(&path, INIT_HOOK_BODY)
        .map_err(|e| format!("Failed to write hook body temp file: {}", e))?;
    // resolve to absolute string path
    Ok(path.to_string_lossy().to_string())
}

/// Wait up to `timeout_secs` for a device in the `device` state.
/// Returns the device serial or an error message.
///
/// `get_devices` is called once per iteration (not twice) to avoid spawning
/// redundant `adb devices -l` + per-device `getprop` subprocesses on every
/// poll, and to avoid the race where a second call observes a different
/// device list than the first.
async fn wait_for_device(
    app: AppHandle,
    timeout_secs: u64,
) -> Result<String, String> {
    println!("[?] Waiting for device");
    let mut last_state = String::new();
    for _ in 0..timeout_secs {
        if let Ok(devices) = adb::get_devices(app.clone()).await {
            // Capture the first device's state for the timeout message
            // before filtering, so an unauthorized/offline device is reported.
            if let Some(first) = devices.first() {
                last_state = first.state.clone();
            }
            if let Some(ready) = devices.iter().find(|d| d.state == "device") {
                let serial = ready.serial.clone();
                println!("[✓] Device connected: {}\n", serial);
                return Ok(serial);
            }
        }
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    }
    Err(format!(
        "No device connected or authorized (timeout). Last state: {}",
        last_state
    ))
}

/// Check whether the voboost-inject daemon is already running on the device.
///
/// Returns the PID (as a string) when a running instance is found, or None
/// when no instance is running (or the check itself failed). Uses pgrep
/// against the daemon binary path so it does not match the grep process
/// itself.
async fn daemon_running_pid(
    app: AppHandle,
    device_serial: &str,
) -> Option<String> {
    let cmd = vec![
        "shell".to_string(),
        "su".to_string(),
        "0".to_string(),
        "sh".to_string(),
        "-c".to_string(),
        "pgrep -f /data/voboost/voboost-inject".to_string(),
    ];
    let res = adb::execute_adb(app, cmd, Some(device_serial.to_string()))
        .await
        .ok()?;
    if !res.success {
        return None;
    }
    // pgrep prints one PID per line on success; take the first non-empty
    // trimmed line. An empty stdout means no match.
    let pid = res
        .stdout
        .lines()
        .map(|l| l.trim())
        .find(|l| !l.is_empty() && l.chars().all(|c| c.is_ascii_digit()))?
        .to_string();
    if pid.is_empty() {
        None
    } else {
        Some(pid)
    }
}

/// Run a list of resolved install steps against the given device.
///
/// Retries and the `INSTALL_FAILED_VERSION_DOWNGRADE` recovery are applied
/// inside `execute_install_step` (shared with the GUI), so this loop only
/// handles fatal-vs-non-fatal routing and step sequencing.
async fn run_steps(
    app: AppHandle,
    steps: &[install::InstallStep],
    device_serial: &str,
    lang: &str,
) -> Result<(), String> {
    let mut i = 0;
    while i < steps.len() {
        let step = &steps[i];
        let default_name = "Unknown step".to_string();
        let step_name = step
            .title
            .get(lang)
            .or_else(|| step.title.get("en"))
            .unwrap_or(&default_name);
        println!("[?] {}", step_name);

        match install::execute_install_step(
            app.clone(),
            step.clone(),
            Some(device_serial.to_string()),
        )
        .await
        {
            Ok(res) => {
                if !res.success {
                    let error_str = res.error.clone().unwrap_or_default();
                    let output_str = res.output.clone();

                    if step.fatal {
                        return Err(format!("{} failed: {:?}", step_name, error_str));
                    } else {
                        // Surface the real failure reason for non-fatal steps
                        // (e.g. verify-daemon). Previously a failed readiness
                        // check printed an empty error string because the
                        // underlying `test -f ... && grep` shell command
                        // produces no stderr on failure. Fall back to the
                        // command stdout so the operator sees why the step
                        // failed instead of an empty `""`.
                        let reason = if error_str.is_empty() {
                            output_str.clone()
                        } else {
                            error_str
                        };
                        let reason = reason.trim();
                        if reason.is_empty() {
                            println!("[!] {} failed (ignoring)\n", step_name);
                        } else {
                            println!(
                                "[!] {} failed (ignoring): {}\n",
                                step_name, reason
                            );
                        }
                    }
                } else {
                    println!("[✓] {}\n", step_name);
                }
            }
            Err(e) => {
                if step.fatal {
                    return Err(format!("Step execution error: {}", e));
                } else {
                    println!("[!] Step execution error (ignoring): {}\n", e);
                }
            }
        }
        i += 1;
    }
    Ok(())
}

/// Run the `--install` headless flow (full: APK + daemon + agents + manifest + hook).
pub async fn run_install(
    app: AppHandle,
    apk_path: String,
    daemon_bin: String,
    agents_dir: String,
    manifest: String,
    manifest_sig: String,
    release_key: String,
    lang: String,
) -> ! {
    println!("Starting Voboost CLI Install\n");
    println!("APK Path:       {}", apk_path);
    println!("Daemon binary:  {}", daemon_bin);
    println!("Agents dir:     {}", agents_dir);
    println!("Manifest:       {}", manifest);
    println!("Manifest sig:   {}", manifest_sig);
    if release_key.is_empty() {
        println!("Release key:    (none, OTA verify disabled)");
    } else {
        println!("Release key:    {}", release_key);
    }
    println!("Language:       {}\n", lang);

    let hook_local = match write_hook_body_temp() {
        Ok(p) => p,
        Err(e) => {
            eprintln!("[✗] {}\n", e);
            std::process::exit(1);
        }
    };

    if let Err(e) = adb::start_adb_server(app.clone()).await {
        eprintln!("Failed to start ADB server: {}", e);
        std::process::exit(1);
    }

    let device_serial = match wait_for_device(app.clone(), 60).await {
        Ok(s) => s,
        Err(e) => {
            eprintln!("[✗] Error: {}\n", e);
            std::process::exit(1);
        }
    };

    let artifacts = install::ProvisionArtifacts {
        apk_path,
        daemon_bin,
        agents_dir,
        manifest,
        manifest_sig,
        hook_local,
        release_key,
    };
    let apk_path = artifacts.apk_path.clone();
    let steps = install::get_install_steps(apk_path, None, Some(artifacts));
    if let Err(e) = run_steps(app, &steps, &device_serial, &lang).await {
        eprintln!("[✗] {}\n", e);
        std::process::exit(1);
    }

    println!("Install completed successfully.");
    std::process::exit(0);
}

/// Run the `--restore` headless flow (post-OTA init-hook restore).
pub async fn run_restore(app: AppHandle, lang: String) -> ! {
    println!("Starting Voboost CLI Restore\n");
    println!("Language: {}\n", lang);

    let hook_local = match write_hook_body_temp() {
        Ok(p) => p,
        Err(e) => {
            eprintln!("[✗] {}\n", e);
            std::process::exit(1);
        }
    };

    if let Err(e) = adb::start_adb_server(app.clone()).await {
        eprintln!("Failed to start ADB server: {}", e);
        std::process::exit(1);
    }

    let device_serial = match wait_for_device(app.clone(), 60).await {
        Ok(s) => s,
        Err(e) => {
            eprintln!("[✗] Error: {}\n", e);
            std::process::exit(1);
        }
    };

    let mut steps = install::get_restore_steps(&hook_local);

    // M3: --restore observability. Before the "start-daemon" step, check
    // whether the daemon is already running. If it is, log the PID and
    // drop the start-daemon step so the operator sees "already running"
    // instead of a misleading "Starting daemon" success. The verify-daemon
    // step still runs and confirms readiness.
    if let Some(pid) =
        daemon_running_pid(app.clone(), &device_serial).await
    {
        println!(
            "[i] Daemon already running (PID {}), skipping start\n",
            pid
        );
        steps.retain(|s| s.id != "start-daemon");
    }

    if let Err(e) = run_steps(app, &steps, &device_serial, &lang).await {
        eprintln!("[✗] {}\n", e);
        std::process::exit(1);
    }

    println!("Restore completed successfully.");
    std::process::exit(0);
}

/// Run the `--uninstall` headless flow (full device teardown).
///
/// Stops the daemon, removes the init hook, wipes `/data/voboost`,
/// uninstalls the APK, and reboots. No artifacts are required.
pub async fn run_uninstall(app: AppHandle, lang: String) -> ! {
    println!("Starting Voboost CLI Uninstall\n");
    println!("Language: {}\n", lang);

    if let Err(e) = adb::start_adb_server(app.clone()).await {
        eprintln!("Failed to start ADB server: {}", e);
        std::process::exit(1);
    }

    let device_serial = match wait_for_device(app.clone(), 60).await {
        Ok(s) => s,
        Err(e) => {
            eprintln!("[✗] Error: {}\n", e);
            std::process::exit(1);
        }
    };

    let steps = install::get_uninstall_steps(None);
    if let Err(e) = run_steps(app, &steps, &device_serial, &lang).await {
        eprintln!("[✗] {}\n", e);
        std::process::exit(1);
    }

    println!("Uninstall completed successfully.");
    std::process::exit(0);
}

/// Print the CLI help text to stdout.
pub fn print_help() {
    let lines = [
        "Voboost Installer",
        "",
        "Usage: voboost-install [OPTIONS]",
        "",
        "Options:",
        "  -h, --help                Show this help and exit",
        "  -i, --install <path>       Full install: APK + daemon + agents +",
        "                            manifest + init hook (headless)",
        "  -r, --restore               Restore the init hook after a system OTA",
        "                            (headless)",
        "  -U, --uninstall           Full teardown: stop daemon, remove init hook,",
        "                            wipe /data/voboost, uninstall APK, reboot",
        "                            (headless)",
        "      --daemon-bin <path>   Path to voboost-inject binary",
        "      --agents-dir <path>   Directory of agent files",
        "      --manifest <path>     Path to manifest.json",
        "      --manifest-sig <path> Path to manifest.sig",
        "      --release-key <path>  Path to release-public.pem for OTA verify",
        "                            (install, optional)",
        "  -l, --lang <en|ru>        Language for CLI output",
        "  -d, --dry-run             Simulate actions without a real device",
        "  -p, --platform <id>       Override platform for cable messages",
        "",
        "Headless modes (--install, --restore, --uninstall) do",
        "not open a GUI window. Without any of these flags the React wizard is",
        "shown.",
        "",
    ];
    println!("{}", lines.join("\n"));
}
