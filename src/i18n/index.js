import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import de from './locales/de.json'
import fr from './locales/fr.json'
import es from './locales/es.json'

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            de: { translation: de },
            fr: { translation: fr },
            es: { translation: es },
        },
        fallbackLng: 'en',
        supportedLngs: ['en', 'de', 'fr', 'es'],
        detection: {
            order: ['localStorage', 'navigator', 'htmlTag'],
            caches: ['localStorage'],
        },
        interpolation: {
            escapeValue: false,
        },
    })

export default i18n
