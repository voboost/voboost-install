## 1. OpenSpec change (add-emulator-support)

- [x] 1.1 proposal.md, design.md, specs deltas (this change)
- [x] 1.2 `npx @fission-ai/openspec validate add-emulator-support --strict` passes

## 2. Config (voboost-install)

- [x] 2.1 `config/config-commands.json`: add the `emulator-setup` master command
  (reads `ro.kernel.qemu`; if `1` runs `su 0 setenforce 0`; else exit 0). Non-fatal,
  idempotent, 1 retry.
- [x] 2.2 `config/config-provision.json`: set `"fatal": false` on the `remount` step
  and on the `write-init-hook` step.
- [x] 2.3 `config/config-provision.json`: insert the `emulator-setup` step
  immediately after `write-init-hook` and before `install-apk`.

## 3. Tests (voboost-install)

- [x] 3.1 `src-tauri/src/commands/install.rs`: add a unit test asserting the
  provision scenario resolves `emulator-setup` between `write-init-hook` and
  `install-apk`, and that `remount` and `write-init-hook` resolve with
  `fatal == false`.
- [x] 3.2 `cd src-tauri && cargo build --release` passes.
- [x] 3.3 `cd src-tauri && cargo test` passes.

## 4. Makefile (voboost-inject)

- [x] 4.1 `Makefile` `emulator-run`: replace the raw-`adb` provisioning block
  (mkdir/push/chmod/start) with a single `voboost-install --install` invocation
  using the daemon binary, agents dir, manifest, manifest.sig, release-public.pem
  and `--lang en`. Keep the boot-wait, stub-APK install, and app-zone
  `inject.json` creation logic.

## 5. Validate

- [x] 5.1 `npx @fission-ai/openspec validate add-emulator-support --strict` passes.
- [x] 5.2 `make emulator-run` (voboost-inject) provisions the emulator: daemon
  running (`pgrep -f /data/voboost/voboost-inject`), status `ready`
  (`/data/user/0/ru.voboost/inject-status.json`), `ru.voboost` installed.
- [x] 5.3 Archive the change to `openspec/changes/archive/`.
