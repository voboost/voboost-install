## ADDED Requirements

### Requirement: Universal macOS ADB bundle
The macOS build SHALL stage both the Apple Silicon (`adb_arm`) and Intel (`adb_x86`) ADB binaries into `resources-staged/mac/` of a single build, each copied from `src-tauri/resources/adb/mac/`, made executable (`0755`), and stripped of debug symbols via `strip -x`. The build SHALL NOT select a single architecture at build time.

#### Scenario: Both architectures staged
- **WHEN** `stage-resources.js` runs on macOS
- **THEN** both `resources-staged/mac/adb_arm` and `resources-staged/mac/adb_x86` SHALL exist, each executable and stripped

#### Scenario: Missing source binary fails the build
- **WHEN** either `src-tauri/resources/adb/mac/adb_arm` or `src-tauri/resources/adb/mac/adb_x86` is absent
- **THEN** staging SHALL throw `Required ADB binary not found: <path>` and abort

#### Scenario: Single universal artifact
- **WHEN** the release build completes on macOS
- **THEN** the produced artifact SHALL contain both `adb_arm` and `adb_x86` regardless of which Rust target was compiled

### Requirement: Runtime architecture selection
`get_adb_path` on macOS SHALL select the bundled ADB binary whose name matches the running host architecture (`aarch64` -> `adb_arm`, `x86_64` -> `adb_x86`). If the matching binary is missing, it SHALL fall back to the other architecture's binary (transparently translated by Rosetta 2 on Apple Silicon) and emit a WARN log naming both the missing native binary and the fallback. If neither binary exists, it SHALL return an error naming the primary path and the attempted fallback.

#### Scenario: Native binary present
- **WHEN** `get_adb_path` runs on `aarch64` and `adb_arm` exists
- **THEN** the returned path SHALL be `resources-staged/mac/adb_arm`

#### Scenario: Rosetta fallback
- **WHEN** the host architecture's native binary is absent but the other architecture's binary exists
- **THEN** the other binary SHALL be returned and a WARN log mentioning "Rosetta" SHALL be emitted

#### Scenario: Neither binary present
- **WHEN** neither `adb_arm` nor `adb_x86` exists in the staged directory
- **THEN** `get_adb_path` SHALL return an error of the form `ADB not found at: <primary> (also tried fallback '<other>')`

#### Scenario: Unsupported platform
- **WHEN** `get_adb_path` is compiled for neither Windows nor macOS
- **THEN** it SHALL return `Unsupported platform: ADB path resolution only supports Windows and macOS`

### Requirement: Resource directory resolution
The resources base directory SHALL be resolved by preferring Tauri's `resource_dir()` when it is non-empty, not equal to the `"unknown path"` placeholder, and contains a `resources-staged/` child. When that fails, resolution SHALL derive the base from `std::env::current_exe()`: first `<exe_dir>/resources-staged` (raw cargo binary layout), then `<exe_dir>/../Resources/resources-staged` (`.app` bundle layout). The first candidate whose `resources-staged/` directory exists SHALL win. If no candidate exists, the Tauri-provided path (or its error) SHALL be returned so the caller surfaces a clear "ADB not found at ..." message.

#### Scenario: Canonical Tauri resource dir
- **WHEN** `resource_dir()` returns a real path containing `resources-staged/`
- **THEN** that path SHALL be used as the resources base

#### Scenario: Direct launch from Contents/MacOS/
- **WHEN** `resource_dir()` returns the `"unknown path"` placeholder and the executable is inside `Contents/MacOS/` of a `.app` bundle
- **THEN** the resources base SHALL resolve to `Contents/Resources` (where `resources-staged/` exists)

#### Scenario: Raw cargo binary
- **WHEN** the executable is `target/release/voboost-install` and `resource_dir()` is unusable
- **THEN** the resources base SHALL resolve to the executable's own directory (where `./resources-staged/` exists)

#### Scenario: Unresolvable layout
- **WHEN** no candidate path contains a `resources-staged/` directory
- **THEN** the Tauri-provided path or error SHALL be returned unchanged, producing a meaningful "ADB not found" error downstream
