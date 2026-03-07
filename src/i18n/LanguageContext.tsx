import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { en } from './en';
import { es } from './es';
import type { TranslationKeys } from './en';

export type Language = 'en' | 'es';

const STORAGE_KEY = 'lang';
const TRANSLATIONS: Record<Language, TranslationKeys> = { en, es };

interface LanguageContextValue {
    lang: Language;
    setLang: (lang: Language) => void;
    t: TranslationKeys;
}

const LanguageContext = createContext<LanguageContextValue>({
    lang: 'en',
    setLang: () => { },
    t: en,
});

function detectInitialLanguage(): Language {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (stored === 'en' || stored === 'es') return stored;
    // Fall back to browser language
    if (navigator.language.startsWith('es')) return 'es';
    return 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [lang, setLangState] = useState<Language>(detectInitialLanguage);

    const setLang = useCallback((newLang: Language) => {
        localStorage.setItem(STORAGE_KEY, newLang);
        setLangState(newLang);
    }, []);

    // Keep html lang attribute in sync
    useEffect(() => {
        document.documentElement.lang = lang;
    }, [lang]);

    return (
        <LanguageContext.Provider value={{ lang, setLang, t: TRANSLATIONS[lang] }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage(): LanguageContextValue {
    return useContext(LanguageContext);
}
