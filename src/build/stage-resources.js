import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RESOURCES_DIR = path.resolve(__dirname, "../../src-tauri/resources/adb");
const STAGED_DIR = path.resolve(__dirname, "../../src-tauri/resources-staged");

// Both macOS ADB architectures are bundled so a single universal build
// runs natively on Apple Silicon and Intel hosts. The Rust side
// (`utils/platform.rs`) picks the matching binary at runtime.
const MAC_ADB_BINARIES = ['adb_arm', 'adb_x86'];

function stripMacBinary(destPath) {
    try {
        execSync(`strip -x "${destPath}"`, { stdio: 'inherit' });
        console.log(`[ INFO ] Stripped debug symbols from ${path.basename(destPath)}`);
    } catch (error) {
        console.warn(`[ WARN ] Failed to strip ${path.basename(destPath)}: ${error.message}`);
    }
}

function stageMac() {
    const destDir = path.join(STAGED_DIR, 'mac');
    fs.mkdirSync(destDir, { recursive: true });

    for (const arch of MAC_ADB_BINARIES) {
        const src = path.join(RESOURCES_DIR, 'mac', arch);
        if (!fs.existsSync(src)) {
            throw new Error(`Required ADB binary not found: ${src}`);
        }
        const dest = path.join(destDir, arch);
        fs.copyFileSync(src, dest);
        fs.chmodSync(dest, '755');
        stripMacBinary(dest);
    }
    console.log(`[ INFO ] Staged macOS ADB binaries: ${MAC_ADB_BINARIES.join(', ')}`);
}

function stageWindows() {
    const destDir = path.join(STAGED_DIR, 'win');
    fs.mkdirSync(destDir, { recursive: true });
    const files = ['adb.exe', 'AdbWinApi.dll', 'AdbWinUsbApi.dll'];
    for (const file of files) {
        const src = path.join(RESOURCES_DIR, 'win', file);
        if (!fs.existsSync(src)) {
            throw new Error(`Required ADB file not found: ${src}`);
        }
        fs.copyFileSync(src, path.join(destDir, file));
    }
    console.log('[ INFO ] Staged Windows ADB binaries.');
}

function stage() {
    console.log('[ INFO ] Staging ADB resources (universal macOS bundle: arm64 + x86_64)');

    // Clean staged dir
    if (fs.existsSync(STAGED_DIR)) {
        fs.rmSync(STAGED_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(STAGED_DIR, { recursive: true });

    if (process.platform === 'darwin') {
        stageMac();
    } else {
        stageWindows();
    }
    console.log("[ SUCCESS ] Staged platform-specific ADB binaries.");
}

stage();
