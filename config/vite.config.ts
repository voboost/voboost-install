import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { plugin as markdown } from 'vite-plugin-markdown';
import path from 'path';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
    plugins: [
        react(),
        markdown({ mode: ['html'] as any })
    ],

    root: './src',
    publicDir: './public',

    // Explicitly define the envDir so Vite reads .env, .env.local, etc. from here
    envDir: __dirname,

    // Prevent vite from obscuring rust errors
    clearScreen: false,

    server: {
        port: 5173,
        strictPort: true,
        host: host || false,
        hmr: host
            ? {
                protocol: 'ws',
                host,
                port: 5174,
            }
            : undefined,
        watch: {
            ignored: ['**/src-tauri/**'],
        },
    },

    build: {
        // Output from src to src-tauri
        outDir: '../src-tauri/dist',
        emptyOutDir: true,
        // Tauri uses Chromium on Windows and WebKit on macOS
        target: process.env.TAURI_ENV_PLATFORM === 'windows'
            ? 'chrome105'
            : 'safari14',
        // Don't minify for debug builds
        minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
        // Produce sourcemaps for debug builds
        sourcemap: !!process.env.TAURI_ENV_DEBUG,
        chunkSizeWarningLimit: 1000,
    },

    envPrefix: ['VITE_', 'TAURI_ENV_'],

    test: {
        // The app build roots at ./src, but the test suite lives at the
        // repository root (tests/), so resolve test paths from there.
        root: path.resolve(__dirname, '..'),
        environment: 'node',
        globals: true,
        setupFiles: ['./tests/setup.ts'],
        include: ['./tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        // wizard.test.ts is a WebdriverIO-style e2e stub (uses the `browser`
        // global) with no runner configured; exclude it from the vitest unit
        // run until a browser runner is wired up.
        exclude: [
            '**/node_modules/**',
            '**/.git/**',
            './tests/wizard.test.ts',
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            exclude: [
                'node_modules/',
                './tests/',
                '**/*.d.ts',
            ],
        },
    },
});
