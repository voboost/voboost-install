## MODIFIED Requirements

### Requirement: GUI install command
The `get_install_steps(apk_path, is_uninstalling, scenario_steps?, artifacts?)` SHALL be a `#[tauri::command]` and the single entry point for install steps shared by the GUI wizard and the headless `--install` CLI. When `artifacts` is `Some` it SHALL resolve the full provision scenario via `build_provision_steps` (ignoring the other arguments); when `artifacts` is `None` it SHALL use `scenario_steps` if provided, else select `ScenarioKind::Uninstall` when `is_uninstalling` is true otherwise `ScenarioKind::Install`, and resolve each definition with the base context built from `apk_path`.

#### Scenario: CLI full provision
- **WHEN** `artifacts` is `Some(...)`
- **THEN** the engine SHALL resolve the provision scenario via `build_provision_steps` and return those steps without consulting `scenario_steps` or `is_uninstalling`

#### Scenario: GUI basic install/uninstall
- **WHEN** `artifacts` is `None`
- **THEN** the engine SHALL behave as before: caller-supplied `scenario_steps` win, else Install/Uninstall scenario by `is_uninstalling`

### Requirement: Provision flow
The full provision scenario SHALL be resolved by a private `build_provision_steps(artifacts)` reached only through `get_install_steps` when `artifacts` is supplied. It SHALL build a context from `ProvisionArtifacts` (`apk_path`, `daemon_bin`, `agents_dir`, `manifest`, `manifest_sig`, `hook_local`, `release_key`), resolve `ScenarioKind::Provision`, inject one `push-file` step per agent file after the `/data/voboost/agents` anchor, and remove the release-key steps when `release_key` is empty. The public `get_provision_steps` function SHALL NOT exist.

#### Scenario: dynamic agent push injection
- **WHEN** `agents_dir` contains one or more regular files
- **THEN** the engine SHALL build one `push-file` step per file ordered by name and insert them after the first resolved shell step whose command contains `/data/voboost/agents` (appended at the end if no anchor is found)

#### Scenario: release key filtering
- **WHEN** `release_key` is empty or whitespace-only
- **THEN** the engine SHALL remove the `push-release-key` step and any `push-file` step whose command targets `/data/data/ru.voboost/files/config/release-public.pem`

## REMOVED Requirements

### Requirement: Separate entry points
This requirement described the pre-unification split where the GUI used `get_install_steps`/`execute_install_step` and the CLI used a separate `get_provision_steps` function. Provision now resolves through the shared `get_install_steps` (see the MODIFIED "GUI install command" and "Provision flow" requirements, and the MODIFIED cli "step resolution per mode"), so the install path no longer has separate entry points.
