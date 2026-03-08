import { describe, it, expect } from 'vitest';
import {
    daysBetween,
    calculateCustomEnd,
    getNormalizedCustom,
    getEffectiveOrder,
    buildUnifiedPeriods,
    applyCustomDurationsToParent,
    applyCustomDurations,
    getRemainingFlexWeeks,
    formatLeaveType,
    DEFAULT_DURATIONS,
    computeSchedule,
    cascadeFrom,
    resizePeriod,
    shiftPeriodStart,
    reorderPeriods,
    addExtraPeriod,
    removeExtraPeriod,
    parseLocalDate,
} from '../calendarHelpers';
import { compressWizardData, decompressWizardData } from '../shareUtils';
import type {
    ComputedParentSchedule,
    ComputedPeriod,
    CustomDurations,
    CustomDurationsForParent,
    ExtraLeaveItem,
    LeavePeriod,
    ParentSchedule,
    ScheduleResult,
} from '../../types';
import { FLEXIBLE_WEEKS, LEAVE_TYPES, MANDATORY_WEEKS } from '../../constants';
import { addDays } from '../leaveCalculator';

// ─── ComputedParentSchedule helpers ──────────────────────────────────────────

function makeIso(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function makeComputedPeriod(
    type: ComputedPeriod['type'],
    startDate: string,
    endDate: string,
    days: number | null = null,
    extras: Partial<ComputedPeriod> = {},
): ComputedPeriod {
    return { type, startDate, endDate, days, ...extras };
}

function makeComputedParent(
    flexDays: number,
    extraFlexDays: number = 0,
): ComputedParentSchedule {
    // Mandatory: 6 weeks starting 2026-04-01
    const mandStart = makeIso(2026, 4, 1);
    const mandEnd = makeIso(2026, 5, 13); // approx 6w
    // Flexible starts where mandatory ends
    const flexEnd = (() => {
        const d = new Date(2026, 4, 13); // May 13
        d.setDate(d.getDate() + flexDays);
        return makeIso(d.getFullYear(), d.getMonth() + 1, d.getDate());
    })();
    const periods: ComputedPeriod[] = [
        makeComputedPeriod('mandatory', mandStart, mandEnd),
        makeComputedPeriod('flexible', mandEnd, flexEnd),
    ];
    if (extraFlexDays > 0) {
        const extraEnd = (() => {
            const d = new Date(flexEnd);
            d.setDate(d.getDate() + extraFlexDays);
            return makeIso(d.getFullYear(), d.getMonth() + 1, d.getDate());
        })();
        periods.push(
            makeComputedPeriod('extra', flexEnd, extraEnd, null, {
                isExtra: true,
                extraId: 'ep-1',
                extraName: 'Flex',
                extraPresetKey: 'flexible-extra',
                durationValue: extraFlexDays / 7,
                durationUnit: 'weeks',
            }),
        );
    }
    return { name: 'Test', colorId: 'indigo', periods };
}

// ─── Shared test fixtures ─────────────────────────────────────────────────────

function makeDate(year: number, month: number, day: number): Date {
    const d = new Date(year, month - 1, day);
    d.setHours(0, 0, 0, 0);
    return d;
}

function makePeriod(
    type: LeavePeriod['type'],
    startDate: Date,
    endDate: Date,
    days: number | null = null,
): LeavePeriod {
    return { type, startDate, endDate, parentIndex: 0, parentName: 'Test', days };
}

// Minimal TranslationKeys stub — only include the functions used by formatLeaveType
const stubT = {
    mandatoryLeave: (w: number) => `Mandatory ${w}w`,
    flexibleLeave: (w: number) => `Flexible ${w}w`,
    accumulatedLactancia: (v: number, u: string) => `Lactancia ${v}${u}`,
    childcareLeave: 'Childcare',
    childcareLeavePaid: (w: number) => `Childcare ${w}w paid`,
    childcareLeavePaidUnpaid: (p: number, u: number) => `Childcare ${p}w+${u}w`,
    extraPeriod: 'Extra',
} as unknown as import('../../i18n/en').TranslationKeys;

// ─── daysBetween ──────────────────────────────────────────────────────────────

describe('daysBetween', () => {
    it('returns 0 for same day', () => {
        const d = makeDate(2026, 1, 1);
        expect(daysBetween(d, d)).toBe(0);
    });

    it('counts consecutive days', () => {
        expect(daysBetween(makeDate(2026, 1, 1), makeDate(2026, 1, 8))).toBe(7);
    });

    it('returns a negative value when end is before start', () => {
        expect(daysBetween(makeDate(2026, 1, 8), makeDate(2026, 1, 1))).toBe(-7);
    });

    it('counts across month boundaries correctly', () => {
        // 2026 is not a leap year: Jan 28 → Mar 1 = 3 (rest of Jan) + 28 (Feb) + 1 (Mar 1) = 32
        expect(daysBetween(makeDate(2026, 1, 28), makeDate(2026, 3, 1))).toBe(32);
    });
});

// ─── getNormalizedCustom ──────────────────────────────────────────────────────

describe('getNormalizedCustom', () => {
    it('returns null when customForParent is undefined', () => {
        expect(getNormalizedCustom(undefined, 'flexible')).toBeNull();
    });

    it('returns null when the period type is not in the map', () => {
        const custom: CustomDurationsForParent = {};
        expect(getNormalizedCustom(custom, 'flexible')).toBeNull();
    });

    it('converts a legacy plain-number value to {value, unit: "days"}', () => {
        const custom: CustomDurationsForParent = { flexible: 77 };
        expect(getNormalizedCustom(custom, 'flexible')).toEqual({
            value: 77,
            unit: 'days',
        });
    });

    it('passes through a typed CustomDuration object unchanged', () => {
        const custom: CustomDurationsForParent = {
            flexible: { value: 10, unit: 'weeks' },
        };
        expect(getNormalizedCustom(custom, 'flexible')).toEqual({
            value: 10,
            unit: 'weeks',
        });
    });
});

// ─── calculateCustomEnd ───────────────────────────────────────────────────────

describe('calculateCustomEnd', () => {
    const start = makeDate(2026, 1, 5); // Mon 5 Jan 2026

    it('adds calendar weeks for unit "weeks"', () => {
        const end = calculateCustomEnd(start, { value: 2, unit: 'weeks' }, false);
        expect(end).toEqual(makeDate(2026, 1, 19));
    });

    it('adds calendar months for unit "months"', () => {
        const end = calculateCustomEnd(start, { value: 1, unit: 'months' }, false);
        expect(end).toEqual(makeDate(2026, 2, 5));
    });

    it('adds calendar days for unit "days" when not lactancia', () => {
        const end = calculateCustomEnd(start, { value: 5, unit: 'days' }, false);
        expect(end).toEqual(makeDate(2026, 1, 10));
    });

    it('uses addWorkingDays for unit "days" when isLactancia is true', () => {
        // 5 working days from Mon 5 Jan → ends after Mon 12 Jan (skips weekend)
        const end = calculateCustomEnd(start, { value: 5, unit: 'days' }, true);
        expect(end).toEqual(makeDate(2026, 1, 12));
    });
});

// ─── getEffectiveOrder ────────────────────────────────────────────────────────

describe('getEffectiveOrder', () => {
    const flex: LeavePeriod = makePeriod(
        'flexible',
        makeDate(2026, 2, 1),
        makeDate(2026, 4, 1),
    );
    const lact: LeavePeriod = makePeriod(
        'lactancia',
        makeDate(2026, 4, 1),
        makeDate(2026, 5, 1),
    );
    const extra: ExtraLeaveItem = {
        id: 'ep-1',
        name: 'Vacation',
        durationValue: 2,
        durationUnit: 'weeks',
    };

    it('returns the natural order when storedOrder is empty', () => {
        const order = getEffectiveOrder([flex, lact], [extra], []);
        expect(order).toEqual(['flexible', 'lactancia', 'ep-1']);
    });

    it('returns the natural order when storedOrder is undefined', () => {
        const order = getEffectiveOrder([flex, lact], [extra], undefined);
        expect(order).toEqual(['flexible', 'lactancia', 'ep-1']);
    });

    it('honours the stored order', () => {
        const order = getEffectiveOrder(
            [flex, lact],
            [extra],
            ['ep-1', 'lactancia', 'flexible'],
        );
        expect(order).toEqual(['ep-1', 'lactancia', 'flexible']);
    });

    it('prunes stale keys from the stored order', () => {
        const order = getEffectiveOrder([flex], [], ['ep-deleted', 'flexible']);
        expect(order).toEqual(['flexible']);
    });

    it('appends new keys that are missing from the stored order', () => {
        const order = getEffectiveOrder([flex, lact], [], ['flexible']);
        expect(order).toEqual(['flexible', 'lactancia']);
    });
});

// ─── buildUnifiedPeriods ──────────────────────────────────────────────────────

describe('buildUnifiedPeriods', () => {
    const start = makeDate(2026, 1, 1);

    it('cascades periods sequentially from startCursor', () => {
        const flex = makePeriod('flexible', makeDate(2026, 1, 1), makeDate(2026, 3, 18));
        const lact = makePeriod('lactancia', makeDate(2026, 3, 18), makeDate(2026, 4, 2), 10);
        const periods = buildUnifiedPeriods(
            ['flexible', 'lactancia'],
            [flex, lact],
            [],
            start,
        );

        expect(periods).toHaveLength(2);
        expect(periods[0].key).toBe('flexible');
        expect(periods[0].startDate).toEqual(start);
        // The second period must start exactly where the first one ended
        expect(periods[1].startDate).toEqual(periods[0].endDate);
    });

    it('places extra items in the given order', () => {
        const extra: ExtraLeaveItem = {
            id: 'ep-1',
            name: 'Vacation',
            durationValue: 2,
            durationUnit: 'weeks',
        };
        const flex = makePeriod('flexible', makeDate(2026, 1, 1), makeDate(2026, 3, 18));
        const periods = buildUnifiedPeriods(['ep-1', 'flexible'], [flex], [extra], start);
        expect(periods[0].key).toBe('ep-1');
        expect(periods[0].isExtra).toBe(true);
        expect(periods[1].key).toBe('flexible');
    });

    it('respects a custom start date on extra items when it is later than the cursor', () => {
        const laterDate = makeDate(2026, 6, 1);
        const extra: ExtraLeaveItem = {
            id: 'ep-1',
            name: 'Vacation',
            durationValue: 1,
            durationUnit: 'weeks',
            startDate: '2026-06-01',
        };
        const periods = buildUnifiedPeriods(['ep-1'], [], [extra], start);
        expect(periods[0].startDate).toEqual(laterDate);
    });

    it('ignores a custom start date on extra items when it is earlier than the cursor', () => {
        const extra: ExtraLeaveItem = {
            id: 'ep-1',
            name: 'Vacation',
            durationValue: 1,
            durationUnit: 'weeks',
            // Start date is before the cursor (2026-01-01)
            startDate: '2025-01-01',
        };
        const periods = buildUnifiedPeriods(['ep-1'], [], [extra], start);
        expect(periods[0].startDate).toEqual(start);
    });

    it('uses a custom duration for a regular period when provided', () => {
        const flex = makePeriod('flexible', makeDate(2026, 1, 1), makeDate(2026, 3, 18));
        const custom: CustomDurationsForParent = { flexible: { value: 4, unit: 'weeks' } };
        const periods = buildUnifiedPeriods(['flexible'], [flex], [], start, custom);
        const expectedEnd = addDays(start, 4 * 7);
        expect(periods[0].endDate).toEqual(expectedEnd);
    });
});

// ─── applyCustomDurationsToParent ────────────────────────────────────────────

describe('applyCustomDurationsToParent', () => {
    const mandatoryStart = makeDate(2026, 1, 15);
    const mandatoryEnd = addDays(mandatoryStart, MANDATORY_WEEKS * 7);
    const flexEnd = addDays(mandatoryEnd, FLEXIBLE_WEEKS * 7);

    const mandatory = makePeriod('mandatory', mandatoryStart, mandatoryEnd);
    const flexible = makePeriod('flexible', mandatoryEnd, flexEnd);

    it('is a no-op when customForParent and customStarts are both empty', () => {
        const input = [mandatory, flexible];
        const result = applyCustomDurationsToParent(input, {}, {});
        expect(result).toBe(input);
    });

    it('applies a custom week count to the flexible period', () => {
        const custom: CustomDurationsForParent = { flexible: { value: 4, unit: 'weeks' } };
        const result = applyCustomDurationsToParent([mandatory, flexible], custom);
        expect(result[1].startDate).toEqual(mandatoryEnd);
        expect(result[1].endDate).toEqual(addDays(mandatoryEnd, 4 * 7));
    });

    it('cascades subsequent period start after a shortened preceding period', () => {
        const custom: CustomDurationsForParent = { flexible: { value: 4, unit: 'weeks' } };
        // Suppose there is a lactancia period that comes after flexible
        const lactEnd = addDays(flexEnd, 10);
        const lactancia = makePeriod('lactancia', flexEnd, lactEnd, 10);
        const result = applyCustomDurationsToParent(
            [mandatory, flexible, lactancia],
            custom,
        );
        const newFlexEnd = addDays(mandatoryEnd, 4 * 7);
        expect(result[2].startDate).toEqual(newFlexEnd);
    });
});

// ─── applyCustomDurations ─────────────────────────────────────────────────────

describe('applyCustomDurations', () => {
    const birthDate = makeDate(2026, 3, 1);
    const mandatoryEnd = addDays(birthDate, MANDATORY_WEEKS * 7);
    const flexEnd = addDays(mandatoryEnd, FLEXIBLE_WEEKS * 7);

    function makeSchedule(secondFlexStart?: Date): ScheduleResult {
        const firstParent: ParentSchedule = {
            name: 'Parent A',
            periods: [
                makePeriod('mandatory', birthDate, mandatoryEnd),
                makePeriod('flexible', mandatoryEnd, flexEnd),
            ],
            returnDate: flexEnd,
        };
        const sfStart = secondFlexStart ?? mandatoryEnd;
        const sfEnd = addDays(sfStart, FLEXIBLE_WEEKS * 7);
        const secondParent: ParentSchedule = {
            name: 'Parent B',
            periods: [
                makePeriod('mandatory', birthDate, mandatoryEnd),
                makePeriod('flexible', sfStart, sfEnd),
            ],
            returnDate: sfEnd,
        };
        const calEnd = addDays(flexEnd, FLEXIBLE_WEEKS * 7 + 31);
        return {
            parents: [firstParent, secondParent],
            calendarStart: birthDate,
            calendarEnd: calEnd,
        };
    }

    it('is a no-op when customDurations and customStartDates are both empty', () => {
        const schedule = makeSchedule();
        const result = applyCustomDurations(schedule, {}, {}, 'together', 0);
        expect(result).toBe(schedule);
    });

    it('applies a custom duration in together mode', () => {
        const schedule = makeSchedule();
        const customDurations: CustomDurations = {
            0: { flexible: { value: 4, unit: 'weeks' } },
        };
        const result = applyCustomDurations(schedule, customDurations, {}, 'together', 0);
        const newFlexEnd = addDays(mandatoryEnd, 4 * 7);
        expect(result.parents[0].returnDate).toEqual(newFlexEnd);
    });

    it('calendar range shrinks when a period is shortened', () => {
        const schedule = makeSchedule();
        const originalEnd = schedule.calendarEnd;
        const customDurations: CustomDurations = {
            0: { flexible: { value: 2, unit: 'weeks' } },
            1: { flexible: { value: 2, unit: 'weeks' } },
        };
        const result = applyCustomDurations(schedule, customDurations, {}, 'together', 0);
        expect(result.calendarEnd < originalEnd).toBe(true);
    });
});

// ─── getRemainingFlexWeeks ────────────────────────────────────────────────────

describe('getRemainingFlexWeeks', () => {
    it('returns 0 when the main period uses the full allocation', () => {
        // FLEXIBLE_WEEKS * 7 calendar days → no weeks left
        const parent = makeComputedParent(FLEXIBLE_WEEKS * 7);
        expect(getRemainingFlexWeeks(parent)).toBe(0);
    });

    it('returns remaining weeks when the main flexible period is shortened', () => {
        const parent = makeComputedParent(8 * 7); // 8 weeks
        expect(getRemainingFlexWeeks(parent)).toBe(FLEXIBLE_WEEKS - 8);
    });

    it('accounts for both a shortened main period AND flexible-extra items', () => {
        // 6-week main + 2-week extra → FLEXIBLE_WEEKS - 8 remain
        const parent = makeComputedParent(6 * 7, 2 * 7);
        expect(getRemainingFlexWeeks(parent)).toBe(FLEXIBLE_WEEKS - 6 - 2);
    });

    it('returns 0 when the full allocation is used via the main period', () => {
        const parent = makeComputedParent(FLEXIBLE_WEEKS * 7);
        expect(getRemainingFlexWeeks(parent)).toBe(0);
    });

    it('never returns a negative value when over-allocated', () => {
        const parent = makeComputedParent((FLEXIBLE_WEEKS + 5) * 7);
        expect(getRemainingFlexWeeks(parent)).toBe(0);
    });
});

// ─── formatLeaveType ──────────────────────────────────────────────────────────

describe('formatLeaveType', () => {
    const defaultMandatoryWeeks = Math.round(DEFAULT_DURATIONS.mandatory / 7);
    const defaultFlexWeeks = Math.round(DEFAULT_DURATIONS.flexible / 7);

    // Helper: create a minimal ComputedPeriod from a type and calendar-day count
    function makePeriodForFormat(
        type: ComputedPeriod['type'],
        calDays: number,
        days: number | null = null,
    ): ComputedPeriod {
        return {
            type,
            startDate: '2026-04-01',
            endDate: makeIso(
                new Date(2026, 3, 1 + calDays).getFullYear(),
                new Date(2026, 3, 1 + calDays).getMonth() + 1,
                new Date(2026, 3, 1 + calDays).getDate(),
            ),
            days,
        };
    }

    it('formats mandatory leave with default weeks', () => {
        const p = makePeriodForFormat('mandatory', DEFAULT_DURATIONS.mandatory);
        expect(formatLeaveType(p, stubT)).toBe(`Mandatory ${defaultMandatoryWeeks}w`);
    });

    it('formats mandatory leave with 8 weeks', () => {
        const p = makePeriodForFormat('mandatory', 8 * 7);
        expect(formatLeaveType(p, stubT)).toBe('Mandatory 8w');
    });

    it('formats flexible leave with default weeks', () => {
        const p = makePeriodForFormat('flexible', DEFAULT_DURATIONS.flexible);
        expect(formatLeaveType(p, stubT)).toBe(`Flexible ${defaultFlexWeeks}w`);
    });

    it('formats lactancia with working days from period.days', () => {
        // 12 working days → shows "Lactancia 12days"
        const p = makePeriodForFormat('lactancia', 17, 12); // ~17 cal days for 12 working
        expect(formatLeaveType(p, stubT)).toBe('Lactancia 12days');
    });

    it('formats lactancia using calendar duration when days is null', () => {
        const p = makePeriodForFormat('lactancia', 15, null);
        expect(formatLeaveType(p, stubT)).toBe('Lactancia 15days');
    });

    it('formats cuidado with paid-only label for 2 weeks', () => {
        // 2 weeks = 14 calendar days, within CUIDADO_PAID_WEEKS (2)
        const p = makePeriodForFormat('cuidado', 14);
        expect(formatLeaveType(p, stubT)).toBe('Childcare 2w paid');
    });

    it('formats cuidado with paid+unpaid label for 5 weeks', () => {
        const p = makePeriodForFormat('cuidado', 35);
        expect(formatLeaveType(p, stubT)).toBe('Childcare 2w+3w');
    });

    it('returns childcareLeave fallback for 0-day cuidado period', () => {
        const p: ComputedPeriod = { type: 'cuidado', startDate: '2026-04-01', endDate: '2026-04-01', days: null };
        expect(formatLeaveType(p, stubT)).toBe('Childcare');
    });

    it('formats extra period', () => {
        const p = makePeriodForFormat(LEAVE_TYPES.EXTRA, 14);
        expect(formatLeaveType(p, stubT)).toBe('Extra');
    });
});

// ─── computeSchedule ─────────────────────────────────────────────────────────

describe('computeSchedule', () => {
    const baseData = {
        dueDate: '2026-04-01',
        parentCount: 1 as const,
        names: ['Alice'],
        colors: ['indigo'] as const,
        leaveMode: 'together' as const,
        firstParent: 0,
    };

    it('returns one ComputedParentSchedule per parent', () => {
        const result = computeSchedule(baseData);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Alice');
    });

    it('the first period is mandatory', () => {
        const result = computeSchedule(baseData);
        expect(result[0].periods[0].type).toBe('mandatory');
    });

    it('mandatory period starts on the due date', () => {
        const result = computeSchedule(baseData);
        expect(result[0].periods[0].startDate).toBe('2026-04-01');
    });

    it('mandatory period is 6 weeks long', () => {
        const result = computeSchedule(baseData);
        const m = result[0].periods[0];
        const days = daysBetween(parseLocalDate(m.startDate), parseLocalDate(m.endDate));
        expect(days).toBe(MANDATORY_WEEKS * 7);
    });

    it('all period dates are ISO strings (YYYY-MM-DD)', () => {
        const result = computeSchedule(baseData);
        for (const period of result[0].periods) {
            expect(period.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(period.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
    });

    it('flexible period starts where mandatory ends', () => {
        const result = computeSchedule(baseData);
        const [mandatory, flexible] = result[0].periods;
        expect(flexible.startDate).toBe(mandatory.endDate);
    });

    it('produces two parent schedules in optimized mode', () => {
        const data = {
            ...baseData,
            parentCount: 2 as const,
            names: ['Alice', 'Bob'],
            colors: ['indigo', 'pink'] as const,
            leaveMode: 'optimized' as const,
        };
        const result = computeSchedule(data);
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Alice');
        expect(result[1].name).toBe('Bob');
    });

    it('in optimized mode, second parent non-mandatory starts after first parent ends', () => {
        const data = {
            ...baseData,
            parentCount: 2 as const,
            names: ['Alice', 'Bob'],
            colors: ['indigo', 'pink'] as const,
            leaveMode: 'optimized' as const,
            firstParent: 0,
        };
        const result = computeSchedule(data);
        const alicePeriods = result[0].periods.filter((p) => p.type !== 'mandatory');
        const bobPeriods = result[1].periods.filter((p) => p.type !== 'mandatory');
        if (alicePeriods.length > 0 && bobPeriods.length > 0) {
            const aliceLastEnd = alicePeriods[alicePeriods.length - 1].endDate;
            const bobFirstStart = bobPeriods[0].startDate;
            expect(bobFirstStart >= aliceLastEnd).toBe(true);
        }
    });
});

// ─── cascadeFrom ─────────────────────────────────────────────────────────────

describe('cascadeFrom', () => {
    function makePeriod(type: string, start: string, end: string, days: number | null = null): ComputedPeriod {
        return { type: type as ComputedPeriod['type'], startDate: start, endDate: end, days };
    }

    it('is a no-op when there are no overlaps', () => {
        const periods = [
            makePeriod('mandatory', '2026-04-01', '2026-05-13'),
            makePeriod('flexible', '2026-05-13', '2026-08-05'),
        ];
        const result = cascadeFrom(periods, 1);
        expect(result[1].startDate).toBe('2026-05-13');
        expect(result[1].endDate).toBe('2026-08-05');
    });

    it('preserves gaps (periods that already start after the previous ends)', () => {
        const periods = [
            makePeriod('mandatory', '2026-04-01', '2026-05-13'),
            makePeriod('flexible', '2026-06-01', '2026-09-01'), // gap: starts June 1 not May 13
        ];
        const result = cascadeFrom(periods, 1);
        expect(result[1].startDate).toBe('2026-06-01');
    });

    it('pushes a period forward if it starts before the previous one ends', () => {
        const periods = [
            makePeriod('mandatory', '2026-04-01', '2026-05-13'),
            makePeriod('flexible', '2026-05-01', '2026-08-01'), // starts before mandatory ends → pushed
        ];
        const result = cascadeFrom(periods, 1);
        expect(result[1].startDate).toBe('2026-05-13');
    });

    it('preserves calendar duration when pushing forward', () => {
        // flexible is 84 days (12w). If pushed from May 1 to May 13 (12 days later),
        // the end should also move 12 days later.
        const periods = [
            makePeriod('mandatory', '2026-04-01', '2026-05-13'),
            makePeriod('flexible', '2026-05-01', '2026-08-22'), // 113 cal days
        ];
        const result = cascadeFrom(periods, 1);
        const newStart = parseLocalDate(result[1].startDate);
        const newEnd = parseLocalDate(result[1].endDate);
        const newDays = daysBetween(newStart, newEnd);
        const originalDays = daysBetween(parseLocalDate('2026-05-01'), parseLocalDate('2026-08-22'));
        expect(newDays).toBe(originalDays);
    });

    it('cascades multiple periods in sequence', () => {
        // mandatory ends May 13; flexible starts May 1 → pushed to May 13;
        // lactancia starts May 13 too → also pushed
        const periods = [
            makePeriod('mandatory', '2026-04-01', '2026-05-13'),
            makePeriod('flexible', '2026-05-01', '2026-08-01'),   // pushed to May 13 → Aug 13
            makePeriod('lactancia', '2026-05-01', '2026-05-16', 10), // pushed to Aug 13
        ];
        const result = cascadeFrom(periods, 1);
        expect(result[2].startDate >= result[1].endDate).toBe(true);
    });

    it('does not move the mandatory period (index 0)', () => {
        const periods = [
            makePeriod('mandatory', '2026-04-01', '2026-05-13'),
            makePeriod('flexible', '2026-03-01', '2026-06-01'), // flexible starts in the past
        ];
        const result = cascadeFrom(periods, 0);
        expect(result[0].startDate).toBe('2026-04-01');
        expect(result[0].endDate).toBe('2026-05-13');
    });
});

// ─── resizePeriod ────────────────────────────────────────────────────────────

describe('resizePeriod', () => {
    it('changes the endDate of the target period', () => {
        const schedule = computeSchedule({
            dueDate: '2026-04-01',
            parentCount: 1,
            names: ['Alice'],
            colors: ['indigo'],
            leaveMode: 'together',
            firstParent: 0,
        });
        const result = resizePeriod(schedule, 0, 'flexible', 6, 'weeks');
        const flexible = result[0].periods.find((p) => p.type === 'flexible')!;
        const days = daysBetween(parseLocalDate(flexible.startDate), parseLocalDate(flexible.endDate));
        expect(days).toBe(42); // 6 weeks
    });

    it('cascades subsequent periods when the resized period grows', () => {
        // Start with a schedule, then resize flexible to be very long
        const schedule = computeSchedule({
            dueDate: '2026-04-01',
            parentCount: 1,
            names: ['Alice'],
            colors: ['indigo'],
            leaveMode: 'together',
            firstParent: 0,
        });
        const result = resizePeriod(schedule, 0, 'flexible', 100, 'weeks');
        const flexible = result[0].periods.find((p) => p.type === 'flexible')!;
        // All periods after flexible should start at or after flexible's end
        const idx = result[0].periods.indexOf(flexible);
        for (let i = idx + 1; i < result[0].periods.length; i++) {
            expect(result[0].periods[i].startDate >= flexible.endDate).toBe(true);
        }
    });

    it('returns unchanged schedule when parentIdx does not match', () => {
        const schedule = computeSchedule({
            dueDate: '2026-04-01',
            parentCount: 1,
            names: ['Alice'],
            colors: ['indigo'],
            leaveMode: 'together',
            firstParent: 0,
        });
        const result = resizePeriod(schedule, 99, 'flexible', 4, 'weeks');
        expect(result).toEqual(schedule);
    });
});

// ─── shiftPeriodStart ────────────────────────────────────────────────────────

describe('shiftPeriodStart', () => {
    it('moves the period start forward and preserves duration', () => {
        const schedule = computeSchedule({
            dueDate: '2026-04-01',
            parentCount: 1,
            names: ['Alice'],
            colors: ['indigo'],
            leaveMode: 'together',
            firstParent: 0,
        });
        const flexible = schedule[0].periods.find((p) => p.type === 'flexible')!;
        const originalDays = daysBetween(
            parseLocalDate(flexible.startDate),
            parseLocalDate(flexible.endDate),
        );
        const newStart = '2026-07-01';
        const result = shiftPeriodStart(schedule, 0, 'flexible', newStart);
        const shifted = result[0].periods.find((p) => p.type === 'flexible')!;
        expect(shifted.startDate).toBe(newStart);
        const newDays = daysBetween(parseLocalDate(shifted.startDate), parseLocalDate(shifted.endDate));
        expect(newDays).toBe(originalDays);
    });

    it('clamps the start to the previous period end', () => {
        const schedule = computeSchedule({
            dueDate: '2026-04-01',
            parentCount: 1,
            names: ['Alice'],
            colors: ['indigo'],
            leaveMode: 'together',
            firstParent: 0,
        });
        const mandatory = schedule[0].periods.find((p) => p.type === 'mandatory')!;
        // Try to set flexible start to before mandatory ends
        const tooEarly = '2026-04-01';
        const result = shiftPeriodStart(schedule, 0, 'flexible', tooEarly);
        const shifted = result[0].periods.find((p) => p.type === 'flexible')!;
        // Should be clamped to mandatory end
        expect(shifted.startDate >= mandatory.endDate).toBe(true);
    });
});

// ─── reorderPeriods ──────────────────────────────────────────────────────────

describe('reorderPeriods', () => {
    it('swaps two non-mandatory periods', () => {
        const schedule = computeSchedule({
            dueDate: '2026-04-01',
            parentCount: 1,
            names: ['Alice'],
            colors: ['indigo'],
            leaveMode: 'together',
            firstParent: 0,
            lactanciaFirst: [true],
        });
        const nonMandatory = schedule[0].periods.filter((p) => p.type !== 'mandatory');
        if (nonMandatory.length < 2) return; // skip if only 1 non-mandatory
        const firstKey = nonMandatory[0].type;
        const secondKey = nonMandatory[1].type;
        const result = reorderPeriods(schedule, 0, firstKey, secondKey);
        const newNonMandatory = result[0].periods.filter((p) => p.type !== 'mandatory');
        expect(newNonMandatory[0].type).toBe(secondKey);
        expect(newNonMandatory[1].type).toBe(firstKey);
    });

    it('recascades all non-mandatory periods tightly after reorder', () => {
        const schedule = computeSchedule({
            dueDate: '2026-04-01',
            parentCount: 1,
            names: ['Alice'],
            colors: ['indigo'],
            leaveMode: 'together',
            firstParent: 0,
            lactanciaFirst: [true],
        });
        const nonMandatory = schedule[0].periods.filter((p) => p.type !== 'mandatory');
        if (nonMandatory.length < 2) return;
        const result = reorderPeriods(schedule, 0, nonMandatory[0].type, nonMandatory[1].type);
        const newNM = result[0].periods.filter((p) => p.type !== 'mandatory');
        // After tight cascade: each period should start right where the previous ends
        for (let i = 1; i < newNM.length; i++) {
            expect(newNM[i].startDate).toBe(newNM[i - 1].endDate);
        }
    });
});

// ─── addExtraPeriod / removeExtraPeriod ──────────────────────────────────────

describe('addExtraPeriod', () => {
    const base = {
        dueDate: '2026-04-01',
        parentCount: 1 as const,
        names: ['Alice'],
        colors: ['indigo'] as const,
        leaveMode: 'together' as const,
        firstParent: 0,
    };

    it('appends an extra period after the last existing period', () => {
        const schedule = computeSchedule(base);
        const lastEnd = schedule[0].periods[schedule[0].periods.length - 1].endDate;
        const item = {
            id: 'ep-test',
            name: 'Vacation',
            durationValue: 2,
            durationUnit: 'weeks' as const,
        };
        const result = addExtraPeriod(schedule, 0, item);
        const extra = result[0].periods[result[0].periods.length - 1];
        expect(extra.isExtra).toBe(true);
        expect(extra.extraId).toBe('ep-test');
        expect(extra.startDate).toBe(lastEnd);
        const days = daysBetween(parseLocalDate(extra.startDate), parseLocalDate(extra.endDate));
        expect(days).toBe(14); // 2 weeks
    });
});

describe('removeExtraPeriod', () => {
    const base = {
        dueDate: '2026-04-01',
        parentCount: 1 as const,
        names: ['Alice'],
        colors: ['indigo'] as const,
        leaveMode: 'together' as const,
        firstParent: 0,
    };

    it('removes the specified extra period', () => {
        const schedule = computeSchedule(base);
        const item = { id: 'ep-rm', name: 'Vacation', durationValue: 2, durationUnit: 'weeks' as const };
        const withExtra = addExtraPeriod(schedule, 0, item);
        expect(withExtra[0].periods.some((p) => p.extraId === 'ep-rm')).toBe(true);
        const result = removeExtraPeriod(withExtra, 0, 'ep-rm');
        expect(result[0].periods.some((p) => p.extraId === 'ep-rm')).toBe(false);
    });

    it('returns unchanged schedule when extraId not found', () => {
        const schedule = computeSchedule(base);
        const result = removeExtraPeriod(schedule, 0, 'non-existent-id');
        expect(result[0].periods).toEqual(schedule[0].periods);
    });
});

// ─── Share-URL round-trip (the original bug scenario) ────────────────────────

describe('share URL round-trip: optimized mode hidden first parent', () => {
    /**
     * Reproduces the bug: in optimized mode with parent B's schedule depending on
     * parent A's end date, hiding parent A and sharing the URL should produce a
     * correct single-parent schedule when loaded back.
     */
    it('preserves concrete dates when first parent is hidden and URL is shared', () => {
        const data = {
            dueDate: '2026-04-01',
            parentCount: 2 as const,
            names: ['Alice', 'Bob'],
            colors: ['indigo', 'pink'] as const,
            leaveMode: 'optimized' as const,
            firstParent: 0,
        };
        const schedule = computeSchedule(data);
        const withSchedule = { ...data, schedule };

        // Hide Alice (index 0), share Bob's (index 1) schedule
        const hiddenParents = new Set([0]);
        const compressed = compressWizardData(withSchedule, hiddenParents);

        // Decompress and verify
        const payload = decompressWizardData(compressed);
        expect(payload).not.toBeNull();
        expect(payload!.data.parentCount).toBe(1);
        expect(payload!.data.names[0]).toBe('Bob');

        // The schedule should contain Bob's original computed periods
        const bobOriginal = schedule[1];
        const bobShared = payload!.data.schedule?.[0];
        expect(bobShared).toBeDefined();
        expect(bobShared!.name).toBe('Bob');

        // Critical: the start dates of Bob's non-mandatory periods must match exactly
        // what was computed (not recalculated from scratch with only 1 parent).
        const originalNonMandatory = bobOriginal.periods.filter((p) => p.type !== 'mandatory');
        const sharedNonMandatory = bobShared!.periods.filter((p) => p.type !== 'mandatory');

        for (let i = 0; i < Math.min(originalNonMandatory.length, sharedNonMandatory.length); i++) {
            expect(sharedNonMandatory[i].startDate).toBe(originalNonMandatory[i].startDate);
            expect(sharedNonMandatory[i].endDate).toBe(originalNonMandatory[i].endDate);
        }
    });
});
