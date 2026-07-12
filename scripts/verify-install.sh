#!/system/bin/sh
# verify-install.sh — verify a voboost install is complete and healthy.
#
# Run ON the device (under root) after `voboost-install --install`:
#   adb push scripts/verify-install.sh /data/local/tmp/
#   adb shell su 0 sh /data/local/tmp/verify-install.sh
#
# Checks:
#   1. Daemon binary present + executable
#   2. Daemon process running
#   3. Daemon status: state=ready, not killed/panic
#   4. Init hook present with 644 permissions
#   5. App installed (ru.voboost)
#   6. App zone exists with inject.json + inject-status.json
#   7. release-public.pem present in app config
#   8. No status-write errors in daemon log
#   9. start.sh + stop.sh present
#
# Exit codes: 0 = all checks pass, 1 = one or more checks fail.
set -u

pass=0
fail=0

ok() { echo "[PASS] $*"; pass=$((pass+1)); }
no() { echo "[FAIL] $*"; fail=$((fail+1)); }

echo "=== Voboost Install Verification ==="

# 1. Daemon binary
if [ -x /data/voboost/voboost-inject ]; then
  ok "daemon binary present + executable"
else
  no "daemon binary missing or not executable (/data/voboost/voboost-inject)"
fi

# 2. Daemon process
if pgrep -f /data/voboost/voboost-inject >/dev/null 2>&1; then
  pid=$(pgrep -f /data/voboost/voboost-inject | head -1)
  ok "daemon running (PID $pid)"
else
  no "daemon not running"
fi

# 3. Daemon status
status_file=/data/user/0/ru.voboost/inject-status.json
if [ -f "$status_file" ]; then
  state=$(grep -o '"state" : "[^"]*"' "$status_file" | head -1 | cut -d'"' -f4)
  killed=$(grep -o '"killed" : [a-z]*' "$status_file" | head -1 | cut -d' ' -f3)
  panic=$(grep -o '"panic" : [a-z]*' "$status_file" | head -1 | cut -d' ' -f3)
  if [ "$state" = "ready" ] && [ "$killed" = "false" ] && [ "$panic" = "false" ]; then
    ok "daemon state=ready, killed=false, panic=false"
  else
    no "daemon state=$state killed=$killed panic=$panic (expected ready/false/false)"
  fi
else
  no "status file missing ($status_file)"
fi

# 4. Init hook
hook=/system/etc/init/voboost.rc
if [ -f "$hook" ]; then
  perms=$(stat -c %a "$hook" 2>/dev/null)
  if [ "$perms" = "644" ]; then
    ok "init hook present with 644 permissions"
  else
    no "init hook permissions=$perms (expected 644)"
  fi
else
  no "init hook missing ($hook)"
fi

# 5. App installed
if pm list packages ru.voboost 2>/dev/null | grep -q '^package:ru.voboost$'; then
  ok "app installed (ru.voboost)"
else
  no "app not installed (ru.voboost)"
fi

# 6. App zone
app_zone=/data/user/0/ru.voboost
if [ -d "$app_zone" ]; then
  if [ -f "$app_zone/inject.json" ]; then
    ok "app zone inject.json present"
  else
    no "app zone inject.json missing"
  fi
  if [ -f "$app_zone/inject-status.json" ]; then
    ok "app zone inject-status.json present"
  else
    no "app zone inject-status.json missing"
  fi
else
  no "app zone missing ($app_zone)"
fi

# 7. release-public.pem
pubkey=/data/data/ru.voboost/files/config/release-public.pem
if [ -f "$pubkey" ]; then
  ok "release-public.pem present"
else
  no "release-public.pem missing ($pubkey)"
fi

# 8. No status-write errors in daemon log
log_file=/data/voboost/logs/inject-$(date -u +%Y-%m-%d).log
if [ -f "$log_file" ]; then
  errors=$(grep -c "status write.*Failed\|No such file or directory" "$log_file" 2>/dev/null)
  if [ "$errors" = "0" ]; then
    ok "no status-write errors in daemon log"
  else
    no "$errors status-write errors in daemon log"
  fi
else
  ok "no daemon log yet (fresh start)"
fi

# 9. start.sh + stop.sh
if [ -x /data/voboost/start.sh ]; then
  ok "start.sh present + executable"
else
  no "start.sh missing or not executable"
fi
if [ -x /data/voboost/stop.sh ]; then
  ok "stop.sh present + executable"
else
  no "stop.sh missing or not executable"
fi

echo ""
echo "=== Results: $pass passed, $fail failed ==="
if [ "$fail" -eq 0 ]; then
  echo "ALL CHECKS PASS"
  exit 0
else
  echo "SOME CHECKS FAILED"
  exit 1
fi
