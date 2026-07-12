## MODIFIED Requirements

### Requirement: Provision scenario (CLI `--install`)
`run_install` SHALL build the init-hook body locally, wait for a device, then resolve `config/config-provision.json` through the shared `get_install_steps(..., Some(artifacts))` resolver (not a separate provision function). The step order SHALL be: `root` -> `disable-verity` -> `reboot` -> `wait-device` (45) -> `root` -> `wait-device` (30) -> `wait-package-manager` -> `remount` -> `setenforce` -> four `mkdir-remote` (`/data/voboost`, `/agents`, `/run`, `/logs`, root:root 700) -> `push-file`+`chmod-remote` daemon (700) -> dynamic agent push -> `push-file`+`chmod-remote` manifest.json (600) -> `push-file`+`chmod-remote` manifest.sig (600) -> `push-file` init hook body -> `write-init-hook` -> `install-apk` -> `fix-app-ownership` -> `push-file`+`push-release-key` (release-public.pem) -> `appops-set` -> five `settings-put-global` -> `shell` write start.sh -> `shell` write stop.sh -> `start-daemon` -> `verify-daemon`.

#### Scenario: provision resolved via shared resolver
- **WHEN** `run_install` builds the provision step list
- **THEN** it SHALL obtain it from `get_install_steps` with the artifacts bundle, sharing the GUI's resolution path

#### Scenario: pm-grant intentionally absent
- **WHEN** provision runs the post-install block
- **THEN** it SHALL NOT issue any `pm-grant` step, because the APK declares none of those permissions (documented in `config-provision.README.md`)
