## 1. OpenSpec change (unify-install-single-source)

- [ ] 1.1 proposal.md, design.md, specs deltas (this change)
- [ ] 1.2 `npx @fission-ai/openspec validate unify-install-single-source --strict` passes

## 2. Code

- [ ] 2.1 `src-tauri/src/commands/install.rs` `ProvisionArtifacts`: change the derive to
  `#[derive(Debug, Clone, Default, Serialize, Deserialize)]` and add the line
  `#[serde(rename_all = "camelCase")]` directly above `pub struct ProvisionArtifacts`.
- [ ] 2.2 `src-tauri/src/commands/install.rs` `get_install_steps`: add the parameter
  `artifacts: Option<ProvisionArtifacts>` after `scenario_steps: Option<Vec<StepDefinition>>`,
  and insert as the first statement of the body:
  `if let Some(ref art) = artifacts { return build_provision_steps(art); }`
- [ ] 2.3 `src-tauri/src/commands/install.rs`: rename
  `pub fn get_provision_steps(artifacts: &ProvisionArtifacts) -> Vec<InstallStep>` to
  `fn build_provision_steps(artifacts: &ProvisionArtifacts) -> Vec<InstallStep>` and update its
  doc comment to state it is reached through `get_install_steps`, not a `#[tauri::command]`.
- [ ] 2.4 `src-tauri/src/commands/cli_runner.rs` `run_install`: replace
  `let steps = install::get_provision_steps(&artifacts);` with
  `let apk_path = artifacts.apk_path.clone();` followed by
  `let steps = install::get_install_steps(apk_path, false, None, Some(artifacts));`.
- [ ] 2.5 `src-tauri/src/commands/install.rs` tests `test_provision_steps_load` and
  `test_provision_steps_with_release_key`: replace
  `let steps = crate::commands::install::get_provision_steps(&artifacts);` with
  `let steps = crate::commands::install::get_install_steps(artifacts.apk_path.clone(), false, None, Some(artifacts));`.
- [ ] 2.6 `src/services/install.ts` and `src/services/adb.ts`: in the `invoke('get_install_steps', {...})`
  object, add `artifacts: null` on the line after `scenarioSteps: scenarioSteps ?? null`.

## 3. Validate

- [ ] 3.1 `cd src-tauri && cargo test` passes
- [ ] 3.2 `npm run lint && npm test && npm run build` pass
