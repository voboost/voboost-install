export interface InstallStep {
    id: string;
    title: {
        en: string;
        ru: string;
    };
    command: string[];
    fatal: boolean;
    retryCount: number;
    retryDelaySecs: number;
}

export interface StepResult {
    stepId: string;
    success: boolean;
    output: string;
    error?: string;
}
