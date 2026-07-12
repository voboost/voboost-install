# Voboost Releases — Unified OTA Manifest

This directory holds the **unified OTA manifest** consumed by both:

- **`voboost`** (Android app) — fetches the manifest periodically, verifies
  its ed25519 signature, and self-updates its own APK + stages the
  `voboost-inject` daemon APK for the daemon to self-update.
- **`voboost-install`** (desktop installer) — fetches the manifest to list
  available app versions for the operator to install/upgrade.

There is **no separate OTA server**. The manifest is a raw file on GitHub;
APKs are GitHub Release assets. For local testing, both can be `file://`
paths.

## Files

| File | Description |
|---|---|
| `manifest.json` | The unified signed manifest (schema v1). |
| `manifest.sig` | Detached ed25519 signature over the exact bytes of `manifest.json`. |
| `../config/release-public.pem` | The public half of the signing key (committed). |
| `../config/release-private.pem` | The private half (gitignored, CI secret). |

## Schema (v1)

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-07-05T06:29:00Z",
  "releases": [
    {
      "component": "app",
      "track": "testing",
      "version": "1.0.0-beta3",
      "releasedAt": "2026-07-05",
      "downloadUrl": "https://github.com/voboost/voboost/releases/download/v1.0.0-beta3/voboost-1.0.0-beta3.apk",
      "sha256": "<lowercase hex 64>",
      "size": 15728640,
      "minAndroidVersion": 28,
      "changelog": { "en": "...", "ru": "..." },
      "installScenario": "v1",
      "uninstallScenario": "v1"
    }
  ],
  "scenarios": { "install": { "v1": [...] }, "uninstall": { "v1": [...] } }
}
```

- **`component`** ∈ `{app, inject}` — which artifact (`app` = voboost APK,
  `inject` = voboost-inject daemon APK). There is no `installer` component
  (the installer does not self-update).
- **`track`** ∈ `{dev, testing, production}` — release track. Clients filter
  to their configured track.

## Publishing a release

```bash
# 1. Build the APK (in the component repo).
# 2. Upload it as a GitHub Release asset (or use a file:// path for local testing).
# 3. Upsert the manifest entry + re-sign:
scripts/publish-release.sh \
  --component app \
  --track testing \
  --version 1.0.0-beta3 \
  --apk /path/to/voboost-1.0.0-beta3.apk \
  --changelog-en "Fix X" \
  --changelog-ru "Исправление X"
```

The script computes `sha256` + `size`, upserts the entry (same
`component`+`track` → replace), bumps `generatedAt`, and writes
`manifest.sig` with `config/release-private.pem`.

After `--apk`, set the `downloadUrl` in `manifest.json` to the GitHub Release
asset URL (production) or a `file://` path (local testing). The script
preserves an existing `downloadUrl` if the new APK path is given without a
URL override (edit `manifest.json` directly to set the URL).

To remove an entry:

```bash
scripts/publish-release.sh --component app --track testing --version 1.0.0-beta3 --remove
```

## Client configuration

### Production (GitHub raw URL)

```
https://raw.githubusercontent.com/voboost/voboost-install/main/releases/manifest.json
```

CDN cache is ~5 min. The signature URL is derived by replacing `.json` with
`.sig`.

### Local testing (file://)

```
file:///abs/path/to/voboost-install/releases/manifest.json
```

No cache, instant updates on every write. APK `downloadUrl` entries can also
be `file://` paths for fully offline testing.

## Trust model

- One ed25519 keypair, generated and stored in `voboost-install/config/`.
- The **app** verifies `manifest.sig` against `release-public.pem` (bundled as
  an asset) before trusting any entry.
- The **installer** verifies `manifest.sig` against the same key (embedded at
  build time).
- The **daemon** does NOT verify this manifest — it re-verifies the staged
  APK's *embedded* `manifest.json`+`.sig` against its compiled-in
  `EMBEDDED_PUBKEY` (same key family). The unified manifest is the client's
  trust source for *which* APK to download; the daemon's embedded manifest is
  its trust source for *the APK bytes it installs*.
