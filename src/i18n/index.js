import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from './locales/en.json';
import koTranslations from './locales/ko.json';

const resources = {
  en: {
    translation: enTranslations
  },
  ko: {
    translation: koTranslations
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ko', // Default to Korean
    
    detection: {
      order: ['navigator'],
      caches: []
    },

    interpolation: {
      escapeValue: false // React already does escaping
    },

    react: {
      useSuspense: false
    }
  });

export default i18n;