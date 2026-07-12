# Proposal: rename-rearm-to-restore

## Why
The CLI flag `--rearm` (short `-R`) is unclear to operators. "Rearm" is
jargon inherited from internal naming and does not describe what the flag
actually does: restore the voboost init hook after a system OTA wipes it. The
verb "restore" matches the action (and already matches the user-facing step
title "Restoring init hook" / "Восстановление init-хука"). Renaming the flag
and every internal symbol consistently removes the mismatch between the
user-visible command, the step title, and the code.

## What Changes
- Rename the CLI flag `--rearm` (short `-R`) to `--restore` (short `-r`) in
  the Tauri CLI argument schema (`tauri.conf.json`) and the printed help text.
- Rename the headless mode enum variant `HeadlessMode::Rearm` to
  `HeadlessMode::Restore` and its dispatch in `lib.rs`.
- Rename the runner `run_rearm` to `run_restore` in `cli_runner.rs`.
- Rename `ScenarioKind::Rearm` to `ScenarioKind::Restore`, its scenario
  binding to `config/config-restore.json`, and its `name()` string in
  `install.rs`.
- Rename the resolver `get_rearm_steps` to `get_restore_steps` and its test
  `test_rearm_steps_load` call site.
- Move `config/config-rearm.json` to `config/config-restore.json` (git mv)
  and rename its step `"do": "rearm-hook"` to `"do": "restore-hook"`.
- Rename the master command template id `rearm-hook` to `restore-hook` in
  `config/config-commands.json` (titles already say "Restoring").

This is a CODE-only change. User-facing documentation (README, releases
schema docs) is handled by a separate docs change proposal.

## Impact
- **Affected capabilities**: `cli`, `install-scenario`, `step-engine`.
- **Affected files**: `src-tauri/tauri.conf.json`,
  `src-tauri/src/lib.rs`, `src-tauri/src/commands/cli_runner.rs`,
  `src-tauri/src/commands/install.rs`, `config/config-rearm.json` (moved),
  `config/config-commands.json`.
- **Behavior**: No device-side behavior changes. The init-hook append command
  and its idempotent guard are unchanged; only the template id string is
  renamed.
- **Backwards compatibility**: The old `--rearm` flag and `-R` short stop
  working. Operators and any external scripts must switch to `--restore` /
  `-r`. This is an intentional breaking CLI rename.
- **Validation**: `cd src-tauri && cargo test` and
  `npx @fission-ai/openspec validate rename-rearm-to-restore --strict`.
