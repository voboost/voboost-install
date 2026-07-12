use std::process::Command;
use tauri::AppHandle;
use serde::{Deserialize, Serialize};

use crate::utils::{logger, platform};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdbDevice {
    pub serial: String,
    pub state: String,
    pub model: Option<String>,
    pub product: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandResult {
    pub success: bool,
    pub exit_code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
}

/// Allowed ADB commands whitelist for security
const ALLOWED_COMMANDS: &[&str] = &[
    "start-server",
    "devices",
    "wait-for-device",
    "root",
    "remount",
    "disable-verity",
    "install",
    "uninstall",
    "shell",
    "reboot",
    "push",
];

/// Validate that the command is in the whitelist
fn validate_adb_command(args: &[String]) -> Result<(), String> {
    if args.is_empty() {
        return Err("No command provided".to_string());
    }

    let command = &args[0];
    if !ALLOWED_COMMANDS.contains(&command.as_str()) {
        return Err(format!("Command '{}' is not allowed", command));
    }

    Ok(())
}

/// Start ADB server
#[tauri::command]
pub async fn start_adb_server(app: AppHandle) -> Result<(), String> {
    use tauri_plugin_cli::CliExt;
    let run_dry = match app.cli().matches() {
        Ok(matches) => matches.args.get("dry-run").map(|a| a.occurrences > 0).unwrap_or(false),
        Err(_) => false,
    };

    if run_dry {
        logger::log("INFO", "[DRY-RUN] Would start ADB server");
        return Ok(());
    }

    let adb_path = platform::get_adb_path(&app)?;

    logger::log("INFO", &format!("Starting ADB server: {:?}", adb_path));

    Command::new(&adb_path)
        .args(["start-server"])
        .output()
        .map_err(|e| format!("Failed to start ADB server: {}", e))?;

    logger::log("SUCCESS", "ADB server started");
    Ok(())
}

/// Get list of connected devices
#[tauri::command]
pub async fn get_devices(app: AppHandle) -> Result<Vec<AdbDevice>, String> {
    use tauri_plugin_cli::CliExt;
    let run_dry = match app.cli().matches() {
        Ok(matches) => matches.args.get("dry-run").map(|a| a.occurrences > 0).unwrap_or(false),
        Err(_) => false,
    };

    if run_dry {
        logger::log("INFO", "[DRY-RUN] Returning mock connected device");
        return Ok(vec![AdbDevice {
            serial: "MOCK_DEVICE_123".to_string(),
            state: "device".to_string(),
            model: Some("Voboost Test".to_string()),
            product: Some("voyah".to_string()),
        }]);
    }

    let adb_path = platform::get_adb_path(&app)?;

    let output = Command::new(&adb_path)
        .args(["devices", "-l"])
        .output()
        .map_err(|e| format!("Failed to get devices: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    // `adb devices -l` already prints `model:` and `product:` tokens per
    // device, which `parse_devices_output` extracts. The previous per-device
    // `getprop` enrichment spawned up to 2*N extra ADB subprocesses on every
    // poll (every 2 s in the GUI), so it has been removed: the `-l` output is
    // the single source of model/product, matching the adb-security spec's
    // "Device enumeration" requirement.
    Ok(parse_devices_output(&stdout))
}

/// Wrap a shell script argument in single quotes for safe transport through
/// `adb shell`.
///
/// `adb shell` joins all arguments after `shell` with spaces and sends the
/// resulting string to the device's shell, which then re-parses it. This means
/// an argument like `mkdir -p /x && chown root /x` passed as a single argv
/// element arrives on the device as `... sh -c mkdir -p /x && chown root /x`
/// — the `&&` is split by the device shell and `sh -c` only receives `mkdir`
/// (with no argument), producing `mkdir: Needs 1 argument`.
///
/// Wrapping the script in single quotes preserves it as one token through the
/// device shell. Embedded single quotes are escaped with the standard
/// `'\''` idiom.
fn shell_quote_single(script: &str) -> String {
    // Already quoted? Leave as-is to avoid double-quoting.
    if script.starts_with('\'') && script.ends_with('\'') && script.len() >= 2 {
        return script.to_string();
    }
    let escaped = script.replace('\'', "'\\''");
    format!("'{}'", escaped)
}

/// Detect `sh -c <script>` (and `sh -c <script>` after `su 0 ...`) patterns in
/// the argument vector and quote the `<script>` so it survives `adb shell`'s
/// space-join + device-shell re-parse.
///
/// Returns a new argument vector with the script arguments safely quoted.
/// Arguments that do not follow a `-c` flag are left untouched.
fn quote_shell_scripts(args: &[String]) -> Vec<String> {
    let mut out: Vec<String> = Vec::with_capacity(args.len());
    let mut i = 0;
    while i < args.len() {
        out.push(args[i].clone());
        // Look for the pattern: current == "-c" AND a script follows.
        if args[i] == "-c" && i + 1 < args.len() {
            let script = &args[i + 1];
            // Only quote when the script contains shell metacharacters that
            // would otherwise be split by the device shell.
            let needs_quote = script
                .chars()
                .any(|c| matches!(c, ' ' | '\t' | '&' | '|' | ';' | '>' | '<' | '(' | ')' | '$' | '`' | '*' | '?' | '"' | '\''));
            if needs_quote {
                out.push(shell_quote_single(script));
            } else {
                out.push(script.clone());
            }
            i += 2;
        } else {
            i += 1;
        }
    }
    out
}

/// Execute ADB command (with whitelist validation)
#[tauri::command]
pub async fn execute_adb(
    app: AppHandle,
    args: Vec<String>,
    device_serial: Option<String>,
) -> Result<CommandResult, String> {
    // Security: Validate command against whitelist
    validate_adb_command(&args)?;

    let adb_path = platform::get_adb_path(&app)?;

    // Quote any `sh -c <script>` arguments so compound shell scripts survive
    // `adb shell`'s space-join + device-shell re-parse.
    let args = quote_shell_scripts(&args);

    logger::log("INFO", &format!("Executing: adb {}", args.join(" ")));

    let mut cmd = Command::new(&adb_path);

    // Target specific device if serial provided
    if let Some(serial) = device_serial {
        cmd.args(["-s", &serial]);
    }

    cmd.args(&args);

    let output = cmd.output()
        .map_err(|e| format!("Failed to execute ADB: {}", e))?;

    let result = CommandResult {
        success: output.status.success(),
        exit_code: output.status.code(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    };

    if result.success {
        logger::log("SUCCESS", &format!("Command completed: adb {}", args.join(" ")));
    } else {
        logger::log("ERROR", &format!("Command failed: {}", result.stderr));
    }

    Ok(result)
}

/// Parse `adb devices -l` output
fn parse_devices_output(output: &str) -> Vec<AdbDevice> {
    let mut devices = Vec::new();

    for line in output.lines().skip(1) {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 {
            let serial = parts[0].to_string();
            let state = parts[1].to_string();

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_devices_output_empty() {
        let output = "List of devices attached\n\n";
        let devices = parse_devices_output(output);
        assert!(devices.is_empty());
    }

    #[test]
    fn test_parse_devices_output_single_device() {
        let output = "List of devices attached\nABC123\tdevice product:voyah model:Free\n";
        let devices = parse_devices_output(output);

        assert_eq!(devices.len(), 1);
        assert_eq!(devices[0].serial, "ABC123");
        assert_eq!(devices[0].state, "device");
        assert_eq!(devices[0].model, Some("Free".to_string()));
        assert_eq!(devices[0].product, Some("voyah".to_string()));
    }

    #[test]
    fn test_parse_devices_output_unauthorized() {
        let output = "List of devices attached\nABC123\tunauthorized\n";
        let devices = parse_devices_output(output);

        assert_eq!(devices.len(), 1);
        assert_eq!(devices[0].state, "unauthorized");
    }

    #[test]
    fn test_parse_devices_output_multiple() {
        let output = "List of devices attached\nABC123\tdevice\nDEF456\toffline\n";
        let devices = parse_devices_output(output);

        assert_eq!(devices.len(), 2);
    }

    #[test]
    fn test_validate_allowed_command() {
        let args = vec!["root".to_string()];
        assert!(validate_adb_command(&args).is_ok());
    }

    #[test]
    fn test_validate_disallowed_command() {
        // `pull` is not in the whitelist and must be rejected.
        let args = vec!["pull".to_string()];
        assert!(validate_adb_command(&args).is_err());
    }

    #[test]
    fn test_validate_push_allowed() {
        // `push` is required for provisioning and must be accepted.
        let args = vec!["push".to_string()];
        assert!(validate_adb_command(&args).is_ok());
    }

    #[test]
    fn test_validate_empty_command() {
        let args: Vec<String> = vec![];
        assert!(validate_adb_command(&args).is_err());
    }

    #[test]
    fn test_shell_quote_single_plain() {
        assert_eq!(shell_quote_single("mkdir -p /data/voboost"), "'mkdir -p /data/voboost'");
    }

    #[test]
    fn test_shell_quote_single_with_embedded_quote() {
        // Embedded single quote must be escaped with '\''.
        assert_eq!(
            shell_quote_single("grep -qF '# >>> voboost' /x"),
            "'grep -qF '\\''# >>> voboost'\\'' /x'"
        );
    }

    #[test]
    fn test_shell_quote_single_already_quoted() {
        // Already-quoted scripts must not be double-wrapped.
        assert_eq!(shell_quote_single("'already'"), "'already'");
    }

    #[test]
    fn test_quote_shell_scripts_su_sh_c() {
        let args: Vec<String> = vec![
            "shell".to_string(),
            "su".to_string(),
            "0".to_string(),
            "sh".to_string(),
            "-c".to_string(),
            "mkdir -p /data/voboost && chown root:root /data/voboost".to_string(),
        ];
        let out = quote_shell_scripts(&args);
        assert_eq!(out[0], "shell");
        assert_eq!(out[4], "-c");
        assert_eq!(out[5], "'mkdir -p /data/voboost && chown root:root /data/voboost'");
    }

    #[test]
    fn test_quote_shell_scripts_no_c_flag() {
        // Commands without `-c` must be unchanged.
        let args: Vec<String> = vec![
            "shell".to_string(),
            "setenforce".to_string(),
            "0".to_string(),
        ];
        let out = quote_shell_scripts(&args);
        assert_eq!(out, args);
    }

    #[test]
    fn test_quote_shell_scripts_simple_script() {
        // A `-c` script with no shell metacharacters should not be quoted.
        let args: Vec<String> = vec![
            "shell".to_string(),
            "sh".to_string(),
            "-c".to_string(),
            "true".to_string(),
        ];
        let out = quote_shell_scripts(&args);
        assert_eq!(out[3], "true");
    }

    #[test]
    fn test_quote_shell_scripts_c_as_first_arg() {
        // `-c` as the very first argument (no preceding `sh`) must still be
        // detected and quoted so the script survives the device shell.
        let args: Vec<String> = vec![
            "-c".to_string(),
            "mkdir -p /data/voboost".to_string(),
        ];
        let out = quote_shell_scripts(&args);
        assert_eq!(out[0], "-c");
        assert_eq!(out[1], "'mkdir -p /data/voboost'");
    }

    #[test]
    fn test_quote_shell_scripts_trailing_c_without_script() {
        // A trailing `-c` with no following script must not panic and must
        // leave the vector unchanged.
        let args: Vec<String> = vec!["shell".to_string(), "sh".to_string(), "-c".to_string()];
        let out = quote_shell_scripts(&args);
        assert_eq!(out, args);
    }
}
