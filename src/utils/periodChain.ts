import { LEAVE_TYPES } from '../constants';
import type { ComputedParentSchedule, ComputedPeriod } from '../types';
import { addDays, addWorkingDays, daysBetween, formatDateKey, parseLocalDate } from './dates';
import { isFixedPeriod } from './leaveLaw';

export function recomputeEnd(newStartIso: string, period: ComputedPeriod): string {
    const newStart = parseLocalDate(newStartIso);
    if (period.days !== null) {
        return formatDateKey(addWorkingDays(newStart, period.days));
    }
    const calDuration = daysBetween(
        parseLocalDate(period.startDate),
        parseLocalDate(period.endDate),
    );
    return formatDateKey(addDays(newStart, calDuration));
}

/** Re-chains periods back to back from `anchorEnd`, preserving each duration. */
export function tightCascadeAll(periods: ComputedPeriod[], anchorEnd: string): ComputedPeriod[] {
    let cursor = anchorEnd;
    return periods.map((p) => {
        const newEnd = recomputeEnd(cursor, p);
        const result: ComputedPeriod = { ...p, startDate: cursor, endDate: newEnd };
        cursor = newEnd;
        return result;
    });
}

/** Calendar-day gap of each editable period relative to its predecessor (or `anchorEnd` for the first). */
export function gapsOf(editable: ComputedPeriod[], anchorEnd: string): number[] {
    let prevEnd = anchorEnd;
    return editable.map((p) => {
        const gap = Math.max(0, daysBetween(parseLocalDate(prevEnd), parseLocalDate(p.startDate)));
        prevEnd = p.endDate;
        return gap;
    });
}

/** Re-chains periods from `anchorEnd`, reapplying the given gaps so user-set gaps survive resizes. */
export function cascadeWithGaps(
    editable: ComputedPeriod[],
    anchorEnd: string,
    gaps: number[],
): ComputedPeriod[] {
    let cursor = anchorEnd;
    return editable.map((p, i) => {
        const start = formatDateKey(addDays(parseLocalDate(cursor), gaps[i] ?? 0));
        const end = recomputeEnd(start, p);
        cursor = end;
        return { ...p, startDate: start, endDate: end };
    });
}

export function splitFixed(periods: ComputedPeriod[]): {
    fixed: ComputedPeriod[];
    editable: ComputedPeriod[];
} {
    return {
        fixed: periods.filter(isFixedPeriod),
        editable: periods.filter((p) => !isFixedPeriod(p)),
    };
}

export function mandatoryEndOf(periods: ComputedPeriod[]): string {
    const mandatory = periods.find((p) => p.type === LEAVE_TYPES.MANDATORY);
    return mandatory?.endDate ?? periods[0]?.startDate ?? '';
}

function lastEndOf(periods: ComputedPeriod[]): string {
    return periods.reduce((max, p) => (p.endDate > max ? p.endDate : max), '');
}

/**
 * Single entry point after any edit. Re-chains the edited parent's editable
 * periods from the mandatory end (tightly, or reapplying `gaps` captured before
 * the edit), then (2 parents, optimized) re-chains the second parent so their
 * editable periods start no earlier than the first parent's last day.
 */
export function cascadeAllFromEdit(
    schedule: ComputedParentSchedule[],
    editedParentIdx: number,
    firstParent: number,
    optimized: boolean,
    gaps: number[] | 'tight' = 'tight',
): ComputedParentSchedule[] {
    const result = schedule.map((p) => ({ ...p, periods: [...p.periods] }));

    const edited = result[editedParentIdx];
    if (!edited) return schedule;

    const { fixed, editable } = splitFixed(edited.periods);
    const anchor = mandatoryEndOf(edited.periods);
    const cascaded =
        gaps === 'tight'
            ? tightCascadeAll(editable, anchor)
            : cascadeWithGaps(editable, anchor, gaps);
    result[editedParentIdx] = { ...edited, periods: [...fixed, ...cascaded] };

    if (optimized && result.length === 2) {
        const secondIdx = firstParent === 0 ? 1 : 0;
        const first = result[firstParent];
        const second = result[secondIdx];
        if (!first || !second) return result;

        const firstLastEnd = lastEndOf(first.periods);
        const secondSplit = splitFixed(second.periods);
        if (secondSplit.editable.length > 0 && firstLastEnd) {
            const secondAnchor = mandatoryEndOf(second.periods);
            const constraintStart = firstLastEnd > secondAnchor ? firstLastEnd : secondAnchor;
            result[secondIdx] = {
                ...second,
                periods: [
                    ...secondSplit.fixed,
                    ...tightCascadeAll(secondSplit.editable, constraintStart),
                ],
            };
        }
    }

    return result;
}
