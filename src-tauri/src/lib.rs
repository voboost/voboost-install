mod commands;
mod utils;

use commands::{adb, cli_runner, download, install, platform};
use tauri_plugin_cli::CliExt;

#[tauri::command]
async fn exit_app(code: i32) {
    std::process::exit(code);
}

/// Read a string CLI arg value from the parsed matches.
fn arg_str(matches: &tauri_plugin_cli::Matches, key: &str) -> Option<String> {
    matches
        .args
        .get(key)
        .and_then(|a| a.value.as_str())
        .map(|s| s.to_string())
}

/// True if a boolean (no-value) CLI flag is present.
fn flag_present(matches: &tauri_plugin_cli::Matches, key: &str) -> bool {
    matches
        .args
        .get(key)
        .map(|a| a.occurrences > 0)
        .unwrap_or(false)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            let matches = app.cli().matches().ok();

            // 1. --help FIRST: print help and exit 0 before any window is shown.
            if let Some(ref m) = matches {
                if flag_present(m, "help") {
                    cli_runner::print_help();
                    std::process::exit(0);
                }
            }

            // Determine whether a headless mode was requested.
            let headless = matches.as_ref().and_then(|m| {
                if m.args.get("install").map(|a| a.occurrences > 0).unwrap_or(false) {
                    Some(HeadlessMode::Install)
                } else if flag_present(m, "restore") {
                    Some(HeadlessMode::Restore)
                } else if flag_present(m, "uninstall") {
                    Some(HeadlessMode::Uninstall)
                } else {
                    None
                }
            });

            if let Some(mode) = headless {
                // Headless mode: no GUI window, no Dock icon.
                //
                // On macOS a Tauri app defaults to `ActivationPolicy::Regular`,
                // which puts an icon in the Dock and activates the app even
                // when no window is ever shown. Switching to `Accessory`
                // keeps the process a background CLI tool: no Dock icon,
                // no window flash, no focus steal.
                #[cfg(target_os = "macos")]
                {
                    let _ = app.set_activation_policy(tauri::ActivationPolicy::Accessory);
                }

                let app_handle = app.handle().clone();
                let m = matches.clone().unwrap();

                tauri::async_runtime::spawn(async move {
                    let lang = arg_str(&m, "lang").unwrap_or_else(|| "en".to_string());

                    match mode {
                        HeadlessMode::Install => {
                            let apk_path = match arg_str(&m, "install") {
                                Some(p) => p,
                                None => {
                                    eprintln!("Error: --install requires an APK path");
                                    std::process::exit(1);
                                }
                            };
                            let daemon_bin = match arg_str(&m, "daemon-bin") {
                                Some(p) => p,
                                None => {
                                    eprintln!("Error: --install requires --daemon-bin <path>");
                                    std::process::exit(1);
                                }
                            };
                            let agents_dir = match arg_str(&m, "agents-dir") {
                                Some(p) => p,
                                None => {
                                    eprintln!("Error: --install requires --agents-dir <path>");
                                    std::process::exit(1);
                                }
                            };
                            let manifest = match arg_str(&m, "manifest") {
                                Some(p) => p,
                                None => {
                                    eprintln!("Error: --install requires --manifest <path>");
                                    std::process::exit(1);
                                }
                            };
                            let manifest_sig = match arg_str(&m, "manifest-sig") {
                                Some(p) => p,
                                None => {
                                    eprintln!(
                                        "Error: --install requires --manifest-sig <path>"
                                    );
                                    std::process::exit(1);
                                }
                            };
                            // --release-key is optional: when omitted the
                            // install skips the OTA release-public.pem push
                            // (OTA signature verification stays disabled).
                            let release_key =
                                arg_str(&m, "release-key").unwrap_or_default();
                            cli_runner::run_install(
                                app_handle,
                                apk_path,
                                daemon_bin,
                                agents_dir,
                                manifest,
                                manifest_sig,
                                release_key,
                                lang,
                            )
                            .await;
                        }
                        HeadlessMode::Restore => {
                            cli_runner::run_restore(app_handle, lang).await;
                        }
                        HeadlessMode::Uninstall => {
                            cli_runner::run_uninstall(app_handle, lang).await;
                        }
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            adb::start_adb_server,
            adb::get_devices,
            adb::execute_adb,
            download::fetch_releases,
            download::read_local_releases,
            download::download_apk,
            download::check_existing_apk,
            install::get_install_steps,
            install::get_uninstall_steps,
            install::execute_install_step,
            platform::has_usb_type_c,
            platform::get_platform_override,
            exit_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Headless execution mode selected by CLI flags.
enum HeadlessMode {
    Install,
    Restore,
    Uninstall,
}
