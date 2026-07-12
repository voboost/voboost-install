## Why
`voboost-install --install` (the provision scenario) cannot complete on the Android emulator (AVD `free`, API 28, arm64, `ro.kernel.qemu=1`) because two steps are fatal and always fail there:

- `remount` fails with `remount of the /superblock failed: Permission denied` — on this Apple Silicon host `adb remount` cannot make `/system` writable, and `-writable-system` forces a cold boot that never completes (documented in `voboost-inject/AGENTS.md`).
- `write-init-hook` fails because it appends to `/system/etc/init/voboost.rc`, which is read-only on the emulator.

Because the init hook cannot be installed, the daemon cannot be started by init on the emulator. The daemon must instead be started manually (the existing `start-daemon` step already does this via `/data/voboost/start.sh`, which uses `nohup` and works without init).

On a real device both steps must remain fatal (a failed `remount` or `write-init-hook` means the device is not properly set up). The emulator must therefore be detected at runtime so the two steps become non-fatal only there, while a real device keeps the strict behavior.

The `voboost-inject` Makefile target `emulator-run` currently provisions `/data/voboost` with raw `adb` commands, duplicating the provision logic that already lives in `config-provision.json`. Routing `emulator-run` through `voboost-install --install` removes that duplication and exercises the real provision path on the emulator.

## What Changes
- Add a new master command `emulator-setup` to `config/config-commands.json`. It reads `ro.kernel.qemu` via `adb shell getprop`; when the value is `1` it runs `su 0 setenforce 0` (SELinux permissive, required for frida-core on the emulator) and is a no-op otherwise. It is non-fatal and idempotent.
- Add the `emulator-setup` step to `config/config-provision.json` immediately after `write-init-hook` (before `install-apk`).
- Set `fatal: false` on the `remount` and `write-init-hook` steps in `config/config-provision.json`. On a real device both succeed so the flag is irrelevant; on the emulator both fail and are skipped, and the daemon is started manually by the existing `start-daemon` step.
- Add a Rust unit test asserting the provision scenario resolves `emulator-setup` after `write-init-hook` and that `remount`/`write-init-hook` are non-fatal.
- Update `voboost-inject/Makefile` `emulator-run` to call `voboost-install --install` for provisioning (daemon + agents + manifest + app + init hook + daemon start) instead of raw `adb` commands. The stub-APK install and app-zone `inject.json` creation remain in the Makefile because they are emulator-only fixtures not part of the production provision scenario.

## Impact
- Real device: no behavior change. `remount` and `write-init-hook` succeed (fatal flag never triggers); `emulator-setup` is a no-op (`ro.kernel.qemu` is empty).
- Emulator: `remount` and `write-init-hook` fail and are skipped; `emulator-setup` sets SELinux permissive; `start-daemon` starts the daemon manually; `verify-daemon` confirms readiness.
- `voboost-inject` `make emulator-run` now drives the real provision scenario, so emulator CI exercises the same code path as production install.
