import React from 'react';
import './WizardLayout.css';

interface WizardLayoutProps {
    children: React.ReactNode;
    footer?: React.ReactNode;
}

import { useAppStore } from '../../store';

export function WizardLayout({ children, footer }: WizardLayoutProps) {
    const { showGlobalLog, installLog } = useAppStore();
    const logText = installLog
        .map(entry => entry.level === 'empty' ? '' : `[${entry.timestamp}] ${entry.message}`)
        .join('\n');
    const logRef = React.useRef<HTMLTextAreaElement>(null);

    React.useEffect(() => {
        if (logRef.current && showGlobalLog) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [installLog, showGlobalLog]);

    return (
        <div className="wizard-layout">
            <main className="wizard-layout__content scrollbar"
                  style={showGlobalLog ? { overflow: 'hidden' } : undefined}>
                <div className="wizard-layout__content-inner">
                    {showGlobalLog ? (
                        <div className="wizard-layout__log">
                            <textarea
                                className="wizard-layout__log-textarea scrollbar"
                                value={logText}
                                readOnly
                                ref={logRef}
                            />
                        </div>
                    ) : children}
                </div>
            </main>
            {footer && (
                <footer className="wizard-layout__footer">
                    {footer}
                </footer>
            )}
        </div>
    );
}
