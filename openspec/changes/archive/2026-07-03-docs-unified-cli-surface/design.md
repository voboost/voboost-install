# Design: docs-unified-cli-surface

## 1. Examples must be rewritten, not renamed
The old `--auto-install <apk>` took a single positional artifact. Its
replacement `--install <apk>` requires four additional artifact flags to
bring up a full provision: `--daemon-bin`, `--agents-dir`, `--manifest`, and
`--manifest-sig` (`--release-key` is optional; omitting it disables OTA
signature verification, per the `cli` spec). A mechanical
`--auto-install` -> `--install` rename would leave the example calling
`--install` without its required artifacts, which the binary rejects with
`Error:` and exit 1. So every `--auto-install <apk>` example must be
rewritten as a full `--install <apk> --daemon-bin ... --agents-dir ...
--manifest ... --manifest-sig ...` invocation. Help-text phrasing in
`cli_runner.rs::print_help` is the authoritative flag list.

## 2. Two operational surfaces to document
The README CLI section must distinguish:
- **Full provision** (`--install`): needs the APK plus all provision artifacts;
  used for first bring-up.
- **Post-OTA restore** (`--restore`): no artifacts; re-appends the init hook.
- **Teardown** (`--uninstall`): no artifacts; stops daemon, removes hook,
  wipes `/data/voboost`, uninstalls APK, reboots.

Each gets its own example rather than collapsing them into one, because they
take different argument sets.

## 3. Wizard restructure is already staged
The 6-step wizard and the connection-step1 platform variants
(`mac-new`/`mac-old`/`win-new`/`win-old`) are already present in the working
tree (uncommitted README diff and the content-naming file list). This change
formalizes that wording in the Overview ("6-step wizard") and ensures the
content-naming `screenname` enumeration lists the four platform variants
consistently with the `getContentStep1` selector in `src/content/index.ts`.
No content markdown files are added or renamed by this proposal.

## 4. Historical checklist items are annotated, not erased
`docs/11-implementation-checklist.md` Part 12 and `docs/implementation_plan.md`
Part 12 record the original `--auto-install` implementation as completed past
work. Rewriting them to pretend the unified CLI was always there would
falsify history. Instead, each `--auto-install` reference is updated to note
the final flag (`--install` with artifact flags) and marked as superseded by
the unified CLI surface, preserving the audit trail while removing the
misleading standalone reference.

## 5. Dependency on rename-rearm-to-restore
The docs reference `--restore` (and short `-r`) for the post-OTA flow. That
flag name is introduced by `rename-rearm-to-restore`; until it lands, the
binary still exposes `--rearm`/`-R`. This change must be applied after
`rename-rearm-to-restore` so the documented flag matches the shipped binary.
