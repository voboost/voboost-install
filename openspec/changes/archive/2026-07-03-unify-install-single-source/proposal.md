## Why
The GUI wizard and the headless `--install` CLI resolve install steps through two different functions: `get_install_steps` (a `#[tauri::command]`) for the basic scenario and `get_provision_steps` (a plain function) for the full bring-up. This splits the source of truth, so `--install` does not call `get_install_steps`, and the two consumers cannot share step logic or let a future GUI split the provision flow across wizards.

## What Changes
- Add an optional `artifacts: Option<ProvisionArtifacts>` argument to `get_install_steps`. When `Some`, resolve the full provision scenario (the current `get_provision_steps` body, including dynamic agent injection and release-key filtering); when `None`, keep today's basic install/uninstall behavior.
- Move the `get_provision_steps` body into a private `build_provision_steps` called from `get_install_steps`; remove the public `get_provision_steps`.
- `ProvisionArtifacts` gains `Serialize, Deserialize` and `#[serde(rename_all = "camelCase")]` so it can be a Tauri command argument.
- `run_install` resolves steps via `get_install_steps(apk_path, false, None, Some(artifacts))` instead of `get_provision_steps`.
- Frontend `getInstallSteps` wrappers pass `artifacts: null` explicitly (matching the existing `scenarioSteps ?? null` convention); GUI behavior is unchanged.
- Update the two provision unit tests to call `get_install_steps(..., Some(artifacts))`.

## Impact
CLI `--install` and the GUI wizard share one resolution path. No change to GUI behavior or to the provision step sequence. The `get_install_steps` Tauri command gains an optional argument (backward compatible).
