import { create } from 'zustand';

import { LANGUAGES, type Language, translations, type TranslationKey } from '../i18n/translations';

const STORAGE_KEY = 'moyenax-language';

function getInitialLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (LANGUAGES.some((language) => language.code === stored)) return stored as Language;
  return 'fr';
}

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

function translate(language: Language, key: TranslationKey, params: Record<string, string | number> = {}): string {
  const template = translations[language][key] ?? translations.fr[key] ?? key;
  return Object.entries(params).reduce(
    (text, [paramKey, value]) => text.replaceAll(`{${paramKey}}`, String(value)),
    template,
  );
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: getInitialLanguage(),
  setLanguage: (language: Language): void => {
    localStorage.setItem(STORAGE_KEY, language);
    set({ language });
  },
  t: (key: TranslationKey, params?: Record<string, string | number>): string => translate(get().language, key, params),
}));

export function useTranslation(): {
  language: Language;
  setLanguage: (language: Language) => void;
  languages: typeof LANGUAGES;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
} {
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  return {
    language,
    setLanguage,
    languages: LANGUAGES,
    t: (key: TranslationKey, params?: Record<string, string | number>) => translate(language, key, params),
  };
}