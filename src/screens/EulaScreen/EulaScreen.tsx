import React, { useEffect } from 'react';
import { useWizard } from 'react-use-wizard';
import {
    Button,
    Checkbox
} from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import { WizardLayout } from '../../components/WizardLayout';
import { LogControls } from '../../components/LogControls';
import { useAppStore } from '../../store';
import { useSharedStyles } from '../../styles/shared';
import { injectBemClasses } from '../../utils/injectBemClasses';
import '../../components/MarkdownBlock';
import { getContent } from '../../content';
import './EulaScreen.css';

export function EulaScreen() {
    const sharedStyles = useSharedStyles();
    const { t } = useTranslation();
    const { nextStep, previousStep } = useWizard();
    const { language, addLogEntry } = useAppStore();
    const [accepted, setAccepted] = React.useState(false);
    useEffect(() => {
        addLogEntry({ level: 'info', message: 'EULA screen shown' });
    }, [addLogEntry]);

    const titleContent = getContent('eulaTitle', language);
    const licenseContent = getContent('eulaLicense', language);

    const footer = (
        <div className="eula-screen__footer">
            <div className="eula-screen__footer-left">
                <Button size="large" onClick={() => previousStep()}>
                    {t('common.back', 'Back')}
                </Button>
                <LogControls />
            </div>
            <div className={`${sharedStyles.footerActions} eula-screen__footer-actions`}>
                <div className="eula-screen__checkbox-wrapper">
                    <Checkbox
                        size="large"
                        label={t('eula.accept', 'I accept the license agreement')}
                        checked={accepted}
                        onChange={(_, data) => setAccepted(!!data.checked)}
                        className="eula-screen__checkbox"
                    />
                </div>
                <Button
                    appearance="primary"
                    size="large"
                    disabled={!accepted}
                    onClick={() => {
                        addLogEntry({ level: 'info', message: 'EULA accepted' });
                        addLogEntry({ level: 'empty', message: '' });
                        nextStep();
                    }}
                    className={sharedStyles.primaryButton}
                >
                    {t('common.next', 'Next')}
                </Button>
            </div>
        </div>
    );

    return (
        <WizardLayout
            footer={footer}
        >
            <div className="eula-screen__content-wrapper">
                <div dangerouslySetInnerHTML={{ __html: injectBemClasses(titleContent, 'page-title') }} />
                <div className="eula-screen__license-container scrollbar" dangerouslySetInnerHTML={{ __html: injectBemClasses(licenseContent, 'license-content') }} />
            </div>
        </WizardLayout>
    );
}
