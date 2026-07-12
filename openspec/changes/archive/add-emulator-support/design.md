## D1. Why `fatal: false` on `remount`/`write-init-hook` instead of emulator-aware variants?
The task considered two approaches: (a) new `emulator-remount`/`emulator-write-init-hook` wrapper commands that check `ro.kernel.qemu`, or (b) simply set `fatal: false` on the existing steps plus an `emulator-setup` no-op-on-real-device step. Approach (b) is simpler and safe because on a real device both steps succeed — `fatal: false` only changes behavior when the step actually fails, which only happens on the emulator. Adding wrapper commands would duplicate the `remount`/`write-init-hook` templates and the `ro.kernel.qemu` check, with no behavioral gain.

## D2. Why is `emulator-setup` a no-op on a real device?
The step runs `adb shell getprop ro.kernel.qemu` and only acts when the value is `1`. On a real device the property is empty, so the step exits 0 without running `setenforce`. This keeps the production provision scenario unchanged (the existing `setenforce` step already handles SELinux on real devices).

## D3. Why does `emulator-setup` run `setenforce 0` when a `setenforce` step already exists?
The existing `setenforce` step runs `shell setenforce 0` as the adb shell user. Under `adb root` on the emulator the shell user is root, so it works, but `emulator-setup` runs `su 0 setenforce 0` explicitly to be robust against the shell user not being root (e.g. when `adb root` is unavailable). It is idempotent and non-fatal, so running both is harmless.

## D4. Why does the daemon still start via `start-daemon` on the emulator?
The `start-daemon` step runs `/data/voboost/start.sh`, which uses `nohup /data/voboost/voboost-inject >>logs/startup.log 2>&1 &`. This does not depend on the init hook or `/system` being writable — it just execs the daemon binary on `/data`. So on the emulator the daemon is started manually by `start-daemon`, exactly matching the production start timing (the production init hook starts the service `on property:sys.boot_completed=1`, which is no later than a host-driven start). `emulator-setup` does NOT start the daemon; that remains the responsibility of `start-daemon` so the provision scenario has a single daemon-start step for both real devices and the emulator.

## D5. Why place `emulator-setup` after `write-init-hook` and before `install-apk`?
`setenforce 0` must run before the daemon starts (at `start-daemon`, near the end of the scenario). Placing it right after `write-init-hook` keeps it early in the flow, after the existing `setenforce` step, and before any app/APK work. It is idempotent so its exact position between `setenforce` and `start-daemon` is not load-bearing.

## D6. Why keep stub-APK install and `inject.json` creation in the Makefile?
The `com.qinggan.*` stub APKs and the default `inject.json` are emulator-only test fixtures (the agents inject into stub packages that do not exist on a real device). They are not part of the production provision scenario and must not be added to `config-provision.json`. The Makefile installs them after `voboost-install --install` completes.
