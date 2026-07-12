## Purpose
Constrain ADB command execution in voboost-install to a fixed whitelist and safely transport compound shell scripts through `adb shell` so device-side scripts are not split on whitespace during provisioning.

## Requirements

### Requirement: Whitelist enforcement
The system SHALL validate the first element of the `args` vector against the `ALLOWED_COMMANDS` whitelist before any ADB subprocess is spawned. The allowed set SHALL be exactly: `start-server`, `devices`, `wait-for-device`, `root`, `remount`, `disable-verity`, `install`, `uninstall`, `shell`, `reboot`, `push`.

#### Scenario: Empty argument vector
- **WHEN** `execute_adb` is invoked with an empty `args` vector
- **THEN** validation SHALL fail with `No command provided` and no subprocess SHALL run

#### Scenario: Disallowed command
- **WHEN** `args[0]` is not a member of `ALLOWED_COMMANDS` (e.g. `pull`)
- **THEN** validation SHALL fail with `Command '<name>' is not allowed` and no subprocess SHALL run

#### Scenario: Allowed command
- **WHEN** `args[0]` is a member of `ALLOWED_COMMANDS`
- **THEN** the command SHALL proceed to device targeting and execution

#### Scenario: push permitted
- **WHEN** `args[0]` is `push`
- **THEN** the command SHALL be accepted, because `push` is in the whitelist for provisioning

### Requirement: Device targeting
When `device_serial` is `Some(serial)`, `execute_adb` SHALL prepend `-s <serial>` to the ADB argument vector so the command targets a specific device.

#### Scenario: Serial provided
- **WHEN** `device_serial` is `Some("ABC123")`
- **THEN** the spawned command SHALL be `adb -s ABC123 <args...>`

#### Scenario: Serial omitted
- **WHEN** `device_serial` is `None`
- **THEN** no `-s` flag SHALL be emitted and `adb` SHALL use its default device selection

### Requirement: Shell-script quoting for `sh -c <script>`
`execute_adb` SHALL pass `args` through `quote_shell_scripts`, which SHALL detect a `-c` flag immediately followed by a script argument and single-quote that script when it contains any shell metacharacter from the set: space, tab, `&`, `|`, `;`, `>`, `<`, `(`, `)`, `$`, backtick, `*`, `?`, `"`, `'`. The detection SHALL apply to the `-c` flag regardless of the preceding tokens (covering `sh -c <script>` and `su 0 sh -c <script>`).

#### Scenario: Compound script after `su 0 sh -c`
- **WHEN** `args` contains `shell su 0 sh -c "mkdir -p /data/x && chown root:root /data/x"`
- **THEN** the script SHALL be emitted as `'mkdir -p /data/x && chown root:root /data/x'`

#### Scenario: Script with no metacharacters
- **WHEN** the token following `-c` contains no metacharacter (e.g. `true`)
- **THEN** the script SHALL be left unmodified

#### Scenario: Argument vector without `-c`
- **WHEN** `args` contains no `-c` flag (e.g. `shell setenforce 0`)
- **THEN** the vector SHALL be returned unchanged

### Requirement: Single-quote wrapping idiom
The system SHALL wrap quoting-required scripts with single quotes and escape embedded single quotes using the `'\''` idiom. A script that already starts and ends with a single quote (length >= 2) SHALL be treated as already quoted and SHALL NOT be double-wrapped.

#### Scenario: Plain script wrapped
- **WHEN** `shell_quote_single` receives `mkdir -p /data/voboost`
- **THEN** it SHALL return `'mkdir -p /data/voboost'`

#### Scenario: Embedded single quote
- **WHEN** `shell_quote_single` receives `grep -qF '# >>> voboost' /x`
- **THEN** it SHALL return `'grep -qF '\''# >>> voboost'\'' /x'`

#### Scenario: Already-quoted script
- **WHEN** `shell_quote_single` receives `'already'`
- **THEN** it SHALL return `'already'` unchanged

### Requirement: Execution logging and result
`execute_adb` SHALL log the command string before execution, log success or failure (with stderr) after execution, and return a `CommandResult` containing `success`, `exit_code`, `stdout`, and `stderr`.

#### Scenario: Successful command
- **WHEN** the subprocess exits with status 0
- **THEN** `result.success` SHALL be `true`, `exit_code` SHALL be `Some(0)`, and a SUCCESS log SHALL be emitted

#### Scenario: Failing command
- **WHEN** the subprocess exits non-zero
- **THEN** `result.success` SHALL be `false` and an ERROR log including `stderr` SHALL be emitted

### Requirement: Device enumeration
`get_devices` SHALL parse `adb devices -l` output and return devices with `serial`, `state`, and optional `model`/`product` fields. Filtering of state (e.g. `device` vs `unauthorized`) SHALL be performed by callers, not by `get_devices`.

#### Scenario: Authorized device
- **WHEN** `adb devices -l` reports a device with state `device`
- **THEN** `get_devices` SHALL return that device including model and product getprop lookups

#### Scenario: Unauthorized device
- **WHEN** `adb devices -l` reports a device with state `unauthorized`
- **THEN** `get_devices` SHALL return that device with its state as-is, without getprop enrichment

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
