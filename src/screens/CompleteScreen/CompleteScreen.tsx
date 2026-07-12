import React from 'react';
import { Button, makeStyles } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import { WizardLayout } from '../../components/WizardLayout';
import { LogControls } from '../../components/LogControls';
import { injectBemClasses } from '../../utils/injectBemClasses';
import '../../components/MarkdownBlock';
import { getContent } from '../../content';
import { exitApp } from '../../services/platform';
import { CheckmarkCircle48Regular } from '@fluentui/react-icons';
import { useSharedStyles } from '../../styles/shared';
import { useAppStore } from '../../store';

const useStyles = makeStyles({
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '48px 24px',
        gap: '24px',
        height: '100%',
    },
    icon: {
        color: 'var(--colorSuccessForeground1)',
        marginBottom: '16px',
        transform: 'scale(1.5)',
    },
    footer: {
        display: 'flex',
        justifyContent: 'flex-end',
        width: '100%',
    },
});

export function CompleteScreen() {
    const styles = useStyles();
    const sharedStyles = useSharedStyles();
    const { t } = useTranslation();
    const { language } = useAppStore();
    const content = getContent('complete', language);

    const handleFinish = async () => {
        useAppStore.getState().addLogEntry({ level: 'info', message: 'User clicked Finish to close the application' });
        try {
            await exitApp(0);
        } catch {
            window.close();
        }
    };

    return (
        <WizardLayout
            footer={
                <div className={styles.footer}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <LogControls />
                    </div>
                    <div className={sharedStyles.footerActions}>
                        <Button appearance="primary" size="large" onClick={handleFinish} className={sharedStyles.primaryButton}>
                            {t('complete.button', 'Finish')}
                        </Button>
                    </div>
                </div>
            }
        >
            <div className={styles.container}>
                <CheckmarkCircle48Regular className={styles.icon} />
                <div style={{ textAlign: 'left', width: '100%', maxWidth: '600px' }} dangerouslySetInnerHTML={{ __html: injectBemClasses(content, 'page-content') }} />
            </div>
        </WizardLayout>
    );
}
