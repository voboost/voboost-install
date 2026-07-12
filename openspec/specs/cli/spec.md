## Purpose
The `cli` capability exposes the voboost-install binary as a command-line tool: it parses Tauri CLI arguments, prints help, and dispatches one of three headless flows (`--install`, `--rearm`, `--uninstall`) against a connected Android device, or falls back to the React GUI wizard when no headless flag is present.
## Requirements
### Requirement: CLI argument schema
The application SHALL register the following CLI arguments via the `tauri-plugin-cli` configuration: `help` (short `h`, no value), `install` (short `i`, takes a value: APK path), `restore` (short `r`, no value), `uninstall` (short `U`, no value), `daemon-bin` (takes value), `agents-dir` (takes value), `manifest` (takes value), `manifest-sig` (takes value), `release-key` (takes value), `lang` (short `l`, takes value), `dry-run` (short `d`, no value), and `platform` (short `p`, takes value). No `--auto-install`, no `--provision`, and no `--rearm` flag SHALL exist.

#### Scenario: flag inventory matches configuration
- **WHEN** the CLI argument table is inspected
- **THEN** exactly the twelve arguments listed above are declared, each with the stated short alias and value-arity, and no others
- **THEN** the post-OTA init-hook restore flag is named `restore` with short alias `r`, not `rearm`/`R`

### Requirement: help short-circuits before any window
When `--help`/`-h` is present, the setup closure SHALL print the static help text to stdout and exit with code 0 before any GUI window is created.

#### Scenario: help requested
- **WHEN** the process is invoked with `-h` or `--help`
- **THEN** `print_help` output is written to stdout and the process exits 0 with no window shown

### Requirement: headless mode selection and precedence
The application SHALL select at most one headless mode by evaluating flags in the fixed precedence order `install` > `restore` > `uninstall`. When any of these flags is present, the application SHALL NOT open a GUI window.

#### Scenario: install takes precedence
- **WHEN** more than one headless flag is supplied (e.g. `--install` together with `--restore`)
- **THEN** the higher-precedence mode wins in the order install, then restore, then uninstall

#### Scenario: no headless flag
- **WHEN** none of `--install`, `--restore`, `--uninstall` is present
- **THEN** the React GUI wizard is launched

### Requirement: macOS hides Dock icon in headless mode
On macOS, when a headless mode is selected, the application SHALL set the activation policy to `Accessory` so that no Dock icon, window flash, or focus steal occurs.

#### Scenario: headless on macOS
- **WHEN** a headless mode runs on macOS
- **THEN** the process is treated as a background tool with no Dock presence

### Requirement: --install requires provision artifacts
The `--install` mode SHALL require an APK path (the `--install` value) plus `--daemon-bin`, `--agents-dir`, `--manifest`, and `--manifest-sig`. If any required value is missing, the application SHALL print an `Error:` message to stderr and exit 1. `--release-key` SHALL be optional; an empty value disables OTA signature verification.

#### Scenario: missing required artifact
- **WHEN** `--install` is given without one of `--daemon-bin`, `--agents-dir`, `--manifest`, or `--manifest-sig`
- **THEN** the process writes the corresponding `Error:` line to stderr and exits 1

#### Scenario: release key omitted
- **WHEN** `--install` runs without `--release-key`
- **THEN** the install proceeds with OTA signature verification disabled

### Requirement: headless runners spawn off the setup task
Each headless mode SHALL be executed inside a `tauri::async_runtime::spawn` task with the resolved `lang` (defaulting to `en` when `--lang` is absent). `--install` SHALL call `run_install`; `--restore` SHALL call `run_restore`; `--uninstall` SHALL call `run_uninstall`.

#### Scenario: language default
- **WHEN** a headless mode runs without `--lang`
- **THEN** the language passed to the runner is `en`

### Requirement: each runner starts ADB and waits for a device
Every headless runner SHALL start the ADB server, then wait up to 60 seconds (polling once per second) for at least one device whose ADB state is exactly `device`. On timeout or failure it SHALL print an error and exit 1.

#### Scenario: device appears in window
- **WHEN** a device in the `device` state connects within 60 seconds
- **THEN** the runner resolves its serial and continues to the steps

#### Scenario: device timeout
- **WHEN** no authorized `device`-state device appears within 60 seconds
- **THEN** the runner prints the last observed state and exits 1

### Requirement: step resolution per mode
`run_install` SHALL resolve steps via `get_provision_steps` with a `ProvisionArtifacts` bundle (apk, daemon, agents, manifest, manifest-sig, hook body temp path, release key). `run_restore` SHALL resolve steps via `get_restore_steps` from a locally generated hook-body temp file and SHALL drop the `start-daemon` step when the daemon is already running (detected via `pgrep -f /data/voboost/voboost-inject`). `run_uninstall` SHALL resolve steps via `get_uninstall_steps` and requires no artifacts.

#### Scenario: restore skips redundant daemon start
- **WHEN** `--restore` runs and the inject daemon is already running
- **THEN** the `start-daemon` step is removed and the runner logs the running PID before continuing

### Requirement: step execution prints progress and exits by severity
Each runner SHALL print a start banner, then execute resolved steps, printing `[?]` before a step, `[✓]` on success, and `[!]` on a non-fatal failure (with the underlying error or stdout as the reason). A fatal step failure SHALL abort the run with an error and exit 1; reaching the end SHALL exit 0.

#### Scenario: fatal step fails
- **WHEN** a step marked fatal returns failure
- **THEN** the runner writes the failure to stderr and exits 1

#### Scenario: all steps succeed
- **WHEN** every resolved step completes successfully
- **THEN** the runner prints its completion message and exits 0

### Requirement: Documented CLI surface matches implementation
The user-facing documentation SHALL describe exactly the CLI flags the binary implements and SHALL NOT document flags the binary does not implement.
The docs (`README.md`, `README.ru.md`, and files under `docs/`) SHALL list
`--install`/`-i`, `--restore`/`-r`, `--uninstall`/`-U`, `--daemon-bin`,
`--agents-dir`, `--manifest`, `--manifest-sig`, `--release-key`,
`--lang`/`-l`, `--dry-run`/`-d`, `--platform`/`-p`, and `--help`/`-h`, and
SHALL NOT present `--auto-install` as a usable flag. The `--install`
documentation SHALL state that `--daemon-bin`, `--agents-dir`, `--manifest`,
and `--manifest-sig` are required and that `--release-key` is optional.
Historical references to `--auto-install` that record past implementation
steps SHALL be marked as superseded by the unified CLI surface.

#### Scenario: README flags match the binary
- **WHEN** the `Available CLI Flags` section of `README.md` or `README.ru.md` is read
- **THEN** it lists exactly `--install`/`-i`, `--restore`/`-r`, `--uninstall`/`-U`, `--daemon-bin`, `--agents-dir`, `--manifest`, `--manifest-sig`, `--release-key`, `--lang`/`-l`, `--dry-run`/`-d`, `--platform`/`-p`, and `--help`/`-h`, and does not list `--auto-install`

#### Scenario: install example carries required artifacts
- **WHEN** a `--install` example in `README.md` or `README.ru.md` is read
- **THEN** it passes `--daemon-bin`, `--agents-dir`, `--manifest`, and `--manifest-sig` alongside the APK path

#### Scenario: no standalone auto-install reference
- **WHEN** `README.md`, `README.ru.md`, and `docs/*.md` are searched for `--auto-install`
- **THEN** every remaining occurrence is inside a historical record explicitly annotated as superseded by the unified CLI surface

