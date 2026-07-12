#!/system/bin/sh
# verify-uninstall.sh — verify a voboost uninstall removed EVERYTHING.
#
# Run ON the device (under root) after `voboost-install --uninstall` + reboot:
#   adb push scripts/verify-uninstall.sh /data/local/tmp/
#   adb shell su 0 sh /data/local/tmp/verify-uninstall.sh
#
# Checks that NOTHING remains:
#   1. App package ru.voboost uninstalled
#   2. /data/voboost removed
#   3. /system/etc/init/voboost.rc removed
#   4. /data/user/0/ru.voboost removed
#   5. /data/data/ru.voboost removed
#   6. No voboost-inject process running
#
# Exit codes: 0 = all clean, 1 = something remains.
set -u

pass=0
fail=0

ok() { echo "[PASS] $*"; pass=$((pass+1)); }
no() { echo "[FAIL] $*"; fail=$((fail+1)); }

echo "=== Voboost Uninstall Verification ==="

# 1. App package
if pm list packages ru.voboost 2>/dev/null | grep -q 'ru.voboost'; then
  no "app package ru.voboost still installed"
else
  ok "app package ru.voboost removed"
fi

# 2. /data/voboost
if [ -e /data/voboost ]; then
  no "/data/voboost still exists"
else
  ok "/data/voboost removed"
fi

# 3. Init hook
if [ -f /system/etc/init/voboost.rc ]; then
  no "init hook /system/etc/init/voboost.rc still exists"
else
  ok "init hook /system/etc/init/voboost.rc removed"
fi

# 4. App zone
if [ -e /data/user/0/ru.voboost ]; then
  no "/data/user/0/ru.voboost still exists"
else
  ok "/data/user/0/ru.voboost removed"
fi

# 5. App data
if [ -e /data/data/ru.voboost ]; then
  no "/data/data/ru.voboost still exists"
else
  ok "/data/data/ru.voboost removed"
fi

# 6. No daemon process
if pgrep -f /data/voboost/voboost-inject >/dev/null 2>&1; then
  no "voboost-inject process still running"
else
  ok "no voboost-inject process"
fi

echo ""
echo "=== Results: $pass passed, $fail failed ==="
if [ "$fail" -eq 0 ]; then
  echo "UNINSTALL CLEAN — nothing remains"
  exit 0
else
  echo "UNINSTALL INCOMPLETE — something remains"
  exit 1
fi
