import { describe, expect, it } from 'vitest';
import {
    addDays,
    addWorkingDays,
    countWorkingDays,
    daysBetween,
    formatDateKey,
    formatDisplayDate,
    isIsoDate,
    parseLocalDate,
    weekdayNames,
} from '../dates';

describe('parseLocalDate / formatDateKey', () => {
    it('round-trips an ISO date in local time regardless of timezone', () => {
        const d = parseLocalDate('2026-10-01');
        expect(d.getFullYear()).toBe(2026);
        expect(d.getMonth()).toBe(9);
        expect(d.getDate()).toBe(1);
        expect(d.getHours()).toBe(0);
        expect(formatDateKey(d)).toBe('2026-10-01');
    });

    it('pads month and day', () => {
        expect(formatDateKey(new Date(2026, 2, 5))).toBe('2026-03-05');
    });
});

describe('isIsoDate', () => {
    it('accepts valid dates and rejects malformed or impossible ones', () => {
        expect(isIsoDate('2026-02-28')).toBe(true);
        expect(isIsoDate('2026-02-30')).toBe(false);
        expect(isIsoDate('2026-13-01')).toBe(false);
        expect(isIsoDate('26-01-01')).toBe(false);
        expect(isIsoDate(20260101)).toBe(false);
        expect(isIsoDate(null)).toBe(false);
    });
});

describe('day arithmetic', () => {
    it('adds calendar days across a DST change without drifting', () => {
        const beforeDst = parseLocalDate('2026-03-27');
        expect(formatDateKey(addDays(beforeDst, 7))).toBe('2026-04-03');
        expect(daysBetween(beforeDst, addDays(beforeDst, 7))).toBe(7);
    });

    it('counts working days Monday to Friday', () => {
        expect(countWorkingDays(parseLocalDate('2026-01-05'), parseLocalDate('2026-01-10'))).toBe(
            5,
        );
        expect(countWorkingDays(parseLocalDate('2026-01-03'), parseLocalDate('2026-01-05'))).toBe(
            0,
        );
    });

    it('adds working days skipping weekends', () => {
        expect(formatDateKey(addWorkingDays(parseLocalDate('2026-01-02'), 1))).toBe('2026-01-05');
        expect(formatDateKey(addWorkingDays(parseLocalDate('2026-01-05'), 5))).toBe('2026-01-12');
    });
});

describe('localised formatting', () => {
    it('formats dates in the requested language', () => {
        const d = parseLocalDate('2026-10-01');
        expect(formatDisplayDate(d, 'en')).toMatch(/Thu.*1.*Oct.*2026/);
        expect(formatDisplayDate(d, 'es')).toMatch(/jue.*1.*oct.*2026/i);
    });

    it('lists weekday names starting on Monday', () => {
        expect(weekdayNames('en')[0]).toMatch(/^Mon/);
        expect(weekdayNames('es')[0]).toMatch(/^Lun/i);
        expect(weekdayNames('en')).toHaveLength(7);
    });
});
