#!/usr/bin/env bash
# publish-release.sh — upsert a release entry into the unified OTA manifest
# and re-sign it with the release ed25519 private key.
#
# This repo (voboost-install) is the source of truth for the unified OTA
# manifest consumed by both the voboost Android app and the voboost-install
# desktop installer. See plans/ota-unified-github-manifest.md (in
# voboost-inject) for the full design.
#
# Usage:
#   scripts/publish-release.sh \
#     --component <app|inject> \
#     --track <dev|testing|production> \
#     --version <semver> \
#     --apk <path-to-apk> \
#     [--released-at <YYYY-MM-DD>]   # default: today (UTC)
#     [--changelog-en <text>] \
#     [--changelog-ru <text>] \
#     [--min-android <N>]            # default: 28
#     [--install-scenario <key>]     # default: v1
#     [--uninstall-scenario <key>]   # default: v1
#     [--remove]                     # remove the entry instead of upserting
#
# The manifest is written to releases/manifest.json and signed to
# releases/manifest.sig (detached ed25519 over the exact manifest bytes).
#
# For local testing, set the client's manifestUrl to:
#   file:///abs/path/to/voboost-install/releases/manifest.json
# (the .sig is derived by replacing .json with .sig).
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST="$REPO_DIR/releases/manifest.json"
SIG="$REPO_DIR/releases/manifest.sig"
KEY="$REPO_DIR/config/release-private.pem"

component=""
track=""
version=""
apk=""
released_at=""
changelog_en=""
changelog_ru=""
min_android="28"
install_scenario="v1"
uninstall_scenario="v1"
remove=0

while [ $# -gt 0 ]; do
  case "$1" in
    --component) component="$2"; shift 2 ;;
    --track) track="$2"; shift 2 ;;
    --version) version="$2"; shift 2 ;;
    --apk) apk="$2"; shift 2 ;;
    --released-at) released_at="$2"; shift 2 ;;
    --changelog-en) changelog_en="$2"; shift 2 ;;
    --changelog-ru) changelog_ru="$2"; shift 2 ;;
    --min-android) min_android="$2"; shift 2 ;;
    --install-scenario) install_scenario="$2"; shift 2 ;;
    --uninstall-scenario) uninstall_scenario="$2"; shift 2 ;;
    --remove) remove=1; shift ;;
    -h|--help)
      sed -n '2,30p' "$0"; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

# Validate required args.
[ -n "$component" ] || { echo "publish-release: --component <app|inject> required" >&2; exit 2; }
[ -n "$track" ]     || { echo "publish-release: --track <dev|testing|production> required" >&2; exit 2; }
[ -n "$version" ]   || { echo "publish-release: --version <semver> required" >&2; exit 2; }
case "$component" in app|inject) ;; *) echo "publish-release: component must be app|inject" >&2; exit 2 ;; esac
case "$track" in dev|testing|production) ;; *) echo "publish-release: track must be dev|testing|production" >&2; exit 2 ;; esac

[ -f "$KEY" ] || { echo "publish-release: private key not found at $KEY" >&2; exit 2; }
[ -f "$MANIFEST" ] || { echo "publish-release: manifest not found at $MANIFEST" >&2; exit 2; }

# Default releasedAt = today (UTC).
[ -n "$released_at" ] || released_at="$(date -u +%Y-%m-%d)"

# Compute sha256 + size of the APK (skip if --remove).
sha=""
size=""
if [ "$remove" -eq 0 ]; then
  [ -n "$apk" ] || { echo "publish-release: --apk <path> required (or use --remove)" >&2; exit 2; }
  [ -f "$apk" ] || { echo "publish-release: APK not found: $apk" >&2; exit 2; }
  sha="$(openssl dgst -sha256 -hex "$apk" | awk '{ print $NF }')"
  size="$(stat -f%z "$apk" 2>/dev/null || stat -c%s "$apk" 2>/dev/null)"
fi

# Use python3 to upsert the JSON entry (keeps formatting stable + sorted keys).
python3 - "$MANIFEST" "$component" "$track" "$version" "$released_at" "$sha" "$size" "$min_android" "$install_scenario" "$uninstall_scenario" "$changelog_en" "$changelog_ru" "$remove" <<'PY'
import json, sys, datetime

(manifest, component, track, version, released_at, sha, size,
 min_android, install_scenario, uninstall_scenario,
 changelog_en, changelog_ru, remove) = sys.argv[1:]

with open(manifest, "r", encoding="utf-8") as f:
    doc = json.load(f)

doc["generatedAt"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
releases = doc.setdefault("releases", [])

# Find existing entry by (component, track) and replace or remove.
idx = next((i for i, r in enumerate(releases)
            if r.get("component") == component and r.get("track") == track), None)

if remove == "1":
    if idx is not None:
        releases.pop(idx)
    else:
        print(f"publish-release: no entry to remove for {component}/{track}", file=sys.stderr)
        sys.exit(0)
else:
    entry = {
        "component": component,
        "track": track,
        "version": version,
        "releasedAt": released_at,
        "downloadUrl": "",  # filled by caller after gh release upload, or file:// for local
        "sha256": sha,
        "size": int(size),
        "minAndroidVersion": int(min_android),
    }
    if changelog_en or changelog_ru:
        entry["changelog"] = {}
        if changelog_en: entry["changelog"]["en"] = changelog_en
        if changelog_ru: entry["changelog"]["ru"] = changelog_ru
    if install_scenario: entry["installScenario"] = install_scenario
    if uninstall_scenario: entry["uninstallScenario"] = uninstall_scenario
    if idx is not None:
        # Preserve an existing downloadUrl if the new one is empty.
        if not entry["downloadUrl"] and releases[idx].get("downloadUrl"):
            entry["downloadUrl"] = releases[idx]["downloadUrl"]
        releases[idx] = entry
    else:
        releases.append(entry)

with open(manifest, "w", encoding="utf-8") as f:
    json.dump(doc, f, indent=2, ensure_ascii=False)
    f.write("\n")
PY

# Sign the manifest (detached ed25519, raw signature bytes).
openssl pkeyutl -sign -inkey "$KEY" -rawin -in "$MANIFEST" -out "$SIG"

echo "Wrote $MANIFEST"
echo "Wrote $SIG"
echo "Public key: $REPO_DIR/config/release-public.pem"
