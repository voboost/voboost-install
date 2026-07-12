import { invoke } from '@tauri-apps/api/core';

export function getOs(): string {
    const ua = window.navigator.userAgent.toLowerCase();
    if (ua.includes('mac')) {
        return 'macos';
    } else if (ua.includes('win')) {
        return 'windows';
    } else if (ua.includes('linux')) {
        return 'linux';
    }
    return 'windows';
}

export async function hasUsbTypeC(): Promise<boolean> {
    return invoke('has_usb_type_c');
}

export async function exitApp(code: number = 0): Promise<void> {
    return invoke('exit_app', { code });
}

export async function getPlatformOverride(): Promise<string | null> {
    return invoke('get_platform_override');
}
