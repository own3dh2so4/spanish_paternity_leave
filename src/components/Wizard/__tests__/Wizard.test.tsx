import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Wizard from '../Wizard';
import { WIZARD_DATA_VERSION } from '../../../constants';
import type { WizardInput } from '../../../types';

function setDueDate(value: string) {
    const input = screen.getByTestId('due-date-container').querySelector('input')!;
    fireEvent.change(input, { target: { value } });
    fireEvent.keyDown(input, { key: 'Enter' });
}

const next = () => fireEvent.click(screen.getByTestId('wizard-next-btn'));

describe('Wizard', () => {
    it('collects a single-parent family with defaults in four steps', () => {
        const onComplete = vi.fn();
        render(<Wizard onComplete={onComplete} initialData={null} />);
        setDueDate('01/10/2026');
        next();
        fireEvent.click(screen.getByTestId('parent-count-btn-1'));
        next();
        fireEvent.change(screen.getByTestId('parent-name-input-0'), { target: { value: 'Ana' } });
        next();
        expect(screen.getByTestId('allowance-summary')).toHaveTextContent(
            '6 mandatory + 22 flexible',
        );
        expect(screen.getByTestId('wizard-next-btn')).toHaveTextContent(/Calculate/);
        next();
        const input = onComplete.mock.calls[0][0] as WizardInput;
        expect(input).toMatchObject({
            version: WIZARD_DATA_VERSION,
            dueDate: '2026-10-01',
            parentCount: 1,
            names: ['Ana'],
            leaveMode: 'together',
            firstParent: 0,
            babies: 1,
            disability: false,
            biologicalMother: null,
            anticipatedWeeks: 0,
        });
    });

    it('collects twins, a biological mother with anticipated weeks and staggered mode', () => {
        const onComplete = vi.fn();
        render(<Wizard onComplete={onComplete} initialData={null} />);
        setDueDate('01/10/2026');
        next();
        fireEvent.click(screen.getByTestId('parent-count-btn-2'));
        next();
        fireEvent.change(screen.getByTestId('parent-name-input-0'), { target: { value: 'Ana' } });
        fireEvent.change(screen.getByTestId('parent-name-input-1'), { target: { value: 'Luis' } });
        next();
        fireEvent.click(screen.getByTestId('babies-btn-2'));
        fireEvent.click(screen.getByTestId('mother-btn-0'));
        fireEvent.click(screen.getByTestId('anticipated-btn-3'));
        expect(screen.getByTestId('allowance-summary')).toHaveTextContent(
            '6 mandatory + 12 flexible',
        );
        next();
        fireEvent.click(screen.getByTestId('mode-optimized-btn'));
        next();
        fireEvent.click(screen.getByTestId('first-parent-btn-1'));
        next();
        expect(onComplete.mock.calls[0][0]).toMatchObject({
            parentCount: 2,
            names: ['Ana', 'Luis'],
            babies: 2,
            biologicalMother: 0,
            anticipatedWeeks: 3,
            leaveMode: 'optimized',
            firstParent: 1,
        });
    });

    it('blocks Next until the names are filled and warns about the invalid share link', () => {
        render(<Wizard onComplete={vi.fn()} initialData={null} invalidShareLink />);
        expect(screen.getByRole('alert')).toHaveTextContent(/not valid/);
        expect(screen.getByTestId('wizard-next-btn')).toBeDisabled();
        setDueDate('01/10/2026');
        expect(screen.getByTestId('wizard-next-btn')).toBeEnabled();
        next();
        next();
        expect(screen.getByTestId('wizard-next-btn')).toBeDisabled();
    });

    it('selecting SERMAS for the biological mother sets 10 extra days and hides the anticipation picker', () => {
        const onComplete = vi.fn();
        render(<Wizard onComplete={onComplete} initialData={null} />);
        setDueDate('01/10/2026');
        next();
        next();
        fireEvent.change(screen.getByTestId('parent-name-input-0'), { target: { value: 'Marta' } });
        fireEvent.change(screen.getByTestId('parent-name-input-1'), { target: { value: 'David' } });
        next();
        fireEvent.click(screen.getByTestId('mother-btn-0'));
        expect(screen.getByTestId('anticipated-btn-0')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('regime-btn-0-sermas'));
        expect(screen.getByTestId('convenio-days-0')).toHaveValue(10);
        expect(screen.getByTestId('convenio-days-1')).toHaveValue(0);
        expect(screen.queryByTestId('anticipated-btn-0')).toBeNull();
        expect(screen.getByTestId('anticipated-unavailable')).toBeInTheDocument();
        next();
        next();
        expect(onComplete.mock.calls[0][0]).toMatchObject({
            regimes: ['sermas', 'et'],
            convenioDays: [10, 0],
            biologicalMother: 0,
            anticipatedWeeks: 0,
        });
    });

    it('lets each parent keep the weeks until age 8 for later', () => {
        const onComplete = vi.fn();
        render(<Wizard onComplete={onComplete} initialData={null} />);
        setDueDate('01/10/2026');
        next();
        next();
        fireEvent.change(screen.getByTestId('parent-name-input-0'), { target: { value: 'Ana' } });
        fireEvent.change(screen.getByTestId('parent-name-input-1'), { target: { value: 'Luis' } });
        next();
        expect(screen.getByTestId('extra-weeks-btn-0-yes')).toHaveAttribute('aria-checked', 'true');
        fireEvent.click(screen.getByTestId('extra-weeks-btn-0-no'));
        expect(screen.getByTestId('extra-weeks-btn-0-no')).toHaveAttribute('aria-checked', 'true');
        next();
        next();
        expect(onComplete.mock.calls[0][0]).toMatchObject({ useExtraWeeks: [false, true] });
    });

    it('asks about 4 weeks for a single-parent family', () => {
        render(<Wizard onComplete={vi.fn()} initialData={null} />);
        setDueDate('01/10/2026');
        next();
        fireEvent.click(screen.getByTestId('parent-count-btn-1'));
        next();
        fireEvent.change(screen.getByTestId('parent-name-input-0'), { target: { value: 'Ana' } });
        next();
        expect(
            screen.getByRole('radiogroup', { name: /4 paid weeks until age 8/i }),
        ).toBeInTheDocument();
    });
});
