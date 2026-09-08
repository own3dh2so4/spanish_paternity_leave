import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import { STORAGE_KEY } from '../constants';
import { makeData } from '../test-fixtures';
import { compressWizardData } from '../utils/shareUtils';

function visit(search: string) {
    window.history.replaceState({}, '', `${window.location.pathname}${search}`);
}

beforeEach(() => {
    window.localStorage.clear();
    visit('');
});

afterEach(() => {
    window.localStorage.clear();
});

describe('App', () => {
    it('shows the wizard when there is nothing stored', () => {
        render(<App />);
        expect(screen.getByTestId('wizard-next-btn')).toBeInTheDocument();
    });

    it('opens straight into the calendar when a valid plan is stored', () => {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(makeData()));

        render(<App />);

        expect(screen.getByTestId('edit-btn')).toBeInTheDocument();
    });

    it('ignores a stored plan that fails validation', () => {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, names: ['A'] }));

        render(<App />);

        expect(screen.getByTestId('wizard-next-btn')).toBeInTheDocument();
    });

    it('loads a plan from a share link and persists it', () => {
        const data = makeData({ convenioDays: [10, 0] });
        visit(`?share=${compressWizardData(data, new Set())}`);

        render(<App />);

        expect(screen.getByTestId('edit-btn')).toBeInTheDocument();
        expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toEqual(data);
    });

    it('strips the share parameter from the URL but keeps the other ones', () => {
        visit(`?utm=x&share=${compressWizardData(makeData(), new Set())}#top`);

        render(<App />);

        expect(window.location.search).toBe('?utm=x');
        expect(window.location.hash).toBe('#top');
    });

    it('warns in the wizard when the share link cannot be decoded', () => {
        visit('?share=not-a-valid-payload');

        render(<App />);

        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByTestId('wizard-next-btn')).toBeInTheDocument();
    });

    it('leaves the URL alone when there is no share parameter', () => {
        visit('?utm=x');

        render(<App />);

        expect(window.location.search).toBe('?utm=x');
    });
});
