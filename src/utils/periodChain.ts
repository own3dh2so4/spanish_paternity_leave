/**
 * Centralized cascade engine for leave periods.
 *
 * All period mutations (resize, shift, reorder, add, remove) should call
 * `cascadeAllFromEdit` after making their local change.  This function
 * re-cascades the edited parent's non-mandatory periods AND — in optimized
 * mode — the other parent's non-mandatory periods so that:
 *   • No unintended overlaps occur between parents.
 *   • Edits that grow or shrink the first parent's timeline push/pull the
 *     second parent accordingly.
 */

import { LEAVE_TYPES } from '../constants';
import type { ComputedParentSchedule, ComputedPeriod } from '../types';
import { addDays, addWorkingDays, formatDateKey } from './leaveCalculator';
import { daysBetween, parseLocalDate } from './calendarHelpers';

// ─── Primitive helpers ────────────────────────────────────────────────────────

/**
 * Recomputes the end date of a period given a new start date.
 * Lactancia uses working-day arithmetic; all other periods preserve calendar
 * duration (end − start in calendar days).
 */
export function recomputeEnd(newStartIso: string, period: ComputedPeriod): string {
    const newStart = parseLocalDate(newStartIso);
    if (period.type === LEAVE_TYPES.LACTANCIA && period.days !== null) {
        return formatDateKey(addWorkingDays(newStart, period.days));
    }
    const calDuration = daysBetween(
        parseLocalDate(period.startDate),
        parseLocalDate(period.endDate),
    );
    return formatDateKey(addDays(newStart, calDuration));
}

// ─── Intra-parent cascading ───────────────────────────────────────────────────

/**
 * Re-cascades all non-mandatory periods tightly from `anchorEnd`, leaving
 * **no gaps** between consecutive periods.  Each period's calendar duration
 * is preserved; only start/end dates change.
 *
 * Used after reorder and any edit where gaps should be eliminated.
 */
export function tightCascadeAll(
    periods: ComputedPeriod[],
    anchorEnd: string,
): ComputedPeriod[] {
    let cursor = anchorEnd;
    return periods.map((p) => {
        const newEnd = recomputeEnd(cursor, p);
        const result: ComputedPeriod = { ...p, startDate: cursor, endDate: newEnd };
        cursor = newEnd;
        return result;
    });
}

/**
 * Cascades periods forward from `fromIndex` to prevent overlaps **within one
 * parent**.  If a period already starts after the previous one ends (explicit
 * gap), the gap is preserved.  The mandatory period (index 0) is never moved.
 *
 * This is the "gentle" cascade — it pushes forward but does not close gaps.
 */
export function cascadeFrom(
    periods: ComputedPeriod[],
    fromIndex: number,
): ComputedPeriod[] {
    if (fromIndex < 1 || periods.length < 2) return periods;
    const result = periods.map((p) => ({ ...p }));
    for (let i = Math.max(1, fromIndex); i < result.length; i++) {
        const prevEnd = result[i - 1].endDate;
        if (result[i].startDate < prevEnd) {
            result[i] = {
                ...result[i],
                startDate: prevEnd,
                endDate: recomputeEnd(prevEnd, result[i]),
            };
        }
    }
    return result;
}

// ─── Cross-parent cascading ───────────────────────────────────────────────────

/**
 * After any edit on `schedule[editedParentIdx]`, re-cascades:
 *
 *   1. The edited parent's non-mandatory periods from the mandatory end
 *      (tight cascade — no gaps).
 *   2. In optimized mode (2 parents): the other parent's non-mandatory
 *      periods from `max(otherMandatoryEnd, firstParentLastEnd)`.
 *
 * This is the **single entry point** for all cross-parent cascade logic.
 * It replaces the old `cascadeFrom` + `cascadeAcrossParents` two-step
 * pattern and ensures both push-forward and pull-back work correctly.
 *
 * @param schedule      - The full schedule array (already mutated for the
 *                        edited parent's target period).
 * @param editedParentIdx - Index of the parent that was just edited.
 * @param firstParent   - Index of the "first" parent in optimized mode.
 * @param tight         - If true, the edited parent's non-mandatory periods
 *                        are tightly cascaded (no gaps).  Use `true` after
 *                        reorder; `false` after resize/shift (to preserve
 *                        any explicit gaps the user set).
 */
export function cascadeAllFromEdit(
    schedule: ComputedParentSchedule[],
    editedParentIdx: number,
    firstParent: number,
    tight: boolean = false,
): ComputedParentSchedule[] {
    if (editedParentIdx < 0 || editedParentIdx >= schedule.length) return schedule;

    const result = schedule.map((p) => ({ ...p, periods: [...p.periods] }));

    // ── Step 1: intra-parent cascade for the edited parent ────────────────
    const editedParent = result[editedParentIdx];
    const mandatory = editedParent.periods.find(
        (p) => p.type === LEAVE_TYPES.MANDATORY,
    );
    const nonMandatory = editedParent.periods.filter(
        (p) => p.type !== LEAVE_TYPES.MANDATORY,
    );

    const mandatoryEnd = mandatory?.endDate ?? nonMandatory[0]?.startDate ?? '';

    let cascadedNonMandatory: ComputedPeriod[];
    if (tight) {
        cascadedNonMandatory = tightCascadeAll(nonMandatory, mandatoryEnd);
    } else {
        // Gentle cascade: only push forward where overlaps exist
        const withMandatory = mandatory
            ? [mandatory, ...nonMandatory]
            : nonMandatory;
        const cascaded = cascadeFrom(withMandatory, mandatory ? 1 : 0);
        cascadedNonMandatory = mandatory ? cascaded.slice(1) : cascaded;
    }

    result[editedParentIdx] = {
        ...editedParent,
        periods: mandatory
            ? [mandatory, ...cascadedNonMandatory]
            : cascadedNonMandatory,
    };

    // ── Step 2: cross-parent cascade (optimized mode only) ────────────────
    if (result.length === 2) {
        const secondIdx = firstParent === 0 ? 1 : 0;

        // The first parent's last period end is the constraint for the second
        const firstLastEnd = result[firstParent].periods.reduce(
            (max, p) => (p.endDate > max ? p.endDate : max),
            '',
        );

        const secondParent = result[secondIdx];
        const secondMandatory = secondParent.periods.find(
            (p) => p.type === LEAVE_TYPES.MANDATORY,
        );
        const secondNonMandatory = secondParent.periods.filter(
            (p) => p.type !== LEAVE_TYPES.MANDATORY,
        );

        if (secondNonMandatory.length > 0 && firstLastEnd) {
            const secondMandatoryEnd =
                secondMandatory?.endDate ?? secondNonMandatory[0]?.startDate ?? '';

            // The second parent's non-mandatory periods must start no earlier
            // than the first parent's last end.
            const constraintStart =
                firstLastEnd > secondMandatoryEnd
                    ? firstLastEnd
                    : secondMandatoryEnd;

            // Always tight-cascade the second parent from the constraint so
            // that both growing AND shrinking of the first parent is reflected.
            const cascadedSecond = tightCascadeAll(
                secondNonMandatory,
                constraintStart,
            );

            result[secondIdx] = {
                ...secondParent,
                periods: secondMandatory
                    ? [secondMandatory, ...cascadedSecond]
                    : cascadedSecond,
            };
        }
    }

    return result;
}
