# Provision Scenario — Disabled `pm-grant` Steps

The `config-provision.json` scenario previously granted five runtime
permissions to `ru.voboost` right after the APK install:

- `android.permission.SYSTEM_ALERT_WINDOW`
- `android.permission.READ_LOGS`
- `android.permission.RECORD_AUDIO`
- `android.permission.WRITE_EXTERNAL_STORAGE`
- `android.permission.WRITE_SECURE_SETTINGS`

These steps were **removed** from `config-provision.json` because the current
`voboost.apk` does **not** declare any of these permissions in its
`AndroidManifest.xml`. On Android, `pm grant <pkg> <perm>` fails with a
`SecurityException: Package ru.voboost has not requested permission <perm>`
when the permission is not declared by the package, so every step logged a
failure (non-fatal, but noisy and misleading).

The `pm-grant` step definition is still present in
[`config-commands.json`](./config-commands.json), so re-enabling the grants is
a matter of adding the `pm-grant` entries back to `config-provision.json`
**once the APK declares the corresponding `<uses-permission>` entries**.

## Re-enabling

After the APK's `AndroidManifest.xml` declares the permissions, restore this
block into `config-provision.json` after the `install-apk` step:

```json
{
    "do": "pm-grant",
    "args": ["android.permission.SYSTEM_ALERT_WINDOW"]
},
{
    "do": "pm-grant",
    "args": ["android.permission.READ_LOGS"]
},
{
    "do": "pm-grant",
    "args": ["android.permission.RECORD_AUDIO"]
},
{
    "do": "pm-grant",
    "args": ["android.permission.WRITE_EXTERNAL_STORAGE"]
},
{
    "do": "pm-grant",
    "args": ["android.permission.WRITE_SECURE_SETTINGS"]
},
```
