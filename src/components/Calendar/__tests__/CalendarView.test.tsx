import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import CalendarView from '../CalendarView';
import { makeData } from '../../../test-fixtures';
import { EXTRA_PRESETS, getPeriodKey, resizePeriod } from '../../../utils/calendarHelpers';
import { getRemainingFlexWeeks } from '../../../utils/leaveLaw';
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

    it('shows no weeks-until-8 row for a parent who kept them for later', () => {
        renderView(makeData({ useExtraWeeks: [false, true] }));
        const cards = screen.getAllByTestId(/^summary-card-/);
        expect(within(cards[0]).queryByTestId('period-row-cuidado')).toBeNull();
        expect(within(cards[1]).getByTestId('period-row-cuidado')).toBeInTheDocument();
    });
});

describe('CalendarView — the add-extra form', () => {
    const openForm = (cardIndex: number) => {
        const card = screen.getAllByTestId(/^summary-card-/)[cardIndex];
        fireEvent.click(within(card).getByTestId('add-period-btn'));
        return within(card);
    };

    it('labels its controls for what they do, not for their units', () => {
        renderView(makeData());
        const form = openForm(0);

        expect(form.getByLabelText('Period type')).toBeInTheDocument();
        expect(form.getByLabelText('Duration')).toBeInTheDocument();
        expect(form.getByLabelText('Duration unit')).toBeInTheDocument();
    });

    it.each(EXTRA_PRESETS.filter((p) => p.key !== 'custom').map((p) => [p.key] as const))(
        'seeds the duration from the %s preset',
        (key) => {
            const preset = EXTRA_PRESETS.find((p) => p.key === key)!;
            renderView(makeData());
            const form = openForm(0);

            fireEvent.change(form.getByLabelText('Period type'), { target: { value: key } });

            expect(form.getByLabelText('Duration')).toHaveValue(preset.defaultValue);
            expect(form.getByLabelText('Duration unit')).toHaveValue(preset.defaultUnit);
        },
    );

    it('asks for a name only for a custom period and uses it', () => {
        const { onUpdateData } = renderView(makeData());
        const form = openForm(0);
        expect(form.queryByLabelText('Period name…')).toBeNull();

        fireEvent.change(form.getByLabelText('Period type'), { target: { value: 'custom' } });
        fireEvent.change(form.getByLabelText('Period name…'), { target: { value: 'Sabbatical' } });
        fireEvent.click(form.getByTestId('add-extra-confirm'));

        const next = onUpdateData.mock.calls[0][0] as WizardData;
        expect(next.schedule[0].periods.find((p) => p.isExtra)?.extraName).toBe('Sabbatical');
    });

    it('adds the typed duration in the chosen unit', () => {
        const { onUpdateData } = renderView(makeData());
        const form = openForm(0);

        fireEvent.change(form.getByLabelText('Duration unit'), { target: { value: 'days' } });
        fireEvent.change(form.getByLabelText('Duration'), { target: { value: '5' } });
        fireEvent.click(form.getByTestId('add-extra-confirm'));

        const next = onUpdateData.mock.calls[0][0] as WizardData;
        const added = next.schedule[0].periods.find((p) => p.isExtra)!;
        expect(
            (new Date(added.endDate).getTime() - new Date(added.startDate).getTime()) / 86_400_000,
        ).toBe(5);
    });

    it('locks the unit to weeks for the flexible remainder and caps it at the quota left', () => {
        const shrunk = makeData();
        const flexible = shrunk.schedule[0].periods.find((p) => p.type === 'flexible')!;
        shrunk.schedule = resizePeriod(
            shrunk.schedule,
            0,
            getPeriodKey(flexible),
            5,
            'weeks',
            shrunk.firstParent,
            false,
        );
        const remaining = getRemainingFlexWeeks(shrunk.schedule[0]);
        expect(remaining).toBeGreaterThan(0);

        const { onUpdateData } = renderView(shrunk);
        const form = openForm(0);
        fireEvent.change(form.getByLabelText('Period type'), {
            target: { value: 'flexible-extra' },
        });

        expect(form.getByLabelText('Duration unit')).toBeDisabled();
        fireEvent.change(form.getByLabelText('Duration'), { target: { value: '99' } });
        fireEvent.click(form.getByTestId('add-extra-confirm'));

        const next = onUpdateData.mock.calls[0][0] as WizardData;
        const added = next.schedule[0].periods.find((p) => p.isExtra)!;
        const weeks =
            (new Date(added.endDate).getTime() - new Date(added.startDate).getTime()) /
            (7 * 86_400_000);
        expect(weeks).toBe(remaining);
    });

    it('closes on cancel without touching the plan', () => {
        const { onUpdateData } = renderView(makeData());
        const form = openForm(0);

        fireEvent.click(form.getByRole('button', { name: 'Cancel' }));

        expect(screen.queryByTestId('add-extra-form')).toBeNull();
        expect(onUpdateData).not.toHaveBeenCalled();
    });

    it('confirms on Enter and closes on Escape', () => {
        const { onUpdateData } = renderView(makeData());
        const form = openForm(0);

        fireEvent.keyDown(form.getByLabelText('Duration'), { key: 'Escape' });
        expect(screen.queryByTestId('add-extra-form')).toBeNull();
        expect(onUpdateData).not.toHaveBeenCalled();

        const reopened = openForm(0);
        fireEvent.keyDown(reopened.getByLabelText('Duration'), { key: 'Enter' });
        expect(onUpdateData).toHaveBeenCalledTimes(1);
    });
});

describe('CalendarView — editing a period row', () => {
    const editorFor = (cardIndex: number, type: string) => {
        const card = screen.getAllByTestId(/^summary-card-/)[cardIndex];
        const row = within(card).getByTestId(`period-row-${type}`);
        fireEvent.click(within(row).getByRole('button', { name: /Edit duration/ }));
        return within(row);
    };

    it('opens the duration editor seeded with the current weeks', () => {
        renderView(makeData());
        const row = editorFor(0, 'flexible');

        expect(row.getByLabelText('Duration')).toHaveValue(11);
        expect(row.getByText('weeks')).toBeInTheDocument();
        expect(row.queryByLabelText('Duration unit')).toBeNull();
    });

    it('commits on Enter and discards on Escape', () => {
        const { onUpdateData } = renderView(makeData());
        let row = editorFor(0, 'flexible');

        fireEvent.change(row.getByLabelText('Duration'), { target: { value: '5' } });
        fireEvent.keyDown(row.getByLabelText('Duration'), { key: 'Escape' });
        expect(onUpdateData).not.toHaveBeenCalled();

        row = editorFor(0, 'flexible');
        fireEvent.change(row.getByLabelText('Duration'), { target: { value: '5' } });
        fireEvent.keyDown(row.getByLabelText('Duration'), { key: 'Enter' });

        const next = onUpdateData.mock.calls[0][0] as WizardData;
        const flex = next.schedule[0].periods.find((p) => p.type === 'flexible')!;
        expect(
            (new Date(flex.endDate).getTime() - new Date(flex.startDate).getTime()) /
                (7 * 86_400_000),
        ).toBe(5);
    });

    it('edits lactancia in days rather than weeks', () => {
        renderView(makeData());
        const row = editorFor(0, 'lactancia');

        expect(row.getByLabelText('Duration unit')).toHaveValue('days');
    });

    it('offers a delete button only for extra periods', () => {
        const { onUpdateData } = renderView(makeData());
        const card = screen.getAllByTestId(/^summary-card-/)[0];
        fireEvent.click(within(card).getByTestId('add-period-btn'));
        fireEvent.click(within(card).getByTestId('add-extra-confirm'));

        const flexibleRow = within(card).getByTestId('period-row-flexible');
        expect(within(flexibleRow).queryByRole('button', { name: /Remove/ })).toBeNull();
        expect(onUpdateData).toHaveBeenCalled();
    });
});

describe('CalendarView — header, sharing and per-parent controls', () => {
    it('recomputes the whole plan when the due date changes', () => {
        const data = makeData();
        const { onUpdateData } = renderView(data);

        fireEvent.click(screen.getByRole('button', { name: 'Change due date' }));
        fireEvent.click(screen.getByRole('gridcell', { name: 'Choose Thursday, 15 October 2026' }));

        const next = onUpdateData.mock.calls[0][0] as WizardData;
        expect(next.dueDate).toBe('2026-10-15');
        expect(next.schedule[0].periods.find((p) => p.type === 'mandatory')!.startDate).toBe(
            '2026-10-15',
        );
    });

    it('ignores picking the due date it already has', () => {
        const { onUpdateData } = renderView(makeData());

        fireEvent.click(screen.getByRole('button', { name: 'Change due date' }));
        fireEvent.click(screen.getByRole('gridcell', { name: 'Choose Thursday, 1 October 2026' }));

        expect(onUpdateData).not.toHaveBeenCalled();
    });

    it('copies a share link and confirms it in a live region', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
        renderView(makeData());

        fireEvent.click(screen.getByTestId('share-btn'));

        expect(await screen.findByRole('status')).toHaveTextContent('Link copied to clipboard!');
        expect(writeText).toHaveBeenCalledWith(expect.stringContaining('share='));
        vi.unstubAllGlobals();
    });

    it('reports a clipboard failure instead of pretending it worked', async () => {
        vi.stubGlobal('navigator', {
            ...navigator,
            clipboard: {
                writeText: vi.fn().mockRejectedValue(new Error('denied')),
            },
        });
        renderView(makeData());

        fireEvent.click(screen.getByTestId('share-btn'));

        expect(await screen.findByRole('status')).toHaveTextContent('Could not copy the link');
        vi.unstubAllGlobals();
    });

    it('hides and shows a parent without touching the plan', () => {
        const { onUpdateData } = renderView(makeData());
        const card = screen.getAllByTestId(/^summary-card-/)[1];
        const toggle = within(card).getByRole('button', { name: 'Hide this parent' });

        fireEvent.click(toggle);

        const shown = within(screen.getAllByTestId(/^summary-card-/)[1]).getByRole('button', {
            name: 'Show this parent',
        });
        expect(shown).toHaveAttribute('aria-pressed', 'true');

        fireEvent.click(shown);
        expect(
            within(screen.getAllByTestId(/^summary-card-/)[1]).getByRole('button', {
                name: 'Hide this parent',
            }),
        ).toHaveAttribute('aria-pressed', 'false');
        expect(onUpdateData).not.toHaveBeenCalled();
    });

    it('resets one parent to the standard schedule and leaves the other alone', () => {
        const data = makeData();
        const edited = structuredClone(data);
        edited.schedule[0].periods.find((p) => p.type === 'flexible')!.endDate = '2027-03-01';
        edited.schedule[1].periods.find((p) => p.type === 'flexible')!.endDate = '2027-03-01';
        const { onUpdateData } = renderView(edited);

        const card = screen.getAllByTestId(/^summary-card-/)[0];
        fireEvent.click(
            within(card).getByRole('button', {
                name: 'Reset this parent to the standard schedule',
            }),
        );

        const next = onUpdateData.mock.calls[0][0] as WizardData;
        expect(next.schedule[0].periods.find((p) => p.type === 'flexible')!.endDate).toBe(
            data.schedule[0].periods.find((p) => p.type === 'flexible')!.endDate,
        );
        expect(next.schedule[1].periods.find((p) => p.type === 'flexible')!.endDate).toBe(
            '2027-03-01',
        );
    });
});

describe('CalendarView — moving a period start date and deleting an extra', () => {
    const rowIn = (cardIndex: number, type: string) =>
        within(
            within(screen.getAllByTestId(/^summary-card-/)[cardIndex]).getByTestId(
                `period-row-${type}`,
            ),
        );

    const openStartDatePicker = (cardIndex: number, type: string) =>
        fireEvent.click(rowIn(cardIndex, type).getByRole('button', { name: /Edit start date$/ }));

    it('opens a picker on the period it is editing', () => {
        renderView(makeData());

        openStartDatePicker(0, 'flexible');

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('November 2026');
    });

    it('shifts the period to the chosen start date and re-chains the rest', () => {
        const { onUpdateData } = renderView(makeData());
        openStartDatePicker(0, 'flexible');

        fireEvent.click(screen.getByRole('gridcell', { name: 'Choose Monday, 30 November 2026' }));

        const next = onUpdateData.mock.calls[0][0] as WizardData;
        const flexible = next.schedule[0].periods.find((p) => p.type === 'flexible')!;
        const lactancia = next.schedule[0].periods.find((p) => p.type === 'lactancia')!;
        expect(flexible.startDate).toBe('2026-11-30');
        expect(lactancia.startDate).toBe(flexible.endDate);
    });

    it('deletes an extra period, and offers no delete on statutory rows', () => {
        const base = makeData();
        const seeded = vi.fn();
        render(
            <CalendarView data={base} onEdit={vi.fn()} onReset={vi.fn()} onUpdateData={seeded} />,
        );
        const seedCard = screen.getAllByTestId(/^summary-card-/)[0];
        fireEvent.click(within(seedCard).getByTestId('add-period-btn'));
        fireEvent.click(within(seedCard).getByTestId('add-extra-confirm'));
        const withExtra = seeded.mock.calls[0][0] as WizardData;
        cleanup();

        const { onUpdateData } = renderView(withExtra);
        expect(rowIn(0, 'flexible').queryByRole('button', { name: /^Remove/ })).toBeNull();

        fireEvent.click(rowIn(0, 'vacation').getByRole('button', { name: /^Remove/ }));

        const next = onUpdateData.mock.calls[0][0] as WizardData;
        expect(next.schedule[0].periods.some((p) => p.isExtra)).toBe(false);
    });
});
