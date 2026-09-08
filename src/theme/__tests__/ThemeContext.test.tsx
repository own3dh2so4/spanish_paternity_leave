import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, useTheme } from '../ThemeContext';

const STORAGE_KEY = 'theme';

type Listener = (event: MediaQueryListEvent) => void;

function stubMatchMedia(prefersLight: boolean) {
    const listeners = new Set<Listener>();
    vi.stubGlobal('matchMedia', (media: string) => ({
        media,
        matches: prefersLight,
        onchange: null,
        addEventListener: (_: string, l: Listener) => listeners.add(l),
        removeEventListener: (_: string, l: Listener) => listeners.delete(l),
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
    }));
    return {
        emit: (matches: boolean) =>
            act(() => {
                listeners.forEach((l) => l({ matches } as MediaQueryListEvent));
            }),
        listenerCount: () => listeners.size,
    };
}

function Probe() {
    const { theme, toggleTheme } = useTheme();
    return (
        <button type="button" onClick={toggleTheme}>
            {theme}
        </button>
    );
}

const renderProbe = () =>
    render(
        <ThemeProvider>
            <Probe />
        </ThemeProvider>,
    );

beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
});

afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
});

describe('ThemeProvider', () => {
    it('follows the OS preference when nothing is stored', () => {
        stubMatchMedia(true);
        renderProbe();

        expect(screen.getByRole('button')).toHaveTextContent('light');
        expect(document.documentElement.dataset.theme).toBe('light');
    });

    it('defaults to dark when the OS asks for dark', () => {
        stubMatchMedia(false);
        renderProbe();

        expect(screen.getByRole('button')).toHaveTextContent('dark');
        expect(document.documentElement.dataset.theme).toBe('dark');
    });

    it.each([['light'], ['dark']])('prefers the stored %s over the OS preference', (stored) => {
        window.localStorage.setItem(STORAGE_KEY, stored);
        stubMatchMedia(stored === 'dark');
        renderProbe();

        expect(screen.getByRole('button')).toHaveTextContent(stored);
    });

    it('ignores an unusable stored value', () => {
        window.localStorage.setItem(STORAGE_KEY, 'neon');
        stubMatchMedia(true);
        renderProbe();

        expect(screen.getByRole('button')).toHaveTextContent('light');
    });

    it('toggling persists the choice and paints the document', () => {
        stubMatchMedia(false);
        renderProbe();
        const button = screen.getByRole('button');

        act(() => button.click());

        expect(button).toHaveTextContent('light');
        expect(window.localStorage.getItem(STORAGE_KEY)).toBe('light');
        expect(document.documentElement.dataset.theme).toBe('light');

        act(() => button.click());

        expect(button).toHaveTextContent('dark');
        expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark');
    });

    it('adopts a later OS change while the user has not chosen', () => {
        const mq = stubMatchMedia(false);
        renderProbe();

        mq.emit(true);

        expect(screen.getByRole('button')).toHaveTextContent('light');
        expect(document.documentElement.dataset.theme).toBe('light');
    });

    it('ignores an OS change once the user has chosen', () => {
        const mq = stubMatchMedia(false);
        renderProbe();
        act(() => screen.getByRole('button').click());

        mq.emit(true);

        expect(screen.getByRole('button')).toHaveTextContent('light');
        window.localStorage.setItem(STORAGE_KEY, 'dark');
        mq.emit(true);
        expect(screen.getByRole('button')).toHaveTextContent('light');
    });

    it('unsubscribes from the OS preference on unmount', () => {
        const mq = stubMatchMedia(false);
        const { unmount } = renderProbe();
        expect(mq.listenerCount()).toBe(1);

        unmount();

        expect(mq.listenerCount()).toBe(0);
    });
});
