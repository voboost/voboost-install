# Troubleshooting Guide

## Overview

This guide helps users resolve common issues during installation.

---

## Installation Issues

### Windows

#### "Windows protected your PC" (SmartScreen)

**Cause**: App is not code-signed or signature is not recognized.

**Solution**:
1. Click "More info"
2. Click "Run anyway"

*Note: This warning will not appear once the app is properly code-signed.*

#### "The app you're trying to install isn't a Microsoft-verified app"

**Cause**: Windows 11 S mode or app installation restrictions.

**Solution**:
1. Go to Settings → Apps → Advanced app settings
2. Change "Choose where to get apps" to "Anywhere"

#### Antivirus Blocking

**Cause**: Some antivirus software may flag the bundled ADB.

**Solution**:
1. Add exception for the installer folder
2. Or temporarily disable antivirus during installation

---

### macOS

#### "Voboost Installer can't be opened because it is from an unidentified developer"

**Cause**: App is not notarized.

**Solution**:
1. Right-click (or Control-click) the app
2. Select "Open" from the menu
3. Click "Open" in the dialog

Or via System Preferences:
1. Go to System Preferences → Security & Privacy
2. Click "Open Anyway" next to the blocked app message

#### "Voboost Installer is damaged and can't be opened"

**Cause**: Gatekeeper quarantine attribute.

**Solution**:
```bash
xattr -cr /Applications/Voboost\ Installer.app
```

#### App Crashes on Apple Silicon

**Cause**: Rosetta 2 not installed.

**Solution**:
```bash
softwareupdate --install-rosetta
```

---

## Download Issues

### "Unable to connect to server"

**Possible Causes**:
- No internet connection
- Firewall blocking connection
- GitHub is down

**Solutions**:
1. Check internet connection
2. Try opening https://github.com in browser
3. Check firewall settings
4. Try again later

### "Downloaded file is corrupted"

**Cause**: Download was interrupted or file was modified.

**Solution**:
1. Click "Try Again" to re-download
2. If persists, check disk space
3. Try disabling antivirus temporarily

### Download Stuck at 0%

**Possible Causes**:
- Slow internet connection
- Proxy issues

**Solutions**:
1. Wait a few minutes (large files take time to start)
2. Check proxy settings
3. Try a different network

---

## Connection Issues

### "No device found"

**Checklist**:
- [ ] USB cable is connected to computer
- [ ] USB cable is connected to vehicle
- [ ] Vehicle is powered on
- [ ] USB debugging is enabled on vehicle

**USB Debugging Setup**:
1. Go to Settings → About
2. Tap "Build Number" 7 times
3. Go back to Settings → Developer Options
4. Enable "USB Debugging"

### "Device found but not authorized"

**Cause**: USB debugging prompt not accepted on vehicle.

**Solution**:
1. Look at the vehicle's screen
2. Find the "Allow USB debugging?" prompt
3. Check "Always allow from this computer"
4. Tap "Allow"

### "Device is offline"

**Possible Causes**:
- Bad USB cable
- USB port issue
- ADB server conflict

**Solutions**:
1. Try a different USB cable
2. Try a different USB port
3. Restart the installer
4. Restart the vehicle

### Multiple Devices Connected

**Cause**: More than one Android device connected.

**Solution**:
1. Disconnect other Android devices
2. Keep only the vehicle connected
3. Click "Check Again"

---

## Installation Failures

### "Root access not available"

**Cause**: Device doesn't support ADB root.

**Solution**:
- This device may not be compatible
- Contact support for assistance

### "Remount failed"

**Cause**: Filesystem cannot be remounted.

**Solutions**:
1. Reboot the vehicle
2. Try installation again
3. If persists, device may not be compatible

### "APK installation failed"

**Common Error Codes**:

| Error | Meaning | Solution |
|-------|---------|----------|
| INSTALL_FAILED_INSUFFICIENT_STORAGE | No space | Free up space on vehicle |
| INSTALL_FAILED_ALREADY_EXISTS | App exists | Uninstall existing app first |
| INSTALL_FAILED_OLDER_SDK | Android too old | Device not compatible |
| INSTALL_FAILED_VERSION_DOWNGRADE | Older version | Uninstall current version first |

### Installation Stuck

**If installation seems stuck**:
1. Wait at least 2 minutes (some steps take time)
2. Check if vehicle screen shows any prompts
3. If truly stuck, close installer and try again

---

## After Installation

### App Not Appearing

**Solution**:
1. Wait for vehicle to fully reboot
2. Check app drawer/launcher
3. Search for "Voboost" in settings

### App Crashes on Launch

**Solutions**:
1. Reboot the vehicle
2. Clear app data: Settings → Apps → Voboost → Clear Data
3. Reinstall using the installer

---

## Getting Help

### Collecting Diagnostic Information

If you need to contact support, please provide:

1. **Installation Log**
   - Click "View Log" on the installation screen
   - Click "Copy to Clipboard"
   - Paste into your support request

2. **System Information**
   - Operating System (Windows 10/11, macOS version)
   - Vehicle model and year
   - Voboost version you tried to install

3. **Screenshots**
   - Screenshot of any error messages
   - Screenshot of the installation screen

### Contact Support

- **GitHub Issues**: https://github.com/voboost/voboost-install/issues
- **Email**: support@voboost.ru (if available)

### Before Contacting Support

Please try:
1. Restarting the installer
2. Restarting your computer
3. Restarting the vehicle
4. Using a different USB cable
5. Checking this troubleshooting guide

---

## FAQ

### Q: Is my vehicle compatible?

**A**: Currently supported vehicles:
- Voyah Free (all years)
- Voyah Dream (all years)

Other vehicles may work but are not officially supported.

### Q: Do I need to root my vehicle?

**A**: No, the installer handles all necessary steps automatically. The vehicle must support ADB root access (most Voyah vehicles do).

### Q: Will this void my warranty?

**A**: Installing third-party software may affect your warranty. Please check with your dealer.

### Q: Can I uninstall Voboost?

**A**: Yes, you can uninstall through Settings → Apps → Voboost → Uninstall.

### Q: Is my data safe?

**A**: The installer does not collect any personal data. All operations are performed locally on your computer.

### Q: Why does the installer need USB debugging?

**A**: USB debugging allows the installer to communicate with your vehicle's Android system to install the app.

### Q: Can I install on multiple vehicles?

**A**: Yes, you can run the installer multiple times for different vehicles.
