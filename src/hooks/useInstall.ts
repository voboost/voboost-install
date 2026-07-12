import { useState, useCallback } from 'react';
import { useAppStore } from '../store';
import { getInstallSteps, getUninstallSteps, executeInstallStep } from '../services/adb';
import type { UIInstallStep } from '../store/types';
import type { StepDefinition } from '../types/releases';

export function useInstall() {
    const {
        apkPath,
        connectedDevice,
        installStatus,
        setInstallStatus,
        setInstallSteps,
        setCurrentInstallStep,
        addLogEntry,
        setError,
        language,
        isUninstalling,
        selectedVersion,
        releasesManifest
    } = useAppStore();

    const [isInstalling, setIsInstalling] = useState(false);

    // Get scenario steps for the selected version
    const getScenarioSteps = useCallback((): StepDefinition[] | undefined => {
        if (!selectedVersion || !releasesManifest) {
            return undefined;
        }

        const release = releasesManifest.releases.find(r => r.version === selectedVersion);
        if (!release) {
            return undefined;
        }

        const scenarioKey = isUninstalling ? release.uninstallScenario : release.installScenario;
        if (!scenarioKey || !releasesManifest.scenarios) {
            return undefined;
        }

        const scenarios = isUninstalling
            ? releasesManifest.scenarios.uninstall
            : releasesManifest.scenarios.install;

        return scenarios?.[scenarioKey];
    }, [selectedVersion, releasesManifest, isUninstalling]);

    // Initialize steps when starting
    const initializeInstall = useCallback(async () => {
        if (!apkPath) {
            setError('No APK file selected or downloaded.');
            return false;
        }

        try {
            const scenarioSteps = getScenarioSteps();
            const dbSteps = isUninstalling
                ? await getUninstallSteps(scenarioSteps)
                : await getInstallSteps(apkPath, scenarioSteps);

            const uiSteps: UIInstallStep[] = dbSteps.map((step) => ({
                id: step.id,
                label: language === 'ru' ? step.title.ru : step.title.en,
                status: 'pending',
            }));

            setInstallSteps(uiSteps);
            setCurrentInstallStep(0);
            setInstallStatus('idle');
            addLogEntry({ level: 'info', message: 'Ready to install.' });

            return true;
        } catch {
            setError('Failed to query installation steps from adb service.');
            return false;
        }
    }, [apkPath, language, setInstallSteps, setCurrentInstallStep, setInstallStatus, addLogEntry, setError, getScenarioSteps, isUninstalling]);

    const startInstall = useCallback(async () => {
        if (!apkPath || isInstalling || installStatus === 'running') return;
        setIsInstalling(true);
        setInstallStatus('running');
        setError(null);
        addLogEntry({ level: 'info', message: 'Starting installation process...' });

        try {
            const scenarioSteps = getScenarioSteps();
            const dbSteps = isUninstalling
                ? await getUninstallSteps(scenarioSteps)
                : await getInstallSteps(apkPath, scenarioSteps);

            for (let i = 0; i < dbSteps.length; i++) {
                setCurrentInstallStep(i);

                // Update current step to running
                setInstallSteps(useAppStore.getState().installSteps.map((s, idx) => ({
                    ...s,
                    label: language === 'ru' ? dbSteps[idx].title.ru : dbSteps[idx].title.en,
                    status: idx === i ? 'running' : (idx < i ? 'success' : 'pending')
                })));

                addLogEntry({ level: 'info', message: `Executing step: ${dbSteps[i].title.en}` });

                const result = await executeInstallStep(dbSteps[i], connectedDevice?.serial);

                if (result.success) {
                    addLogEntry({ level: 'success', message: `Step ${dbSteps[i].title.en} completed.` });
                    // Log command output if available
                    if (result.output && result.output.trim()) {
                        addLogEntry({ level: 'info', message: `Output: ${result.output.trim()}` });
                    }
                } else {
                    addLogEntry({ level: 'error', message: `Step failed: ${result.error}` });
                    // Log error details if available
                    if (result.error && result.error.trim()) {
                        addLogEntry({ level: 'error', message: `Error details: ${result.error.trim()}` });
                    }

                    setInstallSteps(useAppStore.getState().installSteps.map((s, idx) => ({
                        ...s,
                        status: idx === i ? 'error' : (idx < i ? 'success' : 'pending'),
                        errorMessage: idx === i ? result.error : undefined
                    })));

                    setInstallStatus('error');
                    setError(`Installation failed at step: ${dbSteps[i].title.en}`);
                    setIsInstalling(false);
                    return;
                }
            }

            setInstallSteps(useAppStore.getState().installSteps.map(s => ({ ...s, status: 'success' })));
            setInstallStatus('success');
            addLogEntry({ level: 'success', message: 'Installation completed beautifully.' });
        } catch (e) {
            setInstallStatus('error');
            setError('Unexpected technical failure during installation.');
            addLogEntry({ level: 'error', message: `Fatal: ${e}` });
        } finally {
            setIsInstalling(false);
        }
    }, [apkPath, isInstalling, installStatus, setInstallStatus, setError, addLogEntry, setCurrentInstallStep, setInstallSteps, connectedDevice, language, getScenarioSteps, isUninstalling]);

    return {
        initializeInstall,
        startInstall,
        isInstalling,
    };
}
