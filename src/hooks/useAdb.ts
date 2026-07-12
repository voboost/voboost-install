import { useState, useEffect, useCallback, useRef } from 'react';
import { getDevices, startAdbServer } from '../services/adb';
import type { AdbDevice } from '../types/adb';

const POLL_INTERVAL = 2000; // 2 seconds

export function useAdbDevices() {
    const [devices, setDevices] = useState<AdbDevice[]>([]);
    const [isPolling, setIsPolling] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Refs to prevent race conditions
    const isPollingRef = useRef(false);
    const isMountedRef = useRef(true);

    const startPolling = useCallback(async () => {
        setIsPolling(true);
        isPollingRef.current = true;
        setError(null);

        try {
            await startAdbServer();
        } catch {
            if (isMountedRef.current) {
                setError('Failed to start ADB server');
                setIsPolling(false);
                isPollingRef.current = false;
            }
            return;
        }
    }, []);

    const stopPolling = useCallback(() => {
        setIsPolling(false);
        isPollingRef.current = false;
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (!isPolling) return;

        let isPollInProgress = false;

        const poll = async () => {
            if (isPollInProgress || !isPollingRef.current) return;

            isPollInProgress = true;
            try {
                const deviceList = await getDevices();
                if (isMountedRef.current && isPollingRef.current) {
                    setDevices(deviceList);
                    setError(null);
                }
            } catch {
                if (isMountedRef.current && isPollingRef.current) {
                    setError('Failed to get devices');
                }
            } finally {
                isPollInProgress = false;
            }
        };

        poll();
        const interval = setInterval(poll, POLL_INTERVAL);

        return () => {
            clearInterval(interval);
            isPollInProgress = false;
        };
    }, [isPolling]);

    const connectedDevice = devices.find(d => d.state === 'device');
    const unauthorizedDevice = devices.find(d => d.state === 'unauthorized');

    return {
        devices,
        connectedDevice,
        unauthorizedDevice,
        isPolling,
        error,
        startPolling,
        stopPolling,
    };
}
