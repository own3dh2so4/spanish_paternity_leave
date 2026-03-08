import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import WorkTimeline from '../WorkTimeline';
import type { ComputedPeriod } from '../../../types';
import type { TranslationKeys } from '../../../i18n/en';

afterEach(cleanup);

const stubT = {
    workTimeline: 'Work Timeline',
    stopsWorking: 'Stops working',
    returnsToWork: 'Returns to work',
    returnsToWorkFinal: 'Finally returns',
    returnsToWorkOn: 'Returns on',
} as unknown as TranslationKeys;

function makeIso(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function makePeriod(
    type: ComputedPeriod['type'],
    start: [number, number, number],
    end: [number, number, number],
): ComputedPeriod {
    return {
        type,
        startDate: makeIso(...start),
        endDate: makeIso(...end),
        days: null,
    };
}

describe('WorkTimeline', () => {
    it('shows the work-timeline label', () => {
        render(<WorkTimeline periods={[]} t={stubT} />);
        expect(screen.getByText('Work Timeline')).toBeInTheDocument();
    });

    it('renders nothing when there are no leave periods', () => {
        render(<WorkTimeline periods={[]} t={stubT} />);
        expect(screen.queryByText('Stops working')).not.toBeInTheDocument();
    });

    it('shows a single stop/return block for one contiguous period', () => {
        const mandatory = makePeriod('mandatory', [2026, 4, 1], [2026, 7, 1]);
        const flexible = makePeriod('flexible', [2026, 7, 1], [2026, 9, 1]);
        render(<WorkTimeline periods={[mandatory, flexible]} t={stubT} />);

        expect(screen.getAllByText('Stops working')).toHaveLength(1);
        expect(screen.getByText('Finally returns')).toBeInTheDocument();
    });

    it('shows multiple blocks for non-contiguous leave periods', () => {
        const mandatory = makePeriod('mandatory', [2026, 4, 1], [2026, 5, 13]);
        // period1 ends June 1, period2 starts August 1 → gap in between
        const period1 = makePeriod('flexible', [2026, 5, 13], [2026, 6, 1]);
        const period2 = makePeriod('flexible', [2026, 8, 1], [2026, 9, 1]);

        render(<WorkTimeline periods={[mandatory, period1, period2]} t={stubT} />);

        expect(screen.getAllByText('Stops working')).toHaveLength(2);
        expect(screen.getByText('Returns to work')).toBeInTheDocument();
        expect(screen.getByText('Finally returns')).toBeInTheDocument();
    });

    it('merges overlapping leave periods into one block', () => {
        const mandatory = makePeriod('mandatory', [2026, 4, 1], [2026, 6, 1]);
        // Flexible overlaps with the mandatory period
        const flexible = makePeriod('flexible', [2026, 5, 1], [2026, 7, 1]);
        render(<WorkTimeline periods={[mandatory, flexible]} t={stubT} />);

        expect(screen.getAllByText('Stops working')).toHaveLength(1);
        expect(screen.getByText('Finally returns')).toBeInTheDocument();
    });
});
