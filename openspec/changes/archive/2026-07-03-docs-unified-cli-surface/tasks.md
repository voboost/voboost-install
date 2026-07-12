# Tasks: docs-unified-cli-surface

> Assumes `rename-rearm-to-restore` is applied first so docs reference
> `--restore`/`-r`, not the interim `--rearm`/`-R`.

## 1. README.md — Overview wizard step count
- old (line 7):
  `It features a 6-step wizard interface, multi-language support, and a headless command-line mode for automation.`
- new:
  `It features a 6-step wizard interface (Welcome, EULA, Firmware, Connection, Install, Complete), multi-language support, and a unified headless command-line mode for automation.`
- (If any 5-step wording remains elsewhere in README.md, replace with 6-step.)

## 2. README.md — rewrite the Headless Mode CLI block (lines 26-65)
Replace the entire `### Headless Mode (Command Line)` through the end of
`#### Headless Mode Behavior` block with:

```
### Headless Mode (Command Line)

The installer can run entirely from the command line without opening a
graphical window. This is ideal for automation scripts and remote integration.
Three headless modes are available; exactly one is selected per invocation.

#### macOS Examples

```bash
# Full provision: APK + daemon + agents + manifest + init hook
/Volumes/voboost-install/voboost-install.app/Contents/MacOS/voboost-install \
    --install "/path/to/voboost-debug.apk" \
    --daemon-bin "/path/to/voboost-inject" \
    --agents-dir "/path/to/agents" \
    --manifest "/path/to/manifest.json" \
    --manifest-sig "/path/to/manifest.sig" \
    --lang ru

# Restore the init hook after a system OTA (no artifacts needed)
./src-tauri/target/aarch64-apple-darwin/release/voboost-install --restore --lang en

# Full teardown: stop daemon, remove hook, wipe data, uninstall APK, reboot
./src-tauri/target/aarch64-apple-darwin/release/voboost-install --uninstall
```

#### Windows Examples

```bash
# Full provision
"C:\Program Files\voboost-install\voboost-install.exe" ^
    --install "C:\path\to\voboost-debug.apk" ^
    --daemon-bin "C:\path\to\voboost-inject.exe" ^
    --agents-dir "C:\path\to\agents" ^
    --manifest "C:\path\to\manifest.json" ^
    --manifest-sig "C:\path\to\manifest.sig" ^
    --lang en

# Restore the init hook after a system OTA
.\src-tauri\target\release\voboost-install.exe --restore --lang ru

# Full teardown
.\src-tauri\target\release\voboost-install.exe --uninstall
```

#### Available CLI Flags

- `--install <apk>` (`-i`) - Full headless install: APK + daemon + agents + manifest + init hook. Requires `--daemon-bin`, `--agents-dir`, `--manifest`, `--manifest-sig`; `--release-key` is optional.
- `--restore` (`-r`) - Restore the init hook after a system OTA (no artifacts needed).
- `--uninstall` (`-U`) - Full teardown: stop daemon, remove init hook, wipe `/data/voboost`, uninstall APK, reboot.
- `--daemon-bin <path>` - Path to the voboost-inject daemon binary (provision).
- `--agents-dir <path>` - Directory of agent files (provision).
- `--manifest <path>` - Path to manifest.json (provision).
- `--manifest-sig <path>` - Path to manifest.sig (provision).
- `--release-key <path>` - Path to release-public.pem for OTA signature verification (optional; omit to disable).
- `--lang <en|ru>` (`-l`) - Language for CLI output.
- `--dry-run` (`-d`) - Simulate actions without executing them on a real device.
- `--platform <id>` (`-p`) - Override platform for cable connection messages (`win-old`, `win-new`, `mac-old`, `mac-new`).
- `--help` (`-h`) - Show help and exit.

Headless modes do not open a GUI window. Without `--install`, `--restore`, or
`--uninstall`, the React wizard is shown.
```

## 3. README.md — content-naming screenname list (line ~373)
- old:
  `screenname` - Screen identifier (welcome, eula-title, eula-license, download, connection, connection-step1-mac-new, connection-step1-mac-old, connection-step1-win-new, connection-step1-win-old, connection-step2, connection-step3, install, complete)
- (confirm the list already includes the four connection-step1 platform variants; if any are missing, add them to match the same list in README.ru.md and `src/content/index.ts`.)

## 4. README.ru.md — Overview wizard step count
- old (line 7):
  `Оно имеет интерфейс мастера из 6 шагов, поддержку нескольких языков и пакетный режим командной строки для автоматизации.`
- new:
  `Оно имеет интерфейс мастера из 6 шагов (Приветствие, Лицензия, Прошивка, Подключение, Установка, Завершение), поддержку нескольких языков и единый пакетный режим командной строки для автоматизации.`

## 5. README.ru.md — rewrite the Headless Mode CLI block (lines 26-65)
Mirror task 2 in Russian: same three examples (`--install` with all artifact
flags, `--restore`, `--uninstall`) and the same flag list, translated. Section
heading `### Пакетный режим (командная строка)`; subsections
`#### Примеры для macOS` / `#### Примеры для Windows` /
`#### Доступные флаги CLI`. The flag tokens themselves (`--install`,
`--daemon-bin`, etc.) stay in English.

## 6. README.ru.md — content-naming screenname list (line ~373)
Same verification as task 3 for the Russian list.

## 7. docs/implementation_plan.md — Part 12 sweep (lines 263-272)
- old (line 265):
  `- Define `--auto-install <apk_path>` in `tauri.conf.json` CLI config.`
- new:
  `- Define the headless CLI flags (`--install`, `--restore`, `--uninstall`, and provision artifact flags) in `tauri.conf.json` CLI config. (Superseded: the original single `--auto-install <apk>` flag was replaced by the unified CLI surface; see the `cli` capability spec.)`
- old (line 267):
  `- If `--auto-install` is detected:`
- new:
  `- If a headless flag (`--install`, `--restore`, or `--uninstall`) is detected:`

## 8. docs/walkthrough.md — CLI example (line 53)
- old:
  `./voboost-installer --auto-install "C:\path\to\update.apk" --lang ru`
- new:
  `./voboost-installer --install "C:\path\to\update.apk" --daemon-bin "C:\path\to\voboost-inject.exe" --agents-dir "C:\path\to\agents" --manifest "C:\path\to\manifest.json" --manifest-sig "C:\path\to\manifest.sig" --lang ru`
- (Update the trailing note to state `--install` requires the artifact flags; `--restore` and `--uninstall` need none.)

## 9. docs/task.md — Phase 1 checklist (line 24)
- old:
  `- [x] Build multi-architecture DMG (`aarch64` and `x86_64`) locally for macOS validation through the CLI (`--auto-install`).`
- new:
  `- [x] Build multi-architecture DMG (`aarch64` and `x86_64`) locally for macOS validation through the CLI. (Superseded: the original `--auto-install` CLI flag is now `--install` with provision artifact flags; see the `cli` capability spec.)`

## 10. docs/11-implementation-checklist.md — Part 12 (lines 411-414)
- old (line 412):
  `  - [x] Configure CLI arguments (`--auto-install`, `--lang`) in `tauri.conf.json`.`
- new:
  `  - [x] Configure CLI arguments in `tauri.conf.json`. (Superseded: the original `--auto-install`/`--lang` pair was replaced by the unified CLI surface -- `--install`/`--restore`/`--uninstall` plus provision artifact and shared flags; see the `cli` capability spec.)`

## 11. Verify
- `grep -rn -- '--auto-install' README.md README.ru.md docs/` returns no
  matches outside the explicit "(Superseded: ...)" annotations.
- `npx @fission-ai/openspec validate docs-unified-cli-surface --strict`.
