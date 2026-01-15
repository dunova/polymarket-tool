'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { en, Translations } from './translations/en';
import { zh } from './translations/zh';

type Language = 'en' | 'zh';

interface I18nContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: Translations;
}

const translations: Record<Language, Translations> = { en, zh };

const I18nContext = createContext<I18nContextType>({
    language: 'zh',
    setLanguage: () => { },
    t: zh,
});

export function I18nProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('language') as Language;
            if (saved && (saved === 'en' || saved === 'zh')) {
                return saved;
            }
        }
        return 'zh';
    });

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('language', lang);
    };

    return (
        <I18nContext.Provider value={{ language, setLanguage, t: translations[language] }
        }>
            {children}
        </I18nContext.Provider>
    );
}

export function useTranslation() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useTranslation must be used within I18nProvider');
    }
    return context;
}

export function LanguageToggle() {
    const { language, setLanguage } = useTranslation();

    return (
        <button
            onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')
            }
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
        >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            {language === 'en' ? '中文' : 'EN'}
        </button>
    );
}
