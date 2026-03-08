import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import CalendarLegend from '../CalendarLegend';
import type { ColorPalette, ComputedParentSchedule, ComputedPeriod } from '../../../types';
import type { TranslationKeys } from '../../../i18n/en';
import { COLOR_PALETTES } from '../../../constants';

afterEach(cleanup);

const stubT = {
    birthDate: 'Birth date',
    parentMandatory: (n: string) => `${n} mandatory`,
    parentFlexible: (n: string) => `${n} flexible`,
    parentLactancia: (n: string) => `${n} lactancia`,
    parentChildcare: (n: string) => `${n} childcare`,
    parentExtra: (n: string) => `${n} extra`,
    legend: 'Legend',
} as unknown as TranslationKeys;

const palette: ColorPalette = COLOR_PALETTES.indigo;

function makeParent(
    name: string,
    extraPeriods: ComputedPeriod[] = [],
): ComputedParentSchedule {
    return {
        name,
        colorId: 'indigo',
        periods: [
            { type: 'mandatory', startDate: '2026-04-01', endDate: '2026-05-13', days: null },
            { type: 'flexible', startDate: '2026-05-13', endDate: '2026-08-05', days: null },
            ...extraPeriods,
        ],
    };
}

describe('CalendarLegend', () => {
    it('renders the birth date legend section', () => {
        render(
            <CalendarLegend
                displayOrder={[0]}
                effectiveSchedule={[makeParent('Alice')]}
                activeColors={[palette]}
                hiddenParents={new Set()}
                t={stubT}
            />,
        );
        expect(screen.getAllByText('Birth date').length).toBeGreaterThanOrEqual(1);
    });

    it('shows mandatory and flexible legend items for each visible parent', () => {
        render(
            <CalendarLegend
                displayOrder={[0]}
                effectiveSchedule={[makeParent('Alice')]}
                activeColors={[palette]}
                hiddenParents={new Set()}
                t={stubT}
            />,
        );
        expect(screen.getByText('Alice mandatory')).toBeInTheDocument();
        expect(screen.getByText('Alice flexible')).toBeInTheDocument();
    });

    it('does not render a hidden parent', () => {
        render(
            <CalendarLegend
                displayOrder={[0]}
                effectiveSchedule={[makeParent('Alice')]}
                activeColors={[palette]}
                hiddenParents={new Set([0])}
                t={stubT}
            />,
        );
        expect(screen.queryByText('Alice mandatory')).not.toBeInTheDocument();
    });

    it('shows the lactancia legend item only when the parent has a lactancia period', () => {
        const lactancia: ComputedPeriod = {
            type: 'lactancia',
            startDate: '2026-08-05',
            endDate: '2026-09-01',
            days: 10,
        };
        render(
            <CalendarLegend
                displayOrder={[0]}
                effectiveSchedule={[makeParent('Alice', [lactancia])]}
                activeColors={[palette]}
                hiddenParents={new Set()}
                t={stubT}
            />,
        );
        expect(screen.getByText('Alice lactancia')).toBeInTheDocument();
    });

    it('does not show lactancia legend when the parent has no lactancia period', () => {
        render(
            <CalendarLegend
                displayOrder={[0]}
                effectiveSchedule={[makeParent('Alice')]}
                activeColors={[palette]}
                hiddenParents={new Set()}
                t={stubT}
            />,
        );
        expect(screen.queryByText('Alice lactancia')).not.toBeInTheDocument();
    });

    it('shows the childcare legend item only when the parent has a cuidado period', () => {
        const cuidado: ComputedPeriod = {
            type: 'cuidado',
            startDate: '2026-08-05',
            endDate: '2026-09-01',
            days: null,
        };
        render(
            <CalendarLegend
                displayOrder={[0]}
                effectiveSchedule={[makeParent('Alice', [cuidado])]}
                activeColors={[palette]}
                hiddenParents={new Set()}
                t={stubT}
            />,
        );
        expect(screen.getByText('Alice childcare')).toBeInTheDocument();
    });

    it('shows the extra legend item when the parent has extra periods', () => {
        const extra: ComputedPeriod = {
            type: 'extra',
            startDate: '2026-09-01',
            endDate: '2026-09-15',
            days: null,
            isExtra: true,
            extraId: 'ep-1',
            extraName: 'Vacation',
        };
        render(
            <CalendarLegend
                displayOrder={[0]}
                effectiveSchedule={[makeParent('Alice', [extra])]}
                activeColors={[palette]}
                hiddenParents={new Set()}
                t={stubT}
            />,
        );
        expect(screen.getByText('Alice extra')).toBeInTheDocument();
    });

    it('renders legend items for both parents', () => {
        render(
            <CalendarLegend
                displayOrder={[0, 1]}
                effectiveSchedule={[makeParent('Alice'), makeParent('Bob')]}
                activeColors={[palette, COLOR_PALETTES.pink]}
                hiddenParents={new Set()}
                t={stubT}
            />,
        );
        expect(screen.getByText('Alice mandatory')).toBeInTheDocument();
        expect(screen.getByText('Bob mandatory')).toBeInTheDocument();
    });
});
