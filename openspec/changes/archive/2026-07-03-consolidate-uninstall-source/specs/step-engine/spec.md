## MODIFIED Requirements

### Requirement: GUI install command
The `get_install_steps(apk_path, scenario_steps?, artifacts?)` SHALL be a `#[tauri::command]` resolving install steps only. When `artifacts` is `Some` it SHALL resolve the full provision scenario via `build_provision_steps`; when `None` it SHALL use `scenario_steps` if provided, else resolve `ScenarioKind::Install` with the base context from `apk_path`. The `is_uninstalling` argument SHALL NOT exist; uninstall is resolved by `get_uninstall_steps`.

#### Scenario: no is_uninstalling flag
- **WHEN** the frontend triggers an install
- **THEN** it SHALL call `get_install_steps` without any uninstall flag, and uninstall SHALL be a separate command

### Requirement: Rearm and uninstall flows
`get_rearm_steps(hook_local)` SHALL resolve `ScenarioKind::Rearm` (renamed to Restore by `rename-rearm-to-restore`) with a context containing only `hook_local`. `get_uninstall_steps(scenario_steps?)` SHALL be a `#[tauri::command]`: when `scenario_steps` is `Some` it SHALL resolve those steps, otherwise it SHALL resolve `ScenarioKind::Uninstall` with an empty extra context. Both the CLI runner and the GUI uninstall wizard SHALL call `get_uninstall_steps`.

#### Scenario: GUI and CLI share uninstall source
- **WHEN** uninstall steps are needed by either the GUI or the CLI
- **THEN** both SHALL obtain them from the single `get_uninstall_steps` function

#### Scenario: rearm/restore context
- **WHEN** restore steps are built
- **THEN** the context SHALL contain `hook_local` plus the base context (`package`/`PACKAGE` only, since `apk_path` is empty)
