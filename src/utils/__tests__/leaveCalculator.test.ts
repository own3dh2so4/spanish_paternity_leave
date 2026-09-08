import { describe, expect, it } from 'vitest';
import { DUE_DATE, makeInput } from '../../test-fixtures';
import { at, missing, parentAt, periodOf } from '../../test-helpers';
import type { ComputedParentSchedule, LeaveType } from '../../types';
import { addMonths, countWorkingDays, daysBetween, parseLocalDate } from '../dates';
import { calculateLactanciaDays, calculateLeaveSchedule } from '../leaveCalculator';

const weeksOf = (parent: ComputedParentSchedule, type: LeaveType) => {
    const p = parent.periods.find((x) => x.type === type);
    return p ? daysBetween(parseLocalDate(p.startDate), parseLocalDate(p.endDate)) / 7 : 0;
};
const period = periodOf;

describe('calculateLactanciaDays', () => {
    it('accumulates one hour per working day until the ninth month into full days', () => {
        const birth = parseLocalDate(DUE_DATE);
        const returnToWork = parseLocalDate('2027-01-28');
        const expected = Math.floor(countWorkingDays(returnToWork, addMonths(birth, 9)) / 8);
        expect(calculateLactanciaDays(returnToWork, birth)).toBe(expected);
        expect(expected).toBeGreaterThanOrEqual(10);
        expect(expected).toBeLessThanOrEqual(16);
    });

    it('is zero once the child is nine months old', () => {
        const birth = parseLocalDate(DUE_DATE);
        expect(calculateLactanciaDays(addMonths(birth, 9), birth)).toBe(0);
    });

    it('has no artificial cap', () => {
        const birth = parseLocalDate(DUE_DATE);
        expect(calculateLactanciaDays(birth, birth)).toBeGreaterThan(15);
    });
});

describe('calculateLeaveSchedule — couple, together', () => {
    const schedule = calculateLeaveSchedule(makeInput());

    it('produces one schedule per parent with 6 + 11 + 2 weeks each', () => {
        expect(schedule).toHaveLength(2);
        for (const parent of schedule) {
            expect(weeksOf(parent, 'mandatory')).toBe(6);
            expect(weeksOf(parent, 'flexible')).toBe(11);
            expect(weeksOf(parent, 'cuidado')).toBe(2);
            expect(parent.allowance).toEqual({
                mandatoryWeeks: 6,
                flexibleWeeks: 11,
                extraUntil8Weeks: 2,
            });
        }
    });

    it('starts the mandatory block on the birth date and chains the rest without gaps', () => {
        const parent = parentAt(schedule, 0);
        expect(period(parent, 'mandatory').startDate).toBe('2026-10-01');
        expect(period(parent, 'mandatory').endDate).toBe('2026-11-12');
        expect(period(parent, 'flexible').startDate).toBe('2026-11-12');
        expect(period(parent, 'flexible').endDate).toBe('2027-01-28');
        for (let i = 1; i < parent.periods.length; i++) {
            expect(at(parent.periods, i).startDate).toBe(at(parent.periods, i - 1).endDate);
        }
    });

    it('estimates lactancia from the return to work after the flexible block', () => {
        const parent = parentAt(schedule, 0);
        const lact = period(parent, 'lactancia');
        const expected = Math.floor(
            countWorkingDays(parseLocalDate('2027-01-28'), addMonths(parseLocalDate(DUE_DATE), 9)) /
                8,
        );
        expect(lact.days).toBe(expected);
    });

    it('never emits a period before the birth without anticipation', () => {
        expect(parentAt(schedule, 0).periods.every((p) => p.startDate >= DUE_DATE)).toBe(true);
    });
});

describe('calculateLeaveSchedule — single parent', () => {
    it('gives 6 + 22 + 4 weeks', () => {
        const [parent = missing('parent')] = calculateLeaveSchedule(makeInput({ parentCount: 1 }));
        expect(weeksOf(parent, 'mandatory')).toBe(6);
        expect(weeksOf(parent, 'flexible')).toBe(22);
        expect(weeksOf(parent, 'cuidado')).toBe(4);
        expect(period(parent, 'flexible').endDate).toBe('2027-04-15');
    });
});

describe('calculateLeaveSchedule — extensions', () => {
    it('adds flexible weeks for twins and disability', () => {
        const [a = missing('a')] = calculateLeaveSchedule(
            makeInput({ babies: 2, disability: true }),
        );
        expect(weeksOf(a, 'flexible')).toBe(13);
        const [single = missing('single')] = calculateLeaveSchedule(
            makeInput({ parentCount: 1, babies: 2, disability: true }),
        );
        expect(weeksOf(single, 'flexible')).toBe(26);
    });
});

describe('calculateLeaveSchedule — biological mother anticipation', () => {
    const schedule = calculateLeaveSchedule(
        makeInput({ biologicalMother: 0, anticipatedWeeks: 2 }),
    );

    it('places the anticipated weeks right before the due date and shortens the flexible block', () => {
        const mother = parentAt(schedule, 0);
        const anticipated = period(mother, 'anticipated');
        expect(anticipated.startDate).toBe('2026-09-17');
        expect(anticipated.endDate).toBe('2026-10-01');
        expect(weeksOf(mother, 'flexible')).toBe(9);
        expect(at(mother.periods, 0).type).toBe('anticipated');
        expect(at(mother.periods, 1).type).toBe('mandatory');
    });

    it('does not affect the other parent', () => {
        expect(parentAt(schedule, 1).periods.some((p) => p.type === 'anticipated')).toBe(false);
        expect(weeksOf(parentAt(schedule, 1), 'flexible')).toBe(11);
    });
});

describe('calculateLeaveSchedule — optimized (staggered)', () => {
    it('starts the second parent’s flexible weeks when the first parent returns to work', () => {
        const schedule = calculateLeaveSchedule(
            makeInput({ leaveMode: 'optimized', firstParent: 0 }),
        );
        const firstReturn = parentAt(schedule, 0).periods.reduce(
            (m, p) => (p.endDate > m ? p.endDate : m),
            '',
        );
        expect(period(parentAt(schedule, 1), 'flexible').startDate).toBe(firstReturn);
        expect(period(parentAt(schedule, 1), 'mandatory').startDate).toBe(DUE_DATE);
    });

    it('respects firstParent = 1', () => {
        const schedule = calculateLeaveSchedule(
            makeInput({ leaveMode: 'optimized', firstParent: 1 }),
        );
        expect(period(parentAt(schedule, 1), 'flexible').startDate).toBe('2026-11-12');
        expect(period(parentAt(schedule, 0), 'flexible').startDate > '2026-11-12').toBe(true);
    });

    it('accrues the waiting parent lactancia from their mandatory end, not their late return', () => {
        const schedule = calculateLeaveSchedule(
            makeInput({ leaveMode: 'optimized', firstParent: 0 }),
        );
        const waiting = parentAt(schedule, 1);
        const mandatory = period(waiting, 'mandatory');
        const lactancia = period(waiting, 'lactancia');

        expect(lactancia.startDate).toBe(mandatory.endDate);
        expect(lactancia.days).toBe(
            calculateLactanciaDays(parseLocalDate(mandatory.endDate), parseLocalDate(DUE_DATE)),
        );
    });

    it('gives the waiting parent more lactancia than anchoring on their flexible block would', () => {
        const schedule = calculateLeaveSchedule(
            makeInput({ leaveMode: 'optimized', firstParent: 0 }),
        );
        const waiting = parentAt(schedule, 1);
        const onReturn = period(waiting, 'lactancia').days ?? 0;
        const ifAnchoredLate = calculateLactanciaDays(
            parseLocalDate(period(waiting, 'flexible').endDate),
            parseLocalDate(DUE_DATE),
        );

        expect(onReturn).toBeGreaterThan(ifAnchoredLate);
    });

    it('takes the waiting parent lactancia before their flexible block', () => {
        const schedule = calculateLeaveSchedule(
            makeInput({ leaveMode: 'optimized', firstParent: 0 }),
        );
        expect(parentAt(schedule, 1).periods.map((p) => p.type)).toEqual([
            'mandatory',
            'lactancia',
            'flexible',
            'cuidado',
        ]);
    });

    it('never overlaps the two parents\u2019 flexible blocks, which is what staggering buys', () => {
        const schedule = calculateLeaveSchedule(
            makeInput({ leaveMode: 'optimized', firstParent: 0 }),
        );
        const a = period(parentAt(schedule, 0), 'flexible');
        const b = period(parentAt(schedule, 1), 'flexible');

        expect(a.startDate < b.endDate && b.startDate < a.endDate).toBe(false);
    });

    it('leaves the starting parent lactancia where their leave actually ends', () => {
        const schedule = calculateLeaveSchedule(
            makeInput({ leaveMode: 'optimized', firstParent: 0 }),
        );
        const starting = parentAt(schedule, 0);
        expect(period(starting, 'lactancia').startDate).toBe(period(starting, 'flexible').endDate);
    });
});

describe('calculateLeaveSchedule — regimes', () => {
    it('models a SERMAS biological mother: week-37 leave, 10 extra days, 30 natural days of lactancia', () => {
        const schedule = calculateLeaveSchedule(
            makeInput({
                regimes: ['sermas', 'et'],
                convenioDays: [10, 0],
                biologicalMother: 0,
                anticipatedWeeks: 3,
            }),
        );
        const mother = parentAt(schedule, 0);
        expect(mother.regime).toBe('sermas');
        expect(mother.periods.map((p) => p.type)).toEqual([
            'gestation',
            'mandatory',
            'flexible',
            'convenio',
            'lactancia',
            'cuidado',
        ]);
        expect(period(mother, 'gestation').startDate).toBe('2026-09-03');
        expect(period(mother, 'gestation').endDate).toBe(DUE_DATE);
        expect(weeksOf(mother, 'flexible')).toBe(11);
        expect(period(mother, 'convenio').startDate).toBe('2027-01-28');
        expect(period(mother, 'convenio').endDate).toBe('2027-02-07');
        const lact = period(mother, 'lactancia');
        expect(lact.days).toBeNull();
        expect(lact.startDate).toBe('2027-02-07');
        expect(daysBetween(parseLocalDate(lact.startDate), parseLocalDate(lact.endDate))).toBe(30);
        expect(period(parentAt(schedule, 1), 'lactancia').days).not.toBeNull();
        expect(parentAt(schedule, 1).periods.some((p) => p.type === 'convenio')).toBe(false);
    });

    it('doubles SERMAS lactancia for twins and starts the pre-birth leave at week 35', () => {
        const [mother = missing('mother')] = calculateLeaveSchedule(
            makeInput({
                regimes: ['sermas', 'et'],
                convenioDays: [10, 0],
                biologicalMother: 0,
                babies: 2,
            }),
        );
        const lact = period(mother, 'lactancia');
        expect(daysBetween(parseLocalDate(lact.startDate), parseLocalDate(lact.endDate))).toBe(60);
        expect(period(mother, 'gestation').startDate).toBe('2026-08-20');
    });

    it('estimates EBEP lactancia until 12 months and ignores anticipation', () => {
        const [parent = missing('parent')] = calculateLeaveSchedule(
            makeInput({ regimes: ['ebep', 'et'], biologicalMother: 0, anticipatedWeeks: 4 }),
        );
        expect(parent.periods.some((p) => p.type === 'anticipated' || p.type === 'gestation')).toBe(
            false,
        );
        const expected = Math.floor(
            countWorkingDays(
                parseLocalDate('2027-01-28'),
                addMonths(parseLocalDate(DUE_DATE), 12),
            ) / 8,
        );
        expect(period(parent, 'lactancia').days).toBe(expected);
        expect(expected).toBeGreaterThan(15);
    });

    it('adds generic convenio days for a private-sector parent', () => {
        const [parent = missing('parent')] = calculateLeaveSchedule(
            makeInput({ convenioDays: [3, 0] }),
        );
        const convenio = period(parent, 'convenio');
        expect(
            daysBetween(parseLocalDate(convenio.startDate), parseLocalDate(convenio.endDate)),
        ).toBe(3);
        expect(period(parent, 'lactancia').startDate).toBe(convenio.endDate);
    });

    it('accrues lactancia from the end of the convenio days, not from the flexible block', () => {
        const withConvenio = parentAt(
            calculateLeaveSchedule(makeInput({ convenioDays: [10, 0] })),
            0,
        );
        const lact = period(withConvenio, 'lactancia');
        const expected = calculateLactanciaDays(
            parseLocalDate(lact.startDate),
            parseLocalDate(DUE_DATE),
        );
        expect(lact.days).toBe(expected);

        const withoutConvenio = parentAt(calculateLeaveSchedule(makeInput()), 0);
        expect(lact.days!).toBeLessThan(period(withoutConvenio, 'lactancia').days!);
    });
});

describe('calculateLeaveSchedule — holiday declared in the wizard', () => {
    const vacationOf = (overrides: Parameters<typeof makeInput>[0]) => {
        const parent = parentAt(calculateLeaveSchedule(makeInput(overrides)), 0);
        const vacation = parent.periods.find((p) => p.isExtra);
        return { parent, vacation };
    };

    it('adds nothing when no holiday is declared', () => {
        expect(vacationOf({}).vacation).toBeUndefined();
    });

    it('appends the holiday after every statutory period', () => {
        const { parent, vacation } = vacationOf({
            vacationDays: [15, 0],
            vacationUnit: ['workdays', 'workdays'],
        });

        expect(parent.periods.map((p) => p.extraPresetKey ?? p.type)).toEqual([
            'mandatory',
            'flexible',
            'lactancia',
            'cuidado',
            'vacation',
        ]);
        expect(vacation?.startDate).toBe(period(parent, 'cuidado').endDate);
    });

    it('counts working days Monday to Friday when the convenio does', () => {
        const { vacation } = vacationOf({
            vacationDays: [15, 0],
            vacationUnit: ['workdays', 'workdays'],
        });

        expect(vacation?.days).toBe(15);
        expect(
            countWorkingDays(
                parseLocalDate(vacation?.startDate ?? ''),
                parseLocalDate(vacation?.endDate ?? ''),
            ),
        ).toBe(15);
    });

    it('counts calendar days when the convenio does, which is a shorter stretch', () => {
        const working = vacationOf({
            vacationDays: [15, 0],
            vacationUnit: ['workdays', 'workdays'],
        }).vacation;
        const natural = vacationOf({
            vacationDays: [15, 0],
            vacationUnit: ['days', 'days'],
        }).vacation;

        expect(natural?.days).toBeNull();
        const span = (p?: { startDate: string; endDate: string }) =>
            daysBetween(parseLocalDate(p?.startDate ?? ''), parseLocalDate(p?.endDate ?? ''));
        expect(span(natural)).toBe(15);
        expect(span(working)).toBeGreaterThan(span(natural));
    });

    it('is declared per parent', () => {
        const schedule = calculateLeaveSchedule(
            makeInput({ vacationDays: [0, 10], vacationUnit: ['workdays', 'workdays'] }),
        );

        expect(parentAt(schedule, 0).periods.some((p) => p.isExtra)).toBe(false);
        expect(parentAt(schedule, 1).periods.some((p) => p.isExtra)).toBe(true);
    });

    it('pushes the waiting parent further out in staggered mode', () => {
        const withHoliday = calculateLeaveSchedule(
            makeInput({
                leaveMode: 'optimized',
                firstParent: 0,
                vacationDays: [15, 0],
                vacationUnit: ['workdays', 'workdays'],
            }),
        );
        const without = calculateLeaveSchedule(
            makeInput({ leaveMode: 'optimized', firstParent: 0 }),
        );

        expect(
            period(parentAt(withHoliday, 1), 'flexible').startDate >
                period(parentAt(without, 1), 'flexible').startDate,
        ).toBe(true);
    });
});

describe('calculateLeaveSchedule — keeping the weeks until age 8 for later', () => {
    it('omits the period and returns to work earlier when a parent opts out', () => {
        const withWeeks = parentAt(calculateLeaveSchedule(makeInput()), 0);
        const [without = missing('without')] = calculateLeaveSchedule(
            makeInput({ useExtraWeeks: [false, false] }),
        );
        expect(without.periods.some((p) => p.type === 'cuidado')).toBe(false);
        expect(without.allowance.extraUntil8Weeks).toBe(2);
        const lastWith = withWeeks.periods.reduce((m, p) => (p.endDate > m ? p.endDate : m), '');
        const lastWithout = without.periods.reduce((m, p) => (p.endDate > m ? p.endDate : m), '');
        expect(lastWithout < lastWith).toBe(true);
        expect(daysBetween(parseLocalDate(lastWithout), parseLocalDate(lastWith))).toBe(14);
    });

    it('is decided per parent', () => {
        const schedule = calculateLeaveSchedule(makeInput({ useExtraWeeks: [false, true] }));
        expect(parentAt(schedule, 0).periods.some((p) => p.type === 'cuidado')).toBe(false);
        expect(weeksOf(parentAt(schedule, 1), 'cuidado')).toBe(2);
    });

    it('drops 4 weeks for a single parent who opts out', () => {
        const [parent = missing('parent')] = calculateLeaveSchedule(
            makeInput({ parentCount: 1, useExtraWeeks: [false] }),
        );
        expect(parent.periods.some((p) => p.type === 'cuidado')).toBe(false);
        expect(parent.allowance.extraUntil8Weeks).toBe(4);
    });

    it('lets the second parent start earlier in staggered mode', () => {
        const opts = { leaveMode: 'optimized' as const, firstParent: 0 };
        const withWeeks = calculateLeaveSchedule(makeInput(opts));
        const without = calculateLeaveSchedule(
            makeInput({ ...opts, useExtraWeeks: [false, false] }),
        );
        expect(
            period(parentAt(without, 1), 'flexible').startDate <
                period(parentAt(withWeeks, 1), 'flexible').startDate,
        ).toBe(true);
        expect(period(parentAt(without, 1), 'flexible').startDate).toBe(
            parentAt(without, 0).periods.reduce((m, p) => (p.endDate > m ? p.endDate : m), ''),
        );
    });
});
