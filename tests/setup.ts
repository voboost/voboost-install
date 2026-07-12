import { vi } from 'vitest';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
    listen: vi.fn(() => Promise.resolve(() => { })),
}));

vi.mock('@tauri-apps/plugin-os', () => ({
    platform: vi.fn(() => Promise.resolve('darwin')),
}));
