import type { Language } from '../i18n/LanguageContext';
import type { TranslationKeys } from '../i18n/en';
import type { Theme } from '../theme/ThemeContext';

interface Props {
    lang: Language;
    theme: Theme;
    t: TranslationKeys;
    onToggleLang: () => void;
    onToggleTheme: () => void;
}

export default function HeaderControls({ lang, theme, t, onToggleLang, onToggleTheme }: Props) {
    return (
        <div className="header-controls">
            <button
                type="button"
                className="btn-icon"
                onClick={onToggleLang}
                title={t.tooltipSwitchLang}
                aria-label={t.tooltipSwitchLang}
                data-testid="lang-toggle"
            >
                {lang === 'en' ? '🇪🇸 ES' : '🇬🇧 EN'}
            </button>
            <button
                type="button"
                className="btn-icon"
                onClick={onToggleTheme}
                title={t.tooltipSwitchTheme(theme)}
                aria-label={t.tooltipSwitchTheme(theme)}
                data-testid="theme-toggle"
            >
                {theme === 'dark' ? '☀️' : '🌙'}
            </button>
        </div>
    );
}
