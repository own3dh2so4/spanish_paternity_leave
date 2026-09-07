import { describe, expect, it } from 'vitest';
import { makeData } from '../../test-fixtures';
import type { ComputedPeriod, Regime } from '../../types';
import {
    defaultConvenioDays,
    eighthBirthday,
    firstBirthday,
    getAnticipatedWeeks,
    getGestationLeaveWeeks,
    getLeaveAllowance,
    getMaxWeeksFor,
    getPeriodWarning,
    getRemainingFlexWeeks,
    isBeforeNewRegime,
} from '../leaveLaw';

describe('getLeaveAllowance', () => {
    it('gives each parent of a couple 6 + 11 + 2 weeks', () => {
        expect(getLeaveAllowance({ parentCount: 2, babies: 1, disability: false })).toEqual({
            mandatoryWeeks: 6,
            flexibleWeeks: 11,
            extraUntil8Weeks: 2,
        });
    });

    it('gives a single parent 6 + 22 + 4 = 32 weeks', () => {
        const a = getLeaveAllowance({ parentCount: 1, babies: 1, disability: false });
        expect(a).toEqual({ mandatoryWeeks: 6, flexibleWeeks: 22, extraUntil8Weeks: 4 });
        expect(a.mandatoryWeeks + a.flexibleWeeks + a.extraUntil8Weeks).toBe(32);
    });

    it('adds one flexible week per extra child and one for disability (couple)', () => {
        expect(
            getLeaveAllowance({ parentCount: 2, babies: 2, disability: false }).flexibleWeeks,
        ).toBe(12);
        expect(
            getLeaveAllowance({ parentCount: 2, babies: 3, disability: false }).flexibleWeeks,
        ).toBe(13);
        expect(
            getLeaveAllowance({ parentCount: 2, babies: 1, disability: true }).flexibleWeeks,
        ).toBe(12);
        expect(
            getLeaveAllowance({ parentCount: 2, babies: 2, disability: true }).flexibleWeeks,
        ).toBe(13);
    });

    it('doubles the extensions for a single parent', () => {
        expect(
            getLeaveAllowance({ parentCount: 1, babies: 2, disability: false }).flexibleWeeks,
        ).toBe(24);
        expect(
            getLeaveAllowance({ parentCount: 1, babies: 2, disability: true }).flexibleWeeks,
        ).toBe(26);
    });
});

describe('getAnticipatedWeeks', () => {
    const et: Regime[] = ['et', 'et'];

    it('applies only to the biological mother and caps at 4', () => {
        expect(
            getAnticipatedWeeks({ biologicalMother: 1, anticipatedWeeks: 3, regimes: et }, 1),
        ).toBe(3);
        expect(
            getAnticipatedWeeks({ biologicalMother: 1, anticipatedWeeks: 3, regimes: et }, 0),
        ).toBe(0);
        expect(
            getAnticipatedWeeks({ biologicalMother: 0, anticipatedWeeks: 9, regimes: et }, 0),
        ).toBe(4);
        expect(
            getAnticipatedWeeks({ biologicalMother: null, anticipatedWeeks: 2, regimes: et }, 0),
        ).toBe(0);
    });

    it('is not available to public employees', () => {
        const input = {
            biologicalMother: 0,
            anticipatedWeeks: 3,
            regimes: ['ebep', 'et'] as Regime[],
        };
        expect(getAnticipatedWeeks(input, 0)).toBe(0);
        expect(getAnticipatedWeeks({ ...input, regimes: ['sermas', 'et'] }, 0)).toBe(0);
    });
});

describe('regime-specific rules', () => {
    it('grants SERMAS mothers paid leave from week 37 (35 for multiple births)', () => {
        const base = { biologicalMother: 0, regimes: ['sermas', 'et'] as Regime[], babies: 1 };
        expect(getGestationLeaveWeeks(base, 0)).toBe(4);
        expect(getGestationLeaveWeeks({ ...base, babies: 2 }, 0)).toBe(6);
        expect(getGestationLeaveWeeks(base, 1)).toBe(0);
        expect(getGestationLeaveWeeks({ ...base, regimes: ['ebep', 'et'] }, 0)).toBe(0);
        expect(getGestationLeaveWeeks({ ...base, regimes: ['et', 'et'] }, 0)).toBe(0);
    });

    it('defaults the SERMAS 10 extra paid days only for the biological mother', () => {
        expect(defaultConvenioDays('sermas', true)).toBe(10);
        expect(defaultConvenioDays('sermas', false)).toBe(0);
        expect(defaultConvenioDays('ebep', true)).toBe(0);
        expect(defaultConvenioDays('et', true)).toBe(0);
    });
});

describe('birthdays and regime', () => {
    it('computes the first and eighth birthdays', () => {
        expect(firstBirthday('2026-10-01')).toBe('2027-10-01');
        expect(eighthBirthday('2026-10-01')).toBe('2034-10-01');
    });

    it('flags births before 31 July 2025', () => {
        expect(isBeforeNewRegime('2025-07-30')).toBe(true);
        expect(isBeforeNewRegime('2025-07-31')).toBe(false);
    });
});

describe('getPeriodWarning', () => {
    const flexible = (endDate: string): ComputedPeriod => ({
        type: 'flexible',
        startDate: '2027-06-01',
        endDate,
        days: null,
    });

    it('warns when a flexible period ends after the first birthday', () => {
        expect(getPeriodWarning(flexible('2027-10-01'), '2026-10-01')).toBeNull();
        expect(getPeriodWarning(flexible('2027-10-02'), '2026-10-01')).toBe('afterFirstBirthday');
    });

    it('treats flexible-extra blocks like flexible weeks', () => {
        const extra: ComputedPeriod = {
            ...flexible('2027-11-01'),
            type: 'extra',
            isExtra: true,
            extraId: 'ep-1',
            extraPresetKey: 'flexible-extra',
        };
        expect(getPeriodWarning(extra, '2026-10-01')).toBe('afterFirstBirthday');
    });

    it('does not warn for holidays or lactancia', () => {
        const holiday: ComputedPeriod = {
            ...flexible('2028-01-01'),
            type: 'extra',
            isExtra: true,
            extraPresetKey: 'vacation',
        };
        expect(getPeriodWarning(holiday, '2026-10-01')).toBeNull();
        expect(
            getPeriodWarning({ ...flexible('2028-01-01'), type: 'lactancia' }, '2026-10-01'),
        ).toBeNull();
    });
});

describe('flexible quota helpers', () => {
    it('reports no remaining weeks on a freshly computed schedule', () => {
        const data = makeData();
        expect(getRemainingFlexWeeks(data.schedule[0])).toBe(0);
    });

    it('counts anticipated weeks against the quota', () => {
        const data = makeData({ biologicalMother: 0, anticipatedWeeks: 2 });
        const parent = data.schedule[0];
        expect(getRemainingFlexWeeks(parent)).toBe(0);
        const flexible = parent.periods.find((p) => p.type === 'flexible')!;
        expect(getMaxWeeksFor(parent, flexible)).toBe(9);
    });

    it('caps the weeks until age 8 at the allowance and leaves lactancia uncapped', () => {
        const parent = makeData({ parentCount: 1 }).schedule[0];
        const cuidado = parent.periods.find((p) => p.type === 'cuidado')!;
        const lactancia = parent.periods.find((p) => p.type === 'lactancia')!;
        expect(getMaxWeeksFor(parent, cuidado)).toBe(4);
        expect(getMaxWeeksFor(parent, lactancia)).toBeUndefined();
    });
});
