import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import ru from './ru.json';
import { detectSystemLanguage } from '../services/locale';

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            ru: { translation: ru },
        },
        lng: 'en',
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
    });

export async function initLanguage(): Promise<string> {
    const lang = await detectSystemLanguage();
    await i18n.changeLanguage(lang);
    return lang;
}

export default i18n;
