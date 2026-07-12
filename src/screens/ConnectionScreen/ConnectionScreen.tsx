import React, { useEffect, useRef } from 'react';
import { useWizard } from 'react-use-wizard';
import { Button, Text, makeStyles, tokens, Spinner } from '@fluentui/react-components';
import { CheckmarkCircle24Filled, Warning24Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import { WizardLayout } from '../../components/WizardLayout';
import { LogControls } from '../../components/LogControls';
import { injectBemClasses } from '../../utils/injectBemClasses';
import '../../components/MarkdownBlock';
import { getContent, getConnectionStep1Content } from '../../content';
import { InstructionCarousel } from '../../components/InstructionCarousel';
import { useAppStore } from '../../store';
import { useAdbDevices, usePlatform } from '../../hooks';
import { useSharedStyles } from '../../styles/shared';

const useStyles = makeStyles({
    container: {
        display: 'flex',
        flexDirection: 'column',
    },
    statusSection: {
        marginTop: '24px',
        padding: '16px',
        backgroundColor: 'var(--colorNeutralBackground2)',
        borderRadius: '8px',
    },
    footer: {
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
    }
});

export function ConnectionScreen() {
    const styles = useStyles();
    const sharedStyles = useSharedStyles();
    const { t } = useTranslation();
    const { nextStep, previousStep } = useWizard();
    const { platform, hasUsbC } = usePlatform();

    const {
        connectionStatus,
        setConnectionStatus,
        setConnectedDevice,
        language,
        addLogEntry
    } = useAppStore();

    const content = getContent('connection', language);

    const {
        connectedDevice,
        unauthorizedDevice,
        error,
        startPolling,
        stopPolling,
    } = useAdbDevices();

    // Instructions for connecting the device - loaded from MD files
    const step1Html = injectBemClasses(getConnectionStep1Content(platform, hasUsbC, language), 'page-content');
    const step2Html = injectBemClasses(getContent('connectionStep2', language), 'page-content');
    const step3Html = injectBemClasses(getContent('connectionStep3', language), 'page-content');

    const instructions = [
        step1Html,
        step2Html,
        step3Html,
    ];

    useEffect(() => {
        startPolling();
        return () => {
            stopPolling();
        };
    }, [startPolling, stopPolling]);

    useEffect(() => {
        if (connectedDevice) {
            const model = (connectedDevice.model || '').toLowerCase();
            const product = (connectedDevice.product || '').toLowerCase();
            const isVoyah = model.includes('voyah') || product.includes('voyah') || model.includes('free') || model.includes('dream') || model.includes('passion') || model.includes('zhiyin');

            if (!isVoyah) {
                setConnectionStatus('error');
                setConnectedDevice(null);
            } else {
                setConnectionStatus('connected');
                setConnectedDevice(connectedDevice);
            }
        } else if (unauthorizedDevice) {
            setConnectionStatus('unauthorized');
            setConnectedDevice(null);
        } else if (error) {
            setConnectionStatus('error');
            setConnectedDevice(null);
        } else {
            setConnectionStatus('searching');
            setConnectedDevice(null);
        }
    }, [connectedDevice, unauthorizedDevice, error, setConnectionStatus, setConnectedDevice]);

    const prevStatusRef = useRef<string | null>(null);

    useEffect(() => {
        if (connectionStatus !== prevStatusRef.current) {
            prevStatusRef.current = connectionStatus;

            if (connectionStatus === 'searching') {
                addLogEntry({ level: 'info', message: 'Trying to connect to vehicle' });
            } else if (connectionStatus === 'connected' && connectedDevice) {
                addLogEntry({ level: 'success', message: `Connected to vehicle: ${connectedDevice.model || connectedDevice.product}` });
            } else if (connectionStatus === 'error') {
                addLogEntry({ level: 'error', message: !error && connectedDevice ? `Unrecognized device: ${connectedDevice.model}` : 'Connection error' });
            } else if (connectionStatus === 'unauthorized') {
                addLogEntry({ level: 'warn', message: 'Device found, waiting for USB debugging approval on screen' });
            }
        }
    }, [connectionStatus, connectedDevice, error, addLogEntry]);

    return (
        <WizardLayout
            footer={
                <div className={styles.footer}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button size="large" onClick={() => previousStep()}>
                            {t('common.back', 'Back')}
                        </Button>
                        <LogControls />
                    </div>
                    <div className={sharedStyles.footerActions}>
                        <Button
                            appearance="primary"
                            size="large"
                            disabled={connectionStatus !== 'connected'}
                            onClick={() => {
                                addLogEntry({ level: 'info', message: 'Proceeding to installation' });
                                addLogEntry({ level: 'empty', message: '' });
                                nextStep();
                            }}
                            className={sharedStyles.primaryButton}
                        >
                            {t('common.next', 'Next')}
                        </Button>
                    </div>
                </div>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
                <div dangerouslySetInnerHTML={{ __html: injectBemClasses(content, 'page-title') }} />

                <InstructionCarousel instructions={instructions} />

                {/* Connection Status Display */}
                <div className={styles.statusSection}>
                    {connectionStatus === 'searching' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Spinner size="small" />
                            <Text>{t('connection.searching', 'Searching for device...')}</Text>
                        </div>
                    )}
                    {connectionStatus === 'connected' && connectedDevice && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: tokens.colorPaletteGreenForeground1 }}>
                            <CheckmarkCircle24Filled />
                            <Text weight="semibold">
                                {t('connection.connected', 'Connected')}: {connectedDevice.model || connectedDevice.product || connectedDevice.serial}
                            </Text>
                        </div>
                    )}
                    {connectionStatus === 'unauthorized' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: tokens.colorPaletteYellowForeground1 }}>
                            <Warning24Regular />
                            <Text>{t('connection.unauthorized', 'Device found. Please approve USB debugging on your vehicle screen.')}</Text>
                        </div>
                    )}
                    {connectionStatus === 'error' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: tokens.colorPaletteRedForeground1 }}>
                            <Warning24Regular />
                            <Text>{error || t('connection.error', 'Connection error or unrecognized device')}</Text>
                        </div>
                    )}
                </div>
            </div>
        </WizardLayout>
    );
}
