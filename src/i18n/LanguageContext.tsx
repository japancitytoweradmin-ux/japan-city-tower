import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Language, Translations } from './types';
import { bn } from './bn';
import { en } from './en';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: Translations;
  formatNumber: (num: number | string | undefined | null) => string;
  formatCurrency: (amount: number | undefined | null) => string;
  getMonthName: (monthNumber: number, year?: number) => string;
  isBangla: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = 'jct_app_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'bn') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'bn'; // Default language = Bangla
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'bn' ? 'en' : 'bn');
  };

  const t = useMemo(() => (language === 'bn' ? bn : en), [language]);
  const isBangla = language === 'bn';

  const formatNumber = (num: number | string | undefined | null): string => {
    if (num === undefined || num === null) return isBangla ? '০' : '0';
    if (!isBangla) return num.toString();
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num
      .toString()
      .replace(/[0-9]/g, (digit) => banglaDigits[parseInt(digit, 10)]);
  };

  const formatCurrency = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null) return isBangla ? '৳০' : '৳0';
    const formatted = new Intl.NumberFormat('en-IN').format(amount);
    if (isBangla) {
      return `৳${formatNumber(formatted)}`;
    }
    return `৳${formatted}`;
  };

  const getMonthName = (monthNumber: number, year?: number): string => {
    const idx = Math.max(0, Math.min(11, monthNumber - 1));
    const monthStr = t.period.months[idx];
    if (year) {
      const yearStr = formatNumber(year);
      return `${monthStr} ${yearStr}`;
    }
    return monthStr;
  };

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    t,
    formatNumber,
    formatCurrency,
    getMonthName,
    isBangla
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

const fallbackFormatNumber = (num: number | string | undefined | null): string => {
  if (num === undefined || num === null) return '০';
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.toString().replace(/[0-9]/g, (digit) => banglaDigits[parseInt(digit, 10)]);
};

const fallbackValue: LanguageContextValue = {
  language: 'bn',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: bn,
  formatNumber: fallbackFormatNumber,
  formatCurrency: (amount: number | undefined | null) => `৳${fallbackFormatNumber(amount ?? 0)}`,
  getMonthName: (m: number, y?: number) => {
    const idx = Math.max(0, Math.min(11, m - 1));
    return y ? `${bn.period.months[idx]} ${fallbackFormatNumber(y)}` : bn.period.months[idx];
  },
  isBangla: true,
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    console.warn('useLanguage was called outside LanguageProvider; using safe fallback context');
    return fallbackValue;
  }
  return context;
};

export const useTranslation = () => {
  return useLanguage();
};
