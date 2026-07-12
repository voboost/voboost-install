# Tasks — unify-apk-cache-naming

## 1. Spec
- [x] Amend `release-manifest` spec: `download_apk` takes `version`, writes `voboost-<version>.apk`, flushes/syncs before hash, cleans up partial file on error.
- [x] Add scenario "download name matches cache name".
- [x] Apply spec delta to canonical `openspec/specs/release-manifest/spec.md`.
- [x] Archive change to `openspec/changes/archive/2026-07-04-unify-apk-cache-naming/`.

## 2. Rust
- [x] `src-tauri/src/commands/download.rs`: added `version: String` param to `download_apk`; file name is `format!("voboost-{}.apk", version)`; flush/sync/hash/cleanup intact.

## 3. TypeScript
- [x] `src/services/releases.ts`: added `version` param to `downloadApk`; forwards to `invoke('download_apk', { url, expectedHash, version })`.
- [x] `src/hooks/useDownload.ts`: passes `release.version` to `downloadApk`.
- [x] `src/screens/DownloadScreen/DownloadScreen.tsx`: passes `release.version` to `downloadApk`; fixed pre-existing `catch {` → `catch (err) {` bug.

## 4. Validate
- [x] `npx @fission-ai/openspec validate unify-apk-cache-naming --strict` → valid
- [x] `npx @fission-ai/openspec validate --specs --strict` → 5 passed
- [x] `cargo test` → 23 passed
- [x] `npm run typecheck` → clean
- [x] `npx vitest run` → 15 passed
