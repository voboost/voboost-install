import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../src/store/appStore';

describe('AppStore', () => {
    beforeEach(() => {
        useAppStore.getState().reset();
    });

    describe('language', () => {
        it('should default to English', () => {
            expect(useAppStore.getState().language).toBe('en');
        });

        it('should change language', () => {
            useAppStore.getState().setLanguage('ru');
            expect(useAppStore.getState().language).toBe('ru');
        });
    });

    describe('EULA', () => {
        it('should not be accepted by default', () => {
            expect(useAppStore.getState().eulaAccepted).toBe(false);
        });

        it('should enable next when accepted', () => {
            useAppStore.getState().setEulaAccepted(true);
            expect(useAppStore.getState().eulaAccepted).toBe(true);
            expect(useAppStore.getState().canGoNext).toBe(true);
        });
    });

    describe('download', () => {
        it('should track download progress', () => {
            useAppStore.getState().setDownloadProgress(50);
            useAppStore.getState().setDownloadedBytes(5000000);
            useAppStore.getState().setTotalBytes(10000000);

            expect(useAppStore.getState().downloadProgress).toBe(50);
            expect(useAppStore.getState().downloadedBytes).toBe(5000000);
        });

        it('should default the release track to production', () => {
            expect(useAppStore.getState().selectedTrack).toBe('production');
        });

        it('should change the selected track', () => {
            useAppStore.getState().setSelectedTrack('testing');
            expect(useAppStore.getState().selectedTrack).toBe('testing');
            useAppStore.getState().setSelectedTrack('dev');
            expect(useAppStore.getState().selectedTrack).toBe('dev');
        });
    });

    describe('installation log', () => {
        it('should add log entries with timestamp', () => {
            useAppStore.getState().addLogEntry({ level: 'info', message: 'Test message' });

            const log = useAppStore.getState().installLog;
            expect(log).toHaveLength(1);
            expect(log[0].message).toBe('Test message');
            expect(log[0].timestamp).toBeDefined();
        });
    });

    describe('device state', () => {
        it('should handle connected device state', () => {
            expect(useAppStore.getState().connectionStatus).toBe('searching');
            expect(useAppStore.getState().connectedDevice).toBeNull();

            const mockDevice = { serial: 'device1', state: 'device', model: 'TestModel', usb: '' };
            useAppStore.getState().setConnectedDevice(mockDevice);

            expect(useAppStore.getState().connectedDevice).toEqual(mockDevice);
            expect(useAppStore.getState().connectionStatus).toBe('connected');

            useAppStore.getState().setConnectedDevice(null);
            expect(useAppStore.getState().connectionStatus).toBe('searching');
        });
    });

    describe('wizard navigation', () => {
        it('should handle step changes and goNext flags', () => {
            expect(useAppStore.getState().currentStep).toBe('welcome');

            useAppStore.getState().setCurrentStep('download');
            expect(useAppStore.getState().currentStep).toBe('download');

            expect(useAppStore.getState().canGoNext).toBe(false);
            useAppStore.getState().setCanGoNext(true);
            expect(useAppStore.getState().canGoNext).toBe(true);
        });
    });

    describe('install steps', () => {
        it('should store and replace install steps', () => {
            const steps = [
                { id: 'root', label: 'Root', status: 'pending' as const },
                { id: 'install-apk', label: 'Install APK', status: 'pending' as const },
            ];
            useAppStore.getState().setInstallSteps(steps);
            expect(useAppStore.getState().installSteps).toHaveLength(2);
            expect(useAppStore.getState().installSteps[1].id).toBe('install-apk');

            // Replace with a different list.
            useAppStore.getState().setInstallSteps([
                { id: 'reboot', label: 'Reboot', status: 'pending' },
            ]);
            expect(useAppStore.getState().installSteps).toHaveLength(1);
            expect(useAppStore.getState().installSteps[0].id).toBe('reboot');
        });

        it('should track current install step index', () => {
            useAppStore.getState().setCurrentInstallStep(3);
            expect(useAppStore.getState().currentInstallStep).toBe(3);
        });

        it('should track install status transitions', () => {
            useAppStore.getState().setInstallStatus('running');
            expect(useAppStore.getState().installStatus).toBe('running');
            useAppStore.getState().setInstallStatus('success');
            expect(useAppStore.getState().installStatus).toBe('success');
            useAppStore.getState().setInstallStatus('error');
            expect(useAppStore.getState().installStatus).toBe('error');
        });
    });

    describe('install log', () => {
        it('should append multiple log entries in order', () => {
            useAppStore.getState().addLogEntry({ level: 'info', message: 'first' });
            useAppStore.getState().addLogEntry({ level: 'success', message: 'second' });
            useAppStore.getState().addLogEntry({ level: 'error', message: 'third' });

            const log = useAppStore.getState().installLog;
            expect(log).toHaveLength(3);
            expect(log[0].message).toBe('first');
            expect(log[1].message).toBe('second');
            expect(log[2].message).toBe('third');
            // Each entry gets a timestamp.
            expect(log[0].timestamp).toBeDefined();
            expect(log[1].timestamp).toBeDefined();
        });

        it('should clear the log', () => {
            useAppStore.getState().addLogEntry({ level: 'info', message: 'to be cleared' });
            expect(useAppStore.getState().installLog).toHaveLength(1);
            useAppStore.getState().clearLog();
            expect(useAppStore.getState().installLog).toHaveLength(0);
        });
    });

    describe('isUninstalling flag', () => {
        it('should default to false and toggle', () => {
            expect(useAppStore.getState().isUninstalling).toBe(false);
            useAppStore.getState().setIsUninstalling(true);
            expect(useAppStore.getState().isUninstalling).toBe(true);
        });
    });

    describe('reset', () => {
        it('should restore the full initial state', () => {
            // Mutate a spread of fields.
            useAppStore.getState().setLanguage('ru');
            useAppStore.getState().setCurrentStep('install');
            useAppStore.getState().setEulaAccepted(true);
            useAppStore.getState().setDownloadStatus('ready');
            useAppStore.getState().setInstallStatus('success');
            useAppStore.getState().setIsUninstalling(true);
            useAppStore.getState().addLogEntry({ level: 'info', message: 'log entry' });
            useAppStore.getState().setError('some error');

            // Reset.
            useAppStore.getState().reset();

            const s = useAppStore.getState();
            expect(s.language).toBe('en');
            expect(s.currentStep).toBe('welcome');
            expect(s.eulaAccepted).toBe(false);
            expect(s.canGoNext).toBe(false);
            expect(s.downloadStatus).toBe('idle');
            expect(s.installStatus).toBe('idle');
            expect(s.isUninstalling).toBe(false);
            expect(s.installLog).toHaveLength(0);
            expect(s.error).toBeNull();
            expect(s.installSteps).toHaveLength(0);
            expect(s.apkPath).toBeNull();
            expect(s.connectedDevice).toBeNull();
        });
    });
});
