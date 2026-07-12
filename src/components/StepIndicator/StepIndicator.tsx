import React from 'react';
import { Checkmark24Filled } from '@fluentui/react-icons';
import './StepIndicator.css';

export interface Step {
    id: string;
    label: string;
}

interface StepIndicatorProps {
    steps: Step[];
    currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
    return (
        <div className="step-indicator" role="navigation" aria-label="Installation progress">
            {steps.map((step, index) => (
                <div
                    key={step.id}
                    className={`step-indicator__step ${index < currentStep ? 'step-indicator__step_completed' : ''} ${index === currentStep ? 'step-indicator__step_active' : ''}`}
                    aria-current={index === currentStep ? 'step' : undefined}
                >
                    <div className="step-indicator__number">
                        {index < currentStep ? (
                            <Checkmark24Filled />
                        ) : (
                            index + 1
                        )}
                    </div>
                    <span className="step-indicator__label" data-text={step.label}>{step.label}</span>
                    {index < steps.length - 1 && <div className="step-indicator__connector" />}
                </div>
            ))}
        </div>
    );
}
