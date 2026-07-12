## MODIFIED Requirements

### Requirement: Master command templates
The engine SHALL embed `config/config-commands.json` at compile time via `include_str!` and parse it once per scenario resolution into a `Vec<InstallStep>`. Each `InstallStep` SHALL expose `id`, `title` (`StepTitle` = `HashMap<String,String>` of lang to label), `command` (`Vec<String>`), `fatal`, `retryCount`, `retryDelaySecs`. A parse failure SHALL log an error and yield an empty master list. The post-OTA init-hook append template SHALL be id `restore-hook`. The emulator detection + SELinux template SHALL be id `emulator-setup`.

#### Scenario: master template lookup by id
- **WHEN** a `StepDefinition` declares `do: "<id>"`
- **THEN** the engine SHALL find the master `InstallStep` whose `id` matches and use it as the base
- **THEN** if no match exists the engine SHALL log an error and skip the step (return `None`)

#### Scenario: inline base when `do` absent
- **WHEN** a `StepDefinition` has no `do` field
- **THEN** the engine SHALL use an inline base step with `id "inline"`, empty title, empty command, `fatal false`, zero retries

#### Scenario: emulator-setup master template
- **WHEN** a `StepDefinition` declares `do: "emulator-setup"`
- **THEN** the engine SHALL resolve it to a `shell` command that reads `ro.kernel.qemu` via `getprop` and, when the value is `1`, runs `su 0 setenforce 0`; otherwise exits 0. The step SHALL be non-fatal (`fatal false`) and idempotent.
