# Change: universal-mac-adb

## Why
A single macOS build of voboost-install must run natively on both Apple Silicon (arm64) and Intel (x86_64) hosts without producing two separate per-arch artifacts. Additionally, headless CLI invocations that launch the executable directly from `Contents/MacOS/` (bypassing LaunchServices) must still be able to locate the bundled ADB binary, because Tauri's `resource_dir()` returns a non-resolvable placeholder in that launch mode.

## What Changes
- Stage **both** macOS ADB architectures (`adb_arm` and `adb_x86`) into every macOS build instead of choosing one at build time.
- Select the matching architecture at **runtime** via `std::env::consts::ARCH`, with a Rosetta-based fallback to the other binary if the native one is missing.
- Resolve the resources directory from the executable location when Tauri's resource dir is unavailable, so headless/direct-launch modes find ADB.

## Status
RETROACTIVE. The code, build scripts, staged binaries, and documentation are already implemented in the uncommitted working tree. This change brings them under spec; the only remaining action is the commit and OpenSpec validation.
