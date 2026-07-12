# Change: unify-apk-cache-naming

## Proposal

### Why
`download_apk` writes the APK to a temp file named after the final URL path segment (e.g. `voboost.apk`), while `check_existing_apk` looks for `voboost-<version>.apk`. The two names never match, so the cached-APK reuse path is effectively dead: every install re-downloads even when a verified copy already exists on disk. This violates the intent of the `release-manifest` spec's "Cached APK reuse" requirement.

### What
Unify the temp-file naming so `download_apk` writes to the same version-scoped path that `check_existing_apk` reads. Concretely:

- `download_apk(url, expected_hash, version)` SHALL write the streamed body to `voboost-<version>.apk` in `std::env::temp_dir()` (replacing the previous "final URL path segment" naming).
- `check_existing_apk(version, expected_hash)` is unchanged: it already looks for `voboost-<version>.apk`.
- The frontend `downloadApk` wrapper SHALL pass the selected release's `version` to the command.

### Impact
- The cache becomes effective: a second run with the same version + hash skips the download.
- The "Streaming download with progress" requirement is amended: the temp-file name is now version-scoped, not URL-segment-derived. All other behavior (HTTPS-only, streaming, progress events, SHA256 verification, partial-file cleanup) is unchanged.
- No breaking change to the public Tauri command surface beyond the added `version` argument.

## Design

The fix is localized to `download_apk` and its frontend wrapper:

1. **Rust** (`src-tauri/src/commands/download.rs`): add a `version: String` parameter to `download_apk`; derive the temp file name as `format!("voboost-{}.apk", version)`; keep the flush/sync/hash/cleanup logic intact.
2. **TypeScript** (`src/services/releases.ts`): add a `version` parameter to `downloadApk` and forward it to `invoke('download_apk', { url, expectedHash, version })`.
3. **Hook** (`src/hooks/useDownload.ts`): pass `release.version` to `downloadApk`.
4. **Spec** (`openspec/specs/release-manifest/spec.md`): amend the "Streaming download with progress" requirement to state the temp file is named `voboost-<version>.apk`; add a scenario tying the download name to the cache name.

No other commands, scenarios, or specs are touched.
