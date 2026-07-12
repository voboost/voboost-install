import { invoke } from '@tauri-apps/api/core';
import type { AdbDevice, CommandResult } from '../types/adb';
import type { InstallStep, StepResult } from '../types/install';
import type { StepDefinition } from '../types/releases';

export async function startAdbServer(): Promise<void> {
    return invoke('start_adb_server');
}

export async function getDevices(): Promise<AdbDevice[]> {
    return invoke('get_devices');
}

export async function executeAdb(
    args: string[],
    deviceSerial?: string
): Promise<CommandResult> {
    return invoke('execute_adb', { args, deviceSerial });
}

export async function getInstallSteps(
    apkPath: string,
    scenarioSteps?: StepDefinition[]
): Promise<InstallStep[]> {
    return invoke('get_install_steps', {
        apkPath,
        scenarioSteps: scenarioSteps ?? null,
        artifacts: null
    });
}

export async function getUninstallSteps(
    scenarioSteps?: StepDefinition[]
): Promise<InstallStep[]> {
    return invoke('get_uninstall_steps', {
        scenarioSteps: scenarioSteps ?? null
    });
}

export async function executeInstallStep(
    step: InstallStep,
    deviceSerial?: string
): Promise<StepResult> {
    return invoke('execute_install_step', { step, deviceSerial });
}

