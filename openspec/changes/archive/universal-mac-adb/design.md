# Design: universal-mac-adb

## Decision: bundle both macOS architectures in one build

### Considered options
1. **Two per-arch builds** (separate `aarch64` and `x86_64` artifacts). Rejected: doubles release artifacts, complicates distribution and auto-update, and forces users to pick the correct download. The release script already attempts both Rust target compilations; per-arch ADB staging on top would couple ADB selection to the compile target.
2. **A single macOS universal (fat) Mach-O ADB binary.** Rejected: requires `lipo`-merging two third-party Google binaries and re-signs/strips the merged result; harder to keep in sync with upstream Platform Tools releases.
3. **Bundle both arches as separate files (`adb_arm`, `adb_x86`) and select at runtime.** Chosen. Each file stays a pristine upstream binary, individually `strip -x`'d. The Rust host picks the matching one via `std::env::consts::ARCH`; the other acts as a Rosetta fallback if the native file is missing. One artifact runs natively on either arch with no user choice and no `lipo` step.

### Trade-off
Disk footprint: both binaries (~6.2 MB + ~6.8 MB) ship in every macOS bundle. Accepted to gain a single universal artifact and a graceful corruption fallback.

## Decision: `current_exe()`-based resource resolution fallback

Tauri's `app.path().resource_dir()` is the canonical source, but on macOS it returns the placeholder `"unknown path"` when the binary is launched directly from `Contents/MacOS/` rather than through LaunchServices/`open`. Headless CLI modes invoke the executable exactly that way, so relying on `resource_dir()` alone would break ADB discovery there.

### Resolution strategy (in order)
1. Tauri `resource_dir()` if it is non-empty, not the `"unknown path"` placeholder, and actually contains `resources-staged/`.
2. `<exe_dir>/resources-staged` for the raw cargo binary layout (`target/release/voboost-install`).
3. `<exe_dir>/../Resources/resources-staged` for the `.app` bundle layout (`Contents/MacOS/`).
4. Whatever Tauri returned, so the caller's existence check yields a clear "ADB not found at ..." error rather than a silent wrong path.

The first candidate whose `resources-staged/` directory exists wins. This keeps the GUI (LaunchServices) path on the canonical resolver while making direct/headless launches robust.
