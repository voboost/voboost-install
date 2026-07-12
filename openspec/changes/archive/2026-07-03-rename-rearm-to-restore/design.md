# Design: rename-rearm-to-restore

## 1. Pure rename, no behavior change
Every replacement is a 1:1 identifier or string rename. No control flow,
command vectors, retry counts, or step ordering change. The init-hook append
command (the `grep -qF ... || cat ... >> ...` line) is identical; only the
template `id` field and the `do` reference flip from `rearm-hook` to
`restore-hook`. Because the step resolver matches `do` against master
template `id`, both must move together.

## 2. Short flag collision check
`-r` was previously unused (the `install-apk` master command uses `-r` as an
`adb install` argument, not a CLI flag). The freed `-R` is not reassigned.
The new `-r` short does not collide with any existing short alias
(`-h`, `-i`, `-U`, `-l`, `-d`, `-p`).

## 3. git mv preserves history for the scenario file
`config/config-rearm.json` is moved with `git mv` to
`config/config-restore.json` so the rename is tracked as a move rather than a
delete+add. The `include_str!` path in `install.rs` and the
`config_json()` match arm are updated to match the new path.
