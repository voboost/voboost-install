import { execSync } from 'child_process';
import os from 'os';

console.log("[ INFO ] Starting multi-architecture release build...");

try {
    if (os.platform() === 'darwin') {
        // A universal macOS build: both adb_arm and adb_x86 are staged into
        // resources-staged/mac/ and the Rust side picks the matching one at
        // runtime. No per-arch staging is needed anymore.
        console.log("[ INFO ] macOS detected. Staging universal ADB resources (arm64 + x86_64)...");
        execSync('node src/build/stage-resources.js', { stdio: 'inherit' });

        console.log("[ INFO ] Building for ARM64...");
        execSync('PATH=$HOME/.cargo/bin:/opt/homebrew/bin:$PATH npm run tauri build -- --target aarch64-apple-darwin', { stdio: 'inherit' });

        console.log("[ INFO ] Building for x86_64 (Intel)...");
        try {
            execSync('PATH=$HOME/.cargo/bin:/opt/homebrew/bin:$PATH npm run tauri build -- --target x86_64-apple-darwin', { stdio: 'inherit' });
        } catch {
            console.warn("[ WARNING ] Failed to build for x86_64. This is normal if your rust compiler (Homebrew) lacks cross-compilation targets. Skipping Intel build.");
        }
    } else {
        console.log("[ INFO ] Windows/Linux detected. Building default target...");
        execSync('node src/build/stage-resources.js', { stdio: 'inherit' });
        execSync('npm run tauri build', { stdio: 'inherit' });
    }

    console.log("[ INFO ] Collecting artifacts...");
    execSync('node src/build/collect-artifacts.js', { stdio: 'inherit' });

    console.log("[ SUCCESS ] Release build complete.");
} catch (error) {
    console.error("[ ERROR ] Build failed:", error.message);
    process.exit(1);
}
