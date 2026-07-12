## MODIFIED Requirements

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
