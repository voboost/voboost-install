## D1. Why a dedicated uninstall command instead of keeping `is_uninstalling`?
`is_uninstalling` overloads the install command with a mode flag, hiding uninstall behind an install-named entry point. A dedicated `get_uninstall_steps` command makes the surface honest and gives GUI and CLI one shared function each for install and uninstall.

## D2. CLI still calls `get_uninstall_steps` directly.
`run_uninstall` invokes the Rust function directly (not via `invoke`), so promoting it to a `#[tauri::command]` does not change CLI behavior; it only exposes the same function to the frontend.

## D3. `scenario_steps` override moves with the command.
The Release `scenarios.uninstall` override (today consumed via `get_install_steps(is_uninstalling, scenario_steps)`) moves to `get_uninstall_steps(scenario_steps)` so the override path is preserved and stays on the uninstall function.

## D4. Dependency on `unify-install-single-source`.
This change assumes `get_install_steps` already carries the optional `artifacts` argument from `unify-install-single-source`. The final signature is `get_install_steps(apk_path, scenario_steps?, artifacts?)`; apply this change after that one.
