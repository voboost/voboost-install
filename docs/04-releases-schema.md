# Unified OTA Manifest Schema (v1)

## Overview

The installer fetches available versions from a **signed** unified OTA
manifest hosted on GitHub. The manifest is a single document consumed by both
`voboost` (the Android app) and `voboost-install` (the desktop installer), so
both clients discover updates from the same source of truth.

The manifest is **ed25519-signed** (detached signature over the exact
`manifest.json` bytes). The installer verifies the signature against the
embedded `config/release-public.pem` before parsing the manifest, closing the
previous "unsigned manifest" gap.

## Hosting Location

### Manifest + signature

The unified manifest and its detached signature live in
`voboost-install/releases/` (the source-of-truth repo, per design §0.1):

```
voboost-install/releases/manifest.json
voboost-install/releases/manifest.sig
```

**Raw URLs** (GitHub raw, CDN-cached ~5 min — acceptable per design §0.6):

```
https://raw.githubusercontent.com/voboost/voboost-install/main/releases/manifest.json
https://raw.githubusercontent.com/voboost/voboost-install/main/releases/manifest.sig
```

### Local testing URLs

For local testing (design §0.3), the manifest URL accepts the `file://`
scheme so the fetch layer reads from disk instead of HTTP — no network, no
cache, instant updates on every write:

```
file:///path/to/voboost-install/releases/manifest.json
file:///path/to/voboost-install/releases/manifest.sig
```

### APK files

APK files are hosted as **GitHub Release assets** (not committed to the repo).
Each component repo tags a release (`voboost-v1.0.0-beta3`,
`voboost-inject-v1.0.0-beta3`) and uploads its APK as an asset. The manifest
references the asset download URLs. For local testing, APKs can also be
`file://` paths.

## Trust model

- **One ed25519 keypair** is the release signing key, generated and stored in
  `voboost-install/config/` (design §0.5). `release-public.pem` is committed
  (not secret); `release-private.pem` is gitignored and stored as a CI secret.
- The signature is a **raw 64-byte detached ed25519 signature** over the exact
  bytes of `manifest.json`, produced by:
  ```
  openssl pkeyutl -sign -inkey config/release-private.pem \
    -rawin -in releases/manifest.json -out releases/manifest.sig
  ```
- The installer embeds `config/release-public.pem` at build time via
  `include_bytes!` and verifies the signature before parsing. If verification
  fails, `fetch_releases` returns an error and no manifest is parsed.
- The signature URL is **derived** from the manifest URL by replacing `.json`
  with `.sig`, so only one config key (`MANIFEST_URL`) is needed.

## Schema (v1)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Voboost Unified OTA Manifest v1",
  "type": "object",
  "required": ["schemaVersion", "releases"],
  "properties": {
    "schemaVersion": {
      "type": "integer",
      "description": "Schema version for backward compatibility",
      "minimum": 1,
      "maximum": 1
    },
    "generatedAt": {
      "type": "string",
      "description": "Manifest generation timestamp (ISO 8601)",
      "format": "date-time"
    },
    "releases": {
      "type": "array",
      "description": "One entry per (component, track)",
      "items": { "$ref": "#/definitions/Release" }
    },
    "scenarios": { "$ref": "#/definitions/Scenarios" }
  },
  "definitions": {
    "Release": {
      "type": "object",
      "required": [
        "component", "track", "version", "releasedAt",
        "downloadUrl", "sha256", "size"
      ],
      "properties": {
        "component": {
          "type": "string",
          "enum": ["app", "inject"],
          "description": "Which artifact the entry describes. Orthogonal to track."
        },
        "track": {
          "type": "string",
          "enum": ["dev", "testing", "production"],
          "description": "Release track, filtered client-side by a setting."
        },
        "version": {
          "type": "string",
          "description": "Semantic version",
          "examples": ["1.0.0", "1.0.0-beta3"]
        },
        "releasedAt": {
          "type": "string",
          "format": "date",
          "examples": ["2026-07-04"]
        },
        "downloadUrl": {
          "type": "string",
          "description": "Full URL to the APK (https:// or file:// for testing)"
        },
        "sha256": {
          "type": "string",
          "pattern": "^[a-f0-9]{64}$",
          "description": "SHA256 of the APK (lowercase hex)"
        },
        "size": {
          "type": "integer",
          "minimum": 0,
          "description": "APK file size in bytes"
        },
        "minAndroidVersion": {
          "type": "integer",
          "default": 28,
          "minimum": 21
        },
        "changelog": {
          "type": "object",
          "properties": {
            "en": { "type": "string" },
            "ru": { "type": "string" }
          }
        },
        "installScenario": {
          "type": "string",
          "description": "Key into scenarios.install (e.g. v1)"
        },
        "uninstallScenario": {
          "type": "string",
          "description": "Key into scenarios.uninstall (e.g. v1)"
        }
      }
    },
    "Scenarios": {
      "type": "object",
      "properties": {
        "install": {
          "type": "object",
          "additionalProperties": {
            "type": "array",
            "items": { "$ref": "#/definitions/StepDefinition" }
          }
        },
        "uninstall": {
          "type": "object",
          "additionalProperties": {
            "type": "array",
            "items": { "$ref": "#/definitions/StepDefinition" }
          }
        }
      }
    },
    "StepDefinition": {
      "type": "object",
      "properties": {
        "do": { "type": "string" },
        "title": { "type": "object", "additionalProperties": { "type": "string" } },
        "command": { "type": "array", "items": { "type": "string" } },
        "args": { "type": "array", "items": { "type": "string" } },
        "var": { "type": "object", "additionalProperties": { "type": "string" } },
        "fatal": { "type": "boolean", "default": true },
        "retry_count": { "type": "integer", "default": 0, "minimum": 0 },
        "retry_delay_secs": { "type": "integer", "default": 0, "minimum": 0 }
      }
    }
  }
}
```

## Example manifest.json

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-07-05T06:00:00Z",
  "releases": [
    {
      "component": "app",
      "track": "production",
      "version": "1.0.0-beta2",
      "releasedAt": "2026-07-04",
      "downloadUrl": "https://github.com/voboost/voboost/releases/download/v1.0.0-beta2/voboost-1.0.0-beta2.apk",
      "sha256": "<lowercase hex 64>",
      "size": 15728640,
      "minAndroidVersion": 28,
      "changelog": { "en": "...", "ru": "..." },
      "installScenario": "v1",
      "uninstallScenario": "v1"
    },
    {
      "component": "app",
      "track": "testing",
      "version": "1.0.0-beta3",
      "releasedAt": "2026-07-05",
      "downloadUrl": "https://github.com/voboost/voboost/releases/download/v1.0.0-beta3/voboost-1.0.0-beta3.apk",
      "sha256": "...",
      "size": 15800000,
      "minAndroidVersion": 28,
      "changelog": { "en": "...", "ru": "..." }
    },
    {
      "component": "inject",
      "track": "production",
      "version": "1.0.0-beta2",
      "releasedAt": "2026-07-04",
      "downloadUrl": "https://github.com/voboost/voboost-inject/releases/download/v1.0.0-beta2/voboost-inject-1.0.0-beta2.apk",
      "sha256": "...",
      "size": 15000000,
      "minAndroidVersion": 28,
      "changelog": { "en": "...", "ru": "..." }
    }
  ],
  "scenarios": {
    "install": {
      "v1": [ { "do": "root" }, { "do": "install-apk" } ]
    },
    "uninstall": {
      "v1": [ { "do": "uninstall-apk" } ]
    }
  }
}
```

## Component / track semantics

| Field | Values | Meaning |
|---|---|---|
| `component` | `app` \| `inject` | Which artifact the entry describes. The installer only installs `app`; the daemon is provisioned via `--daemon-bin` for the initial install and updated OTA by the app. |
| `track` | `dev` \| `testing` \| `production` | Release track, filtered client-side by a setting (default `production`). A client on `production` never sees `dev`/`testing` entries. |

`component` and `track` are **orthogonal**: a component may appear under
multiple tracks (e.g. `app` under both `testing` and `production` with
different versions). This replaces the old `channel: stable|beta` (installer)
and `channel: app|core` (app) vocabulary collision (design §1.2.4).

## Configurable URL

The manifest URL is configurable at build time via the `MANIFEST_URL`
environment variable (design §3.5.2). The signature URL is derived by
replacing `.json` with `.sig`, or overridden explicitly via `MANIFEST_SIG_URL`.

```bash
# Production (default)
cargo build

# Local testing with file://
MANIFEST_URL=file:///path/to/voboost-install/releases/manifest.json \
MANIFEST_SIG_URL=file:///path/to/voboost-install/releases/manifest.sig \
cargo build
```

Both `https://` and `file://` schemes are supported in the fetch layer:
`https://` → `reqwest`; `file://` → `std::fs::read`.

## TypeScript types

```typescript
// src/types/releases.ts

export type ReleaseComponent = 'app' | 'inject';
export type ReleaseTrack = 'dev' | 'testing' | 'production';

export interface Release {
    component: ReleaseComponent;
    track: ReleaseTrack;
    version: string;
    releasedAt: string;
    downloadUrl: string;
    sha256: string;
    size: number;
    minAndroidVersion?: number;
    changelog?: { en?: string; ru?: string };
    installScenario?: string;
    uninstallScenario?: string;
}

export interface ReleasesManifest {
    schemaVersion: number;
    generatedAt?: string;
    releases: Release[];
    scenarios?: Scenarios;
}
```

## Rust implementation

```rust
// src-tauri/src/commands/download.rs

const DEFAULT_MANIFEST_URL: &str =
    "https://raw.githubusercontent.com/voboost/voboost-install/main/releases/manifest.json";
const DEFAULT_MANIFEST_SIG_URL: &str =
    "https://raw.githubusercontent.com/voboost/voboost-install/main/releases/manifest.sig";

fn get_manifest_url() -> String {
    option_env!("MANIFEST_URL").unwrap_or(DEFAULT_MANIFEST_URL).to_string()
}

fn get_manifest_sig_url() -> String {
    option_env!("MANIFEST_SIG_URL").unwrap_or(DEFAULT_MANIFEST_SIG_URL).to_string()
}

#[tauri::command]
pub async fn fetch_releases() -> Result<ReleasesManifest, String> {
    let manifest_bytes = fetch_bytes(&get_manifest_url()).await?;
    let sig_bytes = fetch_bytes(&get_manifest_sig_url()).await?;
    verify_manifest_signature(&manifest_bytes, &sig_bytes)?;
    serde_json::from_slice(&manifest_bytes)
        .map_err(|e| format!("Failed to parse manifest: {}", e))
}
```

## Publishing a release

Use `scripts/publish-release.sh` (design §3.6):

1. Build the APK.
2. Compute `sha256` + `size` of the APK.
3. Load `releases/manifest.json`, upsert the entry (same `component`+`track`
   → replace), bump `generatedAt`.
4. Write `releases/manifest.json`, sign with `config/release-private.pem`
   → `releases/manifest.sig` (detached ed25519).
5. For production: `git commit` + `git push` (raw URL updates within ~5 min).
6. For local testing: no push needed — the `file://` URL points at the working
   copy, so the next client fetch sees the new manifest instantly.

## Backward compatibility

The unified schema is **v1** and replaces the old `releases.json` schema
entirely. The old `channel: stable|beta` (installer) and `channel: app|core`
(app) fields are removed; clients must migrate to `component` + `track`. The
old root `releases.json` file is deleted; the unified manifest in
`releases/manifest.json` is the single source of truth.
