import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en';
import ru from './ru';

// Чтобы добавить язык: скопируйте en.ts → de.ts, переведите, допишите сюда.
export const LANGUAGES = {
  ru: { label: 'Русский', dictionary: ru },
  en: { label: 'English', dictionary: en },
} as const;

export type Language = keyof typeof LANGUAGES;

export function deviceLanguage(): Language {
  const code = getLocales()[0]?.languageCode;
  return code && code in LANGUAGES ? (code as Language) : 'ru';
}

// eslint-disable-next-line import/no-named-as-default-member
void i18n.use(initReactI18next).init({
  resources: Object.fromEntries(
    Object.entries(LANGUAGES).map(([code, { dictionary }]) => [code, { translation: dictionary }])
  ),
  lng: deviceLanguage(),
  fallbackLng: 'ru',
  interpolation: { escapeValue: false },
});

export default i18n;

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: typeof ru };
  }
}
