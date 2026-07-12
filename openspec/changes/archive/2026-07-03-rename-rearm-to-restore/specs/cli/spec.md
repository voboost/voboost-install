## MODIFIED Requirements

### Requirement: CLI argument schema
The application SHALL register the following CLI arguments via the `tauri-plugin-cli` configuration: `help` (short `h`, no value), `install` (short `i`, takes a value: APK path), `restore` (short `r`, no value), `uninstall` (short `U`, no value), `daemon-bin` (takes value), `agents-dir` (takes value), `manifest` (takes value), `manifest-sig` (takes value), `release-key` (takes value), `lang` (short `l`, takes value), `dry-run` (short `d`, no value), and `platform` (short `p`, takes value). No `--auto-install`, no `--provision`, and no `--rearm` flag SHALL exist.

#### Scenario: flag inventory matches configuration
- **WHEN** the CLI argument table is inspected
- **THEN** exactly the twelve arguments listed above are declared, each with the stated short alias and value-arity, and no others
- **THEN** the post-OTA init-hook restore flag is named `restore` with short alias `r`, not `rearm`/`R`

### Requirement: headless mode selection and precedence
The application SHALL select at most one headless mode by evaluating flags in the fixed precedence order `install` > `restore` > `uninstall`. When any of these flags is present, the application SHALL NOT open a GUI window.

#### Scenario: install takes precedence
- **WHEN** more than one headless flag is supplied (e.g. `--install` together with `--restore`)
- **THEN** the higher-precedence mode wins in the order install, then restore, then uninstall

#### Scenario: no headless flag
- **WHEN** none of `--install`, `--restore`, `--uninstall` is present
- **THEN** the React GUI wizard is launched

### Requirement: headless runners spawn off the setup task
Each headless mode SHALL be executed inside a `tauri::async_runtime::spawn` task with the resolved `lang` (defaulting to `en` when `--lang` is absent). `--install` SHALL call `run_install`; `--restore` SHALL call `run_restore`; `--uninstall` SHALL call `run_uninstall`.

#### Scenario: language default
- **WHEN** a headless mode runs without `--lang`
- **THEN** the language passed to the runner is `en`

### Requirement: step resolution per mode
`run_install` SHALL resolve steps via `get_provision_steps` with a `ProvisionArtifacts` bundle (apk, daemon, agents, manifest, manifest-sig, hook body temp path, release key). `run_restore` SHALL resolve steps via `get_restore_steps` from a locally generated hook-body temp file and SHALL drop the `start-daemon` step when the daemon is already running (detected via `pgrep -f /data/voboost/voboost-inject`). `run_uninstall` SHALL resolve steps via `get_uninstall_steps` and requires no artifacts.

#### Scenario: restore skips redundant daemon start
- **WHEN** `--restore` runs and the inject daemon is already running
- **THEN** the `start-daemon` step is removed and the runner logs the running PID before continuing
