import {
    MANDATORY_WEEKS,
    FLEXIBLE_WEEKS,
    LACTANCIA_MAX_DAYS,
    WORK_HOURS_PER_DAY,
    BABY_LACTANCIA_MONTHS,
    LEAVE_TYPES,
    LEAVE_MODES,
} from '../constants';
import type {
    DateMap,
    DateMapEntry,
    LactanciaResult,
    LeavePeriod,
    LeaveMode,
    LeaveType,
    ParentSchedule,
    ScheduleResult,
} from '../types';

/**
 * Add calendar days to a date.
 */
export function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Add months to a date.
 */
export function addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
}

/**
 * Check if a date is a weekday (Mon–Fri).
 */
function isWeekday(date: Date): boolean {
    const day = date.getDay();
    return day !== 0 && day !== 6;
}

/**
 * Count working days between two dates (inclusive of start, exclusive of end).
 */
export function countWorkingDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);
    while (current < endDate) {
        if (isWeekday(current)) {
            count++;
        }
        current.setDate(current.getDate() + 1);
    }
    return count;
}

/**
 * Add N working days to a date, returning the date after completing them.
 */
export function addWorkingDays(startDate: Date, workingDays: number): Date {
    let count = 0;
    const current = new Date(startDate);
    while (count < workingDays) {
        current.setDate(current.getDate() + 1);
        if (isWeekday(current)) {
            count++;
        }
    }
    return current;
}

/**
 * Calculate the accumulated lactancia days.
 * Each working day from `startDate` until baby reaches 9 months generates 1 hour.
 * Total hours / 8 = days off. Capped at 15 days.
 */
export function calculateLactancia(startDate: Date, birthDate: Date): LactanciaResult {
    const nineMonths = addMonths(new Date(birthDate), BABY_LACTANCIA_MONTHS);
    const start = new Date(startDate);

    if (start >= nineMonths) {
        return { days: 0, startDate: start, endDate: start };
    }

    const workingDays = countWorkingDays(start, nineMonths);
    const accumulatedDays = Math.min(
        Math.floor(workingDays / WORK_HOURS_PER_DAY),
        LACTANCIA_MAX_DAYS,
    );

    if (accumulatedDays <= 0) {
        return { days: 0, startDate: start, endDate: start };
    }

    const endDate = addWorkingDays(start, accumulatedDays);

    return {
        days: accumulatedDays,
        startDate: new Date(start),
        endDate,
    };
}

/**
 * Build a date-range period object.
 */
function makePeriod(
    type: LeaveType,
    start: Date,
    end: Date,
    parentIndex: number,
    parentName: string,
    days: number | null = null,
): LeavePeriod {
    return {
        type,
        startDate: new Date(start),
        endDate: new Date(end),
        parentIndex,
        parentName,
        days,
    };
}

/**
 * Calculate leave schedule for a single parent.
 *
 * @param lactanciaStartOverride - When provided, lactancia starts at this date instead of
 *   mandatoryEnd. Used in optimised mode for the second parent so their lactancia is deferred
 *   until after the first parent returns (preventing both lactancias from overlapping).
 */
function calculateSingleParentLeave(
    birthDate: Date,
    mandatoryStart: Date,
    flexibleStart: Date | null,
    parentIndex: number,
    parentName: string,
    isLactanciaFirst = true,
    lactanciaStartOverride?: Date,
): { periods: LeavePeriod[]; returnDate: Date } {
    const periods: LeavePeriod[] = [];

    // Mandatory leave: 6 weeks (42 calendar days) from mandatoryStart
    const mandatoryEnd = addDays(mandatoryStart, MANDATORY_WEEKS * 7);
    periods.push(makePeriod(LEAVE_TYPES.MANDATORY, mandatoryStart, mandatoryEnd, parentIndex, parentName));

    const preFlexStart = flexibleStart ?? mandatoryEnd;
    // In optimised mode the second parent defers lactancia until after the first parent returns
    const lactanciaStart = lactanciaStartOverride ?? mandatoryEnd;
    let flexStart: Date;
    let flexEnd: Date;

    if (isLactanciaFirst) {
        const lactancia = calculateLactancia(lactanciaStart, birthDate);
        if (lactancia.days > 0) {
            periods.push(
                makePeriod(
                    LEAVE_TYPES.LACTANCIA,
                    lactancia.startDate,
                    lactancia.endDate,
                    parentIndex,
                    parentName,
                    lactancia.days,
                ),
            );
            // Flexible leave cannot start before the other parent returns OR before lactancia ends
            flexStart = new Date(Math.max(preFlexStart.getTime(), lactancia.endDate.getTime()));
        } else {
            flexStart = preFlexStart;
        }

        flexEnd = addDays(flexStart, FLEXIBLE_WEEKS * 7);
        periods.push(makePeriod(LEAVE_TYPES.FLEXIBLE, flexStart, flexEnd, parentIndex, parentName));
    } else {
        flexStart = preFlexStart;
        flexEnd = addDays(flexStart, FLEXIBLE_WEEKS * 7);
        periods.push(makePeriod(LEAVE_TYPES.FLEXIBLE, flexStart, flexEnd, parentIndex, parentName));

        const lactancia = calculateLactancia(flexEnd, birthDate);
        if (lactancia.days > 0) {
            periods.push(
                makePeriod(
                    LEAVE_TYPES.LACTANCIA,
                    lactancia.startDate,
                    lactancia.endDate,
                    parentIndex,
                    parentName,
                    lactancia.days,
                ),
            );
        }
    }

    const lastEnd = Math.max(...periods.map((p) => p.endDate.getTime()));
    return { periods, returnDate: new Date(lastEnd) };
}

/**
 * Main calculation function.
 *
 * @param dueDateStr - ISO date string (YYYY-MM-DD)
 * @param parents - array of parent objects (only `name` is required)
 * @param mode - 'together' or 'optimized'
 * @param firstParentIndex - index of the parent who takes flexible leave first (0 or 1)
 * @param lactanciaFirst - whether each parent takes lactancia before their flexible leave
 * @param cuidadoWeeks - weeks of childcare leave per parent (null = not opted in)
 */
export function calculateLeaveSchedule(
    dueDateStr: string,
    parents: Array<{ name: string }>,
    mode: LeaveMode,
    firstParentIndex = 0,
    lactanciaFirst: boolean[] = [true, true],
    cuidadoWeeks: (number | null)[] = [],
): ScheduleResult {
    const birthDate = new Date(dueDateStr);
    birthDate.setHours(0, 0, 0, 0);

    const results: ParentSchedule[] = [];

    if (parents.length === 1) {
        const result = calculateSingleParentLeave(
            birthDate,
            birthDate,
            null,
            0,
            parents[0].name,
            lactanciaFirst[0],
        );
        results.push({ name: parents[0].name, ...result });
    } else if (mode === LEAVE_MODES.TOGETHER) {
        for (let i = 0; i < parents.length; i++) {
            const result = calculateSingleParentLeave(
                birthDate,
                birthDate,
                null,
                i,
                parents[i].name,
                lactanciaFirst[i],
            );
            results.push({ name: parents[i].name, ...result });
        }
    } else {
        // Optimized: stagger leaves to maximise home coverage
        const first = firstParentIndex;
        const second = firstParentIndex === 0 ? 1 : 0;

        const firstResult = calculateSingleParentLeave(
            birthDate,
            birthDate,
            null,
            first,
            parents[first].name,
            lactanciaFirst[first],
        );
        results[first] = { name: parents[first].name, ...firstResult };

        // Second parent's non-mandatory leave starts after first parent returns.
        // Their lactancia is also deferred so it doesn't overlap with the first parent's lactancia.
        const secondMandatoryEnd = addDays(birthDate, MANDATORY_WEEKS * 7);
        const secondLactanciaStart = new Date(
            Math.max(secondMandatoryEnd.getTime(), firstResult.returnDate.getTime()),
        );
        const secondResult = calculateSingleParentLeave(
            birthDate,
            birthDate,
            firstResult.returnDate,
            second,
            parents[second].name,
            lactanciaFirst[second],
            secondLactanciaStart,
        );
        results[second] = { name: parents[second].name, ...secondResult };
    }

    // Append childcare leave (cuidado) for parents who opted in
    for (let i = 0; i < results.length; i++) {
        const weeks = cuidadoWeeks[i];
        if (weeks && weeks > 0) {
            const cuidadoStart = new Date(results[i].returnDate);
            const cuidadoEnd = addDays(cuidadoStart, weeks * 7);
            results[i].periods.push(
                makePeriod(LEAVE_TYPES.CUIDADO, cuidadoStart, cuidadoEnd, i, parents[i].name, weeks * 7),
            );
            results[i].returnDate = cuidadoEnd;
        }
    }

    // Determine calendar range
    let calendarStart = new Date(birthDate);
    let calendarEnd = new Date(birthDate);

    for (const r of results) {
        for (const p of r.periods) {
            if (p.startDate < calendarStart) calendarStart = new Date(p.startDate);
            if (p.endDate > calendarEnd) calendarEnd = new Date(p.endDate);
        }
    }

    // Extend to full months
    calendarStart.setDate(1);
    calendarEnd = addMonths(calendarEnd, 1);
    calendarEnd.setDate(0); // last day of the previous month

    return { parents: results, calendarStart, calendarEnd };
}

/**
 * Build a lookup map: ISO date string → [{ type, parentIndex, parentName }]
 * for efficient calendar rendering.
 */
export function buildDateMap(scheduleResults: ParentSchedule[]): DateMap {
    const map: DateMap = {};

    for (const parent of scheduleResults) {
        for (const period of parent.periods) {
            const current = new Date(period.startDate);
            while (current < period.endDate) {
                const key = formatDateKey(current);
                if (!map[key]) map[key] = [];
                const entry: DateMapEntry = {
                    type: period.type,
                    parentIndex: period.parentIndex,
                    parentName: period.parentName,
                };
                map[key].push(entry);
                current.setDate(current.getDate() + 1);
            }
        }
    }

    return map;
}

/**
 * Format a date as YYYY-MM-DD for use as a map key.
 */
export function formatDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Format a date for human-readable display (e.g. "Mon 15 Jan 2026").
 */
export function formatDisplayDate(date: Date): string {
    return date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}
