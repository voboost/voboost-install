## MODIFIED Requirements

### Requirement: Uninstall scenario (CLI `--uninstall` and GUI uninstall)
The uninstall flow SHALL be resolved by the shared `get_uninstall_steps` command used by both the CLI and the GUI, loading `config/config-uninstall.json` and executing: `stop-daemon` -> `root` -> `remount` -> `shell rm -f /system/etc/init/voboost.rc` (non-fatal) -> `shell rm -rf /data/voboost` (non-fatal) -> `uninstall-apk` ru.voboost (non-fatal) -> `reboot` (non-fatal). The GUI SHALL NOT reach uninstall through `get_install_steps(is_uninstalling)`.

#### Scenario: GUI uninstall uses the shared command
- **WHEN** the GUI wizard uninstalls
- **THEN** it SHALL call `get_uninstall_steps`, sharing the CLI's single source of truth

#### Scenario: non-fatal teardown steps
- **WHEN** a teardown shell/uninstall/reboot step fails
- **THEN** the runner SHALL log the failure and continue (fatal=false)

### Requirement: Scenario override by Release
A Release MAY carry `scenarios.install` / `scenarios.uninstall` keyed by release id. The install override SHALL be consumed by `get_install_steps(apk_path, scenario_steps, artifacts)` and the uninstall override SHALL be consumed by `get_uninstall_steps(scenario_steps)`. When an override is `None`, each command SHALL fall back to its embedded scenario file (`config-install.json` / `config-uninstall.json`).

#### Scenario: uninstall override routed to get_uninstall_steps
- **WHEN** a Release supplies `scenarios.uninstall[<id>]`
- **THEN** the GUI SHALL pass those steps to `get_uninstall_steps(scenarioSteps)`, not to `get_install_steps`
