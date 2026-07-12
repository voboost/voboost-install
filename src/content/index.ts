import { html as welcomeEn } from '../../content/1-welcome-en.md';
import { html as welcomeRu } from '../../content/1-welcome-ru.md';
import { html as eulaTitleEn } from '../../content/2-eula-title-en.md';
import { html as eulaTitleRu } from '../../content/2-eula-title-ru.md';
import { html as eulaLicenseEn } from '../../content/2-eula-license-en.md';
import { html as eulaLicenseRu } from '../../content/2-eula-license-ru.md';
import { html as downloadEn } from '../../content/3-download-en.md';
import { html as downloadRu } from '../../content/3-download-ru.md';
import { html as connectionEn } from '../../content/4-connection-en.md';
import { html as connectionRu } from '../../content/4-connection-ru.md';
import { html as connectionStep1WinNewEn } from '../../content/4-connection-step1-win-new-en.md';
import { html as connectionStep1WinNewRu } from '../../content/4-connection-step1-win-new-ru.md';
import { html as connectionStep1WinOldEn } from '../../content/4-connection-step1-win-old-en.md';
import { html as connectionStep1WinOldRu } from '../../content/4-connection-step1-win-old-ru.md';
import { html as connectionStep1MacNewEn } from '../../content/4-connection-step1-mac-new-en.md';
import { html as connectionStep1MacNewRu } from '../../content/4-connection-step1-mac-new-ru.md';
import { html as connectionStep1MacOldEn } from '../../content/4-connection-step1-mac-old-en.md';
import { html as connectionStep1MacOldRu } from '../../content/4-connection-step1-mac-old-ru.md';
import { html as connectionStep2En } from '../../content/4-connection-step2-en.md';
import { html as connectionStep2Ru } from '../../content/4-connection-step2-ru.md';
import { html as connectionStep3En } from '../../content/4-connection-step3-en.md';
import { html as connectionStep3Ru } from '../../content/4-connection-step3-ru.md';
import { html as installEn } from '../../content/5-install-en.md';
import { html as installRu } from '../../content/5-install-ru.md';
import { html as completeEn } from '../../content/6-complete-en.md';
import { html as completeRu } from '../../content/6-complete-ru.md';

export const content = {
    welcome: { en: welcomeEn, ru: welcomeRu },
    eulaTitle: { en: eulaTitleEn, ru: eulaTitleRu },
    eulaLicense: { en: eulaLicenseEn, ru: eulaLicenseRu },
    download: { en: downloadEn, ru: downloadRu },
    connection: { en: connectionEn, ru: connectionRu },
    connectionStep2: { en: connectionStep2En, ru: connectionStep2Ru },
    connectionStep3: { en: connectionStep3En, ru: connectionStep3Ru },
    connectionStep1WinNew: { en: connectionStep1WinNewEn, ru: connectionStep1WinNewRu },
    connectionStep1WinOld: { en: connectionStep1WinOldEn, ru: connectionStep1WinOldRu },
    connectionStep1MacNew: { en: connectionStep1MacNewEn, ru: connectionStep1MacNewRu },
    connectionStep1MacOld: { en: connectionStep1MacOldEn, ru: connectionStep1MacOldRu },
    install: { en: installEn, ru: installRu },
    complete: { en: completeEn, ru: completeRu },
} as const;

export type ContentKey = keyof typeof content;

export function getContent(key: ContentKey, language: string): string {
    const entry = content[key];
    return (entry as Record<string, string>)[language] ?? (entry as Record<string, string>).en;
}

export function getConnectionStep1Content(platform: string, hasUsbC: boolean, language: string): string {
    // Determine the appropriate content key based on platform and USB-C capability
    let contentKey: ContentKey;

    if (platform === 'macos') {
        contentKey = hasUsbC ? 'connectionStep1MacNew' : 'connectionStep1MacOld';
    } else {
        contentKey = hasUsbC ? 'connectionStep1WinNew' : 'connectionStep1WinOld';
    }

    return getContent(contentKey, language);
}

