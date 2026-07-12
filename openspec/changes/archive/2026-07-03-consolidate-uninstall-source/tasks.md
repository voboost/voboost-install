## 1. OpenSpec change (consolidate-uninstall-source)

- [ ] 1.1 proposal.md, design.md, specs deltas (this change)
- [ ] 1.2 `npx @fission-ai/openspec validate consolidate-uninstall-source --strict` passes

## 2. Code

- [ ] 2.1 `src-tauri/src/commands/install.rs` `get_uninstall_steps`: change
  `pub fn get_uninstall_steps() -> Vec<InstallStep>` to
  `#[tauri::command] pub fn get_uninstall_steps(scenario_steps: Option<Vec<StepDefinition>>) -> Vec<InstallStep>`.
  Replace its body so that when `scenario_steps` is `Some` it resolves those steps, otherwise it
  resolves `ScenarioKind::Uninstall` via `resolve_scenario(ScenarioKind::Uninstall, HashMap::new())`
  (mirror the install branch of `get_install_steps`).
- [ ] 2.2 `src-tauri/src/commands/install.rs` `get_install_steps`: remove the `is_uninstalling: bool`
  parameter and delete the `let kind = if is_uninstalling { ScenarioKind::Uninstall } else { ScenarioKind::Install };`
  branch, leaving only `ScenarioKind::Install` for the non-artifacts, non-override path. Final signature:
  `get_install_steps(apk_path, scenario_steps, artifacts)`.
- [ ] 2.3 `src-tauri/src/lib.rs` `invoke_handler`: add `install::get_uninstall_steps,` next to
  `install::get_install_steps,`.
- [ ] 2.4 `src-tauri/permissions/app.toml`: copy the `allow-get-install-steps` permission block and
  change the copy to `identifier = "allow-get-uninstall-steps"`,
  `description = "Allow the get_uninstall_steps command"`,
  `commands.allow = ["get_uninstall_steps"]`.
- [ ] 2.5 `src/services/install.ts`: add a `getUninstallSteps(scenarioSteps?: StepDefinition[])`
  wrapper returning `invoke('get_uninstall_steps', { scenarioSteps: scenarioSteps ?? null })`.
- [ ] 2.6 `src/services/adb.ts`: add the same `getUninstallSteps` wrapper.
- [ ] 2.7 `src/hooks/useInstall.ts`: import `getUninstallSteps`; in `initializeInstall` and
  `startInstall`, branch on `isUninstalling` — call `getUninstallSteps(scenarioSteps)` when
  uninstalling, otherwise `getInstallSteps(apkPath, scenarioSteps)` (drop the `isUninstalling`
  argument from the `getInstallSteps` calls).

## 3. Validate

- [ ] 3.1 `cd src-tauri && cargo test` passes
- [ ] 3.2 `npm run lint && npm test && npm run build` pass
- [ ] 3.3 GUI install path and GUI uninstall path each resolve steps through their dedicated command
