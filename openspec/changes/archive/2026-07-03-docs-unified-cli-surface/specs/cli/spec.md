## ADDED Requirements

### Requirement: Documented CLI surface matches implementation
The user-facing documentation SHALL describe exactly the CLI flags the binary implements and SHALL NOT document flags the binary does not implement.
The docs (`README.md`, `README.ru.md`, and files under `docs/`) SHALL list
`--install`/`-i`, `--restore`/`-r`, `--uninstall`/`-U`, `--daemon-bin`,
`--agents-dir`, `--manifest`, `--manifest-sig`, `--release-key`,
`--lang`/`-l`, `--dry-run`/`-d`, `--platform`/`-p`, and `--help`/`-h`, and
SHALL NOT present `--auto-install` as a usable flag. The `--install`
documentation SHALL state that `--daemon-bin`, `--agents-dir`, `--manifest`,
and `--manifest-sig` are required and that `--release-key` is optional.
Historical references to `--auto-install` that record past implementation
steps SHALL be marked as superseded by the unified CLI surface.

#### Scenario: README flags match the binary
- **WHEN** the `Available CLI Flags` section of `README.md` or `README.ru.md` is read
- **THEN** it lists exactly `--install`/`-i`, `--restore`/`-r`, `--uninstall`/`-U`, `--daemon-bin`, `--agents-dir`, `--manifest`, `--manifest-sig`, `--release-key`, `--lang`/`-l`, `--dry-run`/`-d`, `--platform`/`-p`, and `--help`/`-h`, and does not list `--auto-install`

#### Scenario: install example carries required artifacts
- **WHEN** a `--install` example in `README.md` or `README.ru.md` is read
- **THEN** it passes `--daemon-bin`, `--agents-dir`, `--manifest`, and `--manifest-sig` alongside the APK path

#### Scenario: no standalone auto-install reference
- **WHEN** `README.md`, `README.ru.md`, and `docs/*.md` are searched for `--auto-install`
- **THEN** every remaining occurrence is inside a historical record explicitly annotated as superseded by the unified CLI surface
