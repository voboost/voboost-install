## Purpose
Define the ordered device-side scenario SEQUENCES executed by voboost-install (GUI install/uninstall and headless CLI `--install`/`--rearm`/`--uninstall`). This is the current-tree baseline (including uncommitted changes); it captures the exact step ordering embedded in the JSON scenario files and the orchestration in `cli_runner.rs`.
## Requirements
### Requirement: Install scenario (GUI default)
The GUI install flow SHALL load `config/config-install.json` and execute its steps in the fixed order: `root` -> `disable-verity` -> `reboot` -> `wait-device` (retryCount 45) -> `root` -> `wait-device` (retryCount 30) -> `remount` -> `setenforce` -> `install-apk` (apk=`{APK}`) -> five `pm-grant` steps -> two `appops-set` steps -> five `settings-put-global` steps.

#### Scenario: pm-grant sequence
- **WHEN** the install scenario reaches the permission block
- **THEN** it SHALL issue `pm-grant` for `SYSTEM_ALERT_WINDOW`, `READ_LOGS`, `RECORD_AUDIO`, `WRITE_EXTERNAL_STORAGE`, `WRITE_SECURE_SETTINGS` in that order

#### Scenario: appops and global settings sequence
- **WHEN** the install scenario continues past pm-grant
- **THEN** it SHALL issue `appops-set REQUEST_INSTALL_PACKAGES allow`, then `appops-set REQUEST_INSTALL_PACKAGES allow --user 0`, then `settings-put-global` for `enable_freeform_support`, `force_resizable_activities`, `hidden_api_policy_pre_p_apps`, `hidden_api_policy_p_apps`, `hidden_api_policy` (all `=1`)

### Requirement: Provision scenario (CLI `--install`)
`run_install` SHALL build the init-hook body locally, wait for a device, then resolve `config/config-provision.json` through the shared `get_install_steps(..., Some(artifacts))` resolver (not a separate provision function). The step order SHALL be: `root` -> `disable-verity` -> `reboot` -> `wait-device` (45) -> `root` -> `wait-device` (30) -> `wait-package-manager` -> `remount` (non-fatal) -> `setenforce` -> four `mkdir-remote` (`/data/voboost`, `/agents`, `/run`, `/logs`, root:root 700) -> `push-file`+`chmod-remote` daemon (700) -> dynamic agent push -> `push-file`+`chmod-remote` manifest.json (600) -> `push-file`+`chmod-remote` manifest.sig (600) -> `push-file` init hook body -> `write-init-hook` (non-fatal) -> `emulator-setup` -> `install-apk` -> `fix-app-ownership` -> `push-file`+`push-release-key` (release-public.pem) -> `appops-set` -> five `settings-put-global` -> `shell` write start.sh -> `shell` write stop.sh -> `start-daemon` -> `verify-daemon`.

#### Scenario: provision resolved via shared resolver
- **WHEN** `run_install` builds the provision step list
- **THEN** it SHALL obtain it from `get_install_steps` with the artifacts bundle, sharing the GUI's resolution path

#### Scenario: pm-grant intentionally absent
- **WHEN** provision runs the post-install block
- **THEN** it SHALL NOT issue any `pm-grant` step, because the APK declares none of those permissions (documented in `config-provision.README.md`)

#### Scenario: remount and write-init-hook are non-fatal
- **WHEN** the `remount` or `write-init-hook` step fails
- **THEN** the runner SHALL log the failure and continue (fatal=false), because on the Android emulator `/system` is read-only and `adb remount` cannot make it writable, so both steps are expected to fail there; on a real device both succeed so the non-fatal flag has no effect

#### Scenario: emulator-setup is a no-op on a real device
- **WHEN** `emulator-setup` runs and `ro.kernel.qemu` is not `1`
- **THEN** the step SHALL exit 0 without changing device state, so the production provision scenario is unchanged

#### Scenario: emulator-setup sets SELinux permissive on the emulator
- **WHEN** `emulator-setup` runs and `ro.kernel.qemu` is `1`
- **THEN** the step SHALL run `su 0 setenforce 0` (SELinux permissive, required for frida-core on the emulator) and exit 0 regardless of the `setenforce` result (non-fatal)

#### Scenario: daemon starts manually on the emulator
- **WHEN** provision runs on the emulator (no init hook installed)
- **THEN** the `start-daemon` step SHALL start the daemon via `/data/voboost/start.sh` (which uses `nohup`), and `verify-daemon` SHALL confirm readiness from `/data/user/0/ru.voboost/inject-status.json`

### Requirement: Downgrade recovery
During `install-apk`, on `INSTALL_FAILED_VERSION_DOWNGRADE` (in error or output), the runner SHALL uninstall `ru.voboost` and retry the same step without advancing.

#### Scenario: downgrade detected
- **WHEN** install-apk fails with `INSTALL_FAILED_VERSION_DOWNGRADE`
- **THEN** the runner SHALL run `adb uninstall ru.voboost` and re-run install-apk

### Requirement: Uninstall scenario (CLI `--uninstall` and GUI uninstall)
The uninstall flow SHALL be resolved by the shared `get_uninstall_steps` command used by both the CLI and the GUI, loading `config/config-uninstall.json` and executing: `stop-daemon` -> `root` -> `remount` -> `shell rm -f /system/etc/init/voboost.rc` (non-fatal) -> `shell rm -rf /data/voboost` (non-fatal) -> `uninstall-apk` ru.voboost (non-fatal) -> `reboot` (non-fatal). The GUI SHALL NOT reach uninstall through `get_install_steps(is_uninstalling)`.

#### Scenario: GUI uninstall uses the shared command
- **WHEN** the GUI wizard uninstalls
- **THEN** it SHALL call `get_uninstall_steps`, sharing the CLI's single source of truth

#### Scenario: non-fatal teardown steps
- **WHEN** a teardown shell/uninstall/reboot step fails
- **THEN** the runner SHALL log the failure and continue (fatal=false)

### Requirement: INIT_HOOK_BODY content
`INIT_HOOK_BODY` SHALL be a proper Android init service definition: a `service voboost-inject /system/bin/sh /data/voboost/start.sh` block (class `late_start`, user/group root, seclabel `u:r:shell:s0`, oneshot, disabled), started by `on property:sys.boot_completed=1` -> `start voboost-inject`. It is written to a host temp file `voboost.rc.body` and pushed to the device for both provision and rearm.

#### Scenario: hook body is a boot-triggered init service
- **WHEN** the provision or restore flow generates the init hook body
- **THEN** the body SHALL define a `service voboost-inject` block started by `on property:sys.boot_completed=1`, be written to `voboost.rc.body`, and be appended to `/system/etc/init/voboost.rc`

### Requirement: Scenario override by Release
A Release MAY carry `scenarios.install` / `scenarios.uninstall` keyed by release id. The install override SHALL be consumed by `get_install_steps(apk_path, scenario_steps, artifacts)` and the uninstall override SHALL be consumed by `get_uninstall_steps(scenario_steps)`. When an override is `None`, each command SHALL fall back to its embedded scenario file (`config-install.json` / `config-uninstall.json`).

#### Scenario: uninstall override routed to get_uninstall_steps
- **WHEN** a Release supplies `scenarios.uninstall[<id>]`
- **THEN** the GUI SHALL pass those steps to `get_uninstall_steps(scenarioSteps)`, not to `get_install_steps`

### Requirement: Restore scenario (CLI `--restore`)
`run_restore` SHALL generate the init-hook body locally (no artifact download), wait for a device, then run `config/config-restore.json`: `root` -> `remount` -> `push-file` hook body to `/data/local/tmp/voboost.rc.body` -> `restore-hook` (idempotent guarded append to `/system/etc/init/voboost.rc`) -> `start-daemon` -> `verify-daemon`.

#### Scenario: skip start-daemon if running
- **WHEN** the daemon is already running (pgrep matches `/data/voboost/voboost-inject`)
- **THEN** the runner SHALL drop the `start-daemon` step, log the PID, and still run `verify-daemon`

