# ADB Binaries

This directory contains the Android Debug Bridge (ADB) binaries used by the Voboost installer.

## Binary Sources

The ADB binaries are sourced from the **Android SDK Platform Tools**:

- **Version:** 35.0.1 (r35.0.1-11580240)
- **Source:** https://developer.android.com/tools/releases/platform-tools
- **License:** Apache 2.0 (included in Android SDK)

## Directory Structure

```
adb/
├── mac/
│   ├── adb          # Universal binary (symlink)
│   ├── adb_arm      # Apple Silicon (arm64) binary
│   └── adb_x86      # Intel (x86_64) binary
└── win/
    ├── adb.exe              # Windows executable
    ├── AdbWinApi.dll        # Windows ADB API library
    └── AdbWinUsbApi.dll     # Windows ADB USB API library
```

## Binary Sizes

### macOS Binaries
- `adb_arm`: 6.2 MB (6,467,520 bytes)
- `adb_x86`: 6.8 MB (7,098,432 bytes)

### Windows Binaries
- `adb.exe`: 5.6 MB
- `AdbWinApi.dll`: 106 KB
- `AdbWinUsbApi.dll`: 72 KB

## Optimizations Applied

### macOS Binaries
- **Debug symbols stripped** using `strip -x` command
- This reduces binary size by removing debugging information
- Note: The binaries from Android SDK are already stripped, so no additional size reduction was achieved
- The build pipeline in `src/build/stage-resources.js` automatically strips binaries during the build process

### Windows Binaries
- No compression applied (UPX not used to avoid antivirus false positives)
- DLLs are kept as-is to ensure compatibility

## How to Update ADB Binaries

1. Download the latest Android SDK Platform Tools from:
   https://developer.android.com/tools/releases/platform-tools

2. Extract the platform-tools archive

3. Replace the binaries:
   ```bash
   # macOS
   cp platform-tools/adb src-tauri/resources/adb/mac/adb_arm
   cp platform-tools/adb src-tauri/resources/adb/mac/adb_x86

   # Windows
   cp platform-tools/adb.exe src-tauri/resources/adb/win/adb.exe
   cp platform-tools/AdbWinApi.dll src-tauri/resources/adb/win/AdbWinApi.dll
   cp platform-tools/AdbWinUsbApi.dll src-tauri/resources/adb/win/AdbWinUsbApi.dll
   ```

4. Strip macOS binaries (if not already stripped):
   ```bash
   strip -x src-tauri/resources/adb/mac/adb_arm
   strip -x src-tauri/resources/adb/mac/adb_x86
   ```

5. Verify binaries work:
   ```bash
   # macOS
   ./scripts/verify-adb.sh

   # Windows
   powershell -ExecutionPolicy Bypass -File .\scripts\verify-adb.ps1
   ```

6. Update this README with the new version information

## Verification

Use the provided verification scripts to ensure binaries work correctly:

- **macOS:** `./scripts/verify-adb.sh`
- **Windows:** `powershell -ExecutionPolicy Bypass -File .\scripts\verify-adb.ps1`

These scripts run `adb version` on each binary to verify functionality.

## Build Process

The build process automatically stages the ADB binaries for the target platform:

1. `src/build/stage-resources.js` copies the binaries to `src-tauri/resources-staged/`
2. For macOS, **both** `adb_arm` (Apple Silicon) and `adb_x86` (Intel) are staged
   so a single universal build runs natively on either architecture
3. Debug symbols are stripped from the macOS binaries (`strip -x`)
4. The staged binaries are bundled into the final application via `tauri.conf.json`
   (`bundle.resources: ["resources-staged/**/*"]`)
5. `tauri.conf.json` runs `node src/build/stage-resources.js` as `beforeBuildCommand`,
   so `npm run tauri:build` always produces a fresh staged set

At runtime, `src-tauri/src/utils/platform.rs` selects the macOS binary that matches
the host architecture (`std::env::consts::ARCH`), with a fallback to the other
architecture (translated via Rosetta 2 on Apple Silicon) if the native one is missing.

## Security Notes

- ADB binaries are verified by SHA256 hash after download (for APK files)
- All ADB commands are validated against a whitelist before execution
- No telemetry or data collection is performed
- All operations are performed locally on the user's machine

## Troubleshooting

### macOS Code Signing Warning
When stripping binaries, you may see a warning about invalidating code signatures:
```
warning: changes being made to the file will invalidate the code signature
```

This is expected and acceptable because:
- The ADB binary is not code-signed by us
- It's a third-party tool from Google
- The installer itself is code-signed, not the bundled ADB binary

### Binary Not Executing
If a binary doesn't execute:
1. Check file permissions: `ls -l src-tauri/resources/adb/mac/adb_arm`
2. Ensure executable bit is set: `chmod +x src-tauri/resources/adb/mac/adb_arm`
3. Run verification script to check functionality

## References

- Android SDK Platform Tools: https://developer.android.com/tools/releases/platform-tools
- ADB Documentation: https://developer.android.com/studio/command-line/adb
