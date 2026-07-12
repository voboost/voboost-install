## MODIFIED Requirements

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
