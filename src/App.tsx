import React, { useEffect } from 'react';
import { Wizard } from 'react-use-wizard';
import {
    FluentProvider,
    webLightTheme,
    webDarkTheme
} from '@fluentui/react-components';
import { useAppStore } from './store';
import { getVersion } from '@tauri-apps/api/app';
import { useDarkMode } from './hooks/useDarkMode';

import { WizardHeader } from './components/WizardHeader';

// Screens
import { WelcomeScreen } from './screens/WelcomeScreen';
import { EulaScreen } from './screens/EulaScreen';
import { DownloadScreen } from './screens/DownloadScreen';
import { ConnectionScreen } from './screens/ConnectionScreen';
import { InstallScreen } from './screens/InstallScreen';
import { CompleteScreen } from './screens/CompleteScreen';

import { useTranslation } from 'react-i18next';
import './App.css';

function App() {
    const isDarkMode = useDarkMode();
    const theme = isDarkMode ? webDarkTheme : webLightTheme;
    const { currentStep, isUninstalling } = useAppStore();
    const { t } = useTranslation();

    useEffect(() => {
        getVersion().then(v => {
            useAppStore.getState().addLogEntry({ level: 'info', message: `Voboost Install ${v} started` });
        }).catch(() => {
            useAppStore.getState().addLogEntry({ level: 'info', message: 'Voboost Install started' });
        });
    }, []);

    const steps = [
        { id: 'eula', label: t('steps.license', 'License') },
        { id: 'download', label: t('steps.download', 'Download') },
        { id: 'connection', label: t('steps.connect', 'Connect') },
        { id: 'install', label: isUninstalling ? t('steps.uninstall', 'Uninstall') : t('steps.install', 'Install') },
        { id: 'complete', label: t('steps.done', 'Done') }
    ];

    const getStepIndex = () => {
        // CurrentStep tracks the formal 'eula', 'download', etc points.
        // The Wizard has WelcomeScreen at children index 0, so we offset by 1.
        // If the store is technically on "eula", then EULA is the 1st children index.
        const i = steps.findIndex(s => s.id === currentStep);
        return i === -1 ? 0 : i + 1;
    };

    return (
        <FluentProvider theme={theme} style={{ height: '100vh', width: '100vw' }}>
            <div className="app-container">
                <Wizard
                    startIndex={getStepIndex()}
                    header={<WizardHeader steps={steps} />}
                >
                    <WelcomeScreen />
                    <EulaScreen />
                    <DownloadScreen />
                    <ConnectionScreen />
                    <InstallScreen />
                    <CompleteScreen />
                </Wizard>
            </div>
        </FluentProvider>
    );
}

export default App;
