import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../ErrorBoundary';
import { STORAGE_KEY } from '../../constants';
import { LANG_STORAGE_KEY } from '../../i18n/LanguageContext';

function Boom(): never {
    throw new Error('boom');
}

afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
    it('renders its children while nothing throws', () => {
        render(
            <ErrorBoundary>
                <p>all good</p>
            </ErrorBoundary>,
        );
        expect(screen.getByText('all good')).toBeInTheDocument();
    });

    it('shows a recoverable alert and logs when a child throws', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(
            <ErrorBoundary>
                <Boom />
            </ErrorBoundary>,
        );

        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByRole('button')).toBeInTheDocument();
        expect(error).toHaveBeenCalled();
    });

    it('reads the language the user picked so the alert is not stuck in English', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        window.localStorage.setItem(LANG_STORAGE_KEY, 'es');

        render(
            <ErrorBoundary>
                <Boom />
            </ErrorBoundary>,
        );

        expect(screen.getByRole('alert')).toHaveTextContent(/algo/i);
    });

    it('resetting drops the plan but keeps the theme and language preferences', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const reload = vi.fn();
        vi.spyOn(window, 'location', 'get').mockReturnValue({
            ...window.location,
            reload,
        } as unknown as Location);

        window.localStorage.setItem(STORAGE_KEY, '{"version":4}');
        window.localStorage.setItem(LANG_STORAGE_KEY, 'es');
        window.localStorage.setItem('theme', 'light');

        render(
            <ErrorBoundary>
                <Boom />
            </ErrorBoundary>,
        );
        screen.getByRole('button').click();

        expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
        expect(window.localStorage.getItem(LANG_STORAGE_KEY)).toBe('es');
        expect(window.localStorage.getItem('theme')).toBe('light');
        expect(reload).toHaveBeenCalled();
    });
});
