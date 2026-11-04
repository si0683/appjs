import { reloadAppAsync } from 'expo';
import { getCalendars, getLocales } from 'expo-localization';
import i18n from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next';
import { I18nManager, Platform } from 'react-native';

import ru from './locales/ru.json';

// Языки приложения. Новый язык:
//   1) npm run i18n -- add de  (создаст locales/de.json с ключами из ru.json);
//   2) переведите файл (или выгрузите всё в CSV: npm run i18n -- export);
//   3) добавьте строку ниже и загрузчик в LOADERS;
//   4) название приложения и тексты разрешений — /locales/de.json в корне + app.json → locales.
// dir: 'rtl' — для арабского, иврита, фарси, урду: интерфейс зеркалится.
export const LANGUAGES = {
  ru: { label: 'Русский', dir: 'ltr' },
  en: { label: 'English', dir: 'ltr' },
  // ar: { label: 'العربية', dir: 'rtl' },
} as const satisfies Record<string, { label: string; dir: 'ltr' | 'rtl' }>;

export type Language = keyof typeof LANGUAGES;

// Базовый язык (ru) встроен в приложение, остальные грузятся только когда нужны:
// при 20 языках пользователь скачивает один.
const LOADERS: Record<Exclude<Language, 'ru'>, () => Promise<{ default: typeof ru }>> = {
  en: () => import('./locales/en.json'),
};

export function deviceLanguage(): Language {
  for (const locale of getLocales()) {
    const code = locale.languageCode;
    if (code && code in LANGUAGES) return code as Language;
  }
  return 'ru';
}

/** Регион телефона: валюта, часовой пояс, система мер — для форматов по умолчанию. */
export function deviceRegion() {
  const locale = getLocales()[0];
  return {
    languageTag: locale?.languageTag ?? 'ru-RU',
    region: locale?.regionCode ?? null,
    currency: locale?.currencyCode ?? null,
    measurementSystem: locale?.measurementSystem ?? 'metric',
    timeZone: getCalendars()[0]?.timeZone ?? null,
    uses24h: getCalendars()[0]?.uses24hourClock ?? true,
  };
}

export const isRtl = (language: Language) => {
  const info: { dir: 'ltr' | 'rtl' } = LANGUAGES[language];
  return info.dir === 'rtl';
};

/**
 * Направление письма. На телефоне смена LTR ↔ RTL требует перезапуска —
 * приложение перезапустится само. В браузере меняется атрибут dir у <html>.
 */
export async function applyDirection(language: Language) {
  const rtl = isRtl(language);
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    return;
  }
  if (I18nManager.isRTL === rtl) return;
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  await reloadAppAsync('direction');
}

// eslint-disable-next-line import/no-named-as-default-member
export const i18nReady = i18n
  .use(initReactI18next)
  .use(
    resourcesToBackend((language: string) =>
      language === 'ru' ? Promise.resolve(ru) : LOADERS[language as keyof typeof LOADERS]?.()
    )
  )
  .init({
    lng: deviceLanguage(),
    fallbackLng: 'ru',
    supportedLngs: Object.keys(LANGUAGES),
    partialBundledLanguages: true,
    resources: { ru: { translation: ru } },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export default i18n;

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: typeof ru };
  }
}
