import React from 'react';
import { Languages } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface LanguageToggleProps {
  className?: string;
  variant?: 'header' | 'button' | 'pill';
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ 
  className = '', 
  variant = 'header' 
}) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div 
      className={`inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs ${className}`}
      role="group"
      aria-label="Language selection"
    >
      <button
        type="button"
        onClick={() => setLanguage('bn')}
        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
          language === 'bn'
            ? 'bg-slate-900 text-amber-400 shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
        title="বাংলা ভাষায় পরিবর্তন করুন"
      >
        বাংলা
      </button>

      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
          language === 'en'
            ? 'bg-slate-900 text-amber-400 shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
        title="Switch to English"
      >
        English
      </button>
    </div>
  );
};
