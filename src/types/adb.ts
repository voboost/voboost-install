export interface AdbDevice {
    serial: string;
    state: string;
    model?: string;
    product?: string;
}

export interface CommandResult {
    success: boolean;
    exitCode: number | null;
    stdout: string;
    stderr: string;
}
