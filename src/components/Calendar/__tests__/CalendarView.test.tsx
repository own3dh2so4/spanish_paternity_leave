import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import CalendarView from '../CalendarView';
import { makeData } from '../../../test-fixtures';
import type { WizardData } from '../../../types';

function renderView(data: WizardData) {
    const onUpdateData = vi.fn();
    const onEdit = vi.fn();
    const onReset = vi.fn();
    render(
        <CalendarView data={data} onEdit={onEdit} onReset={onReset} onUpdateData={onUpdateData} />,
    );
    return { onUpdateData, onEdit, onReset };
}

describe('CalendarView', () => {
    it('renders one summary card per parent with the statutory periods', () => {
        renderView(makeData());
        const cards = screen.getAllByTestId(/^summary-card-/);
        expect(cards).toHaveLength(2);
        const first = within(cards[0]);
        expect(first.getByTestId('period-row-mandatory')).toHaveTextContent(
            /Mandatory leave \(6 weeks\)/,
        );
        expect(first.getByTestId('period-row-flexible')).toHaveTextContent(
            /Flexible leave \(11 weeks\)/,
        );
        expect(first.getByTestId('period-row-cuidado')).toHaveTextContent(
            /until age 8 \(2 weeks\)/,
        );
        expect(first.getByTestId('period-row-lactancia')).toHaveTextContent(
            /Accumulated lactancia/,
        );
    });

    it('shows the anticipated block as a fixed row for the biological mother', () => {
        renderView(makeData({ biologicalMother: 0, anticipatedWeeks: 2 }));
        const cards = screen.getAllByTestId(/^summary-card-/);
        expect(within(cards[0]).getByTestId('period-row-anticipated')).toHaveTextContent(
            /Before the birth \(2 weeks\)/,
        );
        expect(within(cards[1]).queryByTestId('period-row-anticipated')).toBeNull();
    });

    it('shows 32 weeks for a single parent', () => {
        renderView(makeData({ parentCount: 1 }));
        expect(screen.getByTestId('period-row-flexible')).toHaveTextContent(/22 weeks/);
        expect(screen.getByTestId('period-row-cuidado')).toHaveTextContent(/4 weeks/);
    });

    it('edits the flexible duration through the keyboard-accessible button', () => {
        const { onUpdateData } = renderView(makeData());
        const card = screen.getAllByTestId(/^summary-card-/)[0];
        fireEvent.click(within(card).getByRole('button', { name: /Flexible leave \(11 weeks\)/ }));
        const input = within(card).getByRole('spinbutton');
        fireEvent.change(input, { target: { value: '8' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(onUpdateData).toHaveBeenCalledTimes(1);
        const next = onUpdateData.mock.calls[0][0] as WizardData;
        const flex = next.schedule[0].periods.find((p) => p.type === 'flexible')!;
        expect(flex.endDate).toBe('2027-01-07');
    });

    it('moves a period with the arrow buttons', () => {
        const { onUpdateData } = renderView(makeData());
        const card = screen.getAllByTestId(/^summary-card-/)[0];
        const lactRow = within(card).getByTestId('period-row-lactancia');
        fireEvent.click(within(lactRow).getByRole('button', { name: 'Move earlier' }));
        const next = onUpdateData.mock.calls[0][0] as WizardData;
        const types = next.schedule[0].periods.map((p) => p.type);
        expect(types).toEqual(['mandatory', 'lactancia', 'flexible', 'cuidado']);
    });

    it('adds an extra period from the form', () => {
        const { onUpdateData } = renderView(makeData());
        const card = screen.getAllByTestId(/^summary-card-/)[1];
        fireEvent.click(within(card).getByTestId('add-period-btn'));
        fireEvent.click(within(card).getByTestId('add-extra-confirm'));
        const next = onUpdateData.mock.calls[0][0] as WizardData;
        const added = next.schedule[1].periods[next.schedule[1].periods.length - 1];
        expect(added.extraPresetKey).toBe('vacation');
        expect(next.schedule[0].periods.some((p) => p.isExtra)).toBe(false);
    });

    it('warns when a flexible block ends after the first birthday', () => {
        const data = makeData();
        const flex = data.schedule[0].periods.find((p) => p.type === 'flexible')!;
        flex.startDate = '2027-09-01';
        flex.endDate = '2027-11-17';
        renderView(data);
        expect(screen.getAllByTestId('period-warning')[0]).toHaveTextContent(/12 months/);
    });

    it('wires header actions', () => {
        const { onEdit, onReset } = renderView(makeData());
        fireEvent.click(screen.getByTestId('edit-btn'));
        fireEvent.click(screen.getByTestId('reset-btn'));
        expect(onEdit).toHaveBeenCalled();
        expect(onReset).toHaveBeenCalled();
        expect(screen.getByTestId('mode-label')).toHaveTextContent('Together');
    });

    it('renders the legal disclaimer and a localised month grid', () => {
        renderView(makeData());
        expect(screen.getByText(/not legal advice/i)).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /October 2026/ })).toBeInTheDocument();
    });

    it('renders the SERMAS-specific rows for the biological mother', () => {
        renderView(
            makeData({ regimes: ['sermas', 'et'], convenioDays: [10, 0], biologicalMother: 0 }),
        );
        const card = screen.getAllByTestId(/^summary-card-/)[0];
        expect(within(card).getByTestId('period-row-gestation')).toHaveTextContent(
            /Paid leave before the birth \(4 weeks\)/,
        );
        expect(within(card).getByTestId('period-row-convenio')).toHaveTextContent(/10 days/);
        expect(within(card).getByTestId('period-row-lactancia')).toHaveTextContent(
            /30 calendar days/,
        );
    });
});
