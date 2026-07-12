import React, { useState } from 'react';
import {
    Button,
    Textarea,
    Dialog,
    DialogTrigger,
    DialogSurface,
    DialogTitle,
    DialogBody,
    DialogActions
} from '@fluentui/react-components';
import {
    DocumentText24Regular,
    Copy24Regular,
    Checkmark24Regular
} from '@fluentui/react-icons';
import { invoke } from '@tauri-apps/api/core';
import type { LogEntry } from '../../store/types';

interface LogViewerProps {
    logs: LogEntry[];
    title?: string;
}

export function LogViewer({ logs, title = 'Installation Log' }: LogViewerProps) {
    const [copied, setCopied] = useState(false);

    const logText = logs
        .map(entry => `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`)
        .join('\n');

    const copyToClipboard = async () => {
        try {
            await invoke('write_text', { text: logText });
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard write failed; copied state stays false.
        }
    };

    return (
        <Dialog>
            <DialogTrigger disableButtonEnhancement>
                <Button
                    appearance="subtle"
                    icon={<DocumentText24Regular />}
                >
                    View Log
                </Button>
            </DialogTrigger>

            <DialogSurface>
                <DialogTitle>{title}</DialogTitle>
                <DialogBody>
                    <Textarea
                        value={logText}
                        readOnly
                        resize="vertical"
                        style={{
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            minHeight: '400px',
                            width: '100%',
                        }}
                    />
                </DialogBody>
                <DialogActions>
                    <Button
                        appearance="secondary"
                        icon={copied ? <Checkmark24Regular /> : <Copy24Regular />}
                        onClick={copyToClipboard}
                    >
                        {copied ? 'Copied!' : 'Copy to Clipboard'}
                    </Button>
                    <DialogTrigger disableButtonEnhancement>
                        <Button appearance="primary">Close</Button>
                    </DialogTrigger>
                </DialogActions>
            </DialogSurface>
        </Dialog>
    );
}
