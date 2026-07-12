## MODIFIED Requirements

### Requirement: step resolution per mode
`run_install` SHALL resolve steps via `get_install_steps(apk_path, false, None, Some(artifacts))` with a `ProvisionArtifacts` bundle (apk, daemon, agents, manifest, manifest-sig, hook body temp path, release key), so the CLI shares the same resolver as the GUI. `run_rearm` SHALL resolve steps via `get_rearm_steps` from a locally generated hook-body temp file and SHALL drop the `start-daemon` step when the daemon is already running (detected via `pgrep -f /data/voboost/voboost-inject`). `run_uninstall` SHALL resolve steps via `get_uninstall_steps` and requires no artifacts.

#### Scenario: install uses the shared resolver
- **WHEN** `--install` resolves its steps
- **THEN** the runner SHALL call `get_install_steps` (not a separate provision function)

#### Scenario: rearm skips redundant daemon start
- **WHEN** `--rearm` runs and the inject daemon is already running
- **THEN** the `start-daemon` step is removed and the runner logs the running PID before continuing
