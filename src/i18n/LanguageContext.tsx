import React, { createContext, use, useCallback, useEffect, useState } from 'react';
import { en } from './en';
import { es } from './es';
import type { TranslationKeys } from './en';

export type Language = 'en' | 'es';

export const LANG_STORAGE_KEY = 'lang';
const TRANSLATIONS: Record<Language, TranslationKeys> = { en, es };

interface LanguageContextValue {
    lang: Language;
    setLang: (lang: Language) => void;
    t: TranslationKeys;
}

const LanguageContext = createContext<LanguageContextValue>({
    lang: 'en',
    setLang: () => {},
    t: en,
});

function detectInitialLanguage(): Language {
    const stored = localStorage.getItem(LANG_STORAGE_KEY) as Language | null;
    if (stored === 'en' || stored === 'es') return stored;
    // Fall back to browser language
    if (navigator.language.startsWith('es')) return 'es';
    return 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [lang, setLang] = useState<Language>(detectInitialLanguage);

    const selectLanguage = useCallback((newLang: Language) => {
        localStorage.setItem(LANG_STORAGE_KEY, newLang);
        setLang(newLang);
    }, []);

    useEffect(() => {
        document.documentElement.lang = lang;
        document.title = TRANSLATIONS[lang].documentTitle;
    }, [lang]);

    return (
        <LanguageContext value={{ lang, setLang: selectLanguage, t: TRANSLATIONS[lang] }}>
            {children}
        </LanguageContext>
    );
}

export function useLanguage(): LanguageContextValue {
    return use(LanguageContext);
}
