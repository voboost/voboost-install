## MODIFIED Requirements

### Requirement: Scenario files
The engine SHALL embed four scenario files keyed by `ScenarioKind`: `config-install.json` (Install), `config-uninstall.json` (Uninstall), `config-provision.json` (Provision), `config-restore.json` (Restore). Each scenario file SHALL parse into `Vec<StepDefinition>`.

#### Scenario: scenario parse failure
- **WHEN** an embedded scenario file fails to parse
- **THEN** the engine SHALL log an error naming the scenario and treat the definition list as empty

### Requirement: Rearm and uninstall flows
`get_restore_steps(hook_local)` SHALL resolve `ScenarioKind::Restore` with a context containing only `hook_local`. `get_uninstall_steps()` SHALL resolve `ScenarioKind::Uninstall` with an empty extra context.

#### Scenario: restore context
- **WHEN** restore steps are built
- **THEN** the context SHALL contain `hook_local` plus the base context (`package`/`PACKAGE` only, since `apk_path` is empty)

### Requirement: Master command templates
The engine SHALL embed `config/config-commands.json` at compile time via `include_str!` and parse it once per scenario resolution into a `Vec<InstallStep>`. Each `InstallStep` SHALL expose `id`, `title` (`StepTitle` = `HashMap<String,String>` of lang to label), `command` (`Vec<String>`), `fatal`, `retryCount`, `retryDelaySecs`. A parse failure SHALL log an error and yield an empty master list. The post-OTA init-hook append template SHALL be id `restore-hook`.

#### Scenario: master template lookup by id
- **WHEN** a `StepDefinition` declares `do: "<id>"`
- **THEN** the engine SHALL find the master `InstallStep` whose `id` matches and use it as the base
- **THEN** if no match exists the engine SHALL log an error and skip the step (return `None`)

#### Scenario: inline base when `do` absent
- **WHEN** a `StepDefinition` has no `do` field
- **THEN** the engine SHALL use an inline base step with `id "inline"`, empty title, empty command, `fatal false`, zero retries
