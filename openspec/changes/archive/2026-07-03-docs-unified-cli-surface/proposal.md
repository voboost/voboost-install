# Proposal: docs-unified-cli-surface

## Why
The user-facing docs still describe a CLI surface that no longer exists. Both
READMEs document `--auto-install <apk>` as the headless entry point and an
outdated flag list (`--auto-install`, `--lang`, `--dry-run`), but the binary
now exposes a unified CLI: `--install` (full provision bring-up, requiring
separate artifact flags), `--restore` (post-OTA init-hook restore, renamed
from `--rearm`), and `--uninstall`, plus `--lang`, `--dry-run`,
`--platform`, and `--help`. The same stale `--auto-install` reference recurs
in `docs/*.md`. An operator copying a README example today gets an unknown-flag
error. The wizard description also lags: the Overview still calls it a 5-step
wizard in places while the staged content is the 6-step wizard with the
connection-step1 platform variants.

## What Changes
- Rewrite the `### Headless Mode (Command Line)` CLI block in `README.md`
  and `README.ru.md` to the final surface: `--install` with its artifact
  flags (`--daemon-bin`, `--agents-dir`, `--manifest`, `--manifest-sig`,
  optional `--release-key`), `--restore`, `--uninstall`, and the shared
  `--lang`/`--dry-run`/`--platform`/`--help` flags. Provide macOS and Windows
  examples for `--install` (with all artifact flags), a `--restore` example,
  and a `--uninstall` example.
- Apply the already-staged wizard restructure in both READMEs: state a 6-step
  wizard in the Overview and reference the connection-step1 platform variants
  (`mac-new`, `mac-old`, `win-new`, `win-old`) in the content-naming section.
- Sweep `docs/*.md` for `--auto-install` and replace it context-aware (the
  historical `--auto-install <apk>` becomes `--install <apk>` plus the
  artifact flags, not a bare rename). Where a checklist item records a past
  step that is now superseded, annotate it as such rather than rewriting
  history.

## Impact
- **Affected capabilities**: `cli` (documentation only).
- **Affected files**: `README.md`, `README.ru.md`,
  `docs/implementation_plan.md`, `docs/walkthrough.md`, `docs/task.md`,
  `docs/11-implementation-checklist.md`, plus this change's own
  `specs/cli/spec.md`.
- **Behavior**: None. No code or config changes; documentation and help-text
  wording only.
- **Dependencies**: Assumes `rename-rearm-to-restore` is applied first so the
  docs reference `--restore`/`-r` rather than the interim `--rearm`/`-R`.
- **Validation**: `npx @fission-ai/openspec validate docs-unified-cli-surface
  --strict` and a manual grep confirming zero `--auto-install` references
  remain outside historical/superseded annotations.
