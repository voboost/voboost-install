# Tasks: universal-mac-adb

Code is already implemented in the working tree. Items marked DONE exist on disk; the only net-new action is committing and validating the spec.

- [x] DONE `src-tauri/src/utils/platform.rs` — `mac_adb_filename`, `mac_adb_fallback`, `resolve_resources_base` (with `"unknown path"` placeholder handling and `current_exe()` fallbacks for raw-binary and `.app` layouts), `get_adb_path` with arch selection + Rosetta fallback + unsupported-platform error.
- [x] DONE `src/build/stage-resources.js` — `stageMac` stages both `adb_arm` and `adb_x86`; `stripMacBinary` strips with `-x`; `stageWindows`; removed `TARGET_ARCH`.
- [x] DONE `src/build/release.js` — universal staging (single `stage-resources.js` run), no per-arch re-stage.
- [x] DONE `src-tauri/resources/adb/README.md` — documents the universal bundle, runtime selection, and Rosetta fallback.
- [x] DONE `src-tauri/resources-staged/mac/adb_x86` — staged Intel binary (stripped, 0755).
- [x] DONE `src-tauri/resources-staged/mac/adb_arm` — staged Apple Silicon binary (stripped, 0755).
- [ ] Author `openspec/changes/universal-mac-adb/` proposal, design, tasks, and spec delta.
- [ ] Run `openspec validate` (or equivalent) to confirm the change is well-formed.
- [ ] Commit the universal-mac-adb change and the implemented code together.
