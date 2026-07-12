import { locale } from '@tauri-apps/plugin-os';
import type { Language } from '../store/types';

export async function detectSystemLanguage(): Promise<Language> {
    try {
        const systemLocale = await locale();
        // systemLocale returns e.g. "ru-RU", "en-US", "ru", "en"
        if (systemLocale && systemLocale.startsWith('ru')) {
            return 'ru';
        }
    } catch {
        // Fallback: in dev mode or if plugin fails, try navigator.language
        if (typeof navigator !== 'undefined') {
            const navLang = navigator.language || navigator.languages?.[0];
            if (navLang && navLang.startsWith('ru')) {
                return 'ru';
            }
        }
    }
    return 'en';
}
