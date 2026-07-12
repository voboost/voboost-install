import { useAppStore } from './appStore';

export const useLanguage = () => useAppStore((state) => state.language);

export const useDownloadProgress = () =>
    useAppStore((state) => ({
        status: state.downloadStatus,
        progress: state.downloadProgress,
        downloaded: state.downloadedBytes,
        total: state.totalBytes,
    }));

export const useConnection = () =>
    useAppStore((state) => ({
        status: state.connectionStatus,
        device: state.connectedDevice,
    }));

export const useInstallProgress = () =>
    useAppStore((state) => ({
        status: state.installStatus,
        steps: state.installSteps,
        currentStep: state.currentInstallStep,
        log: state.installLog,
    }));
