import React, { createContext, useContext, useState } from 'react';
import { deDE } from './locales/de-DE';
import { enUS } from './locales/en-US';
import { esES } from './locales/es-ES';
import { jaJP } from './locales/ja-JP';
import { koKR } from './locales/ko-KR';
import { viVN } from './locales/vi-VN';
import { zhCN } from './locales/zh-CN';
import { zhTW } from './locales/zh-TW';

export type Language = 'en-US' | 'zh-CN' | 'zh-TW' | 'es-ES' | 'de-DE' | 'ja-JP' | 'ko-KR' | 'vi-VN';

export interface LanguageOption {
  code: Language;
  label: string;
  flag: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en-US', label: 'English (US)', flag: '🇺🇸' },
  { code: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
  { code: 'zh-TW', label: '正體中文', flag: '🇹🇼' },
  { code: 'es-ES', label: 'Español', flag: '🇪🇸' },
  { code: 'de-DE', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja-JP', label: '日本語', flag: '🇯🇵' },
  { code: 'ko-KR', label: '한국어', flag: '🇰🇷' },
  { code: 'vi-VN', label: 'Tiếng Việt', flag: '🇻🇳' },
];

const dictionaries: Record<Language, typeof enUS> = {
  'en-US': enUS,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'es-ES': esES,
  'de-DE': deDE,
  'ja-JP': jaJP,
  'ko-KR': koKR,
  'vi-VN': viVN,
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof enUS) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

function detectDefaultLanguage(): Language {
  const saved = localStorage.getItem('markspace_lang') as Language;
  if (saved && dictionaries[saved]) {
    return saved;
  }
  const browserLang = navigator.language || '';
  if (browserLang.startsWith('zh-TW') || browserLang.startsWith('zh-HK')) return 'zh-TW';
  if (browserLang.startsWith('zh')) return 'zh-CN';
  if (browserLang.startsWith('es')) return 'es-ES';
  if (browserLang.startsWith('de')) return 'de-DE';
  if (browserLang.startsWith('ja')) return 'ja-JP';
  if (browserLang.startsWith('ko')) return 'ko-KR';
  if (browserLang.startsWith('vi')) return 'vi-VN';
  return 'zh-CN';
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(detectDefaultLanguage);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('markspace_lang', lang);
  };

  const t = (key: keyof typeof enUS): string => {
    const dict = dictionaries[language] || dictionaries['zh-CN'];
    return dict[key] || enUS[key] || (key as string);
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
