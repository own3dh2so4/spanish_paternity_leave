import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LANG_STORAGE_KEY, LanguageProvider, useLanguage } from '../LanguageContext';

function Probe() {
    const { lang, setLang, t } = useLanguage();
    return (
        <div>
            <span data-testid="lang">{lang}</span>
            <span data-testid="title">{t.wizardTitle}</span>
            <button type="button" onClick={() => setLang(lang === 'en' ? 'es' : 'en')}>
                toggle
            </button>
        </div>
    );
}

const renderProbe = () =>
    render(
        <LanguageProvider>
            <Probe />
        </LanguageProvider>,
    );

function stubNavigatorLanguage(language: string) {
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue(language);
}

beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('lang');
});

afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
});

describe('LanguageProvider', () => {
    it.each([
        ['es-ES', 'es'],
        ['es', 'es'],
        ['en-GB', 'en'],
        ['fr-FR', 'en'],
    ])('detects %s as %s when nothing is stored', (navigatorLanguage, expected) => {
        stubNavigatorLanguage(navigatorLanguage);
        renderProbe();

        expect(screen.getByTestId('lang')).toHaveTextContent(expected);
    });

    it.each([['en'], ['es']])('prefers the stored %s over the browser language', (stored) => {
        window.localStorage.setItem(LANG_STORAGE_KEY, stored);
        stubNavigatorLanguage(stored === 'en' ? 'es-ES' : 'en-GB');
        renderProbe();

        expect(screen.getByTestId('lang')).toHaveTextContent(stored);
    });

    it('ignores an unusable stored value', () => {
        window.localStorage.setItem(LANG_STORAGE_KEY, 'de');
        stubNavigatorLanguage('en-GB');
        renderProbe();

        expect(screen.getByTestId('lang')).toHaveTextContent('en');
    });

    it('serves the translations for the active language', () => {
        stubNavigatorLanguage('es-ES');
        renderProbe();

        expect(screen.getByTestId('title')).toHaveTextContent('Planificador');
    });

    it('syncs the html lang attribute and the document title', () => {
        stubNavigatorLanguage('en-GB');
        renderProbe();

        expect(document.documentElement.lang).toBe('en');
        expect(document.title).toBe('Parental Leave Planner (Spain)');

        act(() => screen.getByRole('button').click());

        expect(document.documentElement.lang).toBe('es');
        expect(document.title).toBe('Planificador de Permiso Parental (España)');
    });

    it('persists the chosen language', () => {
        stubNavigatorLanguage('en-GB');
        renderProbe();

        act(() => screen.getByRole('button').click());

        expect(window.localStorage.getItem(LANG_STORAGE_KEY)).toBe('es');
        expect(screen.getByTestId('lang')).toHaveTextContent('es');
    });
});
