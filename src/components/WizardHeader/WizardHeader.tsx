import React from 'react';
import { useWizard } from 'react-use-wizard';
import { StepIndicator, Step } from '../StepIndicator';
import { Logo } from '../Logo';
import './WizardHeader.css';

export function WizardHeader({ steps }: { steps: Step[] }) {
    const { activeStep } = useWizard();

    // WelcomeScreen handles its own layout, we don't need a header offset here
    if (activeStep === 0) return null;

    return (
        <div className="wizard-header">
            <Logo className="wizard-header__logo" />
            <div className="wizard-header__steps">
                <StepIndicator steps={steps} currentStep={activeStep - 1} />
            </div>
        </div>
    );
}
