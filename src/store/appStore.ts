import { create } from 'zustand';
import type { AppState } from './types';

const initialState = {
    // Language
    language: 'en' as const,

    // Wizard
    currentStep: 'welcome' as const,
    canGoNext: false,

    // EULA
    eulaAccepted: false,

    // Download
    releasesManifest: null,
    releases: [],
    // Release track filter (design §3.7). Default `production`.
    selectedTrack: 'production' as const,
    selectedVersion: null,
    downloadStatus: 'idle' as const,
    downloadProgress: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    apkPath: null,

    connectionStatus: 'searching' as const,
    connectedDevice: null,

    // Installation / Uninstallation
    isUninstalling: false,

    // Installation
    installStatus: 'idle' as const,
    installSteps: [],
    currentInstallStep: 0,
    installLog: [],
    showGlobalLog: false,

    // Errors
    error: null,
};

export const useAppStore = create<AppState>((set) => ({
    ...initialState,

    // Language
    setLanguage: (language) => set({ language }),

    // Wizard
    setCurrentStep: (currentStep) => set({ currentStep }),
    setCanGoNext: (canGoNext) => set({ canGoNext }),

    // EULA
    setEulaAccepted: (eulaAccepted) => set({ eulaAccepted, canGoNext: eulaAccepted }),

    // Download
    setReleasesManifest: (releasesManifest) => set({ releasesManifest }),
    setReleases: (releases) => set({ releases }),
    setSelectedTrack: (selectedTrack) => set({ selectedTrack }),
    setSelectedVersion: (selectedVersion) => set({ selectedVersion }),
    setDownloadStatus: (downloadStatus) => set({ downloadStatus }),
    setDownloadProgress: (downloadProgress) => set({ downloadProgress }),
    setDownloadedBytes: (downloadedBytes) => set({ downloadedBytes }),
    setTotalBytes: (totalBytes) => set({ totalBytes }),
    setApkPath: (apkPath) => set({ apkPath }),

    // Connection
    setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
    setConnectedDevice: (connectedDevice) => set({
        connectedDevice,
        connectionStatus: connectedDevice ? 'connected' : 'searching',
    }),

    // Installation / Uninstallation
    setIsUninstalling: (isUninstalling) => set({ isUninstalling }),

    // Installation
    setInstallStatus: (installStatus) => set({ installStatus }),
    setInstallSteps: (installSteps) => set({ installSteps }),
    setCurrentInstallStep: (currentInstallStep) => set({ currentInstallStep }),
    addLogEntry: (entry) => set((state) => ({
        installLog: [
            ...state.installLog,
            {
                ...entry,
                timestamp: (() => {
                    const d = new Date();
                    const pad = (n: number) => n.toString().padStart(2, '0');
                    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
                })(),
            },
        ],
    })),
    clearLog: () => set({ installLog: [] }),
    setShowGlobalLog: (showGlobalLog) => set({ showGlobalLog }),

    // Errors
    setError: (error) => set({ error }),

    // Reset
    reset: () => set(initialState),
}));
