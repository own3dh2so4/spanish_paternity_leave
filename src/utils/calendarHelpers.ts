import {
    COLOR_PALETTES,
    FLEXIBLE_WEEKS,
    LEAVE_TYPES,
    CUIDADO_PAID_WEEKS,
} from '../constants';
import type {
    ColorPaletteId,
    ComputedParentSchedule,
    ComputedPeriod,
    CustomDuration,
    CustomDurations,
    CustomDurationsForParent,
    CustomStartDates,
    CustomStartDatesForParent,
    EditUnit,
    ExtraLeaveItem,
    LeavePeriod,
    LeaveType,
    ScheduleResult,
    WizardData,
} from '../types';
import {
    addDays,
    addMonths,
    addWorkingDays,
    calculateLeaveSchedule,
    countWorkingDays,
    formatDateKey,
} from './leaveCalculator';
import {
    cascadeAllFromEdit,
    recomputeEnd,
    tightCascadeAll,
} from './periodChain';
import type { TranslationKeys } from '../i18n/en';

// ─── Constants ────────────────────────────────────────────────────────────────

import { MANDATORY_WEEKS } from '../constants';

export const DEFAULT_DURATIONS: Record<LeaveType, number> = {
    mandatory: MANDATORY_WEEKS * 7,
    flexible: FLEXIBLE_WEEKS * 7,
    lactancia: 0,
    cuidado: 0,
    extra: 0,
};

export const EXTRA_PRESETS: Array<{
    key: string;
    labelKey: keyof TranslationKeys;
    defaultValue: number;
    defaultUnit: 'days' | 'weeks';
}> = [
    { key: 'vacation', labelKey: 'presetVacation', defaultValue: 2, defaultUnit: 'weeks' },
    { key: 'unpaid', labelKey: 'presetUnpaid', defaultValue: 5, defaultUnit: 'days' },
    { key: 'gradual', labelKey: 'presetGradual', defaultValue: 4, defaultUnit: 'weeks' },
    { key: 'custom', labelKey: 'presetCustom', defaultValue: 1, defaultUnit: 'weeks' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UnifiedPeriod {
    /** LeaveType string for regular periods; extra item ID for user-added ones. */
    key: string;
    isExtra: boolean;
    leaveType?: LeaveType;
    extraItem?: ExtraLeaveItem;
    startDate: Date;
    endDate: Date;
    /** Working-days count; only set for lactancia, null otherwise. */
    lactanciaDays: number | null;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Return the number of whole calendar days between two dates, DST-safe.
 *
 * Raw millisecond subtraction (end - start) includes the ±1-hour DST offset,
 * which makes the result 1 hour short or long and shifts computed end-dates to
 * 23:00 or 01:00 instead of midnight. Math.round absorbs the ±1 h skew
 * (DST never shifts by more than 1 h in Spain/EU).
 */
export function daysBetween(start: Date, end: Date): number {
    return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

export function calculateCustomEnd(
    startDate: Date,
    custom: CustomDuration,
    isLactancia: boolean,
): Date {
    const { value, unit } = custom;
    if (unit === 'weeks') return addDays(startDate, value * 7);
    if (unit === 'months') return addMonths(startDate, value);
    return isLactancia ? addWorkingDays(startDate, value) : addDays(startDate, value);
}

// ─── Custom-duration helpers ──────────────────────────────────────────────────

export function getNormalizedCustom(
    customForParent: CustomDurationsForParent | undefined,
    periodType: LeaveType,
): CustomDuration | null {
    const val = customForParent?.[periodType];
    if (val === undefined || val === null) return null;
    if (typeof val === 'number') {
        // Legacy format — stored as plain days
        return { value: val, unit: 'days' };
    }
    return val;
}

// ─── Unified-order helpers ────────────────────────────────────────────────────

/**
 * Returns the ordered list of non-mandatory period keys for a parent.
 * Falls back to the natural schedule order when no explicit order is stored.
 * Stale keys (deleted periods) are pruned; new keys are appended at the end.
 */
export function getEffectiveOrder(
    nonMandatoryPeriods: LeavePeriod[],
    extraItems: ExtraLeaveItem[],
    storedOrder: string[] | undefined,
): string[] {
    const defaultOrder = [
        ...nonMandatoryPeriods.map((p) => p.type as string),
        ...extraItems.map((item) => item.id),
    ];
    if (!storedOrder || storedOrder.length === 0) return defaultOrder;
    const valid = storedOrder.filter((k) => defaultOrder.includes(k));
    const missing = defaultOrder.filter((k) => !valid.includes(k));
    return [...valid, ...missing];
}

/**
 * Re-cascades all non-mandatory periods (regular + extra) in the given order,
 * computing fresh start/end dates from `startCursor`.
 *
 * For lactancia (working-day-based) the correct duration is resolved in priority:
 *   1. Custom duration from `customForParent` (the user's override)
 *   2. Original working-day count stored on the period (`reg.days`)
 *   3. Calendar duration fallback (should never be reached for lactancia)
 *
 * Units 'weeks' and 'months' always use calendar arithmetic; 'days' for lactancia
 * uses `addWorkingDays` so weekends are skipped, matching Spanish law.
 */
export function buildUnifiedPeriods(
    order: string[],
    nonMandatoryPeriods: LeavePeriod[],
    extraItems: ExtraLeaveItem[],
    startCursor: Date,
    customForParent?: CustomDurationsForParent,
): UnifiedPeriod[] {
    const result: UnifiedPeriod[] = [];
    let cursor = new Date(startCursor);

    for (const key of order) {
        const reg = nonMandatoryPeriods.find((p) => p.type === key);
        if (reg) {
            const start = new Date(cursor);
            const isLact = reg.type === LEAVE_TYPES.LACTANCIA;
            const custom = getNormalizedCustom(customForParent, reg.type as LeaveType);
            let end: Date;
            if (custom) {
                end = calculateCustomEnd(start, custom, isLact);
            } else if (isLact && reg.days !== null) {
                end = addWorkingDays(start, reg.days);
            } else {
                end = addDays(start, daysBetween(reg.startDate, reg.endDate));
            }
            result.push({
                key,
                isExtra: false,
                leaveType: reg.type as LeaveType,
                startDate: start,
                endDate: end,
                lactanciaDays: reg.days,
            });
            cursor = new Date(end);
        } else {
            const extra = extraItems.find((item) => item.id === key);
            if (extra) {
                const days =
                    extra.durationUnit === 'weeks'
                        ? extra.durationValue * 7
                        : extra.durationValue;
                let start = new Date(cursor);
                if (extra.startDate) {
                    const customStart = new Date(extra.startDate);
                    customStart.setHours(0, 0, 0, 0);
                    if (customStart > cursor) start = customStart;
                }
                const end = addDays(start, days);
                result.push({
                    key,
                    isExtra: true,
                    extraItem: extra,
                    startDate: start,
                    endDate: end,
                    lactanciaDays: null,
                });
                cursor = new Date(end);
            }
        }
    }
    return result;
}

// ─── Custom-duration application ──────────────────────────────────────────────

export function applyCustomDurationsToParent(
    basePeriods: LeavePeriod[],
    customForParent: CustomDurationsForParent,
    customStartsForParent: CustomStartDatesForParent = {},
): LeavePeriod[] {
    const hasAny =
        Object.keys(customForParent).length > 0 ||
        Object.keys(customStartsForParent).length > 0;
    if (!hasAny) return basePeriods;

    const result: LeavePeriod[] = [];
    let currentStart = new Date(basePeriods[0].startDate);

    for (const period of basePeriods) {
        if (period.type !== LEAVE_TYPES.MANDATORY) {
            const customStartStr = customStartsForParent[period.type];
            if (customStartStr) {
                const customStart = new Date(customStartStr);
                customStart.setHours(0, 0, 0, 0);
                if (customStart > currentStart) {
                    currentStart = customStart;
                }
            }
        }

        const isLactancia = period.type === LEAVE_TYPES.LACTANCIA;
        const customVal = getNormalizedCustom(customForParent, period.type);

        let newEnd: Date;
        if (customVal) {
            newEnd = calculateCustomEnd(currentStart, customVal, isLactancia);
        } else if (isLactancia && period.days !== null) {
            newEnd = addWorkingDays(currentStart, period.days);
        } else {
            newEnd = addDays(currentStart, daysBetween(period.startDate, period.endDate));
        }

        result.push({ ...period, startDate: new Date(currentStart), endDate: newEnd });
        currentStart = new Date(newEnd);
    }

    return result;
}

export function applyCustomDurations(
    schedule: ScheduleResult,
    customDurations: CustomDurations,
    customStartDates: CustomStartDates,
    mode: string,
    firstParentIndex: number,
): ScheduleResult {
    const hasAny =
        Object.keys(customDurations).length > 0 ||
        Object.keys(customStartDates).length > 0;
    if (!hasAny) return schedule;

    const newParents = schedule.parents.map((parent, i) => {
        const custom = customDurations[i] ?? {};
        const customStarts = customStartDates[i] ?? {};
        if (Object.keys(custom).length === 0 && Object.keys(customStarts).length === 0)
            return parent;
        const newPeriods = applyCustomDurationsToParent(parent.periods, custom, customStarts);
        const lastEnd = Math.max(...newPeriods.map((p) => p.endDate.getTime()));
        return { ...parent, periods: newPeriods, returnDate: new Date(lastEnd) };
    });

    // In optimized mode, cascade the second parent's non-mandatory periods off the first
    // parent's new return date.
    if (mode === 'optimized' && newParents.length === 2) {
        const firstIdx = firstParentIndex;
        const secondIdx = firstIdx === 0 ? 1 : 0;

        const firstReturn = newParents[firstIdx].returnDate;
        const secondParent = newParents[secondIdx];

        const mandatoryPeriod = secondParent.periods.find(
            (p) => p.type === LEAVE_TYPES.MANDATORY,
        );
        const otherPeriods = secondParent.periods.filter(
            (p) => p.type !== LEAVE_TYPES.MANDATORY,
        );

        const mandatoryEnd = mandatoryPeriod
            ? new Date(mandatoryPeriod.endDate)
            : firstReturn;
        const nonMandatoryStart =
            firstReturn > mandatoryEnd ? firstReturn : mandatoryEnd;

        const customSecond: CustomDurationsForParent = customDurations[secondIdx] ?? {};
        const customStartsSecond: CustomStartDatesForParent =
            customStartDates[secondIdx] ?? {};
        let cascadeStart = new Date(nonMandatoryStart);

        const newOtherPeriods = otherPeriods.map((period) => {
            const customStartStr = customStartsSecond[period.type];
            if (customStartStr) {
                const customStart = new Date(customStartStr);
                customStart.setHours(0, 0, 0, 0);
                if (customStart > cascadeStart) {
                    cascadeStart = new Date(customStart);
                }
            }

            const isLactancia = period.type === LEAVE_TYPES.LACTANCIA;
            const customVal = getNormalizedCustom(customSecond, period.type);
            let newEnd: Date;

            if (customVal) {
                newEnd = calculateCustomEnd(cascadeStart, customVal, isLactancia);
            } else if (isLactancia && period.days !== null) {
                newEnd = addWorkingDays(cascadeStart, period.days);
            } else {
                newEnd = addDays(
                    cascadeStart,
                    daysBetween(period.startDate, period.endDate),
                );
            }

            const result = {
                ...period,
                startDate: new Date(cascadeStart),
                endDate: newEnd,
            };
            cascadeStart = new Date(newEnd);
            return result;
        });

        const allPeriods = mandatoryPeriod
            ? [mandatoryPeriod, ...newOtherPeriods]
            : newOtherPeriods;
        const lastEnd = Math.max(...allPeriods.map((p) => p.endDate.getTime()));
        newParents[secondIdx] = {
            ...secondParent,
            periods: allPeriods,
            returnDate: new Date(lastEnd),
        };
    }

    // Recompute calendar range purely from the new periods so it can both grow AND shrink
    let calendarStart = new Date(8640000000000000);
    let calendarEnd = new Date(-8640000000000000);
    for (const parent of newParents) {
        for (const p of parent.periods) {
            if (p.startDate < calendarStart) calendarStart = new Date(p.startDate);
            if (p.endDate > calendarEnd) calendarEnd = new Date(p.endDate);
        }
    }
    calendarStart.setDate(1);
    calendarEnd = addMonths(calendarEnd, 1);
    calendarEnd.setDate(0);

    return { ...schedule, parents: newParents, calendarStart, calendarEnd };
}

// ─── Quota helpers ────────────────────────────────────────────────────────────

/**
 * Returns the number of whole flexible-leave weeks still available for a parent,
 * based on its ComputedParentSchedule. Returns 0 when the full allocation is used.
 */
export function getRemainingFlexWeeks(parentSchedule: ComputedParentSchedule): number {
    const flexPeriod = parentSchedule.periods.find((p) => p.type === LEAVE_TYPES.FLEXIBLE);
    const mainFlexDays = flexPeriod
        ? daysBetween(parseLocalDate(flexPeriod.startDate), parseLocalDate(flexPeriod.endDate))
        : FLEXIBLE_WEEKS * 7;

    const extraFlexDays = parentSchedule.periods
        .filter((p) => p.isExtra && p.extraPresetKey === 'flexible-extra')
        .reduce((sum, p) => {
            const days =
                p.durationUnit === 'weeks' ? (p.durationValue ?? 0) * 7 : (p.durationValue ?? 0);
            return sum + days;
        }, 0);

    return Math.max(0, Math.floor((FLEXIBLE_WEEKS * 7 - mainFlexDays - extraFlexDays) / 7));
}

export function generateExtraId(): string {
    return `ep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Display helpers ──────────────────────────────────────────────────────────

/**
 * Returns a human-readable label for a ComputedPeriod, deriving durations
 * directly from the concrete start/end dates stored on the period.
 */
export function formatLeaveType(period: ComputedPeriod, t: TranslationKeys): string {
    const calDays = daysBetween(
        parseLocalDate(period.startDate),
        parseLocalDate(period.endDate),
    );

    switch (period.type) {
        case LEAVE_TYPES.MANDATORY:
            return t.mandatoryLeave(Math.round(calDays / 7));
        case LEAVE_TYPES.FLEXIBLE:
            return t.flexibleLeave(Math.round(calDays / 7));
        case LEAVE_TYPES.LACTANCIA: {
            if (period.durationValue !== undefined && period.durationUnit !== undefined) {
                return t.accumulatedLactancia(period.durationValue, period.durationUnit);
            }
            return t.accumulatedLactancia(period.days ?? calDays, 'days');
        }
        case LEAVE_TYPES.CUIDADO: {
            const totalWeeks = Math.round(calDays / 7);
            if (totalWeeks <= 0) return t.childcareLeave;
            const paidWeeks = Math.min(totalWeeks, CUIDADO_PAID_WEEKS);
            const unpaidWeeks = totalWeeks - paidWeeks;
            return unpaidWeeks > 0
                ? t.childcareLeavePaidUnpaid(paidWeeks, unpaidWeeks)
                : t.childcareLeavePaid(paidWeeks);
        }
        case LEAVE_TYPES.EXTRA:
            return t.extraPeriod;
        default:
            return period.type;
    }
}

// ─── Date-first schedule: pure helpers ────────────────────────────────────────

/**
 * Parses an ISO YYYY-MM-DD string into a local-midnight Date object.
 * Using `new Date(iso)` alone would give UTC midnight which displays as the
 * previous day in UTC+ timezones. This ensures correctness in Spain (UTC+1/+2).
 */
export function parseLocalDate(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
}

/** Returns the canonical string key for a period (extraId for extras, type otherwise). */
export function getPeriodKey(period: ComputedPeriod): string {
    return period.isExtra ? (period.extraId ?? period.type) : period.type;
}

// ─── Cascade functions ────────────────────────────────────────────────────────
// `recomputeEnd`, `cascadeFrom`, `tightCascadeAll`, and `cascadeAllFromEdit`
// are now provided by `./periodChain.ts` — re-exported here for convenience.
export { cascadeFrom, tightCascadeAll, cascadeAllFromEdit } from './periodChain';

// ─── Date-first schedule: computeSchedule ─────────────────────────────────────

/**
 * Derives a complete `ComputedParentSchedule[]` from `WizardData`.
 * This is the single place where leave-law formulas run.  All edit operations
 * update `WizardData.schedule` using the pure helpers below — they never call
 * this function again after the initial computation.
 */
export function computeSchedule(data: WizardData): ComputedParentSchedule[] {
    const lactanciaFirst = data.lactanciaFirst ?? [true, true];
    const customDurations = data.customDurations ?? {};
    const customStartDates = data.customStartDates ?? {};

    const activeColors = data.names.map((_, i) =>
        data.colors?.[i]
            ? COLOR_PALETTES[data.colors[i]]
            : Object.values(COLOR_PALETTES)[i % 5],
    );

    const baseSchedule = calculateLeaveSchedule(
        data.dueDate,
        data.names.map((name, i) => ({ name, color: activeColors[i] })),
        data.leaveMode,
        data.firstParent ?? 0,
        lactanciaFirst,
        data.cuidadoWeeks ?? [],
    );

    const schedule = applyCustomDurations(
        baseSchedule,
        customDurations,
        customStartDates,
        data.leaveMode,
        data.firstParent ?? 0,
    );

    // Build unified periods per parent (same logic as the old CalendarView memo)
    const buildForParent = (
        i: number,
        forcedCursorStart?: Date,
    ): UnifiedPeriod[] => {
        const ps = schedule.parents[i];
        if (!ps) return [];
        const mandatory = ps.periods.find((p) => p.type === LEAVE_TYPES.MANDATORY);
        const nonMandatory = ps.periods.filter((p) => p.type !== LEAVE_TYPES.MANDATORY);
        const extras = data.extraPeriods?.[i] ?? [];
        let cursorStart = mandatory
            ? new Date(mandatory.endDate)
            : new Date(data.dueDate);
        if (forcedCursorStart && forcedCursorStart > cursorStart) {
            cursorStart = new Date(forcedCursorStart);
        }
        const order = getEffectiveOrder(nonMandatory, extras, data.periodOrder?.[i]);
        return buildUnifiedPeriods(order, nonMandatory, extras, cursorStart, customDurations[i]);
    };

    const unifiedMap = new Map<number, UnifiedPeriod[]>();
    if (data.leaveMode === 'optimized' && data.parentCount === 2) {
        const firstIdx = data.firstParent ?? 0;
        const secondIdx = firstIdx === 0 ? 1 : 0;
        const firstPeriods = buildForParent(firstIdx);
        unifiedMap.set(firstIdx, firstPeriods);
        const firstReturn =
            firstPeriods.length > 0
                ? firstPeriods[firstPeriods.length - 1].endDate
                : (schedule.parents[firstIdx]?.returnDate ?? new Date(data.dueDate));
        unifiedMap.set(secondIdx, buildForParent(secondIdx, firstReturn));
    } else {
        for (let i = 0; i < data.names.length; i++) {
            unifiedMap.set(i, buildForParent(i));
        }
    }

    return data.names.map((name, i) => {
        const ps = schedule.parents[i];
        const mandatory = ps?.periods.find((p) => p.type === LEAVE_TYPES.MANDATORY);
        const unified = unifiedMap.get(i) ?? [];

        const periods: ComputedPeriod[] = [];

        if (mandatory) {
            periods.push({
                type: LEAVE_TYPES.MANDATORY,
                startDate: formatDateKey(mandatory.startDate),
                endDate: formatDateKey(mandatory.endDate),
                days: null,
            });
        }

        for (const uP of unified) {
            if (uP.isExtra && uP.extraItem) {
                periods.push({
                    type: LEAVE_TYPES.EXTRA,
                    startDate: formatDateKey(uP.startDate),
                    endDate: formatDateKey(uP.endDate),
                    days: null,
                    isExtra: true,
                    extraId: uP.extraItem.id,
                    extraName: uP.extraItem.name,
                    extraPresetKey: uP.extraItem.presetKey,
                    durationValue: uP.extraItem.durationValue,
                    durationUnit: uP.extraItem.durationUnit,
                });
            } else if (!uP.isExtra && uP.leaveType) {
                periods.push({
                    type: uP.leaveType,
                    startDate: formatDateKey(uP.startDate),
                    endDate: formatDateKey(uP.endDate),
                    days: uP.lactanciaDays,
                });
            }
        }

        const colorId: ColorPaletteId =
            data.colors?.[i] ?? (Object.keys(COLOR_PALETTES)[i % 5] as ColorPaletteId);

        return { name, colorId, periods };
    });
}

// ─── Date-first schedule: edit helpers ────────────────────────────────────────

/**
 * Changes the duration of a period and cascades all subsequent periods forward
 * if they would overlap — including cross-parent cascade in optimized mode.
 * Returns a new `ComputedParentSchedule[]`.
 */
export function resizePeriod(
    schedule: ComputedParentSchedule[],
    parentIdx: number,
    periodKey: string,
    newValue: number,
    unit: EditUnit,
    firstParent: number = 0,
): ComputedParentSchedule[] {
    const localEdit = schedule.map((parent, i) => {
        if (i !== parentIdx) return parent;

        const idx = parent.periods.findIndex((p) => getPeriodKey(p) === periodKey);
        if (idx < 0) return parent;

        const period = parent.periods[idx];
        const start = parseLocalDate(period.startDate);
        let newEnd: Date;

        if (period.type === LEAVE_TYPES.LACTANCIA) {
            let workDays: number;
            if (unit === 'months') {
                const targetEnd = addMonths(start, newValue);
                workDays = countWorkingDays(start, targetEnd);
                newEnd = targetEnd;
            } else {
                workDays = unit === 'weeks' ? Math.round(newValue * 5) : Math.round(newValue);
                newEnd = addWorkingDays(start, workDays);
            }
            const updated: ComputedPeriod = {
                ...period,
                endDate: formatDateKey(newEnd),
                days: workDays,
                durationValue: newValue,
                durationUnit: unit,
            };
            const newPeriods = [...parent.periods];
            newPeriods[idx] = updated;
            return { ...parent, periods: newPeriods };
        }

        const totalDays = unit === 'months' ? newValue * 30 : (unit === 'weeks' ? newValue * 7 : newValue);
        newEnd = unit === 'months' ? addMonths(start, newValue) : addDays(start, totalDays);

        const updated: ComputedPeriod = {
            ...period,
            endDate: formatDateKey(newEnd),
            durationValue: newValue,
            durationUnit: unit,
        };
        const newPeriods = [...parent.periods];
        newPeriods[idx] = updated;
        return { ...parent, periods: newPeriods };
    });
    return cascadeAllFromEdit(localEdit, parentIdx, firstParent, false);
}

/**
 * Moves the start date of a period (clamped to the previous period's end) and
 * cascades all subsequent periods — including cross-parent cascade.
 * Returns a new `ComputedParentSchedule[]`.
 */
export function shiftPeriodStart(
    schedule: ComputedParentSchedule[],
    parentIdx: number,
    periodKey: string,
    newStartIso: string,
    firstParent: number = 0,
): ComputedParentSchedule[] {
    const localEdit = schedule.map((parent, i) => {
        if (i !== parentIdx) return parent;

        const idx = parent.periods.findIndex((p) => getPeriodKey(p) === periodKey);
        if (idx < 0) return parent;

        const period = parent.periods[idx];
        const prevEnd = idx > 0 ? parent.periods[idx - 1].endDate : period.startDate;
        const effectiveStart = newStartIso >= prevEnd ? newStartIso : prevEnd;

        const updated: ComputedPeriod = {
            ...period,
            startDate: effectiveStart,
            endDate: recomputeEnd(effectiveStart, period),
        };
        const newPeriods = [...parent.periods];
        newPeriods[idx] = updated;
        return { ...parent, periods: newPeriods };
    });
    return cascadeAllFromEdit(localEdit, parentIdx, firstParent, false);
}

/**
 * Swaps two non-mandatory periods in order and re-cascades from the mandatory
 * period's end with no gaps — including cross-parent cascade.
 */
export function reorderPeriods(
    schedule: ComputedParentSchedule[],
    parentIdx: number,
    fromKey: string,
    toKey: string,
    firstParent: number = 0,
): ComputedParentSchedule[] {
    const localEdit = schedule.map((parent, i) => {
        if (i !== parentIdx) return parent;

        const mandatory = parent.periods.find((p) => p.type === LEAVE_TYPES.MANDATORY);
        const nonMandatory = parent.periods.filter((p) => p.type !== LEAVE_TYPES.MANDATORY);

        const fromIdx = nonMandatory.findIndex((p) => getPeriodKey(p) === fromKey);
        const toIdx = nonMandatory.findIndex((p) => getPeriodKey(p) === toKey);
        if (fromIdx < 0 || toIdx < 0) return parent;

        const reordered = [...nonMandatory];
        const [removed] = reordered.splice(fromIdx, 1);
        reordered.splice(toIdx, 0, removed);

        const startCursor = mandatory
            ? mandatory.endDate
            : (parent.periods[0]?.startDate ?? reordered[0]?.startDate ?? '');

        const cascaded = tightCascadeAll(reordered, startCursor);

        return {
            ...parent,
            periods: mandatory ? [mandatory, ...cascaded] : cascaded,
        };
    });
    return cascadeAllFromEdit(localEdit, parentIdx, firstParent, true);
}

/**
 * Appends an extra leave item to a parent's period list.
 * The new period starts immediately after the last existing period.
 * Cross-parent cascade is applied in optimized mode.
 */
export function addExtraPeriod(
    schedule: ComputedParentSchedule[],
    parentIdx: number,
    item: ExtraLeaveItem,
    firstParent: number = 0,
): ComputedParentSchedule[] {
    const localEdit = schedule.map((parent, i) => {
        if (i !== parentIdx) return parent;

        const lastPeriod = parent.periods[parent.periods.length - 1];
        const startDate = lastPeriod ? lastPeriod.endDate : formatDateKey(new Date());
        const totalDays =
            item.durationUnit === 'weeks' ? item.durationValue * 7 : item.durationValue;
        const endDate = formatDateKey(addDays(parseLocalDate(startDate), totalDays));

        const newPeriod: ComputedPeriod = {
            type: LEAVE_TYPES.EXTRA,
            startDate,
            endDate,
            days: null,
            isExtra: true,
            extraId: item.id,
            extraName: item.name,
            extraPresetKey: item.presetKey,
            durationValue: item.durationValue,
            durationUnit: item.durationUnit,
        };

        return { ...parent, periods: [...parent.periods, newPeriod] };
    });
    return cascadeAllFromEdit(localEdit, parentIdx, firstParent, false);
}

/**
 * Removes an extra period by ID and cascades any subsequent periods to close
 * any overlap — including cross-parent cascade in optimized mode.
 */
export function removeExtraPeriod(
    schedule: ComputedParentSchedule[],
    parentIdx: number,
    extraId: string,
    firstParent: number = 0,
): ComputedParentSchedule[] {
    const localEdit = schedule.map((parent, i) => {
        if (i !== parentIdx) return parent;

        const idx = parent.periods.findIndex((p) => p.isExtra && p.extraId === extraId);
        if (idx < 0) return parent;

        const newPeriods = parent.periods.filter((_, j) => j !== idx);
        return { ...parent, periods: newPeriods };
    });
    return cascadeAllFromEdit(localEdit, parentIdx, firstParent, false);
}
