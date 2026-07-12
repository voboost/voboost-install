#!/bin/sh
# full-cycle-test.sh — full uninstall → verify → install → verify cycle.
#
# Run from the HOST (macOS) against a connected device:
#   cd voboost-install
#   sh scripts/full-cycle-test.sh
#
# Prerequisites:
#   - Device connected via adb, rooted (adb root + adb remount)
#   - voboost APK built: ../voboost/build/outputs/apk/release/voboost.apk
#   - voboost-inject binary: ../voboost-inject/build-android/src/voboost-inject
#   - voboost-install binary: src-tauri/target/release/voboost-install
#   - Agents: ../voboost-inject/test/fixtures/agents
#   - Manifest: ../voboost-inject/test/fixtures/manifest.json + .sig
#   - Release key: config/release-public.pem
#
# The script reboots the device twice (uninstall reboot + install may reboot).
# Total time: ~5-10 min depending on device boot time.
set -eu

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
INSTALLER="$REPO_DIR/src-tauri/target/release/voboost-install"
VOBOOST_APK="$REPO_DIR/../voboost/build/outputs/apk/release/voboost.apk"
DAEMON_BIN="$REPO_DIR/../voboost-inject/build-android/src/voboost-inject"
AGENTS_DIR="$REPO_DIR/../voboost-inject/test/fixtures/agents"
MANIFEST="$REPO_DIR/../voboost-inject/test/fixtures/manifest.json"
MANIFEST_SIG="$REPO_DIR/../voboost-inject/test/fixtures/manifest.sig"
RELEASE_KEY="$REPO_DIR/config/release-public.pem"
VERIFY_INSTALL="$REPO_DIR/scripts/verify-install.sh"
VERIFY_UNINSTALL="$REPO_DIR/scripts/verify-uninstall.sh"

log() { echo "[full-cycle] $*"; }

# --- prerequisites ---
log "Checking prerequisites..."
for f in "$INSTALLER" "$VOBOOST_APK" "$DAEMON_BIN" "$AGENTS_DIR" "$MANIFEST" "$MANIFEST_SIG" "$RELEASE_KEY"; do
  [ -e "$f" ] || { echo "MISSING: $f" >&2; exit 2; }
done
log "All prerequisites present."

# --- adb root + remount ---
log "adb root + remount..."
adb root >/dev/null 2>&1 || true
adb remount >/dev/null 2>&1 || true
adb shell "su 0 setenforce 0" 2>/dev/null || true

# --- 1. Uninstall ---
log "Step 1: Uninstall..."
"$INSTALLER" --uninstall --lang en 2>&1 | tail -5
log "Uninstall done. Waiting for reboot..."
adb wait-for-device
for i in $(seq 1 60); do
  boot=$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
  [ "$boot" = "1" ] && break
  sleep 2
done
log "Device booted after uninstall."

# --- 2. Verify uninstall ---
log "Step 2: Verify uninstall..."
adb push "$VERIFY_UNINSTALL" /data/local/tmp/verify-uninstall.sh >/dev/null 2>&1
if adb shell "su 0 sh /data/local/tmp/verify-uninstall.sh" 2>&1; then
  log "UNINSTALL CLEAN."
else
  log "UNINSTALL INCOMPLETE — something remains."
  exit 1
fi

# --- 3. Install ---
log "Step 3: Fresh install..."
adb root >/dev/null 2>&1 || true
adb remount >/dev/null 2>&1 || true
adb shell "su 0 setenforce 0" 2>/dev/null || true
"$INSTALLER" \
  --install "$VOBOOST_APK" \
  --daemon-bin "$DAEMON_BIN" \
  --agents-dir "$AGENTS_DIR" \
  --manifest "$MANIFEST" \
  --manifest-sig "$MANIFEST_SIG" \
  --release-key "$RELEASE_KEY" \
  --lang en 2>&1 | tail -5
log "Install done."

# --- 4. Verify install ---
log "Step 4: Verify install..."
adb push "$VERIFY_INSTALL" /data/local/tmp/verify-install.sh >/dev/null 2>&1
if adb shell "su 0 sh /data/local/tmp/verify-install.sh" 2>&1; then
  log "INSTALL VERIFIED — all checks pass."
  log "=== FULL CYCLE PASS ==="
  exit 0
else
  log "INSTALL VERIFICATION FAILED."
  log "=== FULL CYCLE FAIL ==="
  exit 1
fi
