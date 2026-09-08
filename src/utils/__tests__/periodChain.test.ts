import { describe, expect, it } from 'vitest';
import type { ComputedParentSchedule, ComputedPeriod, LeaveType } from '../../types';
import {
    cascadeAllFromEdit,
    cascadeWithGaps,
    gapsOf,
    mandatoryEndOf,
    recomputeEnd,
    splitFixed,
    tightCascadeAll,
} from '../periodChain';

const p = (
    type: LeaveType,
    startDate: string,
    endDate: string,
    days: number | null = null,
): ComputedPeriod => ({ type, startDate, endDate, days });

const parent = (periods: ComputedPeriod[]): ComputedParentSchedule => ({
    name: 'Ana',
    colorId: 'indigo',
    regime: 'et',
    allowance: { mandatoryWeeks: 6, flexibleWeeks: 11, extraUntil8Weeks: 2 },
    periods,
});

const range = (period: ComputedPeriod) => `${period.startDate}→${period.endDate}`;

describe('recomputeEnd', () => {
    it('preserves the calendar duration when the start moves', () => {
        expect(recomputeEnd('2026-03-01', p('flexible', '2026-01-01', '2026-01-15'))).toBe(
            '2026-03-15',
        );
    });

    it('counts lactancia in working days when it carries a day count', () => {
        expect(recomputeEnd('2026-03-02', p('lactancia', '2026-01-05', '2026-01-09', 5))).toBe(
            '2026-03-09',
        );
    });

    it('falls back to calendar days for lactancia expressed in natural days', () => {
        expect(recomputeEnd('2026-03-02', p('lactancia', '2026-01-01', '2026-01-31', null))).toBe(
            '2026-04-01',
        );
    });
});

describe('tightCascadeAll', () => {
    it('chains every period back to back from the anchor and keeps durations', () => {
        const chained = tightCascadeAll(
            [p('flexible', '2026-05-01', '2026-05-15'), p('cuidado', '2026-06-01', '2026-06-15')],
            '2026-04-01',
        );

        expect(chained.map(range)).toEqual(['2026-04-01→2026-04-15', '2026-04-15→2026-04-29']);
    });

    it('returns an empty chain for an empty input', () => {
        expect(tightCascadeAll([], '2026-04-01')).toEqual([]);
    });
});

describe('gapsOf', () => {
    it('measures the first gap against the anchor and the rest against the predecessor', () => {
        const editable = [
            p('flexible', '2026-04-06', '2026-04-20'),
            p('cuidado', '2026-04-27', '2026-05-11'),
        ];
        expect(gapsOf(editable, '2026-04-01')).toEqual([5, 7]);
    });

    it('never reports a negative gap for overlapping periods', () => {
        expect(gapsOf([p('flexible', '2026-03-01', '2026-03-15')], '2026-04-01')).toEqual([0]);
    });
});

describe('cascadeWithGaps', () => {
    it('reapplies the captured gaps so user-set holes survive a resize', () => {
        const editable = [
            p('flexible', '2026-04-06', '2026-04-20'),
            p('cuidado', '2026-04-27', '2026-05-11'),
        ];
        const gaps = gapsOf(editable, '2026-04-01');

        const cascaded = cascadeWithGaps(editable, '2026-04-01', gaps);

        expect(cascaded.map(range)).toEqual(['2026-04-06→2026-04-20', '2026-04-27→2026-05-11']);
        expect(gapsOf(cascaded, '2026-04-01')).toEqual(gaps);
    });

    it('shifts the whole chain when the anchor moves, keeping the gaps', () => {
        const editable = [
            p('flexible', '2026-04-06', '2026-04-20'),
            p('cuidado', '2026-04-27', '2026-05-11'),
        ];
        const gaps = gapsOf(editable, '2026-04-01');

        const cascaded = cascadeWithGaps(editable, '2026-04-08', gaps);

        expect(cascaded.map(range)).toEqual(['2026-04-13→2026-04-27', '2026-05-04→2026-05-18']);
    });

    it('treats a missing gap as no gap', () => {
        const cascaded = cascadeWithGaps(
            [p('flexible', '2026-04-06', '2026-04-20'), p('cuidado', '2026-05-01', '2026-05-08')],
            '2026-04-01',
            [2],
        );
        expect(cascaded.map(range)).toEqual(['2026-04-03→2026-04-17', '2026-04-17→2026-04-24']);
    });
});

describe('splitFixed', () => {
    it('keeps gestation, anticipated and mandatory fixed and everything else editable', () => {
        const { fixed, editable } = splitFixed([
            p('gestation', '2026-02-01', '2026-03-01'),
            p('anticipated', '2026-03-01', '2026-03-15'),
            p('mandatory', '2026-03-15', '2026-04-26'),
            p('flexible', '2026-04-26', '2026-07-12'),
            p('extra', '2026-07-12', '2026-07-26'),
        ]);

        expect(fixed.map((x) => x.type)).toEqual(['gestation', 'anticipated', 'mandatory']);
        expect(editable.map((x) => x.type)).toEqual(['flexible', 'extra']);
    });
});

describe('mandatoryEndOf', () => {
    it('anchors on the end of the mandatory period', () => {
        expect(
            mandatoryEndOf([
                p('anticipated', '2026-03-01', '2026-03-15'),
                p('mandatory', '2026-03-15', '2026-04-26'),
            ]),
        ).toBe('2026-04-26');
    });

    it('falls back to the first start when there is no mandatory period', () => {
        expect(mandatoryEndOf([p('extra', '2026-03-01', '2026-03-15')])).toBe('2026-03-01');
    });

    it('returns an empty anchor for an empty schedule', () => {
        expect(mandatoryEndOf([])).toBe('');
    });
});

describe('cascadeAllFromEdit', () => {
    const fixedHead = [p('mandatory', '2026-03-02', '2026-04-13')];

    it('re-chains the edited parent from the mandatory end and leaves the fixed head alone', () => {
        const schedule = [
            parent([
                ...fixedHead,
                p('flexible', '2026-05-01', '2026-07-17'),
                p('cuidado', '2026-08-01', '2026-08-15'),
            ]),
        ];

        const [result] = cascadeAllFromEdit(schedule, 0, 0, false);

        expect(result.periods.map((x) => `${x.type} ${range(x)}`)).toEqual([
            'mandatory 2026-03-02→2026-04-13',
            'flexible 2026-04-13→2026-06-29',
            'cuidado 2026-06-29→2026-07-13',
        ]);
    });

    it('reapplies gaps when given them instead of tightening', () => {
        const periods = [
            ...fixedHead,
            p('flexible', '2026-04-20', '2026-07-06'),
            p('cuidado', '2026-07-13', '2026-07-27'),
        ];
        const gaps = gapsOf(splitFixed(periods).editable, mandatoryEndOf(periods));

        const [result] = cascadeAllFromEdit([parent(periods)], 0, 0, false, gaps);

        expect(result.periods.map(range)).toEqual([
            '2026-03-02→2026-04-13',
            '2026-04-20→2026-07-06',
            '2026-07-13→2026-07-27',
        ]);
    });

    it('does not touch the other parent when the mode is not optimized', () => {
        const second = parent([...fixedHead, p('flexible', '2026-05-01', '2026-07-17')]);
        const schedule = [
            parent([...fixedHead, p('flexible', '2026-05-01', '2026-07-17')]),
            second,
        ];

        const result = cascadeAllFromEdit(schedule, 0, 0, false);

        expect(result[1].periods).toEqual(second.periods);
    });

    it('pushes the second parent past the first in optimized mode', () => {
        const schedule = [
            parent([...fixedHead, p('flexible', '2026-04-13', '2026-06-29')]),
            parent([...fixedHead, p('flexible', '2026-04-13', '2026-06-29')]),
        ];

        const result = cascadeAllFromEdit(schedule, 0, 0, true);

        expect(result[0].periods.map(range)).toEqual([
            '2026-03-02→2026-04-13',
            '2026-04-13→2026-06-29',
        ]);
        expect(result[1].periods.map(range)).toEqual([
            '2026-03-02→2026-04-13',
            '2026-06-29→2026-09-14',
        ]);
        expect(result[1].periods[1].startDate).toBe(result[0].periods[1].endDate);
    });

    it('honours firstParent = 1 when deciding who waits', () => {
        const schedule = [
            parent([...fixedHead, p('flexible', '2026-04-13', '2026-06-29')]),
            parent([...fixedHead, p('flexible', '2026-04-13', '2026-06-29')]),
        ];

        const result = cascadeAllFromEdit(schedule, 1, 1, true);

        expect(result[1].periods.map(range)).toEqual([
            '2026-03-02→2026-04-13',
            '2026-04-13→2026-06-29',
        ]);
        expect(result[0].periods[1].startDate).toBe(result[1].periods[1].endDate);
    });

    it('keeps the second parent on their own anchor when the first finishes earlier', () => {
        const schedule = [
            parent([...fixedHead, p('flexible', '2026-03-16', '2026-03-23')]),
            parent([
                p('mandatory', '2026-06-01', '2026-07-13'),
                p('flexible', '2026-07-13', '2026-07-27'),
            ]),
        ];

        const result = cascadeAllFromEdit(schedule, 0, 0, true);

        expect(result[1].periods.map(range)).toEqual([
            '2026-06-01→2026-07-13',
            '2026-07-13→2026-07-27',
        ]);
    });

    it('returns the schedule untouched for an out-of-range parent index', () => {
        const schedule = [parent([...fixedHead, p('flexible', '2026-05-01', '2026-07-17')])];
        expect(cascadeAllFromEdit(schedule, 3, 0, false)).toBe(schedule);
        expect(cascadeAllFromEdit(schedule, -1, 0, false)).toBe(schedule);
    });

    it('does not mutate the schedule it was given', () => {
        const periods = [...fixedHead, p('flexible', '2026-05-01', '2026-07-17')];
        const schedule = [parent(periods)];
        const snapshot = JSON.parse(JSON.stringify(schedule));

        cascadeAllFromEdit(schedule, 0, 0, false);

        expect(schedule).toEqual(snapshot);
    });
});
