use tauri::{AppHandle, Emitter};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::utils::logger;

/// StepTitle is a HashMap mapping language codes to translated titles.
/// This allows for easy addition of new languages without modifying the struct.
/// Example: {"en": "Requesting root access", "ru": "Переключение ADB в режим root"}
pub type StepTitle = HashMap<String, String>;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallStep {
    pub id: String,
    pub title: StepTitle,
    pub command: Vec<String>,
    pub fatal: bool,
    pub retry_count: u32,
    pub retry_delay_secs: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StepResult {
    pub step_id: String,
    pub success: bool,
    pub output: String,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StepDefinition {
    pub r#do: Option<String>,
    pub title: Option<StepTitle>,
    pub command: Option<Vec<String>>,
    pub args: Option<Vec<String>>,
    pub var: Option<HashMap<String, String>>,
    pub fatal: Option<bool>,
    pub retry_count: Option<u32>,
    pub retry_delay_secs: Option<u64>,
}

fn load_master_commands() -> Vec<InstallStep> {
    // Embed config files at compile time for production builds
    const COMMANDS_JSON: &str = include_str!("../../../config/config-commands.json");

    if let Ok(parsed) = serde_json::from_str::<Vec<InstallStep>>(COMMANDS_JSON) {
        return parsed;
    }

    logger::log("ERROR", "Failed to parse embedded config-commands.json");
    vec![]
}

fn resolve_step(
    def: &StepDefinition,
    master_commands: &[InstallStep],
    context: &HashMap<String, String>
) -> Option<InstallStep> {
    let current_def = def.clone();
    let resolved_step: Option<InstallStep>;

    // 1. Recursive resolution if `do` is present
    if let Some(ref step_id) = def.r#do {
        // Find in master
        if let Some(master) = master_commands.iter().find(|c| c.id == *step_id) {
            resolved_step = Some(master.clone());
        } else {
            logger::log("ERROR", &format!("Command ID {} not found in master library", step_id));
            return None;
        }
    } else {
        // Inline base
        resolved_step = Some(InstallStep {
            id: "inline".to_string(),
            title: HashMap::new(),
            command: vec![],
            fatal: false,
            retry_count: 0,
            retry_delay_secs: 0,
        });
    }

    if let Some(mut step) = resolved_step {
        // 2. Apply Overwrites & Append Args
        if let Some(val) = current_def.title { step.title = val; }
        if let Some(val) = current_def.command { step.command = val; }
        if let Some(args) = current_def.args {
            step.command.extend(args);
        }
        if let Some(val) = current_def.fatal { step.fatal = val; }
        if let Some(val) = current_def.retry_count { step.retry_count = val; }
        if let Some(val) = current_def.retry_delay_secs { step.retry_delay_secs = val; }

        // 3. Variable Substitution
        let mut final_vars = context.clone();
        if let Some(ref local_vars) = current_def.var {
            for (k, v) in local_vars {
                final_vars.insert(k.clone(), v.clone());
            }
        }

        // Variable substitution: context values take priority over ambient
        // environment variables. Previously this called `std::env::var(key)`
        // first, which on case-insensitive env systems (macOS) made `{path}`
        // resolve to `$PATH` instead of the intended `/data/voboost`, breaking
        // every mkdir/chmod/init-hook step. Env override is now only consulted
        // when the context does not already define the variable.
        //
        // Substitution is iterative (up to a small fixed-point limit) so that
        // nested placeholders resolve correctly — e.g. a step may define
        // `var.local = "{hook_local}"` while `hook_local` is itself a context
        // variable; a single pass would leave `{hook_local}` unreplaced
        // depending on HashMap iteration order.
        for cmd_part in &mut step.command {
            for _ in 0..8 {
                let before = cmd_part.clone();
                for (key, value) in &final_vars {
                    let placeholder = format!("{{{}}}", key);
                    let resolved_value = if value.is_empty() {
                        std::env::var(key).unwrap_or_default()
                    } else {
                        value.clone()
                    };
                    *cmd_part = cmd_part.replace(&placeholder, &resolved_value);
                }
                if *cmd_part == before {
                    break;
                }
            }
        }

        // 4. Final resort labels - add default labels for en and ru if missing
        if !step.command.is_empty() {
            step.title.entry("en".to_string())
                .or_insert_with(|| format!("Executing command: {}...", step.command[0]));
            step.title.entry("ru".to_string())
                .or_insert_with(|| format!("Выполнение команды: {}...", step.command[0]));
        }

        Some(step)
    } else {
        None
    }
}


/// Scenario kind selects which embedded scenario file to load.
#[derive(Debug, Clone, Copy)]
pub enum ScenarioKind {
    Install,
    Uninstall,
    Provision,
    Restore,
}

impl ScenarioKind {
    fn config_json(self) -> &'static str {
        match self {
            ScenarioKind::Install => include_str!("../../../config/config-install.json"),
            ScenarioKind::Uninstall => include_str!("../../../config/config-uninstall.json"),
            ScenarioKind::Provision => include_str!("../../../config/config-provision.json"),
            ScenarioKind::Restore => include_str!("../../../config/config-restore.json"),
        }
    }

    fn name(self) -> &'static str {
        match self {
            ScenarioKind::Install => "install",
            ScenarioKind::Uninstall => "uninstall",
            ScenarioKind::Provision => "provision",
            ScenarioKind::Restore => "restore",
        }
    }
}

/// Build the base context map shared by all scenarios (apk + package vars).
fn build_base_context(apk_path: &str) -> HashMap<String, String> {
    let mut context = HashMap::new();
    context.insert("apk".to_string(), apk_path.to_string());
    context.insert("APK".to_string(), apk_path.to_string());
    context.insert("package".to_string(), "ru.voboost".to_string());
    context.insert("PACKAGE".to_string(), "ru.voboost".to_string());
    context
}

/// Resolve a scenario from its embedded config file with the given context.
fn resolve_scenario(
    kind: ScenarioKind,
    extra_context: HashMap<String, String>,
) -> Vec<InstallStep> {
    let master_commands = load_master_commands();
    let mut context = build_base_context("");
    for (k, v) in extra_context {
        context.insert(k, v);
    }

    let definitions = match serde_json::from_str::<Vec<StepDefinition>>(kind.config_json()) {
        Ok(defs) => defs,
        Err(e) => {
            logger::log(
                "ERROR",
                &format!("Failed to parse embedded config-{}.json: {}", kind.name(), e),
            );
            vec![]
        }
    };

    let mut final_steps = Vec::new();
    for def in definitions {
        if let Some(step) = resolve_step(&def, &master_commands, &context) {
            final_steps.push(step);
        }
    }
    final_steps
}

/// Resolve install steps — the single source of truth shared by the GUI
/// wizard and the headless --install CLI.
///
/// When `artifacts` is supplied (CLI `--install`), the full device bring-up
/// scenario is resolved (APK + daemon + agents + manifest + init hook) via
/// `build_provision_steps`, with dynamic agent push steps injected and the
/// OTA release-key steps filtered out when no key is given. When `artifacts`
/// is absent (GUI wizard), the basic install/uninstall scenario — or a
/// caller-supplied `scenario_steps` override — is resolved. CLI and GUI
/// share one resolution path; each orchestrates the returned steps its own
/// way (GUI may split across wizards, CLI runs sequentially).
#[tauri::command]
pub fn get_install_steps(
    apk_path: String,
    scenario_steps: Option<Vec<StepDefinition>>,
    artifacts: Option<ProvisionArtifacts>,
) -> Vec<InstallStep> {
    if let Some(ref art) = artifacts {
        return build_provision_steps(art);
    }
    let master_commands = load_master_commands();

    let context = build_base_context(&apk_path);

    let mut final_steps = Vec::new();

    // Use scenario steps if provided, otherwise load the embedded install config
    let definitions = if let Some(steps) = scenario_steps {
        steps
    } else {
        match serde_json::from_str::<Vec<StepDefinition>>(ScenarioKind::Install.config_json()) {
            Ok(defs) => defs,
            Err(e) => {
                logger::log(
                    "ERROR",
                    &format!("Failed to parse embedded config-{}.json: {}", ScenarioKind::Install.name(), e),
                );
                vec![]
            }
        }
    };

    for def in definitions {
        if let Some(step) = resolve_step(&def, &master_commands, &context) {
            final_steps.push(step);
        }
    }

    final_steps
}

/// Provisioning artifact paths bound into the provision scenario context.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProvisionArtifacts {
    pub apk_path: String,
    pub daemon_bin: String,
    pub agents_dir: String,
    pub manifest: String,
    pub manifest_sig: String,
    pub hook_local: String,
    /// Local path to the OTA release public key (release-public.pem) pushed
    /// into the app's filesDir for OTA signature verification. Optional:
    /// when empty the release-key push steps are skipped.
    pub release_key: String,
}

/// Build a `push-file` step that copies a single agent file from the host
/// `agents_dir` into `/data/voboost/agents/<filename>` and sets 600 perms.
fn build_agent_push_step(local_path: &std::path::Path, remote_dir: &str) -> Option<InstallStep> {
    let file_name = local_path.file_name()?.to_string_lossy().to_string();
    let remote_path = format!("{}/{}", remote_dir.trim_end_matches('/'), file_name);
    let mut title = HashMap::new();
    title.insert("en".to_string(), format!("Pushing agent {}", file_name));
    title.insert("ru".to_string(), format!("Отправка агента {}", file_name));
    Some(InstallStep {
        id: "push-agent".to_string(),
        title,
        command: vec![
            "push".to_string(),
            local_path.to_string_lossy().to_string(),
            remote_path,
        ],
        fatal: true,
        retry_count: 2,
        retry_delay_secs: 2,
    })
}

/// Enumerate agent files in `agents_dir` (non-recursive, regular files only)
/// and return one `push-file` step per agent, ordered by file name.
fn build_agent_push_steps(agents_dir: &str) -> Vec<InstallStep> {
    let mut steps = Vec::new();
    let read_dir = match std::fs::read_dir(agents_dir) {
        Ok(rd) => rd,
        Err(e) => {
            logger::log(
                "ERROR",
                &format!("Failed to read agents dir {}: {}", agents_dir, e),
            );
            return steps;
        }
    };
    let mut entries: Vec<_> = read_dir
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().map(|t| t.is_file()).unwrap_or(false))
        .collect();
    entries.sort_by_key(|e| e.file_name());
    for entry in entries {
        if let Some(step) = build_agent_push_step(&entry.path(), "/data/voboost/agents") {
            steps.push(step);
        }
    }
    steps
}

/// Resolve the full provision (device bring-up) scenario: APK + daemon +
/// agents + manifest + init hook. Body of the `--install` CLI flow, reached
/// through `get_install_steps` when `artifacts` is supplied, so CLI and GUI
/// share one source of truth. Not a `#[tauri::command]`.
///
/// Agent files are discovered dynamically from `agents_dir` and inserted as
/// `push-file` steps immediately after the `mkdir /data/voboost/agents` step,
/// because the static `config-provision.json` cannot enumerate a dynamic
/// host directory.
fn build_provision_steps(artifacts: &ProvisionArtifacts) -> Vec<InstallStep> {
    let mut context = build_base_context(&artifacts.apk_path);
    context.insert("daemon_bin".to_string(), artifacts.daemon_bin.clone());
    context.insert("agents_dir".to_string(), artifacts.agents_dir.clone());
    context.insert("manifest".to_string(), artifacts.manifest.clone());
    context.insert("manifest_sig".to_string(), artifacts.manifest_sig.clone());
    context.insert("hook_local".to_string(), artifacts.hook_local.clone());
    // release_key is optional: when empty, the release-key push steps are
    // filtered out below so a provision without an OTA key still works.
    context.insert("release_key".to_string(), artifacts.release_key.clone());
    // App zone: the user-facing data dir the daemon writes inject-status.json
    // into. Created by the `app-zone` step BEFORE `start-daemon` so the
    // daemon's first status write never races a missing dir. The path is
    // /data/user/0/ru.voboost (a bind mount of /data/data/ru.voboost on
    // Android; both resolve to the same inode).
    context.insert("app_zone".to_string(), "/data/user/0/ru.voboost".to_string());
    let mut steps = resolve_scenario(ScenarioKind::Provision, context);

    // Inject dynamic agent push steps right after the agents directory is
    // created. We look for the mkdir step whose path is /data/voboost/agents.
    let agent_steps = build_agent_push_steps(&artifacts.agents_dir);
    if !agent_steps.is_empty() {
        // Find the index of the mkdir step for /data/voboost/agents by scanning
        // the resolved command vector for that path.
        let insert_at = steps
            .iter()
            .position(|s| {
                s.command.iter().any(|c| c.contains("/data/voboost/agents"))
                    && s.command.first().map(|c| c == "shell").unwrap_or(false)
            })
            .map(|i| i + 1)
            .unwrap_or(steps.len());
        for (offset, step) in agent_steps.into_iter().enumerate() {
            steps.insert(insert_at + offset, step);
        }
    }

    // When no OTA release key was supplied, drop the push-file (release key
    // to app filesDir) and push-release-key (set ownership/permissions) steps
    // so the provision does not fail on a missing local file. The steps are
    // matched by id; the push-file step is matched by its remote path.
    if artifacts.release_key.trim().is_empty() {
        steps.retain(|s| {
            if s.id == "push-release-key" {
                return false;
            }
            // The push-file step that pushes the key to the app's
            // files/config/ directory.
            if s.id == "push-file"
                && s.command.iter().any(|c| {
                    c == "/data/data/ru.voboost/files/config/release-public.pem"
                })
            {
                return false;
            }
            true
        });
    }

    steps
}

/// Get restore steps (post-OTA init-hook restore). No artifact download needed;
/// only the locally generated init-hook body path is required.
pub fn get_restore_steps(hook_local: &str) -> Vec<InstallStep> {
    let mut context = HashMap::new();
    context.insert("hook_local".to_string(), hook_local.to_string());
    resolve_scenario(ScenarioKind::Restore, context)
}

/// Resolve uninstall steps — the single source of truth shared by the GUI
/// uninstall wizard and the headless `--uninstall` CLI. When `scenario_steps`
/// is supplied they are resolved directly; otherwise the embedded
/// `config-uninstall.json` scenario (stop daemon, remove init hook, wipe
/// /data/voboost, uninstall APK, reboot) is resolved. No artifacts required.
#[tauri::command]
pub fn get_uninstall_steps(
    scenario_steps: Option<Vec<StepDefinition>>,
) -> Vec<InstallStep> {
    if let Some(steps) = scenario_steps {
        let master_commands = load_master_commands();
        let context = build_base_context("");
        let mut final_steps = Vec::new();
        for def in steps {
            if let Some(step) = resolve_step(&def, &master_commands, &context) {
                final_steps.push(step);
            }
        }
        return final_steps;
    }
    resolve_scenario(ScenarioKind::Uninstall, HashMap::new())
}

/// Detect an `INSTALL_FAILED_VERSION_DOWNGRADE` failure in the ADB output.
///
/// Extracted as a pure predicate so the downgrade-recovery contract is
/// unit-testable without a Tauri `AppHandle` or a real device. The marker
/// can appear in either stderr (typical) or stdout (some ADB versions).
fn is_downgrade_failure(stderr: &str, stdout: &str) -> bool {
    const MARKER: &str = "INSTALL_FAILED_VERSION_DOWNGRADE";
    stderr.contains(MARKER) || stdout.contains(MARKER)
}

/// Execute single installation step
#[tauri::command]
pub async fn execute_install_step(
    app: AppHandle,
    step: InstallStep,
    device_serial: Option<String>,
) -> Result<StepResult, String> {
    let default_title = "Unknown step".to_string();
    let step_title = step.title.get("en")
        .or_else(|| step.title.values().next())
        .unwrap_or(&default_title);
    logger::log("INFO", &format!("Starting step: {} ({})", step.id, step_title));

    app.emit("install-step-start", &step.id)
        .map_err(|e| e.to_string())?;

    let mut attempts = 0;
    let max_attempts = step.retry_count + 1;
    let mut last_error = None;
    // Downgrade recovery is one-shot: if the uninstall + retry still reports
    // a downgrade, we must not loop forever. The flag is consumed on the
    // first recovery so a second downgrade failure falls through to the
    // normal retry/failure path.
    let mut downgrade_recovered = false;

    while attempts < max_attempts {
        let result = crate::commands::adb::execute_adb(
            app.clone(),
            step.command.clone(),
            device_serial.clone(),
        ).await?;

        if result.success {
            let step_result = StepResult {
                step_id: step.id.clone(),
                success: true,
                output: result.stdout,
                error: None,
            };
            app.emit("install-step-complete", &step_result).map_err(|e| e.to_string())?;
            logger::log("SUCCESS", &format!("Step completed: {}", step.id));
            return Ok(step_result);
        } else {
            // Downgrade recovery (shared by GUI and CLI): when install-apk
            // fails because a newer APK is already installed, uninstall the
            // package and retry the SAME attempt (do not consume a retry
            // slot). This satisfies the install-scenario spec's "Downgrade
            // recovery" requirement for both the GUI wizard and the
            // headless --install runner. The recovery is one-shot to
            // guarantee termination.
            if !downgrade_recovered
                && step.id == "install-apk"
                && is_downgrade_failure(&result.stderr, &result.stdout)
            {
                downgrade_recovered = true;
                logger::log("WARN", "Version downgrade detected; uninstalling ru.voboost and retrying install-apk");
                let uninstall_cmd = vec!["uninstall".to_string(), "ru.voboost".to_string()];
                let _ = crate::commands::adb::execute_adb(
                    app.clone(),
                    uninstall_cmd,
                    device_serial.clone(),
                ).await;
                // Retry without advancing attempts so the operator does not
                // lose a retry slot to a downgrade recovery.
                continue;
            }

            logger::log("WARN", &format!("Step {} attempt {}/{} failed: {:?}", step.id, attempts + 1, max_attempts, result.stderr));
            last_error = Some(result.stderr);
            attempts += 1;
            if attempts < max_attempts {
                tokio::time::sleep(std::time::Duration::from_secs(step.retry_delay_secs)).await;
            }
        }
    }

    let step_result = StepResult {
        step_id: step.id.clone(),
        success: false,
        output: "".to_string(),
        error: last_error,
    };

    app.emit("install-step-complete", &step_result).map_err(|e| e.to_string())?;
    logger::log("ERROR", &format!("Step failed: {} - {:?}", step.id, step_result.error));

    Ok(step_result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_variable_substitution() {
        let master = vec![
            InstallStep {
                id: "test".to_string(),
                title: [("en".to_string(), "Test".to_string()), ("ru".to_string(), "Тест".to_string())]
                    .iter().cloned().collect(),
                command: vec!["echo".to_string(), "{val}".to_string()],
                fatal: false,
                retry_count: 0,
                retry_delay_secs: 0,
            }
        ];
        let def = StepDefinition {
            r#do: Some("test".to_string()),
            title: None,
            command: None,
            args: None,
            var: Some([("val".to_string(), "hello".to_string())].iter().cloned().collect()),
            fatal: None,
            retry_count: None,
            retry_delay_secs: None,
        };
        let context = HashMap::new();
        let step = resolve_step(&def, &master, &context).unwrap();
        assert_eq!(step.command[1], "hello");
    }

    #[test]
    fn test_recursive_args() {
        let master = vec![
            InstallStep {
                id: "base".to_string(),
                title: [("en".to_string(), "Base".to_string()), ("ru".to_string(), "База".to_string())]
                    .iter().cloned().collect(),
                command: vec!["pm".to_string(), "grant".to_string()],
                fatal: false,
                retry_count: 0,
                retry_delay_secs: 0,
            }
        ];
        let def = StepDefinition {
            r#do: Some("base".to_string()),
            title: None,
            command: None,
            args: Some(vec!["p1".to_string(), "p2".to_string()]),
            var: None,
            fatal: None,
            retry_count: None,
            retry_delay_secs: None,
        };
        let context = HashMap::new();
        let step = resolve_step(&def, &master, &context).unwrap();
        assert_eq!(step.command, vec!["pm", "grant", "p1", "p2"]);
    }

    #[test]
    fn test_mkdir_remote_substitution() {
        let master = vec![InstallStep {
            id: "mkdir-remote".to_string(),
            title: HashMap::new(),
            command: vec![
                "shell".to_string(),
                "su".to_string(),
                "0".to_string(),
                "sh".to_string(),
                "-c".to_string(),
                "mkdir -p {path} && chown {owner} {path} && chmod {mode} {path}"
                    .to_string(),
            ],
            fatal: true,
            retry_count: 3,
            retry_delay_secs: 2,
        }];
        let def = StepDefinition {
            r#do: Some("mkdir-remote".to_string()),
            title: None,
            command: None,
            args: None,
            var: Some(
                [
                    ("path".to_string(), "/data/voboost".to_string()),
                    ("owner".to_string(), "root:root".to_string()),
                    ("mode".to_string(), "700".to_string()),
                ]
                .iter()
                .cloned()
                .collect(),
            ),
            fatal: None,
            retry_count: None,
            retry_delay_secs: None,
        };
        let step = resolve_step(&def, &master, &HashMap::new()).unwrap();
        assert_eq!(step.command[5], "mkdir -p /data/voboost && chown root:root /data/voboost && chmod 700 /data/voboost");
    }

    #[test]
    fn test_push_file_substitution() {
        let master = vec![InstallStep {
            id: "push-file".to_string(),
            title: HashMap::new(),
            command: vec![
                "push".to_string(),
                "{local}".to_string(),
                "{remote}".to_string(),
            ],
            fatal: true,
            retry_count: 2,
            retry_delay_secs: 2,
        }];
        let def = StepDefinition {
            r#do: Some("push-file".to_string()),
            title: None,
            command: None,
            args: None,
            var: Some(
                [
                    ("local".to_string(), "/tmp/daemon".to_string()),
                    ("remote".to_string(), "/data/voboost/voboost-inject".to_string()),
                ]
                .iter()
                .cloned()
                .collect(),
            ),
            fatal: None,
            retry_count: None,
            retry_delay_secs: None,
        };
        let step = resolve_step(&def, &master, &HashMap::new()).unwrap();
        assert_eq!(step.command, vec!["push", "/tmp/daemon", "/data/voboost/voboost-inject"]);
    }

    #[test]
    fn test_provision_steps_load() {
        let artifacts = crate::commands::install::ProvisionArtifacts {
            apk_path: "/tmp/app.apk".to_string(),
            daemon_bin: "/tmp/daemon".to_string(),
            agents_dir: "/tmp/agents".to_string(),
            manifest: "/tmp/manifest.json".to_string(),
            manifest_sig: "/tmp/manifest.sig".to_string(),
            hook_local: "/data/local/tmp/voboost.rc.body".to_string(),
            release_key: String::new(),
        };
        let steps = crate::commands::install::get_install_steps(
            artifacts.apk_path.clone(),
            None,
            Some(artifacts),
        );
        assert!(!steps.is_empty());
        assert_eq!(steps.first().map(|s| s.id.as_str()), Some("root"));
        assert!(steps.iter().any(|s| s.id == "verify-daemon"));
        // fix-app-ownership runs after install-apk to give the app zone
        // back to the app UID (C7/M8).
        assert!(steps.iter().any(|s| s.id == "fix-app-ownership"));
        // No release key supplied: the push-release-key step must be
        // filtered out (C6).
        assert!(!steps.iter().any(|s| s.id == "push-release-key"));
    }

    #[test]
    fn test_provision_steps_with_release_key() {
        let artifacts = crate::commands::install::ProvisionArtifacts {
            apk_path: "/tmp/app.apk".to_string(),
            daemon_bin: "/tmp/daemon".to_string(),
            agents_dir: "/tmp/agents".to_string(),
            manifest: "/tmp/manifest.json".to_string(),
            manifest_sig: "/tmp/manifest.sig".to_string(),
            hook_local: "/data/local/tmp/voboost.rc.body".to_string(),
            release_key: "/tmp/release-public.pem".to_string(),
        };
        let steps = crate::commands::install::get_install_steps(
            artifacts.apk_path.clone(),
            None,
            Some(artifacts),
        );
        // With a release key supplied, both release-key steps are kept: a
        // push-file that copies the local key into the app config dir, and
        // push-release-key which chowns/chmods it at that final path.
        let push_key = steps.iter().find(|s| {
            s.id == "push-file"
                && s.command
                    .iter()
                    .any(|c| c == "/data/data/ru.voboost/files/config/release-public.pem")
        });
        assert!(push_key.is_some(), "release-key push-file step must be present");
        let key_step = steps.iter().find(|s| s.id == "push-release-key");
        assert!(key_step.is_some(), "push-release-key step must be present");
        let cmd = key_step.unwrap().command.join(" ");
        assert!(cmd.contains("/data/data/ru.voboost/files/config/release-public.pem"));
    }

    #[test]
    fn test_provision_emulator_setup_and_non_fatal_steps() {
        // The provision scenario must include the emulator-setup step between
        // write-init-hook and install-apk, and remount + write-init-hook must
        // resolve as non-fatal so the install can complete on the Android
        // emulator (where /system is read-only and adb remount fails).
        let artifacts = crate::commands::install::ProvisionArtifacts {
            apk_path: "/tmp/app.apk".to_string(),
            daemon_bin: "/tmp/daemon".to_string(),
            agents_dir: "/tmp/agents".to_string(),
            manifest: "/tmp/manifest.json".to_string(),
            manifest_sig: "/tmp/manifest.sig".to_string(),
            hook_local: "/data/local/tmp/voboost.rc.body".to_string(),
            release_key: String::new(),
        };
        let steps = crate::commands::install::get_install_steps(
            artifacts.apk_path.clone(),
            None,
            Some(artifacts),
        );
        let ids: Vec<&str> = steps.iter().map(|s| s.id.as_str()).collect();

        let emu_idx = ids
            .iter()
            .position(|id| *id == "emulator-setup")
            .expect("emulator-setup step must be present in provision");
        let hook_idx = ids
            .iter()
            .position(|id| *id == "write-init-hook")
            .expect("write-init-hook step must be present");
        let apk_idx = ids
            .iter()
            .position(|id| *id == "install-apk")
            .expect("install-apk step must be present");
        assert!(
            hook_idx < emu_idx,
            "emulator-setup must come after write-init-hook"
        );
        assert!(
            emu_idx < apk_idx,
            "emulator-setup must come before install-apk"
        );

        // remount and write-init-hook must be non-fatal so the emulator path
        // (where both fail) does not abort the install.
        let remount = steps
            .iter()
            .find(|s| s.id == "remount")
            .expect("remount step must be present");
        assert!(
            !remount.fatal,
            "remount must be non-fatal in provision (emulator support)"
        );
        let hook = steps
            .iter()
            .find(|s| s.id == "write-init-hook")
            .expect("write-init-hook step must be present");
        assert!(
            !hook.fatal,
            "write-init-hook must be non-fatal in provision (emulator support)"
        );

        // emulator-setup must be non-fatal and read ro.kernel.qemu.
        let emu = steps
            .iter()
            .find(|s| s.id == "emulator-setup")
            .expect("emulator-setup step must be present");
        assert!(!emu.fatal, "emulator-setup must be non-fatal");
        let cmd = emu.command.join(" ");
        assert!(
            cmd.contains("ro.kernel.qemu"),
            "emulator-setup must read ro.kernel.qemu"
        );
        assert!(
            cmd.contains("setenforce 0"),
            "emulator-setup must run setenforce 0 on the emulator"
        );
    }

    #[test]
    fn test_provision_write_init_hook_logs_sdk_and_path() {
        // The init hook must work on Android 9 (SDK 28) and Android 11+
        // (SDK >= 30): init scans /system/etc/init/ on every release, so
        // the same path is used on both. The write-init-hook command must
        // log the resolved SDK version and the hook path to stderr so an
        // operator can verify on their machine which path was written.
        let artifacts = crate::commands::install::ProvisionArtifacts {
            apk_path: "/tmp/app.apk".to_string(),
            daemon_bin: "/tmp/daemon".to_string(),
            agents_dir: "/tmp/agents".to_string(),
            manifest: "/tmp/manifest.json".to_string(),
            manifest_sig: "/tmp/manifest.sig".to_string(),
            hook_local: "/data/local/tmp/voboost.rc.body".to_string(),
            release_key: String::new(),
        };
        let steps = crate::commands::install::get_install_steps(
            artifacts.apk_path.clone(),
            None,
            Some(artifacts),
        );
        let hook = steps
            .iter()
            .find(|s| s.id == "write-init-hook")
            .expect("write-init-hook step must be present");
        let cmd = hook.command.join(" ");
        assert!(
            cmd.contains("ro.build.version.sdk"),
            "write-init-hook must log the Android SDK version"
        );
        assert!(
            cmd.contains("/system/etc/init/voboost.rc"),
            "write-init-hook must use /system/etc/init/voboost.rc (works on Android 9 and 11)"
        );
    }

    #[test]
    fn test_provision_app_zone_before_daemon_start() {
        // The daemon writes inject-status.json to /data/user/0/ru.voboost
        // on its first status update. The app-zone step must create that
        // dir (and a default inject.json) BEFORE start-daemon runs, so the
        // daemon's first write never races a missing directory. The step
        // must also come after install-apk (which creates /data/data/ru.voboost
        // with the correct UID) and after fix-app-ownership.
        let artifacts = crate::commands::install::ProvisionArtifacts {
            apk_path: "/tmp/app.apk".to_string(),
            daemon_bin: "/tmp/daemon".to_string(),
            agents_dir: "/tmp/agents".to_string(),
            manifest: "/tmp/manifest.json".to_string(),
            manifest_sig: "/tmp/manifest.sig".to_string(),
            hook_local: "/data/local/tmp/voboost.rc.body".to_string(),
            release_key: String::new(),
        };
        let steps = crate::commands::install::get_install_steps(
            artifacts.apk_path.clone(),
            None,
            Some(artifacts),
        );
        let ids: Vec<&str> = steps.iter().map(|s| s.id.as_str()).collect();

        let apk_idx = ids
            .iter()
            .position(|id| *id == "install-apk")
            .expect("install-apk step must be present");
        let fix_idx = ids
            .iter()
            .position(|id| *id == "fix-app-ownership")
            .expect("fix-app-ownership step must be present");
        let zone_idx = ids
            .iter()
            .position(|id| *id == "app-zone")
            .expect("app-zone step must be present in provision");
        let start_idx = ids
            .iter()
            .position(|id| *id == "start-daemon")
            .expect("start-daemon step must be present");

        assert!(
            apk_idx < fix_idx,
            "fix-app-ownership must come after install-apk"
        );
        assert!(
            fix_idx < zone_idx,
            "app-zone must come after fix-app-ownership"
        );
        assert!(
            zone_idx < start_idx,
            "app-zone must come before start-daemon (status write race fix)"
        );

        // The app-zone command must create /data/user/0/ru.voboost and a
        // default inject.json, chowned to the app UID resolved from
        // /data/data/ru.voboost.
        let zone = steps
            .iter()
            .find(|s| s.id == "app-zone")
            .expect("app-zone step must be present");
        let cmd = zone.command.join(" ");
        assert!(
            cmd.contains("/data/user/0/ru.voboost"),
            "app-zone must create /data/user/0/ru.voboost"
        );
        assert!(
            cmd.contains("inject.json"),
            "app-zone must write a default inject.json"
        );
        assert!(
            cmd.contains("/data/data/ru.voboost"),
            "app-zone must resolve the app UID from /data/data/ru.voboost"
        );
    }

    #[test]
    fn test_restore_steps_load() {
        let steps = crate::commands::install::get_restore_steps(
            "/data/local/tmp/voboost.rc.body",
        );
        assert!(!steps.is_empty());
        assert_eq!(steps.first().map(|s| s.id.as_str()), Some("root"));
        assert!(steps.iter().any(|s| s.id == "restore-hook"));
    }

    #[test]
    fn test_is_downgrade_failure_in_stderr() {
        // Typical case: ADB reports the downgrade marker in stderr.
        assert!(is_downgrade_failure(
            "Failure [INSTALL_FAILED_VERSION_DOWNGRADE]",
            ""
        ));
    }

    #[test]
    fn test_is_downgrade_failure_in_stdout() {
        // Some ADB versions surface the marker in stdout instead.
        assert!(is_downgrade_failure(
            "",
            "pkg: /data/app/...apk\nFailure [INSTALL_FAILED_VERSION_DOWNGRADE]"
        ));
    }

    #[test]
    fn test_is_downgrade_failure_other_error() {
        // A non-downgrade install failure must NOT trigger recovery.
        assert!(!is_downgrade_failure(
            "Failure [INSTALL_FAILED_ALREADY_EXISTS]",
            ""
        ));
        assert!(!is_downgrade_failure("", ""));
    }

    /// Helper: collect the step ids from a resolved step list.
    fn step_ids(steps: &[InstallStep]) -> Vec<&str> {
        steps.iter().map(|s| s.id.as_str()).collect()
    }

    #[test]
    fn test_install_scenario_step_order() {
        // The install-scenario spec mandates the GUI install flow execute:
        // root -> disable-verity -> reboot -> wait-device(45) -> root ->
        // wait-device(30) -> remount -> setenforce -> install-apk ->
        // pm-grant x5 -> appops-set x2 -> settings-put-global x5.
        let steps = get_install_steps("/tmp/app.apk".to_string(), None, None);
        let ids = step_ids(&steps);

        assert!(!ids.is_empty(), "install scenario must produce steps");
        assert_eq!(ids[0], "root", "first step must be root");
        assert_eq!(ids[1], "disable-verity");
        assert_eq!(ids[2], "reboot");

        // The install-apk step must be present.
        let apk_idx = ids
            .iter()
            .position(|id| *id == "install-apk")
            .expect("install-apk step must exist");

        // After install-apk: five pm-grant steps.
        let after_apk = &ids[apk_idx + 1..];
        let pm_grants: Vec<&&str> = after_apk.iter().filter(|id| **id == "pm-grant").collect();
        assert_eq!(
            pm_grants.len(),
            5,
            "exactly five pm-grant steps after install-apk"
        );

        // Two appops-set steps.
        let appops: Vec<&&str> = after_apk.iter().filter(|id| **id == "appops-set").collect();
        assert_eq!(appops.len(), 2, "exactly two appops-set steps");

        // Five settings-put-global steps.
        let settings: Vec<&&str> = after_apk
            .iter()
            .filter(|id| **id == "settings-put-global")
            .collect();
        assert_eq!(
            settings.len(),
            5,
            "exactly five settings-put-global steps"
        );
    }

    #[test]
    fn test_uninstall_scenario_step_order() {
        // The install-scenario spec mandates the uninstall flow execute:
        // stop-daemon -> root -> remount -> shell rm voboost.rc (non-fatal) ->
        // shell rm /data/voboost (non-fatal) -> uninstall-apk (non-fatal) ->
        // reboot (non-fatal).
        let steps = get_uninstall_steps(None);
        let ids = step_ids(&steps);

        assert!(!ids.is_empty(), "uninstall scenario must produce steps");
        assert_eq!(ids[0], "stop-daemon", "first uninstall step must be stop-daemon");
        assert_eq!(ids[1], "root");
        assert_eq!(ids[2], "remount");

        // The teardown steps after remount must be non-fatal.
        for step in steps.iter().skip(3) {
            assert!(
                !step.fatal,
                "teardown step '{}' must be non-fatal",
                step.id
            );
        }

        // The last step must be reboot.
        assert_eq!(
            ids.last().copied(),
            Some("reboot"),
            "last uninstall step must be reboot"
        );
    }

    #[test]
    fn test_default_title_fallback_when_missing() {
        // The step-engine spec: if a resolved step has a non-empty command
        // but no 'en'/'ru' title, the engine inserts default titles of the
        // form "Executing command: <cmd[0]>...".
        let master = vec![InstallStep {
            id: "custom".to_string(),
            title: HashMap::new(),
            command: vec!["shell".to_string(), "echo".to_string(), "hi".to_string()],
            fatal: false,
            retry_count: 0,
            retry_delay_secs: 0,
        }];
        let def = StepDefinition {
            r#do: Some("custom".to_string()),
            title: None,
            command: None,
            args: None,
            var: None,
            fatal: None,
            retry_count: None,
            retry_delay_secs: None,
        };
        let step = resolve_step(&def, &master, &HashMap::new()).unwrap();
        assert_eq!(
            step.title.get("en").unwrap(),
            "Executing command: shell..."
        );
        assert_eq!(
            step.title.get("ru").unwrap(),
            "Выполнение команды: shell..."
        );
    }

    #[test]
    fn test_default_title_not_overwritten_when_present() {
        // When the step already has an 'en' title, the fallback must NOT
        // overwrite it.
        let mut title = HashMap::new();
        title.insert("en".to_string(), "My Step".to_string());
        let master = vec![InstallStep {
            id: "custom".to_string(),
            title,
            command: vec!["shell".to_string()],
            fatal: false,
            retry_count: 0,
            retry_delay_secs: 0,
        }];
        let def = StepDefinition {
            r#do: Some("custom".to_string()),
            title: None,
            command: None,
            args: None,
            var: None,
            fatal: None,
            retry_count: None,
            retry_delay_secs: None,
        };
        let step = resolve_step(&def, &master, &HashMap::new()).unwrap();
        assert_eq!(step.title.get("en").unwrap(), "My Step");
        // 'ru' was missing, so the fallback fills it.
        assert_eq!(
            step.title.get("ru").unwrap(),
            "Выполнение команды: shell..."
        );
    }

    // Env-var manipulation is process-global and unsafe under parallel
    // test execution. These two tests are serialized via a dedicated mutex
    // so they cannot race with each other or leak env state to other tests.
    static ENV_TEST_LOCK: std::sync::LazyLock<std::sync::Mutex<()>> =
        std::sync::LazyLock::new(|| std::sync::Mutex::new(()));

    #[test]
    fn test_variable_substitution_empty_context_falls_back_to_env() {
        let _guard = ENV_TEST_LOCK.lock().unwrap();
        // The step-engine spec: an EMPTY context value SHALL fall back to
        // std::env::var(key). We set a known env var and verify it is used.
        std::env::set_var("VOBOOST_TEST_ENV_VAR", "env-value-123");
        let master = vec![InstallStep {
            id: "env-test".to_string(),
            title: HashMap::new(),
            command: vec!["echo".to_string(), "{VOBOOST_TEST_ENV_VAR}".to_string()],
            fatal: false,
            retry_count: 0,
            retry_delay_secs: 0,
        }];
        // The StepDefinition provides an EMPTY value for the key, which
        // triggers the env fallback.
        let mut local_var = HashMap::new();
        local_var.insert("VOBOOST_TEST_ENV_VAR".to_string(), "".to_string());
        let def = StepDefinition {
            r#do: Some("env-test".to_string()),
            title: None,
            command: None,
            args: None,
            var: Some(local_var),
            fatal: None,
            retry_count: None,
            retry_delay_secs: None,
        };
        let step = resolve_step(&def, &master, &HashMap::new()).unwrap();
        assert_eq!(step.command[1], "env-value-123");
        std::env::remove_var("VOBOOST_TEST_ENV_VAR");
    }

    #[test]
    fn test_variable_substitution_non_empty_context_wins_over_env() {
        let _guard = ENV_TEST_LOCK.lock().unwrap();
        // The step-engine spec: a non-empty context value SHALL win over the
        // ambient environment.
        std::env::set_var("VOBOOST_TEST_OVERRIDE", "from-env");
        let master = vec![InstallStep {
            id: "override-test".to_string(),
            title: HashMap::new(),
            command: vec!["echo".to_string(), "{VOBOOST_TEST_OVERRIDE}".to_string()],
            fatal: false,
            retry_count: 0,
            retry_delay_secs: 0,
        }];
        let mut local_var = HashMap::new();
        local_var.insert("VOBOOST_TEST_OVERRIDE".to_string(), "from-context".to_string());
        let def = StepDefinition {
            r#do: Some("override-test".to_string()),
            title: None,
            command: None,
            args: None,
            var: Some(local_var),
            fatal: None,
            retry_count: None,
            retry_delay_secs: None,
        };
        let step = resolve_step(&def, &master, &HashMap::new()).unwrap();
        assert_eq!(
            step.command[1], "from-context",
            "non-empty context value must win over env"
        );
        std::env::remove_var("VOBOOST_TEST_OVERRIDE");
    }

    #[test]
    fn test_get_uninstall_steps_with_scenario_override() {
        // The install-scenario spec: a Release MAY carry scenarios.uninstall
        // keyed by release id, consumed by get_uninstall_steps(scenarioSteps).
        // When provided, the caller's steps are resolved directly (not the
        // embedded config-uninstall.json).
        let custom = vec![StepDefinition {
            r#do: Some("root".to_string()),
            title: None,
            command: None,
            args: None,
            var: None,
            fatal: Some(true),
            retry_count: None,
            retry_delay_secs: None,
        }];
        let steps = get_uninstall_steps(Some(custom));
        assert_eq!(steps.len(), 1);
        assert_eq!(steps[0].id, "root");
        assert!(steps[0].fatal, "override fatal flag must be honored");
    }

    #[test]
    fn test_provision_release_key_filtering_removes_both_steps() {
        // The step-engine spec: when release_key is empty, the engine SHALL
        // remove the push-release-key step AND the push-file step whose
        // command targets release-public.pem.
        let artifacts = ProvisionArtifacts {
            apk_path: "/tmp/app.apk".to_string(),
            daemon_bin: "/tmp/daemon".to_string(),
            agents_dir: "/tmp/agents".to_string(),
            manifest: "/tmp/manifest.json".to_string(),
            manifest_sig: "/tmp/manifest.sig".to_string(),
            hook_local: "/data/local/tmp/voboost.rc.body".to_string(),
            release_key: "   ".to_string(), // whitespace-only = empty
        };
        let steps = get_install_steps(artifacts.apk_path.clone(), None, Some(artifacts));
        assert!(
            !steps.iter().any(|s| s.id == "push-release-key"),
            "push-release-key must be removed when release_key is empty"
        );
        assert!(
            !steps
                .iter()
                .any(|s| s.command.iter().any(|c| c
                    == "/data/data/ru.voboost/files/config/release-public.pem")),
            "release-key push-file step must be removed when release_key is empty"
        );
    }

    #[test]
    fn test_provision_agent_push_injected_after_agents_mkdir() {
        // The step-engine spec: when agents_dir contains one or more regular
        // files, the engine SHALL build one push-file step per file and
        // insert them after the first resolved shell step whose command
        // contains /data/voboost/agents.
        //
        // We point agents_dir at a real temp dir with two agent files so
        // the injection logic runs.
        let temp_dir = std::env::temp_dir().join("voboost-test-agents-inject");
        std::fs::create_dir_all(&temp_dir).unwrap();
        std::fs::write(temp_dir.join("agent-a.bin"), b"aaa").unwrap();
        std::fs::write(temp_dir.join("agent-b.bin"), b"bbb").unwrap();

        let artifacts = ProvisionArtifacts {
            apk_path: "/tmp/app.apk".to_string(),
            daemon_bin: "/tmp/daemon".to_string(),
            agents_dir: temp_dir.to_string_lossy().to_string(),
            manifest: "/tmp/manifest.json".to_string(),
            manifest_sig: "/tmp/manifest.sig".to_string(),
            hook_local: "/data/local/tmp/voboost.rc.body".to_string(),
            release_key: String::new(),
        };
        let steps = get_install_steps(artifacts.apk_path.clone(), None, Some(artifacts));

        // There must be exactly two push-agent steps, ordered by file name.
        let agent_steps: Vec<&InstallStep> = steps.iter().filter(|s| s.id == "push-agent").collect();
        assert_eq!(agent_steps.len(), 2, "two agent push steps must be injected");
        // Ordered by file name: agent-a before agent-b.
        assert!(agent_steps[0].command.iter().any(|c| c.contains("agent-a.bin")));
        assert!(agent_steps[1].command.iter().any(|c| c.contains("agent-b.bin")));

        // The agent steps must be immediately after the agents mkdir step.
        let agents_mkdir_idx = steps
            .iter()
            .position(|s| {
                s.command.first().map(|c| c == "shell").unwrap_or(false)
                    && s.command.iter().any(|c| c.contains("/data/voboost/agents"))
            })
            .expect("agents mkdir step must exist");
        assert_eq!(
            steps[agents_mkdir_idx + 1].id, "push-agent",
            "first agent push must immediately follow the agents mkdir"
        );

        std::fs::remove_dir_all(&temp_dir).ok();
    }
}

