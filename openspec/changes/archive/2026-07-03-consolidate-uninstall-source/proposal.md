## Why
Uninstall is reached through two entry points: the GUI calls `get_install_steps(apk, is_uninstalling=true, scenario_steps)`, while the CLI calls `get_uninstall_steps()`. Both read `config-uninstall.json`, but the GUI path overloads the install command with an `is_uninstalling` flag, so the two consumers do not share one function. After `unify-install-single-source` makes `get_install_steps` the install resolver, the uninstall path should likewise have a single shared function used by both GUI and CLI.

Depends on: `unify-install-single-source` (applied first).

## What Changes
- Make `get_uninstall_steps(scenario_steps?)` a `#[tauri::command]` accepting an optional caller-supplied scenario override (mirroring `get_install_steps`), and have it select `ScenarioKind::Uninstall` when no override is given.
- Remove the `is_uninstalling` argument from `get_install_steps`; it now resolves install only (the `ScenarioKind::Uninstall` selection moves into `get_uninstall_steps`).
- Frontend: add a `getUninstallSteps(scenarioSteps?)` wrapper; `src/hooks/useInstall.ts` calls `getUninstallSteps()` when uninstalling and `getInstallSteps()` when installing.
- Add the Tauri permission `allow-get-uninstall-steps`.
- CLI `run_uninstall` continues to call `get_uninstall_steps()` directly (now also a command).

## Impact
One function per scenario, each used by both GUI and CLI. The GUI uninstall now goes through the same `get_uninstall_steps` the CLI uses. Backward-incompatible for the `get_install_steps` Tauri signature (`is_uninstalling` removed); the only caller (`useInstall.ts`) is updated in the same change.
