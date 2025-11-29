# State Management

## Overview

The application uses **Zustand** for global state management. Zustand is chosen for its simplicity, small bundle size, and TypeScript support.

## Store Structure

```typescript
// src/store/types.ts

import type { Release } from '../types/releases';
import type { AdbDevice } from '../types/adb';
import type { InstallStep } from '../types/install';

export type Language = 'en' | 'ru';

export type WizardStep = 'eula' | 'download' | 'connection' | 'install' | 'complete';

export type DownloadStatus = 'idle' | 'downloading' | 'verifying' | 'ready' | 'error';

export type ConnectionStatus = 'searching' | 'connected' | 'unauthorized' | 'error';

export type InstallStatus = 'idle' | 'running' | 'success' | 'error';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
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
  releases: Release[];
  setReleases: (releases: Release[]) => void;
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

  // Installation
  installStatus: InstallStatus;
  setInstallStatus: (status: InstallStatus) => void;
  installSteps: InstallStep[];
  setInstallSteps: (steps: InstallStep[]) => void;
  currentInstallStep: number;
  setCurrentInstallStep: (step: number) => void;
  installLog: LogEntry[];
  addLogEntry: (entry: Omit<LogEntry, 'timestamp'>) => void;
  clearLog: () => void;

  // Errors
  error: string | null;
  setError: (error: string | null) => void;

  // Reset
  reset: () => void;
}
```

## Store Implementation

```typescript
// src/store/appStore.ts

import { create } from 'zustand';
import type { AppState } from './types';

const initialState = {
  // Language
  language: 'en' as const,

  // Wizard
  currentStep: 'eula' as const,
  canGoNext: false,

  // EULA
  eulaAccepted: false,

  // Download
  releases: [],
  selectedVersion: null,
  downloadStatus: 'idle' as const,
  downloadProgress: 0,
  downloadedBytes: 0,
  totalBytes: 0,
  apkPath: null,

  // Connection
  connectionStatus: 'searching' as const,
  connectedDevice: null,

  // Installation
  installStatus: 'idle' as const,
  installSteps: [],
  currentInstallStep: 0,
  installLog: [],

  // Errors
  error: null,
};

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,

  // Language
  setLanguage: (language) => set({ language }),

  // Wizard
  setCurrentStep: (currentStep) => set({ currentStep }),
  setCanGoNext: (canGoNext) => set({ canGoNext }),

  // EULA
  setEulaAccepted: (eulaAccepted) => set({ eulaAccepted, canGoNext: eulaAccepted }),

  // Download
  setReleases: (releases) => set({ releases }),
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

  // Installation
  setInstallStatus: (installStatus) => set({ installStatus }),
  setInstallSteps: (installSteps) => set({ installSteps }),
  setCurrentInstallStep: (currentInstallStep) => set({ currentInstallStep }),
  addLogEntry: (entry) => set((state) => ({
    installLog: [
      ...state.installLog,
      {
        ...entry,
        timestamp: new Date().toISOString(),
      },
    ],
  })),
  clearLog: () => set({ installLog: [] }),

  // Errors
  setError: (error) => set({ error }),

  // Reset
  reset: () => set(initialState),
}));
```

## Usage in Components

```typescript
// Example: EulaScreen.tsx

import { useAppStore } from '../store';

export function EulaScreen() {
  const {
    eulaAccepted,
    setEulaAccepted,
    language,
  } = useAppStore();

  return (
    <div>
      <Checkbox
        checked={eulaAccepted}
        onChange={(_, data) => setEulaAccepted(data.checked === true)}
      />
    </div>
  );
}
```

## Selectors (Optional)

For performance optimization, use selectors to prevent unnecessary re-renders:

```typescript
// src/store/selectors.ts

import { useAppStore } from './appStore';

// Only re-render when language changes
export const useLanguage = () => useAppStore((state) => state.language);

// Only re-render when download progress changes
export const useDownloadProgress = () => useAppStore((state) => ({
  status: state.downloadStatus,
  progress: state.downloadProgress,
  downloaded: state.downloadedBytes,
  total: state.totalBytes,
}));

// Only re-render when connection status changes
export const useConnection = () => useAppStore((state) => ({
  status: state.connectionStatus,
  device: state.connectedDevice,
}));

// Only re-render when install status changes
export const useInstallProgress = () => useAppStore((state) => ({
  status: state.installStatus,
  steps: state.installSteps,
  currentStep: state.currentInstallStep,
  log: state.installLog,
}));
```

## State Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         App Start                                │
│                             │                                    │
│                             ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  EULA Screen                                            │    │
│  │  - eulaAccepted: false → true                           │    │
│  │  - canGoNext: false → true (when accepted)              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                             │                                    │
│                             ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Download Screen                                        │    │
│  │  - Fetch releases → setReleases()                       │    │
│  │  - Select version → setSelectedVersion()                │    │
│  │  - Download → downloadStatus: idle → downloading        │    │
│  │  - Progress → setDownloadProgress()                     │    │
│  │  - Complete → downloadStatus: ready, setApkPath()       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                             │                                    │
│                             ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Connection Screen                                      │    │
│  │  - Poll devices → connectionStatus: searching           │    │
│  │  - Device found → setConnectedDevice()                  │    │
│  │  - connectionStatus: connected                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                             │                                    │
│                             ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Install Screen                                         │    │
│  │  - Start → installStatus: running                       │    │
│  │  - Each step → setCurrentInstallStep(), addLogEntry()   │    │
│  │  - Complete → installStatus: success                    │    │
│  │  - Error → installStatus: error, setError()             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                             │                                    │
│                             ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Complete Screen                                        │    │
│  │  - Show success message                                 │    │
│  │  - Finish button → close app                            │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## DevTools (Development Only)

For debugging, you can add Zustand DevTools:

```typescript
// src/store/appStore.ts (development)

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // ... store implementation
    }),
    { name: 'VoboostInstaller' }
  )
);
```

This allows you to inspect state changes in browser DevTools (Redux DevTools extension).
