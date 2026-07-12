import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '../../');
const BUNDLE_DIR = path.join(ROOT_DIR, 'src-tauri/target');
const OUTPUT_DIR = path.join(ROOT_DIR, 'build');

function copyBundleFiles() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const extensionsToCopy = ['.dmg', '.exe', '.msi'];
    let filesCopied = 0;

    // Helper to recursively find and copy files
    function findAndCopy(dir) {
        if (!fs.existsSync(dir)) return;

        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            const ext = path.extname(file).toLowerCase();

            if (stat.isDirectory()) {
                if (ext === '.app') {
                    // It's a macOS app bundle, package it directly into a clean DMG
                    const pkgPath = path.join(ROOT_DIR, 'package.json');
                    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                    const version = pkg.version;

                    let archSuffix = '-x86';
                    if (fullPath.includes('aarch64')) {
                        archSuffix = '-arm';
                    }

                    const dmgName = `voboost-install-${version}${archSuffix}.dmg`;
                    const destPath = path.join(OUTPUT_DIR, dmgName);

                    console.log(`[ INFO ] Packaging ${file} into raw DMG using two-pass compression...`);
                    try {
                        import('child_process').then(({ execSync }) => {
                            const tempDmgPath = path.join(OUTPUT_DIR, `temp-${dmgName}`);
                            // Phase 1: Create uncompressed UDRW image
                            execSync(`hdiutil create -volname "voboost-install" -srcfolder "${fullPath}" -ov -format UDRW "${tempDmgPath}"`, { stdio: 'inherit' });
                            // Phase 2: Convert to highly compressed UDBZ image
                            execSync(`hdiutil convert "${tempDmgPath}" -format UDBZ -o "${destPath}"`, { stdio: 'inherit' });
                            // Cleanup intermediate file
                            fs.unlinkSync(tempDmgPath);
                        });
                        console.log(`[ SUCCESS ] Created artifact: build/${dmgName}`);
                        filesCopied++;
                    } catch (e) {
                        console.error(`[ ERROR ] Failed to create DMG:`, e.message);
                    }
                } else {
                    findAndCopy(fullPath); // Recurse into regular folders
                }
            } else {
                if (extensionsToCopy.includes(ext)) {
                    // Do not copy adb.exe or other embedded resources
                    if (file === 'adb.exe' || file === 'AdbWinApi.dll' || file === 'AdbWinUsbApi.dll') {
                        continue;
                    }

                    // We skip checking for .dmg here because we manually create our DMG from the .app 
                    // earlier in the tree. We only want to copy .exe and .msi here.
                    if (ext === '.dmg') {
                        continue;
                    }

                    const pkgPath = path.join(ROOT_DIR, 'package.json');
                    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                    const version = pkg.version;

                    let finalName = file;
                    if (ext === '.exe') {
                        finalName = `voboost-install-${version}.exe`;
                    } else if (ext === '.msi') {
                        finalName = `voboost-install-${version}.msi`;
                    }

                    const destPath = path.join(OUTPUT_DIR, finalName);
                    fs.copyFileSync(fullPath, destPath);
                    console.log(`[ SUCCESS ] Copied artifact: ${file} -> build/${finalName}`);
                    filesCopied++;
                }
            }
        }
    }

    console.log("Locating build artifacts...");
    findAndCopy(BUNDLE_DIR);

    if (filesCopied === 0) {
        console.log("[ WARNING ] No release artifacts (.dmg, .exe, .msi) found in target directory.");
    } else {
        console.log(`[ SUCCESS ] Successfully moved ${filesCopied} artifacts to the build/ folder.`);
    }
}

copyBundleFiles();
