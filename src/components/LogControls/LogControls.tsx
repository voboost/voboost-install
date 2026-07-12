import React, { useState } from 'react';
import { ToggleButton, Button, Tooltip } from '@fluentui/react-components';
import { Copy24Regular, Checkmark24Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../../store';
import './LogControls.css';

export function LogControls() {
    const { t } = useTranslation();
    const { showGlobalLog, setShowGlobalLog, installLog } = useAppStore();
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        const logText = installLog
            .map(entry => entry.level === 'empty' ? '' : `[${entry.timestamp}] ${entry.message}`)
            .join('\n');

        try {
            // Use the clipboard-manager plugin's built-in command
            await invoke('plugin:clipboard-manager|write_text', { text: logText });
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard write failed; the copied state simply stays false.
        }
    };

    return (
        <div className="log-controls">
            <ToggleButton
                size="large"
                checked={showGlobalLog}
                onClick={() => setShowGlobalLog(!showGlobalLog)}
            >
                Log
            </ToggleButton>

            {showGlobalLog && (
                <Tooltip
                    content={copied ? t('common.copied', 'Copied!') : t('common.copyLog', 'Copy Log')}
                    relationship="label"
                >
                    <Button
                        size="large"
                        icon={copied ? <Checkmark24Regular /> : <Copy24Regular />}
                        appearance="subtle"
                        onClick={handleCopy}
                        aria-label={t('common.copyLog', 'Copy Log')}
                    />
                </Tooltip>
            )}
        </div>
    );
}
