# Security Considerations

## Overview

This document describes security measures implemented in the Voboost Installer to protect users and ensure safe installation.

---

## Threat Model

### Assets to Protect

1. **User's computer** - Prevent malware installation
2. **User's vehicle** - Prevent unauthorized modifications
3. **Downloaded APK** - Ensure integrity and authenticity
4. **User data** - No collection, no transmission

### Potential Threats

| Threat | Risk | Mitigation |
|--------|------|------------|
| Malicious APK | High | SHA256 verification |
| Man-in-the-middle | Medium | HTTPS only |
| Compromised releases.json | Medium | GitHub hosting, HTTPS |
| Malicious ADB commands | Low | Bundled ADB, no user input |
| Data exfiltration | Low | No network after download |

---

## APK Verification

### SHA256 Hash Verification

Every APK download is verified against a known hash:

```rust
// Verification flow
1. Fetch releases.json (contains sha256 for each version)
2. Download APK to temp directory
3. Calculate SHA256 of downloaded file
4. Compare with expected hash
5. If mismatch: delete file, show error
6. If match: proceed to installation
```

### Why SHA256?

- Cryptographically secure (no known collisions)
- Fast to compute
- Industry standard for file verification
- Supported natively in Rust (`sha2` crate)

### Hash Storage

Hashes are stored in `releases.json`:

```json
{
  "version": "1.2.0",
  "sha256": "a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd"
}
```

**Important**: `releases.json` must be updated by trusted maintainers only.

---

## Network Security

### HTTPS Only

All network requests use HTTPS:

```rust
// Enforced in code
const RELEASES_URL: &str = "https://raw.githubusercontent.com/...";

// No HTTP fallback
if !url.starts_with("https://") {
    return Err("Insecure URL rejected");
}
```

### Certificate Validation

- System certificate store is used
- No certificate pinning (allows updates)
- Invalid certificates are rejected

### No Proxy Bypass

- System proxy settings are respected
- No hardcoded proxy bypass

---

## ADB Security

### Bundled Binaries

ADB binaries are bundled with the installer:

**Why bundle?**
- Known, verified version
- No download at runtime
- No PATH manipulation
- Consistent behavior

**Source**: Official Android SDK Platform Tools

### Command Whitelist

Only specific ADB commands are executed:

```rust
const ALLOWED_COMMANDS: &[&str] = &[
    "start-server",
    "devices",
    "wait-for-device",
    "root",
    "remount",
    "disable-verity",
    "install",
    "reboot",
];

fn validate_command(args: &[String]) -> bool {
    if args.is_empty() {
        return false;
    }
    ALLOWED_COMMANDS.contains(&args[0].as_str())
}
```

### No User Input in Commands

- APK path is from temp directory (controlled)
- No shell injection possible
- No user-provided arguments

---

## File System Security

### Temp Directory Usage

Downloaded APK is stored in system temp directory:

```rust
let temp_dir = std::env::temp_dir();
let file_path = temp_dir.join(format!("voboost-{}.apk", version));
```

**Why temp?**
- Automatically cleaned by OS
- User doesn't need to manage files
- No permanent storage of APK

### File Permissions

- Downloaded files have default permissions
- No executable bit set on APK
- ADB binary has executable permission (macOS)

### Path Validation

```rust
fn validate_path(path: &Path) -> bool {
    // Must be in temp directory
    let temp_dir = std::env::temp_dir();
    path.starts_with(&temp_dir)
}
```

---

## Code Signing

### Windows

For production release, sign with:

```toml
# src-tauri/tauri.conf.json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": "YOUR_CERT_THUMBPRINT",
      "timestampUrl": "http://timestamp.digicert.com"
    }
  }
}
```

**Benefits**:
- SmartScreen won't block
- Shows publisher name
- Tamper detection

### macOS

For production release, sign and notarize:

```bash
# Sign
codesign --deep --force --verify --verbose \
  --sign "Developer ID Application: Your Name" \
  target/release/bundle/macos/Voboost\ Installer.app

# Notarize
xcrun notarytool submit \
  target/release/bundle/macos/Voboost\ Installer.dmg \
  --apple-id "your@email.com" \
  --team-id "TEAM_ID" \
  --password "app-specific-password"
```

**Benefits**:
- Gatekeeper allows app
- No "unidentified developer" warning
- Required for distribution outside App Store

---

## Tauri Security

### CSP (Content Security Policy)

```json
// src-tauri/tauri.conf.json
{
  "app": {
    "security": {
      "csp": "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'"
    }
  }
}
```

### Capabilities

Minimal permissions requested:

```json
// src-tauri/capabilities/default.json
{
  "identifier": "default",
  "description": "Default capabilities",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "os:default"
  ]
}
```

### No Remote Content

- No loading of remote URLs in WebView
- All content is bundled
- No eval() or dynamic code execution

---

## Privacy

### No Telemetry

The installer does NOT:
- Collect usage statistics
- Send crash reports
- Track user behavior
- Phone home

### No Personal Data

The installer does NOT collect:
- User names
- Email addresses
- Device identifiers
- IP addresses
- Location data

### Local Logging Only

Logs are:
- Stored in memory only
- Not persisted to disk
- Not sent anywhere
- User can copy manually for support

---

## Supply Chain Security

### Dependencies

#### Frontend (npm)

```bash
# Audit dependencies
npm audit

# Use lockfile
npm ci  # Not npm install
```

#### Backend (Cargo)

```bash
# Audit dependencies
cargo audit

# Use lockfile
# Cargo.lock is committed
```

### GitHub Actions

- Use pinned action versions
- Use GITHUB_TOKEN with minimal permissions
- No third-party actions with write access

```yaml
# Good
- uses: actions/checkout@v4

# Bad (unpinned)
- uses: actions/checkout@main
```

---

## Incident Response

### If Compromised APK is Distributed

1. **Immediately** update `releases.json` to remove bad version
2. **Notify** users via GitHub issue/release notes
3. **Investigate** how compromise occurred
4. **Rotate** any compromised credentials
5. **Post-mortem** and improve processes

### If releases.json is Compromised

1. **Revert** to known good version via Git
2. **Rotate** GitHub access tokens
3. **Enable** branch protection if not already
4. **Audit** who has write access

---

## Security Checklist

### Before Release

- [ ] All dependencies audited (`npm audit`, `cargo audit`)
- [ ] No hardcoded secrets in code
- [ ] HTTPS URLs only
- [ ] SHA256 hashes verified
- [ ] Code signed (production)
- [ ] Notarized (macOS, production)

### Ongoing

- [ ] Monitor for dependency vulnerabilities
- [ ] Review PRs for security issues
- [ ] Keep dependencies updated
- [ ] Respond to security reports promptly

---

## Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. **Email** security@voboost.ru (or appropriate contact)
3. **Include** detailed description and steps to reproduce
4. **Wait** for acknowledgment before disclosure

We aim to respond within 48 hours and fix critical issues within 7 days.
