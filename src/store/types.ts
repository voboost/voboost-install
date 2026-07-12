import type { Release, ReleasesManifest, ReleaseTrack } from '../types/releases';
import type { AdbDevice } from '../types/adb';

export type Language = 'en' | 'ru';

export type WizardStep = 'welcome' | 'eula' | 'download' | 'connection' | 'install' | 'complete';

export type DownloadStatus = 'idle' | 'downloading' | 'verifying' | 'ready' | 'error';

export type ConnectionStatus = 'searching' | 'connected' | 'unauthorized' | 'error';

export type InstallStatus = 'idle' | 'running' | 'success' | 'error';

export interface UIInstallStep {
    id: string;
    label: string;
    status: 'pending' | 'running' | 'success' | 'error';
    errorMessage?: string;
}

export interface LogEntry {
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'success' | 'empty';
    message: string;
}

export interface AppState {
    // Language
    language: Language;
    setLanguage: (lang: Language) => void;

    // Wizard navigation
    currentStep: WizardStep;
    setCurrentStep: (step: WizardStep) => void;
    canGoNext: boolean;
    setCanGoNext: (can: boolean) => void;

    // EULA
    eulaAccepted: boolean;
    setEulaAccepted: (accepted: boolean) => void;

    // Download
    releasesManifest: ReleasesManifest | null;
    setReleasesManifest: (manifest: ReleasesManifest | null) => void;
    releases: Release[];
    setReleases: (releases: Release[]) => void;
    // Release track filter (design §3.7). Default `production`; set to
    // `testing` for the emulator test cycle. The version picker lists
    // `component === 'app' && track === selectedTrack` releases.
    selectedTrack: ReleaseTrack;
    setSelectedTrack: (track: ReleaseTrack) => void;
    selectedVersion: string | null;
    setSelectedVersion: (version: string | null) => void;
    downloadStatus: DownloadStatus;
    setDownloadStatus: (status: DownloadStatus) => void;
    downloadProgress: number;
    setDownloadProgress: (progress: number) => void;
    downloadedBytes: number;
    setDownloadedBytes: (bytes: number) => void;
    totalBytes: number;
    setTotalBytes: (bytes: number) => void;
    apkPath: string | null;
    setApkPath: (path: string | null) => void;

    // Connection
    connectionStatus: ConnectionStatus;
    setConnectionStatus: (status: ConnectionStatus) => void;
    connectedDevice: AdbDevice | null;
    setConnectedDevice: (device: AdbDevice | null) => void;

    // Installation / Uninstallation
    isUninstalling: boolean;
    setIsUninstalling: (isUninstalling: boolean) => void;

    // Installation
    installStatus: InstallStatus;
    setInstallStatus: (status: InstallStatus) => void;
    installSteps: UIInstallStep[];
    setInstallSteps: (steps: UIInstallStep[]) => void;
    currentInstallStep: number;
    setCurrentInstallStep: (step: number) => void;
    installLog: LogEntry[];
    addLogEntry: (entry: Omit<LogEntry, 'timestamp'>) => void;
    clearLog: () => void;
    showGlobalLog: boolean;
    setShowGlobalLog: (show: boolean) => void;

    // Errors
    error: string | null;
    setError: (error: string | null) => void;

    // Reset
    reset: () => void;
}
