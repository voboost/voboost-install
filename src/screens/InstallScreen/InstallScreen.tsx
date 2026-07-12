import React, { useEffect, useState } from 'react';
import { useWizard } from 'react-use-wizard';
import { Button, makeStyles, Text, MessageBar, MessageBarBody, tokens } from '@fluentui/react-components';
import { CheckmarkCircle24Filled } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import { WizardLayout } from '../../components/WizardLayout';
import { LogControls } from '../../components/LogControls';
import { injectBemClasses } from '../../utils/injectBemClasses';
import '../../components/MarkdownBlock';
import { getContent } from '../../content';
import { InstallStep } from '../../components/InstallStep';
import { LogViewer } from '../../components/LogViewer';
import { useAppStore } from '../../store';
import { useInstall } from '../../hooks/useInstall';
import { useSharedStyles } from '../../styles/shared';

const useStyles = makeStyles({
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
    },
    stepsContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        backgroundColor: 'var(--colorNeutralBackground2)',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid var(--colorNeutralStroke1)',
        minHeight: '200px',
    },
    footer: {
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
    }
});

export function InstallScreen() {
    const styles = useStyles();
    const sharedStyles = useSharedStyles();
    const { t } = useTranslation();
    const { nextStep, previousStep } = useWizard();

    const {
        installStatus,
        installSteps,
        installLog,
        error,
        language,
        addLogEntry
    } = useAppStore();

    const content = getContent('install', language);

    const { initializeInstall, startInstall, isInstalling } = useInstall();
    const [initDone, setInitDone] = useState(false);

    useEffect(() => {
        if (!initDone) {
            initializeInstall().then(() => {
                setInitDone(true);
            });
        }
    }, [initDone, initializeInstall]);

    const handleInstall = () => {
        startInstall();
    };

    const handleRetry = () => {
        addLogEntry({ level: 'info', message: 'Retrying installation...' });
        addLogEntry({ level: 'empty', message: '' });
        startInstall();
    };

    const footer = (
        <div className={styles.footer}>
            <div style={{ display: 'flex', gap: '8px' }}>
                <Button size="large" onClick={() => previousStep()} disabled={isInstalling}>
                    {t('common.back', 'Back')}
                </Button>
                <LogControls />
            </div>
            <div className={sharedStyles.footerActions}>
                {installStatus === 'error' && (
                    <Button
                        size="large"
                        onClick={handleRetry}
                        disabled={isInstalling}
                    >
                        {t('common.retry', 'Retry')}
                    </Button>
                )}
                <Button
                    appearance="primary"
                    size="large"
                    onClick={() => {
                        if (installStatus === 'success') {
                            addLogEntry({ level: 'info', message: 'Proceeding to completion screen' });
                            addLogEntry({ level: 'empty', message: '' });
                            nextStep();
                        } else {
                            handleInstall();
                        }
                    }}
                    disabled={installStatus === 'running' || !initDone}
                    className={sharedStyles.primaryButton}
                >
                    {installStatus === 'success' ? t('common.next', 'Next') : t('install.button', 'Start Installation')}
                </Button>
            </div>
        </div>
    );

    return (
        <WizardLayout
            footer={footer}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div dangerouslySetInnerHTML={{ __html: injectBemClasses(content, 'page-title') }} />
                {error && (
                    <MessageBar intent="error">
                        <MessageBarBody>{error}</MessageBarBody>
                    </MessageBar>
                )}

                {installStatus === 'success' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: tokens.colorPaletteGreenForeground1 }}>
                        <CheckmarkCircle24Filled />
                        <Text size={400} weight="semibold" style={{ fontSize: '18px', lineHeight: '1.5' }}>
                            {t('install.success')}
                        </Text>
                    </div>
                )}

                <div className={styles.stepsContainer}>
                    {installSteps.map((step) => (
                        <InstallStep
                            key={step.id}
                            label={step.label}
                            status={step.status}
                            errorMessage={step.errorMessage}
                        />
                    ))}
                </div>

                {(installLog.length > 0) && (
                    <LogViewer logs={installLog} />
                )}
            </div>
        </WizardLayout>
    );
}
