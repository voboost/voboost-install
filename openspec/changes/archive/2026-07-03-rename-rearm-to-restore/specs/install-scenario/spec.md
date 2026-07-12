## REMOVED Requirements

### Requirement: Rearm scenario (CLI `--rearm`)
This requirement was renamed to "Restore scenario (CLI `--restore`)" for clarity; see the ADDED requirement below for the current behavior.

## ADDED Requirements

### Requirement: Restore scenario (CLI `--restore`)
`run_restore` SHALL generate the init-hook body locally (no artifact download), wait for a device, then run `config/config-restore.json`: `root` -> `remount` -> `push-file` hook body to `/data/local/tmp/voboost.rc.body` -> `restore-hook` (idempotent guarded append to `/system/etc/init/voboost.rc`) -> `start-daemon` -> `verify-daemon`.

#### Scenario: skip start-daemon if running
- **WHEN** the daemon is already running (pgrep matches `/data/voboost/voboost-inject`)
- **THEN** the runner SHALL drop the `start-daemon` step, log the PID, and still run `verify-daemon`
