#!/system/bin/sh
# test-init-hook.sh — verify the voboost-inject init hook works on this device.
#
# Android init scans /system/etc/init/ on every release (9, 10, 11, 12, 13).
# On Android 9 the directory is typically empty, but init still scans it, so
# dropping voboost.rc there works. This script writes a throwaway test
# service, reboots, checks the service ran, and cleans up — so an operator
# can confirm the init-hook path is functional on their specific machine
# before relying on the production voboost-inject hook.
#
# Run ON the device (under root):
#   adb push test-init-hook.sh /data/local/tmp/
#   adb shell su 0 sh /data/local/tmp/test-init-hook.sh
#
# The script reboots the device once. After the reboot, re-run it with
# `--check` to read the result and clean up:
#   adb shell su 0 sh /data/local/tmp/test-init-hook.sh --check
#
# Exit codes: 0 = pass, 1 = fail, 2 = usage / precondition error.
set -u

HOOK_PATH=/system/etc/init/voboost-test.rc
MARKER=/data/local/tmp/voboost-init-hook-test.marker
LOG=/data/local/tmp/voboost-init-hook-test.log

log() { echo "[voboost-test] $*" >&2; }

# --- --check: read the marker left after the reboot and clean up -----------
if [ "${1:-}" = "--check" ]; then
    if [ ! -f "$MARKER" ]; then
        log "FAIL: marker $MARKER not found after reboot."
        log "The init hook did NOT start the test service."
        exit 1
    fi
    log "PASS: marker found. Init hook works on this device."
    log "Marker contents:"
    cat "$MARKER" >&2
    log "Service log:"
    cat "$LOG" 2>/dev/null >&2 || log "(no service log)"
    log "Cleaning up test hook and marker..."
    # /system may be read-only without remount; try, ignore failure.
    mount -o rw,remount /system 2>/dev/null || true
    rm -f "$HOOK_PATH" 2>/dev/null || true
    rm -f "$MARKER" "$LOG" 2>/dev/null || true
    mount -o ro,remount /system 2>/dev/null || true
    log "Done. Reboot to finalize cleanup."
    exit 0
fi

# --- preconditions ---------------------------------------------------------
if [ "$(id -u)" != "0" ]; then
    log "FAIL: must run as root (su 0)."
    exit 2
fi

sdk=$(getprop ro.build.version.sdk)
log "Android SDK: $sdk"
log "Init dir:   $(dirname "$HOOK_PATH")"

if [ ! -d "$(dirname "$HOOK_PATH")" ]; then
    log "FAIL: $(dirname "$HOOK_PATH") does not exist."
    log "On this device init may scan a different dir; aborting."
    exit 1
fi

# Ensure /system/etc/init/ is writable. On many Android 9 devices /system is
# part of the root / mount (already rw after `adb root` + `adb remount` from
# the host), so no on-device remount is needed. On devices with a separate
# /system mount, try remounting it. The touch test is the authoritative check.
init_dir=$(dirname "$HOOK_PATH")
if touch "$init_dir/.voboost-wtest" 2>/dev/null; then
    rm -f "$init_dir/.voboost-wtest"
    log "/system/etc/init/ is writable (root mount already rw)."
elif mount -o rw,remount /system 2>/dev/null && touch "$init_dir/.voboost-wtest" 2>/dev/null; then
    rm -f "$init_dir/.voboost-wtest"
    log "Remounted /system rw (on-device remount)."
elif mount -o rw,remount / 2>/dev/null && touch "$init_dir/.voboost-wtest" 2>/dev/null; then
    rm -f "$init_dir/.voboost-wtest"
    log "Remounted / rw (root mount, on-device remount)."
else
    log "FAIL: cannot write to $init_dir."
    log "Run `adb root` + `adb remount` from the host first, then retry."
    log "If that fails, /system may be read-only (verity on or superblock locked)."
    exit 1
fi

# Remove any stale marker/log from a previous run.
rm -f "$MARKER" "$LOG"

# Write a throwaway init service. It writes a marker on boot, then exits.
# Uses the same seclabel/shell-wrapper pattern as the production hook so
# the SELinux transition is exercised identically.
# IMPORTANT: the .rc file MUST be 644 (not 666) — Android init refuses to
# parse world-writable .rc files for security (see /init.rc header: "Do not
# create world writable files or directories"). A `cat >` on a fat/ext4
# mount creates 666 by default (umask 0), so chmod 644 explicitly.
cat > "$HOOK_PATH" <<'RC'
# >>> voboost-init-hook-test (do not edit)
service voboost-init-hook-test /system/bin/sh -c "echo ok > /data/local/tmp/voboost-init-hook-test.marker; date > /data/local/tmp/voboost-init-hook-test.log"
    class late_start
    user root
    group root
    seclabel u:r:shell:s0
    oneshot
    disabled

on property:sys.boot_completed=1
    start voboost-init-hook-test
# <<< voboost-init-hook-test
RC
chmod 644 "$HOOK_PATH" 2>/dev/null || true
restorecon "$HOOK_PATH" 2>/dev/null || true

mount -o ro,remount /system 2>/dev/null || true
log "Wrote test hook to $HOOK_PATH."
log "Rebooting in 3s to verify init starts the service..."
sleep 3
log "After reboot, re-run: sh $0 --check"
sync
reboot
