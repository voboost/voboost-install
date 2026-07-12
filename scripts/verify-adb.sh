#!/bin/bash
# Verify ADB binaries work after optimization
# This script tests all ADB binaries to ensure they function correctly

set -e

echo "========================================="
echo "ADB Binary Verification Script"
echo "========================================="
echo ""

# Test macOS ARM binary
echo "Testing macOS ARM binary..."
if [ -f "./src-tauri/resources/adb/mac/adb_arm" ]; then
    ./src-tauri/resources/adb/mac/adb_arm version
    echo "✓ macOS ARM binary verified"
else
    echo "✗ macOS ARM binary not found"
    exit 1
fi
echo ""

# Test macOS x86 binary
echo "Testing macOS x86 binary..."
if [ -f "./src-tauri/resources/adb/mac/adb_x86" ]; then
    ./src-tauri/resources/adb/mac/adb_x86 version
    echo "✓ macOS x86 binary verified"
else
    echo "✗ macOS x86 binary not found"
    exit 1
fi
echo ""

# Test macOS universal binary (if exists)
if [ -f "./src-tauri/resources/adb/mac/adb" ]; then
    echo "Testing macOS universal binary..."
    ./src-tauri/resources/adb/mac/adb version
    echo "✓ macOS universal binary verified"
    echo ""
fi

# Test Windows binary (if running on macOS with Wine or similar)
if [ -f "./src-tauri/resources/adb/win/adb.exe" ]; then
    echo "Windows binary found (cannot test on macOS without Wine)"
    echo "✓ Windows binary exists"
    echo ""
fi

echo "========================================="
echo "All ADB binaries verified successfully!"
echo "========================================="
