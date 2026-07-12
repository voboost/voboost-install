# Tasks: rename-rearm-to-restore

1. **git mv the scenario file** (preserves history):
   `git mv config/config-rearm.json config/config-restore.json`

2. **config/config-restore.json** — rename the step `do` reference:
   - old: `        "do": "rearm-hook",`
   - new: `        "do": "restore-hook",`

3. **config/config-commands.json** — rename the master template id (titles
   already say "Restoring", keep them as-is):
   - old: `        "id": "rearm-hook",`
   - new: `        "id": "restore-hook",`

4. **src-tauri/tauri.conf.json** — rename the CLI argument name, short, and
   description:
   - old:
     ```
                     "name": "rearm",
                     "short": "R",
                     "description": "Restore the init hook after a system OTA (headless)",
     ```
   - new:
     ```
                     "name": "restore",
                     "short": "r",
                     "description": "Restore the init hook after a system OTA (headless)",
     ```

5. **src-tauri/src/lib.rs** — flag lookup and enum variant:
   - old: `                } else if flag_present(m, "rearm") {`
   - new: `                } else if flag_present(m, "restore") {`
   - old: `                    Some(HeadlessMode::Rearm)`
   - new: `                    Some(HeadlessMode::Restore)`
   - old:
     ```
                         HeadlessMode::Rearm => {
                             cli_runner::run_rearm(app_handle, lang).await;
                         }
     ```
   - new:
     ```
                         HeadlessMode::Restore => {
                             cli_runner::run_restore(app_handle, lang).await;
                         }
     ```
   - old:
     ```
 enum HeadlessMode {
     Install,
     Rearm,
     Uninstall,
 }
     ```
   - new:
     ```
 enum HeadlessMode {
     Install,
     Restore,
     Uninstall,
 }
     ```

6. **src-tauri/src/commands/cli_runner.rs** — runner function, call to
   `install::get_rearm_steps`, banner/completion strings, and help text:
   - old: `/// Run the `--rearm` headless flow (post-OTA init-hook restore).`
   - new: `/// Run the `--restore` headless flow (post-OTA init-hook restore).`
   - old: `pub async fn run_rearm(app: AppHandle, lang: String) -> ! {`
   - new: `pub async fn run_restore(app: AppHandle, lang: String) -> ! {`
   - old: `    println!("Starting Voboost CLI Rearm\n");`
   - new: `    println!("Starting Voboost CLI Restore\n");`
   - old: `    let mut steps = install::get_rearm_steps(&hook_local);`
   - new: `    let mut steps = install::get_restore_steps(&hook_local);`
   - old: `    // M3: --rearm observability. Before the "start-daemon" step, check`
   - new: `    // M3: --restore observability. Before the "start-daemon" step, check`
   - old: `    println!("Rearm completed successfully.");`
   - new: `    println!("Restore completed successfully.");`
   - old:
     ```
         "  -R, --rearm               Restore the init hook after a system OTA",
         "                            (headless)",
     ```
   - new:
     ```
         "  -r, --restore             Restore the init hook after a system OTA",
         "                            (headless)",
     ```
   - old: `        "Headless modes (--install, --rearm, --uninstall) do",`
   - new: `        "Headless modes (--install, --restore, --uninstall) do",`

7. **src-tauri/src/commands/install.rs** — enum variant, scenario binding,
   `name()` string, resolver function, and test call site:
   - old:
     ```
 pub enum ScenarioKind {
     Install,
     Uninstall,
     Provision,
     Rearm,
 }
     ```
   - new:
     ```
 pub enum ScenarioKind {
     Install,
     Uninstall,
     Provision,
     Restore,
 }
     ```
   - old: `            ScenarioKind::Rearm => include_str!("../../../config/config-rearm.json"),`
   - new: `            ScenarioKind::Restore => include_str!("../../../config/config-restore.json"),`
   - old: `            ScenarioKind::Rearm => "rearm",`
   - new: `            ScenarioKind::Restore => "restore",`
   - old:
     ```
 /// Get rearm steps (post-OTA init-hook restore). No artifact download needed;
 /// only the locally generated init-hook body path is required.
 pub fn get_rearm_steps(hook_local: &str) -> Vec<InstallStep> {
     let mut context = HashMap::new();
     context.insert("hook_local".to_string(), hook_local.to_string());
     resolve_scenario(ScenarioKind::Rearm, context)
 }
     ```
   - new:
     ```
 /// Get restore steps (post-OTA init-hook restore). No artifact download needed;
 /// only the locally generated init-hook body path is required.
 pub fn get_restore_steps(hook_local: &str) -> Vec<InstallStep> {
     let mut context = HashMap::new();
     context.insert("hook_local".to_string(), hook_local.to_string());
     resolve_scenario(ScenarioKind::Restore, context)
 }
     ```
   - old (in `test_rearm_steps_load`):
     ```
         let steps = crate::commands::install::get_rearm_steps(
             "/data/local/tmp/voboost.rc.body",
         );
         assert!(!steps.is_empty());
         assert_eq!(steps.first().map(|s| s.id.as_str()), Some("root"));
         assert!(steps.iter().any(|s| s.id == "rearm-hook"));
     ```
   - new:
     ```
         let steps = crate::commands::install::get_restore_steps(
             "/data/local/tmp/voboost.rc.body",
         );
         assert!(!steps.is_empty());
         assert_eq!(steps.first().map(|s| s.id.as_str()), Some("root"));
         assert!(steps.iter().any(|s| s.id == "restore-hook"));
     ```

8. **Validate**:
   - `cd src-tauri && cargo test`
   - `npx @fission-ai/openspec validate rename-rearm-to-restore --strict`
