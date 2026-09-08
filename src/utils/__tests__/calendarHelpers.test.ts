import { describe, expect, it } from 'vitest';
import { at, parentAt } from '../../test-helpers';
import { en } from '../../i18n/en';
import { es } from '../../i18n/es';
import { makeData } from '../../test-fixtures';
import type { ComputedParentSchedule, ExtraLeaveItem } from '../../types';
import {
    addExtraPeriod,
    formatLeaveType,
    getPeriodKey,
    movePeriod,
    removeExtraPeriod,
    reorderPeriods,
    resizePeriod,
    shiftPeriodStart,
} from '../calendarHelpers';
import { countWorkingDays, daysBetween, parseLocalDate } from '../dates';

const find = (parent: ComputedParentSchedule, key: string) =>
    parent.periods.find((p) => getPeriodKey(p) === key)!;
const weeks = (parent: ComputedParentSchedule, key: string) => {
    const p = find(parent, key);
    return daysBetween(parseLocalDate(p.startDate), parseLocalDate(p.endDate)) / 7;
};
const expectChained = (parent: ComputedParentSchedule) => {
    const editable = parent.periods.filter(
        (p) => p.type !== 'mandatory' && p.type !== 'anticipated',
    );
    for (let i = 1; i < editable.length; i++) {
        expect(at(editable, i).startDate >= at(editable, i - 1).endDate).toBe(true);
    }
};

const holiday: ExtraLeaveItem = {
    id: 'ep-1',
    presetKey: 'vacation',
    durationValue: 2,
    durationUnit: 'weeks',
};

describe('resizePeriod', () => {
    it('shrinks the flexible block and pulls the following periods earlier', () => {
        const data = makeData();
        const before = find(parentAt(data.schedule, 0), 'cuidado').startDate;
        const next = resizePeriod(data.schedule, 0, 'flexible', 8, 'weeks', 0, false);
        expect(weeks(parentAt(next, 0), 'flexible')).toBe(8);
        expect(find(parentAt(next, 0), 'lactancia').startDate).toBe(
            find(parentAt(next, 0), 'flexible').endDate,
        );
        expect(find(parentAt(next, 0), 'cuidado').startDate < before).toBe(true);
        expectChained(parentAt(next, 0));
    });

    it('never lets the flexible block exceed the statutory allowance', () => {
        const data = makeData();
        const next = resizePeriod(data.schedule, 0, 'flexible', 40, 'weeks', 0, false);
        expect(weeks(parentAt(next, 0), 'flexible')).toBe(11);
    });

    it('caps the weeks until age 8 at 2 for a couple and 4 for a single parent', () => {
        expect(
            weeks(
                parentAt(resizePeriod(makeData().schedule, 0, 'cuidado', 9, 'weeks', 0, false), 0),
                'cuidado',
            ),
        ).toBe(2);
        expect(
            weeks(
                parentAt(
                    resizePeriod(
                        makeData({ parentCount: 1 }).schedule,
                        0,
                        'cuidado',
                        9,
                        'weeks',
                        0,
                        false,
                    ),
                    0,
                ),
                'cuidado',
            ),
        ).toBe(4);
    });

    it('resizes lactancia in working days', () => {
        const data = makeData();
        const next = resizePeriod(data.schedule, 0, 'lactancia', 5, 'days', 0, false);
        const lact = find(parentAt(next, 0), 'lactancia');
        expect(lact.days).toBe(5);
        expect(daysBetween(parseLocalDate(lact.startDate), parseLocalDate(lact.endDate))).toBe(7);
    });

    it('in optimized mode re-chains the second parent after the first parent grows', () => {
        const data = makeData({ leaveMode: 'optimized', firstParent: 0 });
        const shorter = resizePeriod(data.schedule, 0, 'flexible', 5, 'weeks', 0, true);
        const firstReturn = parentAt(shorter, 0).periods.reduce(
            (m, p) => (p.endDate > m ? p.endDate : m),
            '',
        );
        const takeover = at(
            parentAt(shorter, 1).periods.filter((p) => p.type !== 'mandatory'),
            0,
        );
        expect(takeover.startDate).toBe(firstReturn);
    });
});

describe('shiftPeriodStart', () => {
    it('moves a period later and preserves its duration, pushing later periods', () => {
        const data = makeData();
        const next = shiftPeriodStart(data.schedule, 0, 'flexible', '2026-12-01', 0, false);
        const flex = find(parentAt(next, 0), 'flexible');
        expect(flex.startDate).toBe('2026-12-01');
        expect(weeks(parentAt(next, 0), 'flexible')).toBe(11);
        expectChained(parentAt(next, 0));
    });

    it('clamps to the end of the previous period', () => {
        const data = makeData();
        const next = shiftPeriodStart(data.schedule, 0, 'flexible', '2026-10-15', 0, false);
        expect(find(parentAt(next, 0), 'flexible').startDate).toBe('2026-11-12');
    });
});

describe('reorderPeriods / movePeriod', () => {
    it('swaps two editable periods and re-chains from the mandatory end', () => {
        const data = makeData();
        const next = reorderPeriods(data.schedule, 0, 'lactancia', 'flexible', 0, false);
        const editable = parentAt(next, 0).periods.filter((p) => p.type !== 'mandatory');
        expect(editable.map((p) => p.type)).toEqual(['lactancia', 'flexible', 'cuidado']);
        expect(at(editable, 0).startDate).toBe('2026-11-12');
        expectChained(parentAt(next, 0));
    });

    it('movePeriod moves one step and is a no-op at the edges', () => {
        const data = makeData();
        const up = movePeriod(data.schedule, 0, 'cuidado', -1, 0, false);
        expect(
            parentAt(up, 0)
                .periods.filter((p) => p.type !== 'mandatory')
                .map((p) => p.type),
        ).toEqual(['flexible', 'cuidado', 'lactancia']);
        expect(movePeriod(data.schedule, 0, 'flexible', -1, 0, false)).toBe(data.schedule);
    });

    it('keeps the anticipated block fixed at the front', () => {
        const data = makeData({ biologicalMother: 0, anticipatedWeeks: 1 });
        const next = reorderPeriods(data.schedule, 0, 'cuidado', 'flexible', 0, false);
        expect(at(parentAt(next, 0).periods, 0).type).toBe('anticipated');
        expect(at(parentAt(next, 0).periods, 1).type).toBe('mandatory');
    });
});

describe('extra periods', () => {
    it('appends after the last period and removes cleanly', () => {
        const data = makeData();
        const withExtra = addExtraPeriod(data.schedule, 0, holiday, 0, false);
        const extra = find(parentAt(withExtra, 0), 'ep-1');
        const lastBefore = parentAt(data.schedule, 0).periods.reduce(
            (m, p) => (p.endDate > m ? p.endDate : m),
            '',
        );
        expect(extra.startDate).toBe(lastBefore);
        expect(daysBetween(parseLocalDate(extra.startDate), parseLocalDate(extra.endDate))).toBe(
            14,
        );

        const removed = removeExtraPeriod(withExtra, 0, 'ep-1', 0, false);
        expect(parentAt(removed, 0).periods.some((p) => p.extraId === 'ep-1')).toBe(false);
    });

    it.each([
        ['days', 'days' as const, 10, 10],
        ['weeks', 'weeks' as const, 2, 14],
    ])('counts a holiday given in calendar %s as calendar days', (_l, unit, value, expected) => {
        const data = makeData();
        const next = addExtraPeriod(
            data.schedule,
            0,
            { id: 'ep-1', presetKey: 'vacation', durationValue: value, durationUnit: unit },
            0,
            false,
        );
        const extra = find(parentAt(next, 0), 'ep-1');

        expect(daysBetween(parseLocalDate(extra.startDate), parseLocalDate(extra.endDate))).toBe(
            expected,
        );
        expect(extra.days).toBeNull();
    });

    it('counts a holiday given in working days Monday to Friday', () => {
        const data = makeData();
        const next = addExtraPeriod(
            data.schedule,
            0,
            { id: 'ep-1', presetKey: 'vacation', durationValue: 10, durationUnit: 'workdays' },
            0,
            false,
        );
        const extra = find(parentAt(next, 0), 'ep-1');

        expect(extra.days).toBe(10);
        expect(
            countWorkingDays(parseLocalDate(extra.startDate), parseLocalDate(extra.endDate)),
        ).toBe(10);
        // Ten working days always span more than ten calendar days once a weekend falls inside.
        expect(
            daysBetween(parseLocalDate(extra.startDate), parseLocalDate(extra.endDate)),
        ).toBeGreaterThan(10);
    });

    it('keeps a working-day holiday in working days when a resize re-chains it', () => {
        const data = makeData();
        const withExtra = addExtraPeriod(
            data.schedule,
            0,
            { id: 'ep-1', presetKey: 'vacation', durationValue: 10, durationUnit: 'workdays' },
            0,
            false,
        );
        const before = find(parentAt(withExtra, 0), 'ep-1');

        const shrunk = resizePeriod(withExtra, 0, 'flexible', 4, 'weeks', 0, false);
        const after = find(parentAt(shrunk, 0), 'ep-1');

        expect(after.startDate < before.startDate).toBe(true);
        expect(
            countWorkingDays(parseLocalDate(after.startDate), parseLocalDate(after.endDate)),
        ).toBe(10);
    });

    it('in optimized mode an extra on the first parent pushes the second parent', () => {
        const data = makeData({ leaveMode: 'optimized', firstParent: 0 });
        const before = find(parentAt(data.schedule, 1), 'flexible').startDate;
        const next = addExtraPeriod(data.schedule, 0, holiday, 0, true);
        expect(find(parentAt(next, 1), 'flexible').startDate > before).toBe(true);
    });
});

describe('formatLeaveType', () => {
    it('labels every period type in both languages', () => {
        const data = makeData({ biologicalMother: 0, anticipatedWeeks: 1 });
        const withExtra = addExtraPeriod(data.schedule, 0, holiday, 0, false);
        for (const t of [en, es]) {
            for (const p of parentAt(withExtra, 0).periods) {
                const label = formatLeaveType(p, t);
                expect(label.length).toBeGreaterThan(3);
                expect(label).not.toBe(p.type);
            }
        }
        expect(formatLeaveType(find(parentAt(withExtra, 0), 'ep-1'), es)).toContain('Vacaciones');
        expect(formatLeaveType(find(parentAt(withExtra, 0), 'cuidado'), es)).toContain('8 años');
    });

    it('uses the custom name for custom extras', () => {
        const custom: ExtraLeaveItem = {
            ...holiday,
            id: 'ep-2',
            presetKey: 'custom',
            customName: 'Mudanza',
        };
        const next = addExtraPeriod(makeData().schedule, 0, custom, 0, false);
        expect(formatLeaveType(find(parentAt(next, 0), 'ep-2'), es)).toBe('Mudanza');
    });
});
