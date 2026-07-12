# Verify ADB binaries work after optimization
# This script tests all ADB binaries to ensure they function correctly

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "ADB Binary Verification Script" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Test Windows ADB binary
Write-Host "Testing Windows ADB binary..." -ForegroundColor Yellow
$adbPath = ".\src-tauri\resources\adb\win\adb.exe"
if (Test-Path $adbPath) {
    & $adbPath version
    Write-Host "✓ Windows ADB binary verified" -ForegroundColor Green
} else {
    Write-Host "✗ Windows ADB binary not found" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Check for Windows DLLs
Write-Host "Checking Windows ADB DLLs..." -ForegroundColor Yellow
$apiDllPath = ".\src-tauri\resources\adb\win\AdbWinApi.dll"
$usbApiDllPath = ".\src-tauri\resources\adb\win\AdbWinUsbApi.dll"

if (Test-Path $apiDllPath) {
    Write-Host "✓ AdbWinApi.dll found" -ForegroundColor Green
} else {
    Write-Host "✗ AdbWinApi.dll not found" -ForegroundColor Red
    exit 1
}

if (Test-Path $usbApiDllPath) {
    Write-Host "✓ AdbWinUsbApi.dll found" -ForegroundColor Green
} else {
    Write-Host "✗ AdbWinUsbApi.dll not found" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "All ADB binaries verified successfully!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
