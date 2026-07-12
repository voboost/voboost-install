import React from 'react';
import { Spinner, Text } from '@fluentui/react-components';
import {
    CheckmarkCircle24Filled,
    DismissCircle24Filled,
    Circle24Regular
} from '@fluentui/react-icons';
import './InstallStep.css';

type StepStatus = 'pending' | 'running' | 'success' | 'error';

interface InstallStepProps {
    label: string;
    status: StepStatus;
    errorMessage?: string;
}

export function InstallStep({ label, status, errorMessage }: InstallStepProps) {
    const getIcon = () => {
        switch (status) {
            case 'pending':
                return <Circle24Regular className="install-step__icon install-step__icon_pending" />;
            case 'running':
                return <Spinner size="tiny" className="install-step__icon" />;
            case 'success':
                return <CheckmarkCircle24Filled className="install-step__icon install-step__icon_success" />;
            case 'error':
                return <DismissCircle24Filled className="install-step__icon install-step__icon_error" />;
        }
    };

    return (
        <div className={`install-step install-step_status_${status}`}>
            <div className="install-step__icon-container">
                {getIcon()}
            </div>
            <div className="install-step__content">
                <Text weight={status === 'running' ? 'semibold' : 'regular'} className="install-step__label">
                    {label}
                </Text>
                {status === 'error' && errorMessage && (
                    <Text className="install-step__error-message">
                        {errorMessage}
                    </Text>
                )}
            </div>
        </div>
    );
}
