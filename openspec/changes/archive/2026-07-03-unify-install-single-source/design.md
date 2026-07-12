## D1. Why an optional `artifacts` argument instead of a new command?
A second command would preserve the split this change removes. One command with an optional bundle lets the GUI pass `None` (basic scenario) and the CLI pass `Some` (full provision), unifying the entry point while letting each caller select depth. The GUI may later pass `Some` to drive provision steps split across wizards.

## D2. Why keep `build_provision_steps` private?
It holds the dynamic agent injection and release-key filtering that only apply to the provision scenario. Exposing it would re-create a second public entry point. `get_install_steps` is the sole caller.

## D3. CLI clones `apk_path` before moving `artifacts`.
`build_provision_steps` reads `artifacts.apk_path` itself, so the `apk_path` argument is unused on the provision branch. The CLI passes `artifacts.apk_path.clone()` first to avoid borrowing across the `Some(artifacts)` move.

## D4. Explicit `artifacts: null` in the frontend.
Tauri 2 optional command arguments may be omitted, but the existing wrapper passes `scenarioSteps ?? null` explicitly. We follow the same convention for `artifacts` so the contract is uniform and the GUI never provisions.
