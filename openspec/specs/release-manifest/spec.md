## Purpose
Fetch and parse a remote `releases.json` manifest describing available Voboost APK releases, then download and integrity-verify a release artifact. The manifest schema also embeds optional install/uninstall scenario step maps keyed by release id.

## Requirements

### Requirement: ReleasesManifest schema
`ReleasesManifest` SHALL deserialize (camelCase) with a required `schemaVersion: u32` and a required `releases: Vec<Release>`, plus an optional `scenarios: Scenarios`. Each `Release` SHALL expose required `version: String`, `channel: String`, `releaseDate: String`, `downloadUrl: String`, `sha256: String`, `size: u64`, and optional `minAndroidVersion: Option<u32>`, `changelog: Option<Changelog>` (with optional `en`/`ru`), `installScenario: Option<String>`, `uninstallScenario: Option<String>`. A single APK artifact per release SHALL be referenced by `downloadUrl` (no multi-artifact support).

#### Scenario: schema version 2 with scenarios
- **WHEN** the manifest declares `schemaVersion: 2` and supplies `scenarios`
- **THEN** `scenarios.install` and `scenarios.uninstall` SHALL each be optional `HashMap<String, Vec<StepDefinition>>` keyed by release scenario id

#### Scenario: schema version 1 legacy
- **WHEN** the manifest omits `scenarios` or a release omits `installScenario`/`uninstallScenario`
- **THEN** the manifest SHALL still deserialize and scenario resolution SHALL fall back to local config files

### Requirement: Manifest source URL
The manifest URL SHALL be the `RELEASES_URL` environment variable if set at build time, otherwise the default `https://raw.githubusercontent.com/voboost/voboost-install/main/releases.json`.

#### Scenario: build-time override
- **WHEN** `RELEASES_URL` is set when compiling
- **THEN** `get_releases_url` SHALL return that value
- **WHEN** `RELEASES_URL` is unset
- **THEN** `get_releases_url` SHALL return the GitHub raw default

### Requirement: Remote manifest fetch
`fetch_releases` SHALL GET the source URL via `reqwest` and deserialize the response body into `ReleasesManifest`.

#### Scenario: fetch failure
- **WHEN** the HTTP request or JSON parse fails
- **THEN** `fetch_releases` SHALL return an `Err` string naming the failure (`Failed to fetch releases` / `Failed to parse releases`)

### Requirement: Local manifest read
`read_local_releases(path)` SHALL read a file and parse it into `ReleasesManifest` without network access.

#### Scenario: local file parse error
- **WHEN** the file cannot be read or parsed
- **THEN** the command SHALL return an `Err` string (`Failed to read file` / `Failed to parse local releases JSON`)

### Requirement: HTTPS-only download
`download_apk(url, expected_hash, version)` SHALL reject any URL that does not start with `https://` before issuing a request.

#### Scenario: insecure URL rejected
- **WHEN** the supplied `url` does not start with `https://`
- **THEN** the command SHALL return `Err("Insecure URL rejected. HTTPS required.")` and SHALL NOT perform a request

### Requirement: Streaming download with progress
`download_apk(url, expected_hash, version)` SHALL stream the response body to a temp file named `voboost-<version>.apk` (the same name used by `check_existing_apk`), writing to `std::env::temp_dir()`, and emit a `download-progress` Tauri event with `downloaded`, `total` (from `content_length`, else 0), and `percentage` on each chunk. The file handle SHALL be flushed and synced before the SHA256 is computed. Any error after the file is created SHALL remove the partial temp file.

#### Scenario: total size unknown
- **WHEN** the response has no `content_length`
- **THEN** `total` SHALL be 0 and `percentage` SHALL be 0.0

#### Scenario: download name matches cache name
- **WHEN** `download_apk` is invoked with `version = "1.2.3"`
- **THEN** the temp file SHALL be `voboost-1.2.3.apk` so that a subsequent `check_existing_apk("1.2.3", <hash>)` finds it

### Requirement: SHA256 verification
After streaming completes, `download_apk` SHALL compute the lowercase-hex SHA256 of the downloaded file (buffered at 8192 bytes) and compare it to `expected_hash`.

#### Scenario: hash mismatch
- **WHEN** the computed hash differs from `expected_hash`
- **THEN** the command SHALL delete the temp file and return `Err` with both expected and actual hashes
#### Scenario: hash match
- **WHEN** the computed hash equals `expected_hash`
- **THEN** the command SHALL return `Ok` with the absolute temp file path

### Requirement: Cached APK reuse
`check_existing_apk(version, expected_hash)` SHALL look for `voboost-<version>.apk` in `std::env::temp_dir()`.

#### Scenario: cache hit
- **WHEN** the file exists and its SHA256 equals `expected_hash`
- **THEN** the command SHALL return `Ok(Some(path))` without downloading
#### Scenario: cache miss or corruption
- **WHEN** the file is absent, its hash mismatches, or reading fails
- **THEN** the command SHALL delete the file (if present) and return `Ok(None)`
