import { useState, useEffect } from 'react';
import { getOs, hasUsbTypeC, getPlatformOverride } from '../services/platform';

const PLATFORM_MAP: Record<string, { platform: string; hasUsbC: boolean }> = {
    'win-old': { platform: 'windows', hasUsbC: false },
    'win-new': { platform: 'windows', hasUsbC: true },
    'mac-old': { platform: 'macos', hasUsbC: false },
    'mac-new': { platform: 'macos', hasUsbC: true },
};

export function usePlatform() {
    const [platform, setPlatform] = useState<string>('windows');
    const [hasUsbC, setHasUsbC] = useState<boolean>(true);

    useEffect(() => {
        async function fetchPlatformInfo() {
            try {
                // Check for CLI override first
                const override = await getPlatformOverride();
                if (override && PLATFORM_MAP[override]) {
                    setPlatform(PLATFORM_MAP[override].platform);
                    setHasUsbC(PLATFORM_MAP[override].hasUsbC);
                    return;
                }

                // Real detection
                const osString = getOs();
                setPlatform(osString);

                const usbC = await hasUsbTypeC();
                setHasUsbC(usbC);
            } catch {
                // Fall back to defaults if platform/USB-C detection fails.
                setPlatform('windows');
                setHasUsbC(true);
            }
        }
        fetchPlatformInfo();
    }, []);

    return { platform, hasUsbC };
}
