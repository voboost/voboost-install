## MODIFIED Requirements

### Requirement: step resolution per mode
`run_install` SHALL resolve steps via `get_install_steps(apk_path, false, None, Some(artifacts))` with a `ProvisionArtifacts` bundle. `run_rearm` SHALL resolve steps via `get_rearm_steps` from a locally generated hook-body temp file and SHALL drop the `start-daemon` step when the daemon is already running. `run_uninstall` SHALL resolve steps via the shared `get_uninstall_steps` command (the same function the GUI uninstall wizard uses) and requires no artifacts.

#### Scenario: uninstall uses the shared command
- **WHEN** `--uninstall` resolves its steps
- **THEN** the runner SHALL call `get_uninstall_steps`, the single source also used by the GUI

#### Scenario: rearm skips redundant daemon start
- **WHEN** `--rearm` runs and the inject daemon is already running
- **THEN** the `start-daemon` step is removed and the runner logs the running PID before continuing
