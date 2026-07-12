## Purpose
Resolve JSON step definitions into executable ADB commands and execute them with retry/backoff and Tauri event emission. The engine is duplicated across two entry points (a GUI `#[tauri::command]` for install/uninstall and plain functions for provision/rearm) that share a common step resolver.
## Requirements
### Requirement: Master command templates
The engine SHALL embed `config/config-commands.json` at compile time via `include_str!` and parse it once per scenario resolution into a `Vec<InstallStep>`. Each `InstallStep` SHALL expose `id`, `title` (`StepTitle` = `HashMap<String,String>` of lang to label), `command` (`Vec<String>`), `fatal`, `retryCount`, `retryDelaySecs`. A parse failure SHALL log an error and yield an empty master list. The post-OTA init-hook append template SHALL be id `restore-hook`. The emulator detection + SELinux template SHALL be id `emulator-setup`.

#### Scenario: master template lookup by id
- **WHEN** a `StepDefinition` declares `do: "<id>"`
- **THEN** the engine SHALL find the master `InstallStep` whose `id` matches and use it as the base
- **THEN** if no match exists the engine SHALL log an error and skip the step (return `None`)

#### Scenario: inline base when `do` absent
- **WHEN** a `StepDefinition` has no `do` field
- **THEN** the engine SHALL use an inline base step with `id "inline"`, empty title, empty command, `fatal false`, zero retries

#### Scenario: emulator-setup master template
- **WHEN** a `StepDefinition` declares `do: "emulator-setup"`
- **THEN** the engine SHALL resolve it to a `shell` command that reads `ro.kernel.qemu` via `getprop` and, when the value is `1`, runs `su 0 setenforce 0`; otherwise exits 0. The step SHALL be non-fatal (`fatal false`) and idempotent.

### Requirement: Scenario files
The engine SHALL embed four scenario files keyed by `ScenarioKind`: `config-install.json` (Install), `config-uninstall.json` (Uninstall), `config-provision.json` (Provision), `config-restore.json` (Restore). Each scenario file SHALL parse into `Vec<StepDefinition>`.

#### Scenario: scenario parse failure
- **WHEN** an embedded scenario file fails to parse
- **THEN** the engine SHALL log an error naming the scenario and treat the definition list as empty

### Requirement: Step resolution
`resolve_step` SHALL apply, in order: (1) base lookup via `do` or inline base; (2) overwrite of `title`, `command`, `fatal`, `retryCount`, `retryDelaySecs` when the `StepDefinition` provides them; (3) append the `args` vector to the base `command`; (4) iterative `{var}` substitution.

#### Scenario: title and command overwrite
- **WHEN** the `StepDefinition` provides `title` or `command`
- **THEN** these SHALL replace the corresponding base fields wholesale

#### Scenario: args append
- **WHEN** the `StepDefinition` provides `args`
- **THEN** the engine SHALL extend the base `command` vector with `args` (not replace)

### Requirement: Iterative variable substitution
The engine SHALL merge a base context with the `StepDefinition`'s local `var` map (local keys overwriting base keys) into a `final_vars` map, then perform up to 8 fixed-point substitution passes over every command part. A non-empty context value SHALL win over the ambient environment. An EMPTY context value SHALL fall back to `std::env::var(key)`.

#### Scenario: nested placeholder resolution
- **WHEN** a placeholder value itself contains another placeholder
- **THEN** repeated passes SHALL resolve it as long as it converges within 8 passes

#### Scenario: empty context falls back to env
- **WHEN** a context key maps to an empty string
- **THEN** the engine SHALL substitute `std::env::var(key)` (or empty if unset) instead of the empty string

### Requirement: Default title fallback
If, after substitution, the command vector is non-empty and the `title` map lacks an `en` or `ru` entry, the engine SHALL insert default titles of the form `Executing command: <command[0]>...` (en) and `Выполнение команды: <command[0]>...` (ru).

#### Scenario: missing language label
- **WHEN** a resolved step has a non-empty command but no `en` title
- **THEN** the engine SHALL insert the default English fallback (and likewise for `ru`)

### Requirement: Base context
`build_base_context(apk_path)` SHALL inject `apk`/`APK` (both = `apk_path`) and `package`/`PACKAGE` (both = `ru.voboost`).

#### Scenario: scenario resolution context
- **WHEN** any scenario is resolved
- **THEN** the context SHALL start from the base context and have scenario-specific keys merged on top

### Requirement: GUI install command
The `get_install_steps(apk_path, scenario_steps?, artifacts?)` SHALL be a `#[tauri::command]` resolving install steps only. When `artifacts` is `Some` it SHALL resolve the full provision scenario via `build_provision_steps`; when `None` it SHALL use `scenario_steps` if provided, else resolve `ScenarioKind::Install` with the base context from `apk_path`. The `is_uninstalling` argument SHALL NOT exist; uninstall is resolved by `get_uninstall_steps`.

#### Scenario: no is_uninstalling flag
- **WHEN** the frontend triggers an install
- **THEN** it SHALL call `get_install_steps` without any uninstall flag, and uninstall SHALL be a separate command

### Requirement: Step execution
`execute_install_step(app, step, device_serial?)` SHALL be an async `#[tauri::command]`. It SHALL emit a `install-step-start` Tauri event carrying the step `id` before any attempt, then make up to `retryCount + 1` attempts. Between failed attempts it SHALL sleep `retryDelaySecs` seconds. On the first success it SHALL emit `install-step-complete` with a `StepResult` (`success true`, `output` = stdout, `error None`) and return. After all attempts fail it SHALL emit `install-step-complete` with `success false`, empty output, and the last stderr as `error`.

#### Scenario: retry with backoff
- **WHEN** an attempt fails and more attempts remain
- **THEN** the engine SHALL sleep `retryDelaySecs` seconds before retrying

#### Scenario: success on first attempt
- **WHEN** the first ADB execution succeeds
- **THEN** the engine SHALL emit `install-step-complete` and return immediately without sleeping

### Requirement: Provision flow
The full provision scenario SHALL be resolved by a private `build_provision_steps(artifacts)` reached only through `get_install_steps` when `artifacts` is supplied. It SHALL build a context from `ProvisionArtifacts` (`apk_path`, `daemon_bin`, `agents_dir`, `manifest`, `manifest_sig`, `hook_local`, `release_key`), resolve `ScenarioKind::Provision`, inject one `push-file` step per agent file after the `/data/voboost/agents` anchor, and remove the release-key steps when `release_key` is empty. The public `get_provision_steps` function SHALL NOT exist.

#### Scenario: dynamic agent push injection
- **WHEN** `agents_dir` contains one or more regular files
- **THEN** the engine SHALL build one `push-file` step per file ordered by name and insert them after the first resolved shell step whose command contains `/data/voboost/agents` (appended at the end if no anchor is found)

#### Scenario: release key filtering
- **WHEN** `release_key` is empty or whitespace-only
- **THEN** the engine SHALL remove the `push-release-key` step and any `push-file` step whose command targets `/data/data/ru.voboost/files/config/release-public.pem`

### Requirement: Rearm and uninstall flows
`get_restore_steps(hook_local)` SHALL resolve `ScenarioKind::Restore` with a context containing only `hook_local`. `get_uninstall_steps()` SHALL resolve `ScenarioKind::Uninstall` with an empty extra context.

#### Scenario: restore context
- **WHEN** restore steps are built
- **THEN** the context SHALL contain `hook_local` plus the base context (`package`/`PACKAGE` only, since `apk_path` is empty)

