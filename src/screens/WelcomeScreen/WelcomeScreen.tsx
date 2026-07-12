import React, { useEffect } from 'react';
import { useWizard } from 'react-use-wizard';
import { Button } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '../../components/LanguageSelector';
import { Logo } from '../../components/Logo';
import { exitApp } from '../../services/platform';
import { useSharedStyles } from '../../styles/shared';
import { useAppStore } from '../../store';
import { injectBemClasses } from '../../utils/injectBemClasses';
import '../../components/MarkdownBlock';
import { getContent } from '../../content';
import './WelcomeScreen.css';

export function WelcomeScreen() {
    const sharedStyles = useSharedStyles();
    const { t } = useTranslation();
    const { language, addLogEntry } = useAppStore();
    const { nextStep } = useWizard();
    useEffect(() => {
        addLogEntry({ level: 'info', message: 'Welcome screen shown' });
    }, [addLogEntry]);

    const content = getContent('welcome', language);

    return (
        <div className="welcome-screen__root">
            <div className="welcome-container">
                <div className="welcome-sidebar">
                    <Logo className="welcome-logo" />
                </div>

                <div className="welcome-content">
                    <div dangerouslySetInnerHTML={{ __html: injectBemClasses(content, 'page-content') }} />
                </div>
            </div>

            <div className="welcome-footer">
                <div className="welcome-footer__sidebar">
                    <Button size="large" onClick={() => exitApp(0)}>
                        {t('common.exit', 'Exit')}
                    </Button>
                </div>

                <div className="welcome-footer__content">
                    <LanguageSelector className="welcome-screen__dropdown" />

                    <Button
                        appearance="primary"
                        size="large"
                        onClick={() => {
                            addLogEntry({ level: 'empty', message: '' });
                            nextStep();
                        }}
                        className={sharedStyles.primaryButton}
                    >
                        {t('welcome.button', 'Start Installation')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
