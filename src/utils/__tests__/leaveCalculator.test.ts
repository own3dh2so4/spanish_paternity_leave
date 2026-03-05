import { describe, it, expect } from 'vitest';
import {
    calculateLactancia,
    calculateLeaveSchedule,
    countWorkingDays,
    buildDateMap,
    formatDateKey,
    addDays,
    addWorkingDays,
} from '../leaveCalculator';
import { LACTANCIA_MAX_DAYS } from '../../constants';

// ─── formatDateKey ────────────────────────────────────────────────────────────

describe('formatDateKey', () => {
    it('formats a date as YYYY-MM-DD', () => {
        expect(formatDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    });

    it('pads single-digit month and day with leading zeros', () => {
        expect(formatDateKey(new Date(2026, 2, 1))).toBe('2026-03-01');
    });

    it('handles December (month 11) correctly', () => {
        expect(formatDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
    });
});

// ─── addDays ──────────────────────────────────────────────────────────────────

describe('addDays', () => {
    it('adds calendar days regardless of weekends', () => {
        const friday = new Date(2026, 0, 2); // Fri
        const result = addDays(friday, 3);
        expect(formatDateKey(result)).toBe('2026-01-05'); // Monday
    });

    it('does not mutate the input date', () => {
        const date = new Date(2026, 0, 5);
        addDays(date, 10);
        expect(date.getDate()).toBe(5);
    });
});

// ─── addWorkingDays ───────────────────────────────────────────────────────────

describe('addWorkingDays', () => {
    it('skips weekends when counting working days', () => {
        const friday = new Date(2026, 0, 2); // Fri 2 Jan
        const result = addWorkingDays(friday, 1);
        expect(formatDateKey(result)).toBe('2026-01-05'); // Mon 5 Jan
    });

    it('adds 5 working days spanning a full week', () => {
        const monday = new Date(2026, 0, 5); // Mon
        const result = addWorkingDays(monday, 5);
        expect(formatDateKey(result)).toBe('2026-01-12'); // next Mon
    });
});

// ─── countWorkingDays ─────────────────────────────────────────────────────────

describe('countWorkingDays', () => {
    it('counts 5 working days for a Mon–Fri period', () => {
        const monday = new Date(2026, 0, 5);
        const saturday = new Date(2026, 0, 10);
        expect(countWorkingDays(monday, saturday)).toBe(5);
    });

    it('returns 0 for a pure weekend period (Sat–Mon)', () => {
        const saturday = new Date(2026, 0, 3);
        const monday = new Date(2026, 0, 5);
        expect(countWorkingDays(saturday, monday)).toBe(0);
    });

    it('returns 0 when start equals end', () => {
        const date = new Date(2026, 0, 5);
        expect(countWorkingDays(date, date)).toBe(0);
    });

    it('counts correctly across multiple weeks', () => {
        const start = new Date(2026, 0, 5); // Mon
        const end = new Date(2026, 0, 19);  // Mon (2 weeks later)
        expect(countWorkingDays(start, end)).toBe(10);
    });
});

// ─── calculateLactancia ───────────────────────────────────────────────────────

describe('calculateLactancia', () => {
    it('caps accumulated days at the legal maximum of 15', () => {
        const birthDate = new Date(2026, 0, 5);
        const result = calculateLactancia(birthDate, birthDate);
        expect(result.days).toBe(LACTANCIA_MAX_DAYS);
    });

    it('returns 0 days when startDate equals the 9-month boundary', () => {
        const birthDate = new Date(2026, 0, 1);
        const nineMonthsLater = new Date(2026, 9, 1);
        const result = calculateLactancia(nineMonthsLater, birthDate);
        expect(result.days).toBe(0);
    });

    it('returns 0 days when startDate is after the 9-month boundary', () => {
        const birthDate = new Date(2026, 0, 1);
        const after = new Date(2027, 0, 1);
        const result = calculateLactancia(after, birthDate);
        expect(result.days).toBe(0);
    });

    it('returns endDate strictly after startDate when days > 0', () => {
        const birthDate = new Date(2026, 5, 1);
        const result = calculateLactancia(birthDate, birthDate);
        if (result.days > 0) {
            expect(result.endDate.getTime()).toBeGreaterThan(result.startDate.getTime());
        }
    });

    it('does not exceed 15 days even when called very early', () => {
        const birthDate = new Date(2026, 5, 1);
        const result = calculateLactancia(birthDate, birthDate);
        expect(result.days).toBeLessThanOrEqual(15);
    });
});

// ─── calculateLeaveSchedule ───────────────────────────────────────────────────

describe('calculateLeaveSchedule — single parent', () => {
    const parents = [{ name: 'Parent A' }];
    const dueDate = '2026-06-01';

    it('returns exactly one parent schedule', () => {
        const result = calculateLeaveSchedule(dueDate, parents, 'together');
        expect(result.parents).toHaveLength(1);
        expect(result.parents[0].name).toBe('Parent A');
    });

    it('first period is always mandatory', () => {
        const result = calculateLeaveSchedule(dueDate, parents, 'together');
        expect(result.parents[0].periods[0].type).toBe('mandatory');
    });

    it('returns at least 2 periods (mandatory + flexible)', () => {
        const result = calculateLeaveSchedule(dueDate, parents, 'together');
        expect(result.parents[0].periods.length).toBeGreaterThanOrEqual(2);
    });

    it('calendarEnd is strictly after calendarStart', () => {
        const result = calculateLeaveSchedule(dueDate, parents, 'together');
        expect(result.calendarEnd.getTime()).toBeGreaterThan(result.calendarStart.getTime());
    });

    it('calendarStart is the first day of a month', () => {
        const result = calculateLeaveSchedule(dueDate, parents, 'together');
        expect(result.calendarStart.getDate()).toBe(1);
    });

    it('returnDate matches the last period end date', () => {
        const result = calculateLeaveSchedule(dueDate, parents, 'together');
        const p = result.parents[0];
        const maxEnd = Math.max(...p.periods.map((period) => period.endDate.getTime()));
        expect(p.returnDate.getTime()).toBe(maxEnd);
    });
});

describe('calculateLeaveSchedule — two parents, together mode', () => {
    const parents = [{ name: 'Parent A' }, { name: 'Parent B' }];
    const dueDate = '2026-06-01';

    it('returns two parent schedules', () => {
        const result = calculateLeaveSchedule(dueDate, parents, 'together');
        expect(result.parents).toHaveLength(2);
    });

    it('both parents start mandatory leave on the birth date', () => {
        const result = calculateLeaveSchedule(dueDate, parents, 'together');
        const birthDate = new Date(dueDate);
        birthDate.setHours(0, 0, 0, 0);
        for (const parent of result.parents) {
            const mandatory = parent.periods.find((p) => p.type === 'mandatory')!;
            expect(mandatory.startDate.getTime()).toBe(birthDate.getTime());
        }
    });
});

describe('calculateLeaveSchedule — two parents, optimized mode', () => {
    const parents = [{ name: 'Parent A' }, { name: 'Parent B' }];
    const dueDate = '2026-06-01';

    it("second parent's flexible leave starts no earlier than first parent's return date", () => {
        const result = calculateLeaveSchedule(dueDate, parents, 'optimized', 0);
        const p0 = result.parents[0];
        const p1 = result.parents[1];
        const p0Return = p0.returnDate;
        const p1Flexible = p1.periods.find((p) => p.type === 'flexible')!;
        expect(p1Flexible.startDate.getTime()).toBeGreaterThanOrEqual(p0Return.getTime());
    });

    it('total coverage is longer than in together mode', () => {
        const optimized = calculateLeaveSchedule(dueDate, parents, 'optimized', 0);
        const together = calculateLeaveSchedule(dueDate, parents, 'together');
        const optimizedRange =
            optimized.calendarEnd.getTime() - optimized.calendarStart.getTime();
        const togetherRange = together.calendarEnd.getTime() - together.calendarStart.getTime();
        expect(optimizedRange).toBeGreaterThanOrEqual(togetherRange);
    });

    it('respects firstParentIndex = 1', () => {
        const result = calculateLeaveSchedule(dueDate, parents, 'optimized', 1);
        expect(result.parents).toHaveLength(2);
        // Parent at index 1 takes flexible first → their returnDate should be earlier
        const p0Return = result.parents[0].returnDate;
        const p1Return = result.parents[1].returnDate;
        expect(p1Return.getTime()).toBeLessThan(p0Return.getTime());
    });
});

// ─── buildDateMap ─────────────────────────────────────────────────────────────

describe('buildDateMap', () => {
    const dueDate = '2026-06-01';
    const parents = [{ name: 'Test Parent' }];

    it('returns a non-empty object for a valid schedule', () => {
        const schedule = calculateLeaveSchedule(dueDate, parents, 'together');
        const map = buildDateMap(schedule.parents);
        expect(Object.keys(map).length).toBeGreaterThan(0);
    });

    it('each entry has type, parentIndex, and parentName', () => {
        const schedule = calculateLeaveSchedule(dueDate, parents, 'together');
        const map = buildDateMap(schedule.parents);
        const firstEntry = Object.values(map)[0][0];
        expect(firstEntry).toHaveProperty('type');
        expect(firstEntry).toHaveProperty('parentIndex');
        expect(firstEntry).toHaveProperty('parentName', 'Test Parent');
    });

    it('all keys are in YYYY-MM-DD format', () => {
        const schedule = calculateLeaveSchedule(dueDate, parents, 'together');
        const map = buildDateMap(schedule.parents);
        const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
        for (const key of Object.keys(map)) {
            expect(key).toMatch(isoPattern);
        }
    });

    it('birth date is present in the map as mandatory leave', () => {
        const schedule = calculateLeaveSchedule(dueDate, parents, 'together');
        const map = buildDateMap(schedule.parents);
        const birthKey = formatDateKey(new Date(dueDate));
        expect(map[birthKey]).toBeDefined();
        expect(map[birthKey][0].type).toBe('mandatory');
    });
});
